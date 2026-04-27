### Reproducibility: Seeds and Calibration Snapshots

**What it is:** The combination of pinned RNG seeds (for transpiler choices and simulator sampling) and on-disk calibration snapshots (`backend.properties()`, `Target`) that makes a quantum experiment reproduce the *same* circuit layout and the *same* simulated counts on a different machine or a later date. Without it, your CI can pass today and fail tomorrow because the transpiler picked a different SWAP route or calibration data drifted.

**What to pin:**

| Source of non-determinism | Fix |
|---|---|
| Transpiler layout / routing pass | `transpile(..., seed_transpiler=42)` |
| Aer statevector sampling | `AerSimulator(seed_simulator=42)` |
| `numpy` / `random` in test setup | `np.random.seed(42)`, `random.seed(42)` |
| Backend calibration | snapshot `backend.properties()` → JSON, replay |
| Target (coupling map + gate set) | snapshot `backend.target` → pickle/JSON |
| Provider / SDK version | pin in `requirements.txt`, verify via `qiskit.__version__` |

**Why both a seed *and* a snapshot?** The seed pins transpiler *decisions*, but those decisions are made against calibration data. If the T1/T2/error-rate numbers drift, the transpiler (in `optimization_level >= 2`) picks a different best-qubit layout even with the same seed. Freeze both.

**Example — transpile with seeded, snapshotted backend:**
```python
import json, datetime
from qiskit import QuantumCircuit, transpile
from qiskit_ibm_runtime import QiskitRuntimeService
from qiskit_ibm_runtime.fake_provider import FakeSherbrooke

service = QiskitRuntimeService()
backend = service.backend("ibm_sherbrooke")

# 1. Save a calibration snapshot for CI replay
snapshot = {
    "name": backend.name,
    "timestamp": datetime.datetime.utcnow().isoformat(),
    "properties": backend.properties().to_dict(),
    "target": backend.target.to_dict(),   # coupling map + gate durations
    "qiskit_version": __import__("qiskit").__version__,
}
with open("calibration_2026_04_17.json", "w") as f:
    json.dump(snapshot, f, default=str, indent=2)

# 2. Transpile with pinned seed — reproducible layout every run
qc = QuantumCircuit(5); qc.h(0); [qc.cx(i, i + 1) for i in range(4)]
tqc = transpile(qc, backend=backend, optimization_level=3, seed_transpiler=42)
print("layout:", tqc.layout.initial_virtual_layout())
```

**Replay from snapshot in CI (no network):**
```python
from qiskit.providers.models import BackendProperties
from qiskit_aer import AerSimulator

snap = json.load(open("calibration_2026_04_17.json"))
props = BackendProperties.from_dict(snap["properties"])
# Build a FakeBackend-like simulator from the frozen target
sim = AerSimulator(noise_model=None)           # or NoiseModel.from_backend_properties(props)
tqc = transpile(qc, backend=FakeSherbrooke(), seed_transpiler=42)
result = sim.run(tqc, shots=4096, seed_simulator=42).result()
```

**Pitfalls:**
- **Global vs per-pass seeds.** `seed_transpiler` only seeds the preset pass manager; if you build a custom `PassManager`, pass `seed_transpiler` to stochastic passes like `SabreLayout`/`SabreSwap` explicitly.
- **`optimization_level=0` is not deterministic either.** Any randomized layout pass still needs a seed.
- **Snapshot rot.** Refresh snapshots quarterly, tagged with chip revision; old snapshots silently drift from reality and invalidate noise-sim results.
- **Qiskit version upgrades.** Transpiler heuristics change between minor versions — pin `qiskit==X.Y.Z` in CI and bump deliberately.
- **Hardware is still stochastic.** Seeds do *not* reproduce real-QPU shot outcomes — only ideal/noisy-sim counts.

**Rule of thumb:** A reproducible quantum experiment needs three things checked into git: the circuit, the transpiler seed, and a calibration snapshot — miss one and "it worked on my machine" is back with a vengeance.
