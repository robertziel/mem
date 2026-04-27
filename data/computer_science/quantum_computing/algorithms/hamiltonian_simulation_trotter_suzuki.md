### Hamiltonian Simulation — Trotter–Suzuki Product Formulas

**What it is:** The workhorse technique for simulating time evolution `e^(-iHt)` on a quantum computer when `H = Σ_k H_k` decomposes into easy-to-exponentiate terms. Approximates the full exponential by interleaving short time-steps of each term:

`e^(-iHt) ≈ (Π_k e^(-i H_k t/r))^r`

**Math:** For `r` Trotter steps over time `t`:
- **First-order (Lie–Trotter):** `e^(-iHt) = (Π_k e^(-i H_k t/r))^r + O(t² [H_j, H_k] / r)`. Error scales as `O(t² / r)`; halving error doubles `r`.
- **Second-order (Strang):** symmetric split `S_2(t/r) = Π_k e^(-i H_k t/2r) Π_k reversed e^(-i H_k t/2r)`. Error `O(t³ / r²)`.
- **Order `2k` (Suzuki recursion):** error `O(t^(2k+1) / r^(2k))`. Gate cost grows as `5^(k-1)` per step — diminishing returns past `k = 2` or `3`.

**When to use:**
- Quantum chemistry (electronic-structure Hamiltonians in Jordan–Wigner / Bravyi–Kitaev form).
- Lattice models (Hubbard, Heisenberg, Ising).
- Any `H = Σ H_k` with polynomially many local terms.

**Qiskit Nature code:**
```python
from qiskit_nature.second_q.mappers import JordanWignerMapper
from qiskit_nature.second_q.hamiltonians import FermiHubbardModel
from qiskit.synthesis import SuzukiTrotter
from qiskit.circuit.library import PauliEvolutionGate

H_op = JordanWignerMapper().map(FermiHubbardModel.uniform_parameters(
    lattice=..., uniform_interaction=1.0, uniform_onsite_potential=0.0
).second_q_op())

t, order, reps = 1.0, 2, 10
evo = PauliEvolutionGate(H_op, time=t,
                         synthesis=SuzukiTrotter(order=order, reps=reps))
# Error bound: ||e^(-iHt) - evo|| = O(t^(order+1) / reps^order)
```

**Order vs cost trade-off:**

| Order `2k` | Error scaling | Gates per step |
|---|---|---|
| 1 (Lie) | `O(t² / r)` | `L` (one pass over terms) |
| 2 (Strang) | `O(t³ / r²)` | `2L` |
| 4 | `O(t⁵ / r⁴)` | `10L` |
| 6 | `O(t⁷ / r⁶)` | `50L` |

where `L` is the number of Hamiltonian terms.

**Choosing `r` from an error target `ε`:** For order-`2k` Suzuki with `L` terms and norm `Λ = max ‖H_k‖`:

`r ≳ (t · Λ · L)^(1+1/2k) · ε^(-1/2k)`

A chemistry Hamiltonian with `L = 10^4` terms, `t = 1`, `ε = 10^{-3}` at order 2 gives `r ~ 10^6` — millions of Trotter steps. Commuting-clique grouping typically cuts `L` by 10–100×, a huge saving.

**qDRIFT alternative:** Instead of a deterministic product, sample `H_k` with probability `‖H_k‖ / Λ` and evolve by `U = e^{-i H_k τ}`. Gate count scales with `‖H‖²` (L1-norm squared) rather than `L · Λ` — better for chemistry where most terms are small.

**Pitfalls:**
- Commuting terms: if `[H_j, H_k] = 0`, their exponentials *factor exactly* — group commuting cliques before ordering; this is free accuracy. Colouring the interaction graph is standard preprocessing.
- Ordering matters at finite `r` — randomized (qDRIFT) or optimally ordered sequences beat naïve order by constants (and sometimes asymptotically for chemistry).
- Higher-order formulas have *negative* time steps internally; physical interpretability is lost.
- For long `t`, post-Trotter methods (qubitization, LCU, QSVT) scale better: `O(t + log(1/ε))` vs Trotter's `O(t^(1+1/2k))`.
- Trotter error bounds based on operator norms are often wildly loose — empirical errors (measured on a classical simulator) are typically 10–100× smaller and are what to budget from.

**Rule of thumb:** For short-to-medium times and NISQ hardware, Trotter is still the best choice — start with order 2, then bump order only if gate budget allows. For fault-tolerant regimes or very long evolutions, switch to qubitization / QSVT.
