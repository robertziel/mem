### Universal Gate Sets and Clifford+T

**What it is:** A **universal gate set** is a finite collection of gates whose compositions can approximate any n-qubit unitary to arbitrary accuracy. Different universal sets exist — Clifford+T is the canonical choice for fault-tolerant quantum computing.

**Canonical universal sets:**

| Set                           | Notes                                             |
|-------------------------------|---------------------------------------------------|
| **{H, S, CNOT, T}** (Clifford+T) | Standard fault-tolerant set; discrete           |
| {H, Toffoli}                 | Classical + quantum; also universal               |
| {Rx(θ), Rz(θ), CNOT}         | Continuous; needs arbitrary-angle control         |
| {H, CNOT, T}                 | Equivalent to Clifford+T (S = T²)                 |

**Why Clifford+T:**
1. **Clifford gates are cheap** in stabilizer codes — implementable transversally and fault-tolerantly.
2. **T gates are the only non-Clifford ingredient** needed to escape Gottesman-Knill classical simulability.
3. Eastin-Knill: no non-trivial stabilizer code can implement a universal set transversally, so **some** non-transversal gate is required; T via magic-state distillation is the industry standard.

**Solovay–Kitaev theorem:** Any single-qubit unitary U can be approximated to accuracy ε by a sequence of O(log^c(1/ε)) gates from any universal set (c ≈ 3 for basic construction, ≈ 1 with ancilla-assisted variants). Gives a constructive compilation procedure.

```
length(sequence approximating U to ε) = O(polylog(1/ε))
```

**Ross–Selinger / optimal T-count synthesis:** For single-qubit Z-axis rotations Rz(θ), the number of T gates needed to approximate to ε grows as ~3 log₂(1/ε) with near-optimal constants — used by modern compilers (gridsynth, newsynth).

**Why T-count matters:** In the surface code with magic-state distillation, each logical T gate costs thousands of physical qubits and microseconds of distillation time. T-count (and T-depth) is the primary resource metric for fault-tolerant algorithms.

```
Fault-tolerant cost ≈ (# logical qubits) × (# T gates) × (distillation overhead)
```

**Qiskit — compiling to Clifford+T:**
```python
from qiskit import QuantumCircuit
from qiskit.transpiler import generate_preset_pass_manager

qc = QuantumCircuit(2)
qc.rz(0.3, 0)
qc.ry(0.7, 1)
qc.cx(0, 1)

pm = generate_preset_pass_manager(
    optimization_level=3,
    basis_gates=["h", "s", "sdg", "cx", "t", "tdg"]
)
ft = pm.run(qc)
print(ft.count_ops())  # counts of h, t, cx, etc.

# T-count for an arbitrary Rz: handled by SolovayKitaev pass
from qiskit.transpiler.passes.synthesis import SolovayKitaev
```

**Example T-counts:**
- Toffoli: 7 T
- Quantum adder (n-bit): O(n) T with log depth
- Shor factoring 2048-bit RSA: ~10⁹ T gates (dominates resource estimates)

**Rule of thumb:** Any gate set containing a non-Clifford gate plus the Clifford group is universal — and for fault tolerance, what you're really counting is the non-Clifford "magic" you burn through.
