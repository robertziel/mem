### Warm Starts & Parameter Transfer — Seeding VQE/QAOA from Related Instances

**Pattern:** Instead of initializing `θ_0` randomly (which triggers barren plateaus and wastes shots), seed the variational optimizer with parameters obtained from a *cheaper* related instance: a smaller lattice, a classical approximation, a lower-depth ansatz, or a previously-solved neighbor in a parameter sweep. Warm-started angles land in a region of the loss surface where gradients are non-vanishing and convergence is `5–50×` faster.

**When to use:**
- QAOA where `(γ, β)` transfer across problem sizes — angles for `p`-layer MaxCut on `n=8` are excellent starts for `n=16`, `n=32`.
- VQE across bond-length sweeps in chemistry (the `θ*` for `R = 0.735 Å` is nearly optimal at `R = 0.75 Å`).
- Curriculum learning on ansatz depth: train `reps=1`, then append layer, re-train `reps=2` with earlier params frozen or lightly re-optimized.
- QAOA `p → p+1` extrapolation using INTERP / FOURIER heuristics.

**Sources of warm-start parameters:**
| Source | Example | Cost |
|---|---|---|
| Smaller problem instance | Optimized `θ*` on `n/2` qubits | solve once, reuse many |
| Classical surrogate | Tensor-network / DMRG / mean-field solution | polynomial |
| Neighbor in sweep | Previous bond length, previous `h` field | free if sweeping anyway |
| Lower-depth ansatz | `reps=r`, seed `reps=r+1` with zeros in new layer | free |
| QAOA INTERP / FOURIER | extrapolate `(γ,β)` curves from `p` to `p+1` | classical |

**Transfer across lattice sizes (QAOA concentration):**
Farhi et al. showed that optimal QAOA angles for random 3-regular MaxCut concentrate around problem-independent values as `n → ∞`. In practice: solve `p=3` on `n=12` classically, then *directly reuse* those 6 angles on `n=200` — cost drops from weeks of optimization to a single evaluation plus a few refinement steps.

**Example — curriculum warm start for QAOA:**
```python
import numpy as np
from scipy.optimize import minimize
# Stage 1: solve p=1 classically-small
x1 = minimize(obj_p1, x0=[0.1, 0.1], method="COBYLA").x          # (γ1, β1)

# Stage 2: warm-start p=2 by interpolation
x2_init = np.array([x1[0], x1[0], x1[1], x1[1]])                  # duplicate
x2 = minimize(obj_p2, x0=x2_init, method="COBYLA").x

# Stage 3: INTERP to p=3 (linear interp of angle schedule)
gammas = np.interp(np.linspace(0, 1, 3), np.linspace(0, 1, 2), x2[:2])
betas  = np.interp(np.linspace(0, 1, 3), np.linspace(0, 1, 2), x2[2:])
x3_init = np.concatenate([gammas, betas])
```

**VQE bond-length sweep pattern:**
```python
theta = np.random.uniform(-np.pi, np.pi, n_params)   # seed only once
for R in np.linspace(0.5, 2.5, 40):
    H = build_hamiltonian(R)
    res = minimize(lambda t: energy(H, t), x0=theta, method="COBYLA")
    theta = res.x                                    # warm-start next R
    curve.append((R, res.fun))
```

**Trade-offs:**
| Init strategy | Barren-plateau risk | Iters to converge | Problem-aware |
|---|---|---|---|
| Random uniform | high | `100–1000+` | no |
| Zero / identity-block | low (gradient vanishes) | fails to start | no |
| Classical surrogate | very low | `5–20` | yes |
| Neighbor transfer | very low | `2–10` | yes |
| Meta-learning (MAML) | lowest | `1–5` | yes (amortized) |

**Pitfalls:**
- **Symmetry-breaking transfers:** `θ*` from an unconstrained problem can violate symmetries in the new one (particle number, `Z_2`). Project back onto the allowed subspace.
- **Ansatz mismatch:** transferring angles across different entangler topologies is meaningless — keep the ansatz fixed.
- **Stale calibration:** warm starts from a *yesterday-run* QPU may be wrong today; re-fit on a few shots before trusting.
- **Over-confidence:** a warm start gets you to the nearest minimum, not necessarily the global one — still run a few random re-starts as a sanity check.

**Rule of thumb:** Never start VQE/QAOA from scratch if a cheaper instance is available — warm starts turn "hours of optimization per bond length" into "seconds per neighbor" and sidestep barren plateaus that would otherwise make scale-up impossible.
