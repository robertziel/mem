### Chemistry Ground-State Simulation — Molecular Hamiltonians on a QPU

**Problem:** Compute the electronic ground-state energy `E_0` (and optionally excited states) of a molecule `M` with `N_e` electrons in `N_o` spatial orbitals. Accuracy target: **chemical accuracy** (`≈ 1 kcal/mol ≈ 1.6 mHa`), enough to predict reaction rates via Arrhenius.

**Quantum formulation:** Start from the second-quantized electronic Hamiltonian
`H = Σ_{pq} h_{pq} a_p† a_q + ½ Σ_{pqrs} h_{pqrs} a_p† a_q† a_r a_s`.
One- and two-electron integrals `h_{pq}, h_{pqrs}` come from a classical Hartree–Fock pre-run (PySCF, Psi4). Map fermions → qubits:

| Mapping | Qubits | Locality of Paulis |
|---|---|---|
| Jordan–Wigner | `N` (= `2 N_o`) | `O(N)` per term |
| Parity (+ tapering) | `N − 2` | `O(N)` |
| Bravyi–Kitaev | `N` | `O(log N)` |

Run **VQE** (shallow, NISQ) or **QPE / QSP** (deep, fault-tolerant) on the resulting qubit operator.

**Expected speedup:** Exponential *potential* vs. exact classical diagonalization (FCI scales as `N!`). Against polynomial heuristics (CCSD(T), DMRG, AFQMC), the quantum advantage is *regime-dependent* — strong-correlation regimes (transition-metal multi-reference systems, biradicals, conical intersections) are where classical methods fail hardest and quantum wins in principle. For single-reference, closed-shell organics, CCSD(T) is hard to beat.

**Key insight:** The wavefunction of `N` correlated electrons lives in a Hilbert space of dimension `(N_orb choose N_e)` — exponential in `N_orb`. A QPU stores this state in `N` qubits linearly; the rest is a matter of (a) preparing a good guess and (b) measuring the relevant observable. The variational principle `E(θ) ≥ E_0` turns every quantum sample into a strict upper bound, so imperfect circuits still give certified answers — a property classical variational methods share.

**Status 2026 (concept-level):** Small-molecule VQE demos are routine; *utility-scale* chemistry (FeMoco nitrogenase active site — the biological nitrogen-fixation catalyst — or cytochrome P450 drug-metabolism clusters) is a flagship target for **early fault-tolerant** QPUs (logical qubits, magic-state factories). No verified quantum advantage over classical tensor-network methods for industrially relevant accuracy yet; resource estimates put FeMoco ground state at `~10^6–10^8` T-gates.

**Qiskit / OpenFermion snippet (build qubit Hamiltonian for H₂O):**
```python
from pyscf import gto, scf
from qiskit_nature.second_q.drivers import PySCFDriver
from qiskit_nature.second_q.mappers import JordanWignerMapper, ParityMapper

driver = PySCFDriver(atom="O 0 0 0; H 0 0.757 0.587; H 0 -0.757 0.587",
                     basis="sto-3g")
problem = driver.run()                              # Hartree-Fock + integrals
fermionic_op = problem.hamiltonian.second_q_op()    # a_p† a_q ...

mapper = ParityMapper(num_particles=problem.num_particles)  # 2-qubit reduction
qubit_op = mapper.map(fermionic_op)
print("qubits:", qubit_op.num_qubits, "Paulis:", len(qubit_op))
```

**Algorithm trade-off:**
| Method | Depth | Shots | Guarantees |
|---|---|---|---|
| VQE (NISQ) | shallow | many | variational bound, no proof of convergence |
| QPE (fault-tolerant) | deep | 1 per bit of precision | exact to `t` bits given eigenstate overlap |
| Qubitization / QSP | deep, optimal | — | asymptotically best scaling in `ε` and `‖H‖` |
| Krylov / quantum subspace | moderate | many | basis-expansion bound, no variational monotonicity |
| Quantum imaginary-time evolution | moderate | many | cools into ground state, probabilistic |

**Active-space workflow:** (i) classical SCF / HF → MO coefficients, (ii) pick active orbitals (chemical intuition + CASSCF), (iii) build integrals `h_{pq}, h_{pqrs}` over the active space, (iv) fermion-to-qubit map, (v) tapering by `Z₂` symmetries (often `−2` qubits for spin, `−2` for particle number), (vi) run VQE or QPE. Active-space truncation is the *dominant approximation*; the qubit Hamiltonian inherits that error floor no matter how precisely it is minimized.

**When to reach for which algorithm:** VQE for prototyping on NISQ with `< 30` qubits and chemistry-accurate small molecules; QPE once logical qubits and magic-state budgets exist (fault-tolerant era); quantum Krylov / subspace methods as a middle ground (NISQ-feasible, systematic convergence); imaginary-time evolution for ground-state cooling without variational parameters.

**Resource estimate anatomy (rough):** gate count `~O(N^4 · 1/ε)` for naive qubitization, `~O(N^4 · log(1/ε))` with low-rank factorization of the two-electron tensor. Logical qubits scale linearly with active-space size; physical qubits multiply by surface-code overhead (`~10^3–10^4` per logical qubit at reasonable distance). The factor-of-10 improvements in double-factorized / tensor-hypercontracted Hamiltonians over the last decade moved FeMoco from "hundreds of years" to "hours" on a future fault-tolerant QPU.

**Pitfalls:**
- **Basis-set truncation dominates error** at small `N_o` — a "converged" VQE in STO-3G is still far from experiment. Active-space selection (CASSCF) is the first half of the problem; the QPU only sees the active-space Hamiltonian.
- **State preparation:** QPE needs non-trivial overlap with the true ground state; Hartree–Fock fails for multi-reference molecules. Remedies: use CISD/CASCI warm start, or variational state preparation before QPE.
- **Measurement overhead:** `O(N^4)` Pauli terms; grouping into commuting cliques (qubit-wise commuting, fully commuting via Clifford rotations) and classical shadows are essential to bring shot counts below the `ε^{-4}` worst case.
- **Symmetry breaking** of the ansatz (spin `S²`, particle number, point-group irreps) can silently give non-physical states. Penalty terms or symmetry-preserving ansätze (ParticleHoleMapper, spin-adapted UCCSD) are mandatory for chemistry-accurate results.
- **Trotter error vs. gate count** trade-off in QPE: higher-order Trotter schemes cut error but blow up depth; qubitization / QSP is the asymptotically cleaner approach but harder to implement on NISQ.

**Rule of thumb:** For ground-state chemistry, pick **VQE + active space** on NISQ to explore structure, but commit to **QPE / qubitization** in resource estimates for any claim of real-world advantage — strong correlation (FeMoco, P450) is where the quantum win, if any, will first appear.
