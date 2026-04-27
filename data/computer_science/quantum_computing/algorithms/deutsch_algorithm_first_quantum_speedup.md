### Deutsch's Algorithm — The First Quantum Speedup

**Problem:** Given a black-box oracle for `f: {0,1} → {0,1}`, decide whether `f` is *constant* (`f(0) = f(1)`) or *balanced* (`f(0) ≠ f(1)`).

**Classical complexity:** 2 queries (must evaluate `f(0)` and `f(1)`).
**Quantum complexity:** **1 query** — a 2× speedup, and historically the first demonstration that quantum computers could beat classical ones.

**Quantum approach:**
1. Prepare `|0⟩|1⟩`, then apply `H ⊗ H` → `(|0⟩+|1⟩)(|0⟩−|1⟩)/2`.
2. Apply oracle `U_f: |x⟩|y⟩ → |x⟩|y ⊕ f(x)⟩`. The ancilla in state `(|0⟩−|1⟩)/√2` produces a **phase kickback**: `|x⟩ → (−1)^f(x)|x⟩`.
3. Apply `H` to the first qubit and measure.
   - Outcome `0` → constant; outcome `1` → balanced.

**Circuit:**
```
|0⟩ ──H──┤     ├──H──M
         │ U_f │
|1⟩ ──H──┤     ├──────
```

**Qiskit code:**
```python
from qiskit import QuantumCircuit
from qiskit.primitives import StatevectorSampler

def deutsch(oracle: QuantumCircuit) -> QuantumCircuit:
    qc = QuantumCircuit(2, 1)
    qc.x(1)                 # ancilla = |1⟩
    qc.h([0, 1])            # superposition + phase-kickback state
    qc.compose(oracle, inplace=True)
    qc.h(0)
    qc.measure(0, 0)
    return qc

# balanced oracle f(x) = x
balanced = QuantumCircuit(2); balanced.cx(0, 1)
sampler = StatevectorSampler()
result = sampler.run([deutsch(balanced)], shots=1024).result()
counts = result[0].data.c.get_counts()
print("balanced" if "1" in counts else "constant")
```

**Key insight — what quantum mechanics enables:**
- **Superposition** lets us query `f` on both inputs simultaneously.
- **Phase kickback** converts the value of `f(x)` into a relative phase on the query register.
- **Interference** via the final Hadamard collapses that phase structure into a deterministic single-bit answer.

A single classical evaluation tells you one output bit; a single quantum evaluation tells you a *global property* of `f`.

**Caveats:**
- Oracle model: we count queries to `U_f`, not internal gate count.
- The speedup is only 2×; it matters because it *exists*, not because it's practical.
- Generalizes to n-bit inputs as the Deutsch–Jozsa algorithm.

**Rule of thumb:** Deutsch is the "hello world" of quantum algorithms — use it to teach superposition + phase kickback + interference, not as a practical tool.
