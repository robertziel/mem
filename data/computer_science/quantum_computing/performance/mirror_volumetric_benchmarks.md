### Mirror Circuits and Volumetric Benchmarks

**What it is:**
A **mirror circuit** runs a circuit `U` followed by an inverse-like circuit `U†` (or a Pauli-twirled echo) so that the ideal output is known (the input state) *without* classical simulation. A **volumetric benchmark** scans circuit **width × depth** and records the success probability at each cell — a heat map that shows the region of circuit shapes where a device is usable. Mirror circuits make volumetric benchmarks **scalable beyond the classical-simulation frontier** that caps QV.

**Why mirror:**
```
|ψ_out⟩ = U† U |ψ_in⟩ = |ψ_in⟩    (noiseless)
Success prob. = ⟨ψ_in | ρ_out | ψ_in⟩
```
With Pauli twirling added inside the mirror, the resulting channel is depolarizing, and the process fidelity is:
```
F = (D · p_success − 1) / (D − 1),    D = 2^n
```
No classical simulator needed — the reference is a computational-basis state.

**Volumetric plot — axes:**
| Axis | Meaning |
|---|---|
| x: **width** (qubits used) | Wider = more error contributors |
| y: **depth** (circuit layers) | Deeper = more cumulative error |
| Color: success probability | Pass threshold typically `2/3` |

A "bathtub" shape emerges: the device passes small and shallow circuits, fails large and deep ones; the pass boundary defines its operational envelope.

**Extends QV:**
- QV tests only *square* (width = depth) random circuits → a single point on the volumetric plot.
- Volumetric benchmarks test arbitrary (`w`, `d`) pairs → real workloads (e.g., QAOA at depth 5, width 50) are individually addressable.
- Mirror variant lifts the classical-simulation cap so `w > 50` is testable.

**Example — mirror-circuit fidelity:**
```python
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.circuit.random import random_circuit
from qiskit.quantum_info import random_pauli
from qiskit_aer import AerSimulator

def mirror_benchmark(n_qubits, depth, shots=4096, seed=0):
    rng = np.random.default_rng(seed)
    fwd = random_circuit(n_qubits, depth, max_operands=2, seed=seed)
    mirror = QuantumCircuit(n_qubits, n_qubits)
    mirror.compose(fwd, inplace=True)
    mirror.barrier()
    mirror.compose(fwd.inverse(), inplace=True)    # add Pauli twirls for production
    mirror.measure(range(n_qubits), range(n_qubits))
    counts = AerSimulator().run(transpile(mirror), shots=shots).result().get_counts()
    p0 = counts.get("0" * n_qubits, 0) / shots
    F = (2**n_qubits * p0 - 1) / (2**n_qubits - 1)
    return F

for w in (2, 4, 6):
    for d in (5, 20, 50):
        print(f"w={w}, d={d}: F≈{mirror_benchmark(w, d):.3f}")
```

**Design choices — what to randomize:**
- **Ansatz-relevant mirrors:** layers look like target application (QAOA, Trotter, chemistry) — reports app-like fidelity.
- **Random-Clifford mirrors:** cheap to invert exactly, twirl to depolarizing; scalable to 100+ qubits.
- **Periodic mirrors:** `U V U V …` with structure to mimic variational depth.

**When to use:**
- Certifying deep NISQ circuits past the classical-simulation frontier.
- Producing the volumetric map shown in NISQ roadmap papers (Blume-Kohout & Young 2020; Proctor et al. 2021).
- Comparing two devices or two compiler passes on a consistent shape grid.
- Quick go/no-go at a target `(w, d)` before launching a real experiment.

**Pitfalls:**
- **Noise cancellation:** coherent errors in `U` can partially cancel in `U†`, inflating reported fidelity. Pauli twirling eliminates most of this; verify with independent scrambling.
- **Compilation artifacts:** if the compiler recognizes `U†∘U` and simplifies, the benchmark collapses to identity. Use random-Clifford wrappers or `barrier`/opaque instructions to block optimization.
- Reports process fidelity against depolarizing channel — not state-dependent fidelity for biased noise.
- Heat-map resolution: denser `(w,d)` grid costs more shots; typical studies use 5–8 `w` × 5–8 `d` cells.

**Rule of thumb:** Use mirror volumetric benchmarks to map the usable envelope of a device at the shapes your algorithm actually runs at — QV is a single point, EPLG is a layer, but the volumetric plot is the only benchmark that tells you "will a 40-qubit, depth-30 circuit survive on this machine tonight?"
