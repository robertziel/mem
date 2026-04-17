### Solovay–Kitaev Decomposition

**What it is:**
An algorithm (and a theorem) for compiling **any single-qubit unitary** U into a sequence of gates drawn from a **finite universal set** (typically Clifford+T) that approximates U to accuracy ε using `O(log^c(1/ε))` gates. Makes fault-tolerant compilation practical — without SK you would need an arbitrary-angle rotation oracle, which does not exist transversally.

**The theorem:**
```
For any universal gate set G (closed under inverse, dense in SU(2))
and target ε > 0, ∃ sequence s ∈ G* of length L with
    ‖U - s‖ ≤ ε,    L = O(log^c(1/ε)),   c ≈ 3.97 (basic), ≈ 1 (best known)
```

**Algorithm sketch (recursive):**
```
SK(U, n):
    if n = 0: return Basic_Approx(U)              # lookup table, O(ε₀)
    U_{n-1} = SK(U, n-1)
    V, W   = Group_Commutator_Decomp(U · U_{n-1}†)  # such that [V, W] ≈ U·U_{n-1}†
    V_{n-1} = SK(V, n-1)
    W_{n-1} = SK(W, n-1)
    return V_{n-1} · W_{n-1} · V_{n-1}† · W_{n-1}† · U_{n-1}
```
Each recursion level squares the accuracy gain: ε_n ≈ ε_{n-1}^{3/2}.

**Cost scaling:**
| Accuracy ε | Gate count (classic SK, c ≈ 3.97) | Gate count (Ross–Selinger for Rz) |
|---|---|---|
| 10⁻³ | ~10³ | ~30 T |
| 10⁻⁶ | ~10⁶ | ~60 T |
| 10⁻⁹ | ~10⁹ | ~90 T |

**Ross–Selinger (gridsynth)** gives the asymptotically-optimal `~3 log₂(1/ε)` T-count for Z-axis rotations — used by modern compilers instead of vanilla SK for single-qubit diagonal gates. Generic SK handles non-diagonal unitaries.

**Qiskit:**
```python
from qiskit import QuantumCircuit
from qiskit.circuit.library import U3Gate
from qiskit.transpiler.passes.synthesis import SolovayKitaev
from qiskit.synthesis import generate_basic_approximations

basis = ['h', 's', 'sdg', 't', 'tdg']
approx = generate_basic_approximations(basis, depth=3)      # one-time precompute
sk = SolovayKitaev(recursion_degree=3, basic_approximations=approx)

qc = QuantumCircuit(1); qc.append(U3Gate(0.37, 0.12, 0.89), [0])
discretized = sk(qc)
print(discretized.count_ops())                               # all Clifford+T
```

**When to use:**
- **Fault-tolerant compilation**: converting arbitrary-angle rotations from a high-level algorithm (QFT phases, Hamiltonian simulation, VQE-annealing conversions) into Clifford+T.
- **Resource estimation**: T-count budgets (Shor, QPE) rely on SK/Ross–Selinger to give realistic gate counts.
- **Standardizing across backends**: the same Clifford+T sequence runs on any FTQC architecture that supports those gates.

**Pitfalls:**
- **Basic approximations are expensive to precompute**: depth-d brute-force enumeration grows as |G|^d. Cache them on disk, reuse across runs.
- **`c ≈ 3.97` scaling is pessimistic for single axes** — use Ross–Selinger / gridsynth for Rz, Kliuchnikov–Maslov–Mosca for Clifford+T with arbitrary targets, and reserve SK for generic SU(2).
- **Numerical stability**: the group-commutator step loses precision at deep recursion; use extended-precision arithmetic (mpmath) when ε < 10⁻¹².
- **Qiskit's default SK** is correctness-first, not gate-count-optimal — post-process with template matching (`pytket`, `bqskit`) to squeeze further.
- **Not for 2-qubit gates**: SK applies to SU(2). For SU(4) use KAK + per-qubit SK.

**Rule of thumb:** Any time your algorithm calls for `Rz(θ)` with generic θ in a fault-tolerant setting, assume you pay `~3 log₂(1/ε)` T gates per rotation — that's the line-item your resource estimator should highlight.
