### Routing & Logistics — VRP / TSP as QUBO

**Problem:** Route a fleet of vehicles (or a single traveller) through a set of `N` locations minimizing total distance / time, subject to capacity, time-window, and precedence constraints. **TSP** is the single-vehicle special case; **VRP / CVRP / VRPTW** add capacity and time windows. NP-hard in general.

**Quantum formulation:** Binary decision variables `x_{i,t} ∈ {0,1}` = "vertex `i` visited at position `t`" (or `x_{i,j} ∈ {0,1}` = "edge `(i,j)` taken"). Objective plus penalty terms → QUBO:
`H = Σ_{i,j,t} d_{ij} x_{i,t} x_{j,t+1}` (distance)
`+ λ_1 Σ_i (Σ_t x_{i,t} − 1)^2` (each city visited once)
`+ λ_2 Σ_t (Σ_i x_{i,t} − 1)^2` (one city per step)
`+ λ_3 · capacity_violation(x)^2` (VRP only).
Solve via **QAOA**, quantum annealing, or hybrid solvers (CQM / HSS on annealers; warm-start QAOA from LKH).

**Expected speedup:** No proven speedup. Reality: Concorde and LKH solve TSP to optimality on tens of thousands of cities; QAOA at achievable depths does not match them. The quantum angle is (a) *sampling diverse good solutions* under dynamic constraints, (b) instances where penalty structure matches QAOA's symmetries, and (c) long-term fault-tolerant Grover-type quadratic lifts for structured search.

**Key insight:** VRP's hardness is almost entirely in the *constraints*, not the objective. Classical MILP pays branch-and-bound overhead for every new constraint type; QUBO pays a penalty term but keeps the solver structure uniform. If you can tune penalties cheaply (classical warm-up), the quantum formulation trades flexibility for guaranteed optimality — a legitimate engineering trade for dynamic re-planning workloads.

**Status 2026 (concept-level):** Verified advantages exist in domain X = small, heavily-constrained VRP instances where classical MILP struggles on constraint encoding but QAOA's penalty QUBO handles them uniformly. Production logistics (UPS, Maersk-scale fleets) stays classical. Annealers solve up to hundreds of variables with hybrid decomposition; gate-model QAOA stays in the tens-to-hundreds range on current hardware. The realistic near-term value is *sample diversity* under dynamic constraints, not raw optimality.

**QUBO formulation snippet (TSP with position encoding):**
```python
from qiskit_optimization.applications import Tsp
from qiskit_optimization.converters import QuadraticProgramToQubo
import networkx as nx

G = nx.complete_graph(4)
for u, v in G.edges():
    G[u][v]["weight"] = 1 + abs(u - v)          # toy distances

tsp = Tsp(G)
qp  = tsp.to_quadratic_program()                # with one-hot constraints
qubo = QuadraticProgramToQubo().convert(qp)     # penalty-folded QUBO
print("variables:", qubo.get_num_binary_vars(),
      "Ising qubits:", qubo.get_num_binary_vars())
```

**Quantum vs. classical trade-off:**
| Aspect | Classical (LKH, Concorde, MILP) | Quantum (QAOA, annealer) |
|---|---|---|
| Symmetric TSP optimality | to 10⁴+ cities | toy instances |
| Hard constraints | dedicated branch-and-cut | uniform penalty encoding |
| Dynamic / stochastic | re-optimization | sample a distribution |
| Qubit / variable count | n/a | `N²` for position encoding |
| Multi-objective (distance + CO₂ + fairness) | weighted sum, Pareto scan | single QUBO with penalties |

**Related combinatorial siblings:** Hamiltonian cycle (decision version of TSP), capacitated vehicle routing with time windows (CVRPTW), pickup-and-delivery problem, dial-a-ride — all map to the same QUBO skeleton with different penalty sets. A QAOA pipeline that handles one handles the family with swap-in penalty modules.

**Engineering template for a quantum routing pilot:** (1) collect real operational instances (not synthetic grids), (2) solve classically with LKH-3 to establish a baseline and a warm-start solution, (3) formulate QUBO with edge encoding and per-constraint penalties, (4) initialize QAOA `(γ, β)` by transfer from concentrated parameter clusters published for the instance class, (5) evaluate on sample diversity and constraint-satisfaction rate, not just best-found cost. Skip any step and the comparison becomes misleading.

**Pitfalls:**
- **Qubit explosion:** position encoding uses `N²` qubits; edge encoding uses `N²` but with better locality. Flow-based LP relaxations don't map cleanly to QUBO. Higher-order binary optimization (HOBO) reformulations cut qubits but need quadratization.
- **Penalty tuning dominates:** set `λ` too low → infeasible solutions; too high → flat landscape. Needs classical warm-start; penalty ladder and augmented Lagrangian techniques help.
- **Distance precision:** float costs `d_{ij}` become integer approximations — don't lose the scale. Cost range drives QAOA γ parameters, so a badly scaled QUBO is hard to optimize.
- **Feasibility repair** after QAOA is often the real work; pair with classical post-processing (2-opt, Or-opt, LKH-3 local search). A "quantum" solution is typically the seed for classical polishing.
- **Time windows and pickup-delivery** pairs explode penalty count — consider constraint-preserving mixers (XY-mixer on one-hot permutation variables) at the cost of depth.
- **Dynamic re-optimization** (traffic, new orders) is where sampling-based QAOA has its best narrative — generate diverse good solutions rather than resolve from scratch.

**Rule of thumb:** TSP/VRP QAOA is an *interface* between combinatorial optimization and a QPU — useful for learning, for structured-constraint instances, and for hybrid sampling; not a head-to-head replacement for LKH on real fleets.
