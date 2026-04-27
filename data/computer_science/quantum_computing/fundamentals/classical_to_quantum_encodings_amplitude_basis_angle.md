### Classical-to-Quantum Encodings — Amplitude vs Basis vs Angle

**What it is:**
How you load a classical vector `x ∈ ℝ^N` into a quantum state determines qubit count, circuit depth, gradient behaviour, and whether you can read the result out at all. Three standard strategies dominate QML / feature maps.

**Amplitude encoding:**
```
|x⟩ = (1/‖x‖) Σ_i x_i |i⟩           on n = ⌈log₂ N⌉ qubits
```
Maximum data density — log(N) qubits for N features. Preparation in general requires O(N) gates (arbitrary state prep), though structured x (e.g., uniform, Gaussian) can be exponentially faster.

**Basis encoding:**
```
|x⟩ = |x₁ x₂ … x_N⟩                  on N qubits (bitstring)
```
One qubit per feature (assumes binary / quantized features). Trivial preparation: X gates on 1-bits. No amplitude structure — can't exploit superposition of feature values directly.

**Angle encoding:**
```
|x⟩ = ⊗_i R_y(x_i) |0⟩              on N qubits (repeated layers for expressivity)
```
One qubit per feature, features live in rotation angles. **ZZFeatureMap** (2nd-order) adds entangling phases `exp(i x_i x_j Z_i Z_j)`.

**Trade-off table:**
| | Amplitude | Basis | Angle |
|---|---|---|---|
| Qubits | log₂ N | N | N |
| Prep depth | O(N) worst | O(1) | O(d) for d layers |
| Readout | hard (tomography) | trivial (measure Z) | needs observables |
| Gradients | flat / barren-prone | n/a | smooth, parameter-shift |
| Best for | large dense vectors (sim) | discrete features, Grover oracles | variational QML / kernels |
| Parseval sensitive? | yes (normalize!) | no | no |

**Qiskit:**
```python
from qiskit.circuit.library import ZZFeatureMap, RealAmplitudes, StatePreparation
from qiskit import QuantumCircuit
import numpy as np

# Angle + entanglement (QML feature map)
fm = ZZFeatureMap(feature_dimension=4, reps=2, entanglement='linear')

# Variational ansatz frequently paired with angle encoding
ansatz = RealAmplitudes(num_qubits=4, reps=3)

# Amplitude encoding (arbitrary state prep)
x = np.array([0.1, 0.4, 0.2, 0.9]); x /= np.linalg.norm(x)
amp = QuantumCircuit(2); amp.append(StatePreparation(x), [0, 1])
```

**When to use which:**
- **Amplitude**: you need N features in log(N) qubits AND have a structured preparation circuit (QRAM, sparse-state prep, or quantum-generated data).
- **Basis**: inputs are already bits, the downstream algorithm is an oracle (Grover, Deutsch–Jozsa, QAOA-on-bitstrings).
- **Angle**: near-term QML / kernels where depth is cheap, features are real-valued, and you need parameter-shift gradients.

**Pitfalls:**
- **Amplitude readout**: you cannot recover the full x from measurements; tomography costs O(N) queries → wipes out the log(N) qubit win unless you only need an inner product.
- **Normalization**: amplitude loses the norm of x — encode it separately if relevant. Basis loses nothing; angle loses nothing but features should be rescaled to [-π, π] to avoid periodicity aliasing.
- **Barren plateaus**: deep angle encodings with random parameter init → exponentially small gradients. Use hardware-efficient but shallow ansätze, local cost functions, or identity-block init.
- **Classical-equivalence traps**: some encodings (single-layer angle + linear readout) are **efficiently classically simulable** — no quantum advantage. Mix entangling layers to avoid this.
- **Data reuploading** (re-encoding x between ansatz layers) boosts expressivity angle-encodings — preferred over very deep single-layer encodings.

**Rule of thumb:** For NISQ / variational work, default to **angle encoding with entangling layers** (ZZFeatureMap-style); reach for amplitude only when you have log(N) qubits and a closed-form preparation circuit; use basis only when the algorithm is a bitstring oracle.
