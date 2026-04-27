### Grover's Algorithm — Unstructured Search in `O(√N)`

**Problem:** Given an oracle `f: {0,1}^n → {0,1}` with `f(x) = 1` on `M` marked inputs out of `N = 2^n`, find a marked `x`.

**Complexity:**
| Model | Queries |
|---|---|
| Classical (deterministic or randomized) | `Θ(N/M)` |
| Quantum (Grover) | **`Θ(√(N/M))`** |

**Optimality:** Bennett–Bernstein–Brassard–Vazirani (1997) proved that any quantum algorithm needs `Ω(√N)` queries in the unstructured (black-box) setting — Grover is asymptotically optimal.

**Quantum approach:** Amplitude amplification with `A = H^{⊗n}`:
1. Initialize `|s⟩ = H^{⊗n}|0⟩^n` (uniform superposition, initial good amplitude `√(M/N)`).
2. Repeat `k ≈ ⌊(π/4)√(N/M)⌋` times:
   a. **Oracle:** `|x⟩ → (−1)^{f(x)}|x⟩` (phase flip on marked states).
   b. **Diffusion:** `2|s⟩⟨s| − I` (reflection about the uniform superposition, aka "inversion about the mean").
3. Measure.

Each iteration rotates by `2θ` where `sin(θ) = √(M/N)`. After `k` iterations the amplitude on marked states is `sin((2k+1)θ)`.

**Oracle design:** Usually built from classical reversible logic that XORs `f(x)` into an ancilla initialized to `|−⟩`, giving phase kickback `(−1)^{f(x)}`. For a known target string, it's a multi-controlled Z.

**Qiskit code:**
```python
from qiskit import QuantumCircuit
from qiskit.circuit.library import GroverOperator
from qiskit.primitives import StatevectorSampler
import numpy as np

n = 4
target = "1011"

# Phase-flip oracle for a single marked state
oracle = QuantumCircuit(n)
zero_bits = [i for i, b in enumerate(reversed(target)) if b == "0"]
oracle.x(zero_bits)
oracle.h(n - 1); oracle.mcx(list(range(n - 1)), n - 1); oracle.h(n - 1)
oracle.x(zero_bits)

state_prep = QuantumCircuit(n); state_prep.h(range(n))
grover_op = GroverOperator(oracle=oracle, state_preparation=state_prep)

N, M = 2 ** n, 1
k = int(round(np.pi / 4 * np.sqrt(N / M)))

qc = QuantumCircuit(n, n); qc.compose(state_prep, inplace=True)
for _ in range(k):
    qc.compose(grover_op, inplace=True)
qc.measure(range(n), range(n))

print(StatevectorSampler().run([qc], shots=1024).result()[0].data.c.get_counts())
```

**Key insight:** Grover's speedup comes from *amplitude amplification*, not from "searching all items in parallel." The algorithm is a geometric rotation in a 2D subspace spanned by (marked, unmarked) states; each iteration rotates by the same angle, so `O(√N)` rotations bring the amplitude from `1/√N` to near 1.

**Caveats:**
- The speedup is *quadratic*, not exponential. A structured search problem with a classical `O(log N)` algorithm (e.g., sorted list binary search) has no quantum advantage.
- You must **know** `M` (or at least its order) to pick `k`. Running too many iterations *decreases* success probability. If `M` is unknown, use iterative Grover or quantum counting to estimate `M` first.
- Oracle cost: the oracle is invoked `√N` times, so if implementing `f` is expensive, the real wall-clock benefit shrinks.
- NISQ-impractical for large `N`: the circuit depth grows with `√N`, and noise kills success well before that.

**Variants:**
- **Quantum counting** = phase estimation on the Grover operator → estimate `M` with `O(√N/ε)` queries.
- **Fixed-point Grover (Yoder):** avoids overshoot at the cost of a logarithmic overhead.

**Rule of thumb:** Grover is a generic `O(√N)` accelerator for any exhaustive search (brute-force key search, CSP, NP search). Exponential problems become subexponential; polynomial problems rarely benefit.
