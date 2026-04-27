### Circuit Cutting and Knitting — Wire Cuts and Gate Cuts

**What it is:** A technique to run a circuit that is larger than your device by partitioning it into smaller subcircuits, executing each, and classically **knitting** the results back together. Two kinds of cut exist: **wire cuts** (split a qubit line in time) and **gate cuts** (decompose a nonlocal 2q gate into a quasi-probability sum of local operations). Both pay an exponential shot overhead but buy you hardware you do not own.

**Wire cut:** replace an edge of the circuit with a mid-circuit measurement on one side and a state preparation on the other, summed over a complete Pauli basis `{I, X, Y, Z}` with sign coefficients. Cost factor `gamma = 4` per wire cut.

**Gate cut:** decompose a 2q gate `U` as `U = sum_k a_k (A_k tensor B_k)` via quasi-probability simulation. For CNOT the optimal decomposition has `gamma = 2` (six local terms with coefficients `+-1/2`).

**Algorithm (knitting):** for each shot, each cut contributes a random local measurement/preparation sampled from the decomposition's quasi-probability distribution, together with a sign `s_k = sign(a_k)` and a weight `w_k = |a_k|`. The reconstructed expectation value is `E = prod_k(sum|a_k|) * avg(s_1 * s_2 * ... * s_k * meas)` over the joint sample. Variance grows as `gamma^(2k)`.

**Shot overhead:**

```
variance_cut = gamma^(2 k) * variance_original
```

where `k` is the number of cuts and `gamma` is the per-cut cost. Even 5 CNOT cuts is `2^10 = 1024x` more shots — survivable. 5 wire cuts is `4^10 ~ 10^6` — usually not.

| Cut type  | Per-cut gamma | 2 cuts | 5 cuts  | 10 cuts |
|-----------|---------------|--------|---------|---------|
| Gate (CX) | 2             | 16x    | 1024x   | ~10^6x  |
| Wire      | 4             | 256x   | ~10^6x  | ~10^12x |

**Qiskit addon:**
```python
from qiskit import QuantumCircuit
from qiskit_addon_cutting import partition_problem, generate_cutting_experiments, reconstruct_expectation_values
from qiskit.quantum_info import SparsePauliOp

qc = QuantumCircuit(6)
for i in range(5): qc.cx(i, i+1)
obs = SparsePauliOp.from_list([("ZIIIIZ", 1.0)])

# Mark cut location with a TwoQubitQPDGate (or use partition_problem with labels)
subexperiments, coefficients, subobs = partition_problem(
    circuit=qc, partition_labels="AAABBB", observables=obs
)
# Run subexperiments on (small) backend — concatenated bitstrings per subcircuit
# Then knit:
# exp = reconstruct_expectation_values(results, coefficients, subobs)
```

**When to use:**
- Problem needs `n + k` qubits, you have `n` — cut `k` edges, pay `gamma^(2k)`.
- Disconnected-but-coupled subproblems (e.g. two fermionic fragments with one entangling bond).
- Running the same ansatz on two small QPUs in parallel and combining.
- Research / benchmarking — not a production path yet.

**Pitfalls:**
- The `gamma^(2k)` cost is **multiplicative with shot count**, not depth — budget shots accordingly.
- Gate cuts require **classical communication** between subcircuits only at the end (good); wire cuts require **mid-circuit measurement + reset + conditional preparation** (needs a backend that supports it).
- Noise on the extra measurements / preparations can swamp the cut's benefit — cut cost assumes noiseless subcircuits.
- Finding the optimal cut placement is a graph-partitioning problem — minimize `k` subject to each piece fitting on the device.
- Current `qiskit-addon-cutting` supports `CutWire` and `CutTwoQubitGate` instructions; custom nonlocal gates must first be decomposed into CX.

**Example:** A 15-qubit QAOA on a ring, device has 10 qubits — one wire cut partitions into 2 x 8q subcircuits at `4^2 = 16x` shot cost. A 12q chemistry VQE between two fragments — two CX cuts across the bond at `2^4 = 16x`.

**Wire cut vs gate cut — when each wins:**

| Situation                                                     | Prefer    |
|---------------------------------------------------------------|-----------|
| Few entangling gates across the cut line                      | Gate cut  |
| Many gates across, but a single qubit bridges between regions | Wire cut  |
| Backend lacks mid-circuit measurement and reset               | Gate cut  |
| Backend has mid-circuit measurement, few entangling gates     | Either    |

**Rule of thumb:** Every cut multiplies shots by `gamma^2` — if you cannot afford `gamma^(2k)` shots, you cannot afford the cut; reach for cutting only when the alternative is not running the problem at all.
