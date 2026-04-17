### IBM Qiskit — Noise Models and Fake Backends

**What it is:** A `NoiseModel` is a collection of per-gate, per-qubit Kraus channels that an `AerSimulator` applies alongside ideal operations. A `FakeBackend` is a frozen snapshot of a real IBM device (coupling map, basis gates, calibration data) wrapped in the `BackendV2` interface — you transpile for it exactly as you would for the real QPU, then simulate with its derived noise model for a realistic dry run.

**Three paths to a noise model:**

| Path | When | Fidelity to hardware |
|---|---|---|
| `NoiseModel.from_backend(backend)` | You have a real or fake backend | Highest — uses measured T1/T2, gate errors, readout |
| Hand-built with `depolarizing_error`, `thermal_relaxation_error`, `pauli_error`, `ReadoutError` | Studying specific error models | Customizable, not representative |
| `NoiseModel.from_backend_properties(props)` | You only have a properties JSON | Same as (1) |

**Fake backends worth knowing:**

| FakeBackend | Real device | Qubits | Topology |
|---|---|---|---|
| `FakeSherbrooke` | `ibm_sherbrooke` | 127 | Heavy-hex |
| `FakeTorino` | `ibm_torino` | 133 | Heavy-hex (Heron r1) |
| `FakeKyiv` | `ibm_kyiv` | 127 | Heavy-hex |
| `FakeAlmadenV2` / `FakeLagosV2` | Older Eagle/Falcon | 27–65 | Legacy |
| `FakeManilaV2` | `ibm_manila` | 5 | Line — good for teaching |

Import from `qiskit_ibm_runtime.fake_provider` (modern) or `qiskit.providers.fake_provider` (legacy).

**Canonical workflow — fake backend → transpile → noisy sim:**
```python
from qiskit_ibm_runtime.fake_provider import FakeSherbrooke
from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager

fake = FakeSherbrooke()
noise = NoiseModel.from_backend(fake)

pm = generate_preset_pass_manager(optimization_level=2, backend=fake)
isa = pm.run(qc)

sim = AerSimulator(noise_model=noise,
                   coupling_map=fake.coupling_map,
                   basis_gates=noise.basis_gates)
counts = sim.run(isa, shots=8192).result().get_counts()
```

**Building a custom noise model:**
```python
from qiskit_aer.noise import NoiseModel, depolarizing_error, thermal_relaxation_error

nm = NoiseModel()
# 1Q depolarizing on all sx gates, 0.1% per gate
nm.add_all_qubit_quantum_error(depolarizing_error(1e-3, 1), ['sx', 'x'])
# 2Q thermal relaxation for ecr with T1=300µs, T2=200µs, duration=660ns
tr = thermal_relaxation_error(t1=300e-6, t2=200e-6, time=660e-9).expand(
     thermal_relaxation_error(t1=300e-6, t2=200e-6, time=660e-9))
nm.add_all_qubit_quantum_error(tr, ['ecr'])
```

**What `from_backend` includes vs. omits:**

| Included | Omitted / approximate |
|---|---|
| Single-qubit gate error (depol) | Crosstalk between simultaneous gates |
| Two-qubit gate error | Leakage outside computational subspace |
| Readout error (per qubit) | Temporally correlated noise (1/f drifts) |
| T1/T2 thermal relaxation | Coherent miscalibrations (non-Pauli) |

Fake backends are representative, not predictive — real devices drift between calibrations.

**Transpile target matters:**
You **must** transpile for the fake backend (not a plain `AerSimulator`) so that coupling map and basis gates match what the noise model expects. Mixing a circuit transpiled for `ibmq_lima` with `NoiseModel.from_backend(FakeSherbrooke())` produces nonsense.

**Pitfalls:**
- Building a hand-rolled noise model without reading hardware numbers → wildly over- or under-estimated fidelity.
- Forgetting `coupling_map=` on `AerSimulator` after attaching a noise model → simulator uses all-to-all connectivity, bypassing routing noise.
- Using an ancient `Fake*` (non-V2) backend — breaks with modern Runtime APIs.
- Testing with `depolarizing_error(0.01)` and concluding your algorithm "doesn't work on hardware" — real noise is structured, not symmetric depolarization.

**Rule of thumb:** Always dry-run on a matching `Fake<Device>` before submitting to real hardware — the transpile-and-noise shape mismatches catch 80% of the bugs that would otherwise burn queue time.
