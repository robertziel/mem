### HHL Algorithm — Quantum Linear Systems

**Problem:** Given a Hermitian matrix `A ∈ C^{N×N}` and a vector `b ∈ C^N`, solve `Ax = b` for `x`.

**Complexity:**
| Algorithm | Runtime |
|---|---|
| Classical (direct, e.g., LU) | `O(N^3)` |
| Classical (iterative, e.g., conjugate gradient) | `O(N s √κ log(1/ε))` |
| HHL (Harrow–Hassidim–Lloyd 2009) | **`O(log(N) · s² κ² / ε)`** |
| Improved (Childs–Kothari–Somma, Ambainis) | `O(log(N) · s κ · polylog(1/ε))` |

where `s` is sparsity (nonzeros per row), `κ = ‖A‖·‖A⁻¹‖` is the condition number, and `ε` is target error.

HHL is `O(log N)` in dimension — **exponentially faster** than any classical algorithm that outputs an explicit vector, but with enormous asterisks (see caveats).

**Quantum approach:**
1. **Prepare** `|b⟩ = Σᵢ bᵢ |i⟩` (state preparation — assumed available as an oracle `U_b|0⟩ = |b⟩`).
2. **QPE on `e^{iAt}`** using `|b⟩` as the eigenstate register. This writes `|b⟩ = Σⱼ βⱼ|uⱼ⟩` (eigendecomposition of `A`) into `Σⱼ βⱼ |uⱼ⟩|λ̃ⱼ⟩`.
3. **Controlled rotation on an ancilla** conditioned on `λ̃ⱼ`: produce `Σⱼ βⱼ|uⱼ⟩|λ̃ⱼ⟩ (√(1 − C²/λⱼ²)|0⟩ + (C/λⱼ)|1⟩)`.
4. **Uncompute QPE**, leaving `Σⱼ (βⱼ C / λⱼ) |uⱼ⟩|0...0⟩|1⟩` up to garbage.
5. **Post-select on ancilla = 1** (or amplitude-amplify it). The solution state is `|x⟩ ∝ A⁻¹|b⟩`.

**Qiskit sketch:**
```python
# Note: the classic qiskit_algorithms.linear_solvers.HHL was deprecated.
# Modern approach: build the three subroutines explicitly using Qiskit primitives.
from qiskit import QuantumCircuit
from qiskit.circuit.library import QFT, PauliEvolutionGate
from qiskit.quantum_info import SparsePauliOp

def hhl_skeleton(A_pauli: SparsePauliOp, U_b: QuantumCircuit, t_clock: int) -> QuantumCircuit:
    n = U_b.num_qubits
    qc = QuantumCircuit(n + t_clock + 1, 1)
    b_qubits = list(range(n))
    clock = list(range(n, n + t_clock))
    anc = n + t_clock

    qc.compose(U_b, qubits=b_qubits, inplace=True)          # |b⟩

    # QPE on e^{iAt}
    qc.h(clock)
    for k, q in enumerate(clock):
        evo = PauliEvolutionGate(A_pauli, time=2 ** k).control(1)
        qc.append(evo, [q] + b_qubits)
    qc.compose(QFT(t_clock, inverse=True, do_swaps=True), qubits=clock, inplace=True)

    # Controlled rotation on ancilla (C/λ via reciprocal circuit — non-trivial subroutine)
    # reciprocal_rotation(qc, clock, anc)

    # Uncompute QPE
    qc.compose(QFT(t_clock, do_swaps=True), qubits=clock, inplace=True)
    for k, q in reversed(list(enumerate(clock))):
        evo = PauliEvolutionGate(A_pauli, time=-(2 ** k)).control(1)
        qc.append(evo, [q] + b_qubits)
    qc.h(clock)

    qc.measure(anc, 0)                                       # post-select on outcome = 1
    return qc
```

**Key insight:** In the eigenbasis of `A`, inversion is division by the eigenvalue — trivial if you have the eigenvalue written on a register. QPE provides exactly that. The `O(log N)` in dimension comes from performing all of linear algebra entirely *inside* an `O(log N)`-qubit state space.

**The big caveats (why HHL is not a magic speedup):**
1. **Input assumption:** `|b⟩` must be efficiently preparable. Loading an arbitrary classical `b` takes `O(N)`, which alone kills the speedup. You need `b` produced by a quantum subroutine or stored in QRAM.
2. **Output assumption:** you get a quantum state `|x⟩`, not a vector. Reading out all `N` amplitudes takes `O(N)` samples. HHL is useful only when you want an *expectation value* `⟨x|M|x⟩` or similar functional of `x`.
3. **Sparse Hamiltonian simulation:** `e^{iAt}` must be simulable efficiently — typically requires `A` to be `s`-sparse with efficient row-access oracle.
4. **Condition number:** runtime scales as `κ²` (or `κ` with improvements); ill-conditioned systems kill the speedup.
5. **Precision:** `1/ε` scaling in HHL (`polylog(1/ε)` in CKS) — worse than Newton-type classical iterations.

**Rule of thumb:** HHL is an exponential speedup *for a very specific I/O pattern*: quantumly-produced input + functional-of-solution output + sparse + well-conditioned. For general dense linear algebra on classical data, HHL gives no real-world advantage.
