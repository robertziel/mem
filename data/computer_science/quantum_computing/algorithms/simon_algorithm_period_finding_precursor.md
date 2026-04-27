### Simon's Algorithm — Period Finding over (Z/2Z)^n

**Problem:** Given an oracle `f: {0,1}^n → {0,1}^n` promised to satisfy `f(x) = f(y) ⟺ y = x ⊕ s` for some hidden nonzero `s ∈ {0,1}^n` (2-to-1 with XOR period `s`), find `s`.

**Classical complexity:** `Θ(2^{n/2})` queries (birthday bound — you must find a collision).
**Quantum complexity:** **`O(n)` queries** and `O(n^3)` total gates — exponential speedup.

This is the *direct conceptual precursor* to Shor's algorithm: replace XOR with modular addition and you get period finding over `Z_N`.

**Quantum approach:**
1. Prepare `|0⟩^n|0⟩^n`, apply `H^{⊗n}` to the first register → `(1/√{2^n}) Σ_x |x⟩|0⟩`.
2. Apply `U_f`: `|x⟩|0⟩ → |x⟩|f(x)⟩`.
3. Measure (or trace out) the second register. The first register collapses to `(|x⟩ + |x⊕s⟩)/√2` for a random `x`.
4. Apply `H^{⊗n}` to the first register. The amplitude on `|y⟩` is nonzero only when `y · s = 0 mod 2`.
5. Measure to obtain a random `y` orthogonal to `s`.
6. Repeat `O(n)` times, collect `n − 1` linearly independent `y_i`, and solve the linear system over GF(2) for `s`.

**Qiskit code:**
```python
from qiskit import QuantumCircuit
from qiskit.primitives import StatevectorSampler
import numpy as np

def simon_circuit(oracle: QuantumCircuit, n: int) -> QuantumCircuit:
    qc = QuantumCircuit(2 * n, n)
    qc.h(range(n))
    qc.compose(oracle, inplace=True)
    qc.h(range(n))
    qc.measure(range(n), range(n))
    return qc

def simon_oracle_from_s(s: str) -> QuantumCircuit:
    n = len(s)
    qc = QuantumCircuit(2 * n)
    for i in range(n):
        qc.cx(i, n + i)                       # f(x) = x on the first branch
    j = s.find("1")                           # pivot bit
    for i, b in enumerate(reversed(s)):
        if b == "1":
            qc.cx(n - 1 - j, n + i)           # enforces f(x) = f(x ⊕ s)
    return qc

n = 3; s = "110"
sampler = StatevectorSampler()
ys = []
for _ in range(3 * n):
    res = sampler.run([simon_circuit(simon_oracle_from_s(s), n)], shots=1).result()
    y = list(res[0].data.c.get_counts())[0]
    if y != "0" * n:
        ys.append([int(b) for b in y])
# Solve A·s = 0 (mod 2) on the collected rows to recover s
```

**Key insight:** Quantum interference combined with a uniformly random collapse lets every measurement produce a random element of `s^⊥` (the hyperplane perpendicular to `s`). Classical algorithms have no way to sample from `s^⊥` without explicitly finding collisions, which costs exponentially more.

**Caveats:**
- Promise problem: failure if `f` is not exactly 2-to-1 with a single XOR period.
- The quantum part only gives random `y ⊥ s`; classical linear algebra solves for `s`. Simon is a *hybrid* algorithm.
- Needs `2n` qubits for an `n`-bit problem.

**Rule of thumb:** Simon is the smallest algorithm that proves an exponential quantum speedup *against randomized classical algorithms* (not just deterministic ones). If you understand Simon, you're 80% of the way to understanding Shor.
