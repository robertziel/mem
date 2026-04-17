### Amplitude Amplification — Generalized Grover

**Problem:** Given a state-preparation unitary `A` such that `A|0⟩ = sin(φ)|ψ_good⟩ + cos(φ)|ψ_bad⟩` (some partition of outcomes into "good"/"bad"), amplify the amplitude on `|ψ_good⟩`.

**Classical analogue:** To find a good outcome by rejection sampling, you need `O(1/sin²(φ)) = O(1/p)` trials where `p = sin²(φ)` is the initial success probability.
**Quantum complexity:** **`O(1/sin(φ)) = O(1/√p)`** — a **quadratic speedup** in `1/p`.

Grover's algorithm is the special case where `A = H^{⊗n}` on a search space with `M` marked items out of `N`, giving `p = M/N` and `O(√(N/M))` cost.

**Approach:** Define two reflections:
- `S_good = I − 2Π_good` reflects about the bad subspace (this is the *oracle*, flipping the sign of good states).
- `S_0 = I − 2|0⟩⟨0|` reflects about the all-zeros state.

The Grover operator is `Q = −A · S_0 · A† · S_good`. Applied to `A|0⟩`, it is a rotation by `2φ` in the 2D subspace spanned by `|ψ_good⟩, |ψ_bad⟩`. After `k` iterations, the amplitude on good is `sin((2k+1)φ)`. Choose `k ≈ ⌊π / (4φ)⌋` to maximize.

**Qiskit code (generic AA wrapper):**
```python
from qiskit import QuantumCircuit
from qiskit.circuit.library import GroverOperator
from qiskit.primitives import StatevectorSampler
import numpy as np

def amplitude_amplification(A: QuantumCircuit, oracle: QuantumCircuit, iterations: int) -> QuantumCircuit:
    n = A.num_qubits
    qc = QuantumCircuit(n, n)
    qc.compose(A, inplace=True)
    grover_op = GroverOperator(oracle=oracle, state_preparation=A)
    for _ in range(iterations):
        qc.compose(grover_op, inplace=True)
    qc.measure(range(n), range(n))
    return qc

# Example: A = uniform superposition, oracle flags |11⟩
A = QuantumCircuit(2); A.h([0, 1])
oracle = QuantumCircuit(2); oracle.cz(0, 1)
p = 1 / 4                          # initial success probability
k = int(round(np.pi / (4 * np.arcsin(np.sqrt(p)))))   # optimal iterations
qc = amplitude_amplification(A, oracle, k)
print(StatevectorSampler().run([qc], shots=1024).result()[0].data.c.get_counts())
```

**Key insight:** AA reformulates search as a 2D *rotation* in the good/bad subspace. Each Grover iteration rotates by the fixed angle `2φ` — so you need `O(1/φ) = O(1/√p)` iterations, whereas classical sampling, which is essentially "measure and retry", takes `O(1/p)`.

**Generalizations used in practice:**
- **Amplitude estimation:** count good outcomes with `O(1/ε)` calls instead of classical `O(1/ε²)` (quadratic Monte Carlo speedup).
- **Variable-time AA:** when `A` has varying runtimes on different branches.
- **Oblivious AA:** implement a non-unitary operation by iterated projection — used inside HHL.
- **Fixed-point AA (Yoder, Grover π/3):** avoid "overshoot" when `p` is unknown.

**Caveats:**
- Over-iteration decreases the good amplitude (it's a rotation, not a one-way march). Knowing `p` — or using fixed-point variants — is important.
- Requires `A` and `A†` to be coherent unitaries (no mid-circuit measurements inside `A`).
- The speedup is *quadratic*, not exponential. For search in a structured problem, a classical `O(log N)` algorithm usually beats Grover's `O(√N)`.

**Rule of thumb:** Any time a classical algorithm is "sample until success," amplitude amplification gives a quadratic speedup. Use it as the generic quantum Monte Carlo / rejection-sampling accelerator, not as a replacement for structured-search algorithms.
