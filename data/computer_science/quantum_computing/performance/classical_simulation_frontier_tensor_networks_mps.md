### Classical Simulation Frontier — Tensor Networks, MPS and PEPS

**What it is:**
Tensor networks (TNs) are the state-of-the-art **classical** method for simulating quantum circuits whose entanglement is bounded. A Matrix Product State (MPS) represents an `n`-qubit state as a chain of rank-3 tensors with bond dimension `χ`; PEPS extends this to 2D grids. They define the **classical frontier** against which quantum advantage must be measured: a circuit is quantum-advantageous only when no TN with tractable `χ` can simulate it.

**Key scaling — MPS:**
```
Parameters:          O(n · d · χ²)          d = 2 for qubits
Storage:             O(n · χ²) complex numbers
1Q gate:             O(χ²) cost
2Q gate on neighbors: O(χ³)   + SVD truncation to χ
Non-neighbor 2Q:     O(L · χ³) where L = SWAP distance
```
For a faithful representation, `χ` must scale with the **Schmidt rank across every cut**. In the worst case, `χ ~ 2^(n/2)` — exponential, no savings.

**When MPS works (area-law regime):**
- **Shallow circuits:** depth `D < O(log n)` → entanglement is bounded → `χ = poly(n)` suffices.
- **1D systems:** ground states of gapped local Hamiltonians obey the area law: `χ = O(1)`.
- **Low-temperature local dynamics:** entanglement grows at most linearly with time; MPS tracks up to `t ~ log(χ)`.
- **Clifford-like circuits augmented with a few non-Clifford gates.**

**When MPS fails (volume-law regime):**
- **Random deep circuits** (XEB/QV ones): entanglement saturates at `n/2`, forcing `χ = 2^(n/2)`.
- **Global quench dynamics** past the light-cone time.
- **Highly connected 2D systems:** even PEPS contraction is `#P-hard` in general; approximate contraction is `O(χ^{O(n)})`.

**Reference points — what's classically feasible today:**
| Circuit class | Hard limit on `(n, depth)` (approx.) |
|---|---|
| 1D TEBD / MPS-TDVP | n = 10⁴, depth = 10³ (local, χ ≈ 10³) |
| 2D PEPS (approx. contraction) | n = 100–1000, shallow |
| Tree tensor networks | Hierarchical states up to ~100 qubits |
| Google Sycamore 53-qubit random-circuit | Originally "supremacy"; now simulable in hours–days by SOTA tensor networks |
| IBM 127-qubit Ising Trotter (Kim 2023) | Matched within 48h by TN/neural-net methods |

**Example — MPS approximation with quimb:**
```python
import numpy as np
import quimb.tensor as qtn

n = 20
mps = qtn.MPS_computational_state('0' * n)     # |0…0⟩ with χ = 1
for depth in range(5):
    for i in range(n):                         # random single-qubit
        U = qtn.gen.rand.rand_iso(2, 2)
        mps.gate_(U, i, contract='swap+split')
    for i in range(0, n - 1, 2):               # entangling layer
        mps.gate_(qtn.gen.rand.rand_iso(4, 4).reshape(2, 2, 2, 2),
                  (i, i + 1), contract='swap+split', max_bond=64)
print("Max bond dim:", mps.max_bond())
print("Bond dims:", [mps.bond_size(i, i + 1) for i in range(n - 1)])
```

**Bond dimension ↔ entanglement:**
```
S_A = −Tr[ρ_A log ρ_A] ≤ log_2(χ)
```
So `χ = 2^S_A`. For `S_A = 30` (typical for a mid-cut in a deep random 60-qubit circuit), `χ = 10^9` — infeasible.

**Pauli-path / weight-based methods (related frontier):**
For **noisy** circuits, low-weight Pauli paths dominate; classical cost scales polynomially with `n` at fixed noise and truncated weight. This has closed the gap on several "advantage" claims; see the `pauli_path_stabilizer_rank_noisy_simulation.md` cheatsheet.

**Implications for benchmarking:**
- Any claim of quantum advantage must show a circuit where `χ` required exceeds classical memory **and** Pauli-path expansions do not collapse.
- Volumetric region `width × depth` where MPS is feasible defines the "no-go" zone for quantum-advantage claims.
- Expressive ansätze for VQAs that are classically simulable via low-`χ` MPS deliver no quantum advantage even if trainable.

**Pitfalls:**
- `χ` growth is non-monotone: SVD truncation can be tight even when worst-case says otherwise.
- 2D vs. 1D: using MPS on a 2D problem requires long-range SWAPs → effective `χ` blows up exponentially in circumference.
- Reporting "bond dimension used" without specifying truncation error misleads — always report truncation `ε` alongside `χ`.
- PEPS exact contraction is `#P-hard`; only approximate contraction is practical.

**Rule of thumb:** If a circuit can be simulated by an MPS with `χ ≤ 10⁴` at truncation `ε ≤ 10⁻⁶`, it is not a quantum-advantage candidate; genuine advantage requires volume-law entanglement plus robustness against Pauli-path collapse under device noise.
