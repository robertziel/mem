### Cross-Entropy Benchmarking — XEB for Random Circuits

**What it is:**
Cross-entropy benchmarking (XEB) estimates the fidelity of a (random) quantum circuit by comparing the **measured bitstring distribution** on hardware to the **ideal distribution** computed classically. Because random circuits produce output distributions close to Porter-Thomas, XEB gives a statistically efficient fidelity estimate without running the circuit's inverse. It was the fidelity metric used in the 2019 "quantum supremacy" experiment.

**Math — linear XEB fidelity:**
For a random circuit `U` with ideal probabilities `p_U(x) = |⟨x|U|0⟩|²` and measured bitstrings `x_1, …, x_N`:
```
F_XEB = (D / N) · Σ_j p_U(x_j) − 1,    D = 2^n
```
Equivalently (Google convention):
```
F = (D · ⟨p_U(x)⟩ − 1) / (D − 1)
```
- `F = 1`: perfect circuit (samples concentrated on high-probability ideal outputs).
- `F = 0`: uniform noise (samples look random).
- `F` decays roughly multiplicatively: `F_total ≈ Π_g (1 − ε_g)` over all gates `g`.

**Variants:**
| Variant | Purpose |
|---|---|
| **Linear XEB** | Unbiased fidelity estimate, simple to compute |
| **Log (cross-entropy) XEB** | Original Google metric, higher variance but info-theoretic |
| **Patch/elided XEB** | Split large circuits into classically-simulable patches; extrapolate |
| **Mirror XEB** | Combine XEB with mirror circuits to avoid ideal-simulation cost |

**Example — linear XEB on a 4-qubit random circuit:**
```python
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.quantum_info import Statevector
from qiskit_aer import AerSimulator

n, depth, shots = 4, 20, 50_000
qc = QuantumCircuit(n)
rng = np.random.default_rng(0)
for _ in range(depth):
    for q in range(n):
        qc.rx(rng.uniform(0, 2*np.pi), q); qc.ry(rng.uniform(0, 2*np.pi), q)
    for q in range(0, n - 1, 2):
        qc.cz(q, q + 1)
p_ideal = np.abs(Statevector.from_instruction(qc).data) ** 2  # D = 2^n probs
qc.measure_all()
counts = AerSimulator().run(transpile(qc), shots=shots).result().get_counts()
avg_p = sum((c / shots) * p_ideal[int(b, 2)] for b, c in counts.items())
F_xeb = (2**n) * avg_p - 1
print(f"XEB fidelity ≈ {F_xeb:.3f}")
```

**When to use:**
- Large-qubit benchmarking where running a full inverse circuit is impractical.
- Comparing circuits across architectures at a single metric.
- Reporting system-level fidelity for random-circuit sampling experiments.
- Estimating per-gate error: `ε_g ≈ (1 − F^{1/G})` with `G` = total two-qubit gates.

**Pitfalls:**
- **Requires classical simulation** of `p_U(x)` — hard tension with quantum advantage claims. Elided/patch XEB works around this but only at shallow depths.
- **Finite-sampling bias:** `N` shots needed to resolve `F` to `ε` scales as `1/(F²ε²)`; low-fidelity circuits need huge shot counts.
- Assumes Porter-Thomas output — shallow or structured circuits violate this and inflate `F_XEB` artificially.
- Sensitive to the same coherent-error blind spots as RB only if circuits are not sufficiently random.
- "Supremacy" framing is contested: classical tensor-network and Pauli-path simulations have partially caught up on the reference 53-qubit datasets.

**Rule of thumb:** Use XEB when you can afford to simulate (or partially simulate) the ideal distribution and want a single fidelity for a wide, shallow random circuit — it scales to many qubits far better than full-state tomography, but trust the number only when `N_shots · F² ≫ 1`.
