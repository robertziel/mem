### Deutsch–Jozsa Algorithm — Constant vs. Balanced on n Bits

**Problem:** Given an oracle `f: {0,1}^n → {0,1}` *promised* to be either constant (same output for all inputs) or balanced (output `0` on exactly half of inputs), decide which.

**Classical complexity:**
- Deterministic worst case: `2^{n-1} + 1` queries (check until you've seen a disagreement or ruled it out).
- Bounded-error randomized: `O(1)` queries — so DJ's exponential separation is against *deterministic* classical algorithms only.

**Quantum complexity:** **1 query** — exponential speedup (vs. deterministic classical).

**Quantum approach:**
1. Initialize `n` query qubits to `|0⟩^{⊗n}` and one ancilla to `|1⟩`.
2. Apply `H^{⊗(n+1)}` to produce a uniform superposition over all `x` with phase-kickback ancilla.
3. Apply the oracle: `|x⟩ → (−1)^{f(x)} |x⟩`.
4. Apply `H^{⊗n}` to the query register and measure.
   - All zeros outcome → **constant**.
   - Any non-zero outcome → **balanced**.

**Why it works:** After the final Hadamard, the amplitude of `|0^n⟩` is `(1/2^n) Σ_x (−1)^{f(x)}`. For constant `f`, this is `±1`. For balanced `f`, the sum is zero by definition — so `|0^n⟩` has zero amplitude.

**Qiskit code:**
```python
from qiskit import QuantumCircuit
from qiskit.primitives import StatevectorSampler

def dj_circuit(oracle: QuantumCircuit, n: int) -> QuantumCircuit:
    qc = QuantumCircuit(n + 1, n)
    qc.x(n); qc.h(range(n + 1))     # ancilla |−⟩, queries in |+⟩^n
    qc.compose(oracle, inplace=True)
    qc.h(range(n))
    qc.measure(range(n), range(n))
    return qc

def balanced_oracle(n: int) -> QuantumCircuit:
    qc = QuantumCircuit(n + 1)
    for i in range(n):
        qc.cx(i, n)              # f(x) = x_0 ⊕ x_1 ⊕ ... ⊕ x_{n-1}
    return qc

n = 4
result = StatevectorSampler().run([dj_circuit(balanced_oracle(n), n)], shots=1024).result()
counts = result[0].data.c.get_counts()
print("constant" if counts.get("0" * n, 0) > 512 else "balanced")
```

**Key insight:** Quantum parallelism evaluates `f` on all `2^n` inputs simultaneously, and the final Hadamard performs a *global interference* that makes the two cases (constant/balanced) orthogonal — deterministic single-shot distinguishability.

**Caveats:**
- The *promise* (constant OR balanced, nothing else) is essential — without it, DJ says nothing.
- Against **randomized** classical algorithms the separation collapses to a constant factor, so DJ isn't evidence of real-world exponential quantum advantage.
- Pedagogical value: cleanest example of quantum interference extracting a global property.

**Rule of thumb:** DJ is the canonical exponential quantum vs. deterministic classical separation — contrived, but it set the template (superposition + oracle + interference) that Bernstein–Vazirani, Simon, and Shor all follow.
