### Adiabatic Quantum Computation — Evolve Along a Gap

**What it is:** A model of quantum computation that solves problems by slowly evolving a system from the ground state of an easy Hamiltonian `H_0` to the ground state of a problem Hamiltonian `H_P` whose ground state encodes the answer. Computation = Hamiltonian interpolation, not gate sequencing.

**Math:** Define `H(s) = (1-s) H_0 + s H_P` with schedule `s: [0, T] → [0, 1]`. The *adiabatic theorem* says: if evolution is slow relative to the instantaneous spectral gap `Δ(s)` between ground and first excited state, the system stays in the ground state. Required runtime:

`T ≳ max_s ‖∂_s H‖ / Δ(s)² ∝ 1 / Δ_min²`

So AQC runtime is dominated by the **minimum gap** across the path. Exponentially small gaps → exponential runtime (this is why many NP-hard instances don't get a speedup).

**Equivalence:** Aharonov et al. 2007 proved AQC is polynomially equivalent to gate-model QC — any BQP problem can be solved adiabatically with polynomial overhead, and vice versa. So AQC isn't weaker in principle; it's just a different programming model.

**When to use:**
- Natural fit for QUBO / Ising problems where `H_P = Σ J_ij s_i s_j + Σ h_i s_i`.
- Quantum annealing heuristics (D-Wave style) where you don't insist on the adiabatic bound — close enough to ground state often suffices.
- Research on gap structure, quantum phase transitions.

**Code (schedule sketch):**
```python
import numpy as np
from scipy.linalg import expm

def adiabatic_evolve(H0, HP, T, steps=1000):
    dt = T / steps
    psi = ground_state(H0)                      # start in GS of H0
    for k in range(steps):
        s = (k + 0.5) / steps
        H = (1 - s) * H0 + s * HP
        psi = expm(-1j * H * dt) @ psi          # slow Trotter-free evolution
    return psi                                   # ≈ GS of HP if T >> 1/Δ_min²

# on gate-model hardware: Trotterize the H(s) evolution
# on D-Wave: program couplings, set anneal schedule 'annealing_time' (μs)
```

**AQC vs QAOA:**

| Aspect | AQC | QAOA |
|---|---|---|
| Time model | Continuous `H(s)` | Alternating `U(H_P,γ) U(H_B,β)` layers |
| Parameters | Schedule shape `s(t)` | Discrete angles `(γ_i, β_i)` |
| Depth | Proportional to `T · ‖H‖` | `p` layers (small-p for NISQ) |
| Theoretical guarantee | Adiabatic theorem | Converges to optimum as `p → ∞` |
| Hardware | Annealers (D-Wave), gate-model (Trotterized) | Gate-model only |
| Classical analogue | Simulated annealing | — |

**Example: 3-SAT via AQC.** Encode a 3-SAT instance as `H_P = Σ_c P_c` where each clause Hamiltonian `P_c` projects onto the violating assignment. Start in the uniform superposition (ground state of `H_0 = -Σ_i X_i`). Adiabatic evolution finds the satisfying assignment if one exists. For random 3-SAT at the SAT/UNSAT threshold, the minimum gap scales as `Δ_min ~ 2^{-c√n}` — no exponential speedup, but often a polynomial one over simulated annealing.

**Schedule shape matters:** Linear `s(t) = t/T` is the default; optimized schedules spend more time crossing the minimum-gap region (slower near `s*`) and can gain polynomial factors. Counterdiabatic driving adds a term `H_CD ~ ∑ |ṡ|/Δ · L_j` that cancels diabatic transitions — pays off when the gap is known, too expensive otherwise.

**Gap scaling archetypes:**

| Problem structure | `Δ_min` behavior | AQC runtime |
|---|---|---|
| Unstructured search (Grover-AQC) | `Δ ~ 1/√N` | `T ~ √N` (matches Grover) |
| Easy instances (polynomial gap) | `Δ ~ 1/poly(n)` | `T ~ poly(n)` |
| First-order phase transition | `Δ ~ e^{-c n}` | `T ~ e^{c n}` (no speedup) |
| Second-order phase transition | `Δ ~ 1/poly(n)` | `T ~ poly(n)` (polynomial speedup possible) |

**Pitfalls:**
- Gap analysis is hard — minimum gap is often unknown analytically; estimating it is the core difficulty.
- First-order quantum phase transitions (frustrated systems) give exponentially small gaps, killing speedups.
- D-Wave's annealers are *not* provably adiabatic — they're heuristic thermal-quantum annealers. Benchmarks against classical solvers are nuanced.
- Diabatic / counterdiabatic driving (shortcuts to adiabaticity) can beat the adiabatic bound but require knowing excited states.
- Mapping real problems to Ising Hamiltonians typically needs `O(n²)` couplings for `n` logical variables — graph-minor embedding on physical Chimera/Pegasus graphs can multiply qubit count by 5–20×.

**Rule of thumb:** D-Wave machines are AQC-style analog devices, **not gate-based QCs** — they can't run Shor's, can't do QEC, but can sometimes sample from hard Ising distributions faster than classical MCMC. Don't confuse "quantum annealer" with "universal quantum computer."
