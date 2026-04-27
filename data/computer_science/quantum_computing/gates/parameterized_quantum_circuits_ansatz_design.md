### Parameterized Quantum Circuits and Ansatz Design

**What it is:** A parameterized quantum circuit (PQC) is a circuit with classical parameters θ = (θ₁, ..., θ_p) feeding rotation gates. A classical optimizer updates θ to minimize a cost function — the core of variational algorithms (VQE, QAOA, QML).

**General structure:**
```
|0⟩^⊗n ──[U(θ)]──[measurement]──→  ⟨ψ(θ)|H|ψ(θ)⟩
         ↑
         classical optimizer updates θ
```

**Hardware-efficient ansatz (HEA):** Alternating layers of single-qubit rotations and fixed entanglers chosen to match device connectivity.
```
Layer = [Ry(θ_i) ⊗ Rz(θ_i') on each qubit] → [entangling ring of CNOTs]
Depth = d × Layer
```
- Pros: shallow, native to hardware, high expressibility.
- Cons: no problem structure → barren plateaus (vanishing gradients at depth O(poly n)).

**Problem-inspired ansatz — UCCSD (Unitary Coupled Cluster Singles & Doubles):** For quantum chemistry.
```
|ψ(θ)⟩ = exp[T(θ) − T†(θ)] |HF⟩
T = T₁ + T₂ (single + double fermionic excitations)
```
After Jordan-Wigner mapping, produces deep circuits with O(N⁴) two-qubit gates (N = spin orbitals) but captures molecular correlation accurately.

**QAOA ansatz (for combinatorial optimization):**
```
|ψ(γ, β)⟩ = [Π_k U_B(β_k) U_C(γ_k)] H^⊗n |0⟩^⊗n
U_C(γ) = exp(-i γ H_problem)     (cost)
U_B(β) = exp(-i β Σ X_i)         (mixer)
```
p layers → 2p parameters. Provable performance bounds at p=1 for certain problems.

**Comparison:**

| Ansatz        | Depth        | Trainability     | Accuracy / expressibility |
|---------------|--------------|------------------|---------------------------|
| HEA           | shallow      | barren plateaus  | generic, no structure     |
| UCCSD         | deep         | better landscape | chemistry-accurate        |
| QAOA          | p × layers   | warm-start aids  | combinatorial problems    |
| Adaptive (ADAPT-VQE) | grown    | best so far      | chemistry                 |

**Gradient computation — parameter shift rule:** For any gate of the form e^{−iθP/2} with Pauli P:
```
∂⟨H⟩/∂θ = ½ [⟨H⟩(θ + π/2) − ⟨H⟩(θ − π/2)]
```
Exact gradient from 2 circuit evaluations — no finite differences needed.

**Qiskit:**
```python
from qiskit.circuit.library import EfficientSU2, TwoLocal
from qiskit_algorithms import VQE
from qiskit_algorithms.optimizers import COBYLA

# Hardware-efficient ansatz
ansatz = EfficientSU2(num_qubits=4, reps=3, entanglement="linear",
                     su2_gates=["ry", "rz"])
print(ansatz.num_parameters)  # 32

# Custom two-local ansatz
ansatz2 = TwoLocal(4, rotation_blocks="ry", entanglement_blocks="cz",
                   entanglement="full", reps=2)

# QAOA for MaxCut
from qiskit.circuit.library import QAOAAnsatz
from qiskit.quantum_info import SparsePauliOp
cost_op = SparsePauliOp.from_list([("ZZII", 1), ("IZZI", 1), ("IIZZ", 1)])
qaoa = QAOAAnsatz(cost_op, reps=3)
```

**Barren plateau mitigation:**
- Start from identity (θ initialized small)
- Use problem-inspired structure (QAOA, UCCSD, adaptive)
- Layer-wise training, local cost functions (not global observables)

**Rule of thumb:** Hardware-efficient ansätze are expressive but hard to train; problem-inspired ansätze are trainable but deep — pick by whether your bottleneck is fidelity (go shallow) or accuracy (go structured).
