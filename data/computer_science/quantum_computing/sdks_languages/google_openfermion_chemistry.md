### Google OpenFermion — Fermion-to-Qubit Mappings for Chemistry

**What it is:**
OpenFermion is Google's library for representing and manipulating **second-quantized fermionic operators** (electrons in molecular orbitals) and converting them into qubit operators that a quantum computer can actually run. Every chemistry workflow — VQE, QPE, UCCSD, HF initial states — starts by writing the electronic-structure Hamiltonian as a sum of fermion creation/annihilation products and then choosing a mapping to Pauli strings. OpenFermion owns that pre-step.

**Core objects:**

| Object | Role |
|---|---|
| `FermionOperator('2^ 0', 1.5)` | Weighted fermion term; `^` = creation, bare index = annihilation |
| `MolecularData` | Molecule record (geometry, basis, integrals) |
| `InteractionOperator` | Coefficient-tensor form of the electronic Hamiltonian |
| `QubitOperator('X0 Z1', 0.7)` | Output: weighted Pauli string |

**The three mappings:**

| Mapping | Locality | Qubits for N modes | Typical use |
|---|---|---|---|
| Jordan–Wigner (JW) | Non-local Z-string on every op | N | Default, easy to reason about |
| Bravyi–Kitaev (BK) | `O(log N)` weight per op | N | Lower gate count at depth |
| Parity | Non-local but Z2-symmetry-friendly | N (often N−2 w/ tapering) | Reduces qubits via symmetry |

JW is the textbook choice; BK tends to cut two-qubit gate counts by 30–50% on deep circuits; parity + Z2 tapering is what chemistry papers use to squeeze H2 / LiH onto 2–4 qubits.

**API shape:**
```python
from openfermion import FermionOperator, jordan_wigner, bravyi_kitaev

# H = 0.5 * a_2^dagger a_0  +  h.c.
fop = FermionOperator('2^ 0', 0.5) + FermionOperator('0^ 2', 0.5)

qop_jw = jordan_wigner(fop)        # QubitOperator in Pauli basis
qop_bk = bravyi_kitaev(fop, n_qubits=4)

print(qop_jw)
# 0.25 [X0 Z1 X2] + 0.25 [Y0 Z1 Y2]
```

**Typical chemistry workflow:**
```python
from openfermion import MolecularData, get_fermion_operator
from openfermionpyscf import run_pyscf

mol = MolecularData([('H', (0, 0, 0)), ('H', (0, 0, 0.74))], 'sto-3g', 1, 0)
mol = run_pyscf(mol, run_scf=True, run_fci=True)
ham_ferm = get_fermion_operator(mol.get_molecular_hamiltonian())
ham_qubit = jordan_wigner(ham_ferm)
# ham_qubit is now a SparsePauli-like object ready for VQE/Estimator
```

**Handoff to other SDKs:**
- Qiskit Nature wraps OpenFermion-style conversions via `qiskit_nature.mappers.JordanWignerMapper`; you can also export a `QubitOperator` and rebuild a `SparsePauliOp` term-by-term.
- PennyLane provides `qml.qchem.molecular_hamiltonian` which internally uses OpenFermion's mapping machinery.
- Braket users convert via `qubit_op_to_pennylane()` or by serializing to Pauli strings and rebuilding in `braket.circuits.observables.Observable`.

**When to use:**
- Any electronic-structure problem where you need to go from integrals → qubit Hamiltonian with full control over the mapping.
- When you want to try BK vs. JW ablation studies; OpenFermion is the only library that exposes all three cleanly.
- When you need exact reference energies via `eigenspectrum(qop)` for a tiny Hamiltonian.

**Pitfalls:**
- Mixing `FermionOperator` ordering conventions with external integrals — OpenFermion uses physicist's ordering `(pq|rs)`; some libraries export chemist's `[pq|rs]`.
- `jordan_wigner(fop)` defaults `n_qubits` to the highest index used — if your operator is symmetric but sparse, pass `n_qubits=` explicitly or tapering later will mismatch.
- Dropping the Hermitian conjugate: most fermion integrals are listed as one half of a conjugate pair; build with `+ hermitian_conjugated(fop)` before mapping.
- BK operators are harder to simulate classically — the sparsity pattern scrambles across modes.

**Rule of thumb:** Treat OpenFermion as the mandatory pre-stage for any chemistry circuit — write the problem as a `FermionOperator`, pick a mapping, then hand the resulting `QubitOperator` to whichever SDK will execute (Qiskit, Cirq, PennyLane). Never hand-roll Pauli Hamiltonians for molecules.
