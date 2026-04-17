### Quantum Walks — Discrete and Continuous

**Two formulations:**
- **Discrete-time quantum walk (DTQW):** state lives on `vertex × coin` space. Each step: apply coin unitary `C`, then shift `S` based on coin state. Analog of random walk with a coin flip.
- **Continuous-time quantum walk (CTQW):** evolution `U(t) = e^{−iHt}` where `H` is the adjacency or Laplacian matrix of the graph. No coin register needed.

**Signature behavior:** Both exhibit ballistic spreading — the walk variance grows as `t^2` instead of the classical random walk's `t`. This gives a **quadratic speedup** on hitting-time problems and, for special graph structures, exponential speedups.

**Canonical results:**
| Problem | Classical | Quantum walk |
|---|---|---|
| Element distinctness (are `n` inputs all different?) | `Θ(n)` queries | **`Θ(n^{2/3})`** (Ambainis 2004, optimal) |
| Triangle finding in a graph with `n` vertices | `Õ(n^{1.41})` | **`Õ(n^{5/4})`** (Le Gall 2014) |
| Spatial search on 2D grid `√n × √n` | `Θ(n)` | `O(√n log n)` (Aaronson–Ambainis) |
| `s-t` hitting on "glued trees" graph | `Ω(2^{n/2})` | **`O(poly(n))` — exponential speedup** (Childs et al. 2003) |
| Welded-tree, NAND-tree evaluation | `Θ(n^{0.753...})` | `O(√n log n)` (NAND formula) |

**Discrete walk circuit structure:**
```
coin:    ──C──┐            ──C──┐            ...
              │                  │
vertex:  ─────S─────         ────S─────      ...
```
`C` is typically a Grover-like coin (`2|s⟩⟨s| − I` on coin register).
`S` is the shift: `|c⟩|v⟩ → |c⟩|v + c⟩` for a Cayley graph.

**Qiskit code (DTQW on a cycle of size 2^n):**
```python
from qiskit import QuantumCircuit
from qiskit.circuit.library import QFT
import numpy as np

def increment(n: int) -> QuantumCircuit:
    """|v⟩ → |v+1 mod 2^n⟩."""
    qc = QuantumCircuit(n)
    for i in range(n - 1, 0, -1):
        qc.mcx(list(range(i)), i)
    qc.x(0)
    return qc

def decrement(n: int) -> QuantumCircuit:
    qc = QuantumCircuit(n); qc.x(0)
    for i in range(1, n):
        qc.mcx(list(range(i)), i)
    return qc

def dtqw(n: int, steps: int) -> QuantumCircuit:
    qc = QuantumCircuit(n + 1)                    # n position qubits + 1 coin
    qc.h(n)                                       # initial coin |+⟩
    for _ in range(steps):
        qc.h(n)                                   # coin = Hadamard
        qc.append(increment(n).control(1), [n] + list(range(n)))
        qc.x(n)
        qc.append(decrement(n).control(1), [n] + list(range(n)))
        qc.x(n)
    return qc
```

**Continuous-time walk — simulation:** `U = e^{−iAt}` where `A` is the adjacency matrix. Trotterize or use a sparse Hamiltonian simulation algorithm (Berry–Childs–Kothari, qubitization). For a `d`-regular graph on `N` vertices, simulation cost is `O(d · t · polylog(N/ε))`.

**Key insight — what quantum mechanics enables:**
- **Interference between walker paths** cancels amplitude on "backward" excursions and amplifies forward spread — ballistic propagation.
- On highly symmetric graphs (like glued trees), most classical paths are exponentially dead-ended while the quantum walker finds the symmetric "column" basis and traverses in polynomial time.

**Caveats:**
- Ballistic spreading on regular lattices is a well-understood but *polynomial* benefit; glued-trees-style exponential speedups need specific structure.
- Many quantum walk algorithms assume an adjacency oracle, not an explicit graph — this matters when translating to practical speedups.
- DTQW and CTQW are interconvertible (Childs 2010) but convert with polynomial overhead; the "right" formulation depends on the problem.

**Rule of thumb:** Quantum walks are the generic tool for any "graph traversal / hitting time / distinctness" problem. Expect quadratic speedup by default; hope for exponential only if the graph has hidden symmetry.
