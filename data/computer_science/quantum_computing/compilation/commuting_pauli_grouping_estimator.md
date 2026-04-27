### Commuting Pauli Grouping for Estimator Shot Reduction

**What it is:** To estimate `<psi|H|psi>` where `H = sum_i c_i P_i` is a sum of Pauli strings, you must measure each `P_i`. Naively that is one measurement basis per term. But **qubit-wise commuting** (QWC) Paulis can share a single measurement circuit — post-processing recovers all their expectations from the same shots. Grouping reduces the number of distinct measurement circuits by a factor `O(n)` for typical `n`-qubit chemistry / physics Hamiltonians.

**Two notions of commutation:**

| Kind               | Definition                                                    | Merge strategy                               |
|--------------------|---------------------------------------------------------------|----------------------------------------------|
| Qubit-wise (QWC)   | Same Pauli on every qubit position (e.g. `XIZ` and `XYZ`? no — `I` vs `Y` at qubit 1 doesn't match) | Single tensor-product basis rotation         |
| General commuting  | `[P, Q] = 0` as operators (full Pauli commutation)            | Requires a Clifford to diagonalize the group |

QWC grouping is cheap to implement and suffices for most use cases. General-commuting grouping saves more shots but needs a Clifford to rotate into the common eigenbasis.

**Algorithm (greedy QWC grouping):** build the Pauli compatibility graph (edge = QWC pair), then color it; each color class is one measurement setting. Equivalent to minimum clique cover on the anti-compatibility graph — NP-hard, so use greedy largest-first.

**Shot budget:** for `M` total shots and `G` groups, each group gets `~M/G` shots (or, optimally, `propto sqrt(sum |c_i|^2 in group)` — the Rao-Blackwell allocation). Reducing from `|H|` groups to `|H|/n` groups gives a direct `~n` speedup at fixed statistical error.

**Qiskit:**
```python
from qiskit.quantum_info import SparsePauliOp
from qiskit_ibm_runtime import EstimatorV2

H = SparsePauliOp.from_list([
    ("ZZII",  1.0),
    ("IZZI",  0.5),
    ("XIII", -0.3),
    ("XXII",  0.2),
    ("YYII",  0.2),
])

groups = H.group_commuting(qubit_wise=True)
print(f"{len(H)} terms -> {len(groups)} QWC groups")
for g in groups: print(" ", g.paulis)

# EstimatorV2 does this internally — you just pass the full operator
# estimator = EstimatorV2(mode=backend)
# result = estimator.run([(circuit, H)]).result()
```

**`group_commuting(qubit_wise=True)` vs `qubit_wise=False`:**

| Mode               | Fewer groups? | Extra gates at measurement?    |
|--------------------|---------------|--------------------------------|
| `qubit_wise=True`  | No (strict)   | Local basis rotations only     |
| `qubit_wise=False` | Yes           | Clifford to diagonalize group  |

**When to use:**
- Any variational workload (VQE, QAOA with weighted objective, quantum-chemistry energies).
- Hamiltonian with many terms (`|H|` >> `n`) — the grouping payoff is largest.
- Anywhere you are paying per-shot on a cloud backend.

**Pitfalls:**
- Grouping reduces **shots**, not **circuit depth** — each group is still one full state-prep + measurement.
- Wall-clock savings depend on the backend's per-job overhead; cloud latency per circuit may dwarf shot cost.
- General (non-QWC) commuting groups insert a Clifford before measurement — on noisy hardware the added error can eat the shot savings. Benchmark before enabling.
- EstimatorV2 handles grouping automatically at PUB level; calling `group_commuting` manually is only needed for custom sampling pipelines or shot-budget analysis.

**Example saving:** H2 STO-3G Hamiltonian has 15 Pauli terms on 4 qubits — QWC grouping reduces to ~5 groups, so ~3x fewer measurement circuits for the same standard error.

**Rule of thumb:** If you are writing the shot loop yourself, always group; if you are using EstimatorV2, it already groups — your job is to report `|H|` vs groups to document the speedup.
