### Bernstein–Vazirani Algorithm — Recover a Hidden String in One Query

**Problem:** An oracle computes `f(x) = s · x mod 2` for a hidden string `s ∈ {0,1}^n` (bitwise AND then parity). Find `s`.

**Classical complexity:** `n` queries (query `e_i = 00...010...0` to read bit `s_i`).
**Quantum complexity:** **1 query.**

**Quantum approach:**
1. Prepare `|0⟩^{⊗n}|1⟩`, apply `H^{⊗(n+1)}`.
2. Apply the oracle. Phase kickback implements `|x⟩ → (−1)^{s·x} |x⟩`.
3. Apply `H^{⊗n}` to query register and measure — the result is `s` with probability 1.

**Why it works:** After the oracle, the query register is in `(1/√{2^n}) Σ_x (−1)^{s·x}|x⟩`, which is exactly `H^{⊗n}|s⟩`. One more Hadamard layer collapses to `|s⟩` deterministically.

**Circuit (n=3):**
```
|0⟩ ─H──┤      ├─H─M
|0⟩ ─H──┤ U_f  ├─H─M
|0⟩ ─H──┤      ├─H─M
|1⟩ ─H──┤      ├────
```

**Qiskit code:**
```python
from qiskit import QuantumCircuit
from qiskit.primitives import StatevectorSampler

def bv_oracle(s: str) -> QuantumCircuit:
    n = len(s)
    qc = QuantumCircuit(n + 1)
    # Standard convention: s is read right-to-left (s[-1] is qubit 0)
    for i, bit in enumerate(reversed(s)):
        if bit == "1":
            qc.cx(i, n)
    return qc

def bernstein_vazirani(s: str) -> QuantumCircuit:
    n = len(s)
    qc = QuantumCircuit(n + 1, n)
    qc.x(n); qc.h(range(n + 1))
    qc.compose(bv_oracle(s), inplace=True)
    qc.h(range(n))
    qc.measure(range(n), range(n))
    return qc

s = "1011"
result = StatevectorSampler().run([bernstein_vazirani(s)], shots=1024).result()
print(result[0].data.c.get_counts())   # {'1011': 1024}
```

**Complexity comparison:**
| Model | Queries | Total gates |
|---|---|---|
| Classical deterministic | `n` | `O(n)` |
| Classical randomized | `Θ(n)` | `O(n)` |
| Quantum | **1** | `O(n)` |

Unlike Deutsch–Jozsa, the speedup here *also beats randomized classical algorithms*: any randomized algorithm needs `Ω(n)` queries.

**Key insight — what quantum mechanics enables:**
- Phase kickback encodes all `n` bits of `s` into the phases of a uniform superposition in a single oracle call.
- `H^{⊗n}` is its own inverse; it maps `Σ_x (−1)^{s·x}|x⟩` to `|s⟩`, reading out the phase pattern as a computational basis string.

**Caveats:**
- The "one query" metric hides that building the superposition requires `n` Hadamards — the asymptotic gate count is still `O(n)`.
- Requires oracle access; if you can only evaluate `f` classically (i.e., no quantum oracle), no speedup.

**Rule of thumb:** BV is the cleanest example of quantum phase kickback reading out an entire hidden linear function at once — a useful conceptual building block for Simon's algorithm and QFT-based period finding.
