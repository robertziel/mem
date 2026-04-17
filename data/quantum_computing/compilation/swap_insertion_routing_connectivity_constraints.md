### SWAP Insertion and Routing

**What it is:** Quantum circuits often contain two-qubit gates between qubits that are not physically adjacent. **Routing** rewrites the circuit to respect device connectivity by inserting SWAP gates that move logical qubits to adjacent physical positions. Each SWAP costs **3 CNOTs** on CNOT-native hardware, so routing overhead is often the largest compilation expense.

**Problem statement:**
- Input: circuit + coupling graph G = (physical qubits, allowed 2Q edges)
- Goal: produce an equivalent circuit using only gates on edges in G, minimizing inserted SWAPs (or depth/fidelity).

**Complexity:** Optimal SWAP routing is NP-hard in general. All practical routers are heuristic.

**SABRE routing (Qiskit default):**
1. Scan circuit front layer (gates with no unfulfilled predecessors).
2. Any gate already on an adjacent pair → execute.
3. Otherwise, score candidate SWAPs by how much they reduce distance for **both** the front layer and a lookahead window.
4. Apply the SWAP; repeat.

Stochastic — run multiple trials, return shortest result.

**Cost reality:**
```
SWAP(a, b) = CNOT(a,b) · CNOT(b,a) · CNOT(a,b)     # 3 CNOTs

bridge gate (for CNOT across 1 hop) = 4 CNOTs — sometimes cheaper than SWAP+CNOT+SWAP (6 CNOTs)
```

**Routing passes in Qiskit:**

| Pass             | Notes                                                          |
|------------------|----------------------------------------------------------------|
| `BasicSwap`      | Naive shortest-path; baseline                                  |
| `LookaheadSwap`  | Considers future gates in scoring                              |
| `SabreSwap`      | Default; heuristic + lookahead; stochastic                     |
| `StochasticSwap` | Sampled swap patterns (legacy)                                 |
| `BIPMapping`     | Binary integer programming for optimal on small circuits       |

**Commutation-aware routing:** Modern transpilers reorder commuting gates (e.g., all Rz on the same qubit commute; CNOTs on disjoint qubits commute) to reduce the effective distance before inserting SWAPs.

**Qiskit:**
```python
from qiskit import QuantumCircuit, transpile
from qiskit.transpiler import CouplingMap, PassManager
from qiskit.transpiler.passes import SabreSwap, TrivialLayout, FullAncillaAllocation, ApplyLayout

# Fake linear 5-qubit coupling
cm = CouplingMap.from_line(5)

qc = QuantumCircuit(5)
qc.cx(0, 4)  # forbidden on linear chain — needs routing
qc.cx(1, 3)

pm = PassManager([
    TrivialLayout(cm),
    FullAncillaAllocation(cm),
    ApplyLayout(),
    SabreSwap(cm, heuristic="decay", trials=5),
])
routed = pm.run(qc)
print(routed.count_ops())  # now has cx + swap on valid edges only

# Or just use preset
t = transpile(qc, coupling_map=cm, optimization_level=3)
```

**Reducing SWAPs at the algorithm level:**
- Use **nearest-neighbor ansätze** (linear, ring entanglement) rather than all-to-all.
- Prefer algorithms with local structure (QAOA on a lattice problem matches the device).
- Compose CNOTs so commuting families can be reordered.
- For iterative workloads, **re-layout** between iterations using the final layout from the previous run (`layout_method="sabre", routing_method="sabre"`).

**Measurement of overhead:** Compare `transpiled.count_ops()["cx"]` before/after — typical near-term circuits incur 2–5× CNOT expansion from routing alone on heavy-hex.

**Rule of thumb:** SWAPs are 3 CNOTs you didn't ask for — the routing pass's job is to keep that multiplier small; the algorithm designer's job is to keep the ideal circuit shallow in the first place.
