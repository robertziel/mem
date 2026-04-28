### Simulated Annealing (Metropolis criterion, temperature, cooling schedule, metaheuristic)

**When:** find a "good" solution to a hard combinatorial / continuous optimization problem when **exact methods are too slow** and **gradient is unavailable** — TSP, scheduling, VLSI placement, satellite tasking, hyperparameter tuning. Probabilistic local search that **occasionally accepts worse solutions** to escape local optima.

**Schema:**

| Concept | Detail |
|---|---|
| State `s` | Current solution |
| Energy `E(s)` | Cost (lower = better; minimize like physics analog) |
| Neighbor `s'` | Small perturbation of `s` |
| Temperature `T` | Decreases over iterations; controls willingness to accept worse moves |
| Acceptance | Always accept if `ΔE < 0`; else accept with probability `exp(−ΔE / T)` (Metropolis criterion) |
| Cooling schedule | How `T` decreases: geometric (`T ← α·T`), linear, log, adaptive |

> **At high `T`**, almost any move is accepted — exploration. **At low `T`**, only improvements are accepted — exploitation. Slow cooling = better solutions, more time.

#### Implementation

```python
import math, random

def simulated_annealing(initial, energy, neighbor, T0=1.0, T_min=1e-3, alpha=0.995, max_iter=10**5):
    s = initial
    E = energy(s)
    best, best_E = s, E
    T = T0
    for _ in range(max_iter):
        if T < T_min: break
        s_new = neighbor(s)
        E_new = energy(s_new)
        dE = E_new - E
        if dE < 0 or random.random() < math.exp(-dE / T):
            s, E = s_new, E_new
            if E < best_E: best, best_E = s, E
        T *= alpha                                   # geometric cooling
    return best, best_E
```

#### Cooling schedules

| Schedule | Formula | Notes |
|---|---|---|
| **Geometric** | `T_{k+1} = α · T_k` (`α ∈ [0.8, 0.999]`) | **Default**; `α = 0.995` is common |
| Linear | `T_k = T_0 − k · ε` | Often too fast |
| Logarithmic | `T_k = T_0 / log(k + c)` | Theoretical convergence guarantee, very slow |
| Adaptive | Adjust `T` based on acceptance ratio | Aim for ~30–50% acceptance early |
| Restart | Reset `T` to `T_0` periodically | Escape persistent valleys |
| Cauchy / Boltzmann | Specific schedules with theoretical claims | Specialized |

#### Choosing parameters

| Parameter | Heuristic |
|---|---|
| `T_0` | Set so initial acceptance ratio of bad moves is ~80% — sample some random moves and back-compute |
| `T_min` | Very small (1e−3 to 1e−6) |
| `α` | 0.99 to 0.999 — slower = better |
| Iters per `T` | Often run multiple moves at each temperature |
| Restarts | Useful for rugged landscapes |

#### Neighbor design (problem-specific)

| Problem | Typical neighbor |
|---|---|
| **TSP** | 2-opt swap (reverse a segment); 3-opt; or-opt |
| Scheduling | Swap two jobs; move one job |
| VLSI placement | Swap two cells; rotate; relocate |
| Continuous optimization | Add Gaussian perturbation to one coordinate |
| Graph coloring | Reassign one vertex's color |
| Bin packing | Move item between bins; swap items |
| Sudoku / N-queens | Swap two cells in a row / change one position |

> **Neighbor design is more important than the SA loop**. Small, smooth changes converge better than huge random jumps.

#### Variants

| Variant | What |
|---|---|
| **Threshold accepting** | Accept if `ΔE < threshold` (deterministic) |
| **Tabu search** | Maintain "recently moved" memory; avoid undoing |
| **Great deluge** | Accept any move below a slowly rising water level |
| **Simulated tempering** | Treat `T` as a state; jump between temperatures |
| **Parallel tempering / replica exchange** | Multiple replicas at different `T` exchange states |
| **Quantum annealing** | D-Wave; uses quantum tunneling instead of random thermal moves |
| **Genetic / evolutionary algorithms** | Different metaheuristic; population-based instead of trajectory-based |

#### Simulated annealing vs alternatives

| Need | Use |
|---|---|
| Rugged landscape, escape local minima | **SA** |
| Smooth, differentiable | **Gradient descent** (Adam) |
| Population-based search | **Genetic algorithms** / CMA-ES |
| Convex problem | LP / convex solver |
| NP-hard exact for small n | **Branch and bound** / DP |
| Many local search steps + memory | **Tabu search** |
| Continuous, gradient-free | **CMA-ES**, Bayesian optimization |
| Combinatorial with strong heuristic | **Greedy + local search** first; SA as polish |

#### Use cases

| Application | Detail |
|---|---|
| Traveling Salesman Problem | 2-opt neighbor; classic SA showcase |
| VLSI cell placement | Industry-standard for chip design |
| Job-shop scheduling | Move + swap operations |
| Sudoku solving | Cell-swap neighbor |
| Graph layout (force-directed) | SA on energy = edge length + overlap penalty |
| Protein folding | Energy landscape minimization |
| Hyperparameter tuning | When grid search is too coarse |
| Image quantization | Color palette + assignment |
| Satellite imaging schedules | Constraint-heavy, NP-hard |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Cooling too fast | Stuck in local minimum; lower `α` (closer to 1) |
| Cooling too slow | Too much time; raise `α` or budget |
| Bad neighbor function | Tiny moves never escape, huge moves never refine |
| Forgetting to track `best` separately | Final state may be worse than mid-run; always remember the best |
| Comparing absolute energies across runs | They're stochastic — average across seeds |
| Using on convex / smooth problems | Gradient methods crush SA — use them |
| `T_0` too low | Behaves like greedy local search from the start |
| `T_0` too high | Random walk for ages |
| Single run | Always **multi-start** for hard problems |

#### Theoretical guarantee

With **logarithmic cooling** `T(k) = c / log(k + 2)` for big enough `c`, SA converges to the global optimum with probability 1. **Useless in practice** — way too slow. Geometric is the practical default.

#### Complexity

| Aspect | Cost |
|---|---|
| Per iteration | O(neighbor-evaluation cost) |
| Number of iterations | Problem-specific; 10⁴ to 10⁷ typical |
| Memory | O(state representation) — typically O(n) |
| Convergence | Probabilistic; not deterministic |

**Rule of thumb:** **SA = local search that occasionally accepts worse moves** to escape local minima. **Metropolis criterion** governs acceptance; **temperature decreases over time**. **Neighbor design matters more than the loop**. Use **geometric cooling** with `α ≈ 0.995`. Always **track best-seen separately**, **multi-start**, and **compare against simpler heuristics** (greedy + 2-opt) — sometimes SA isn't the best tool for the job.
