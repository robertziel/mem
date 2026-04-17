### Quantum Landscape 2026 — One-Page Map

**Pattern:** Three orthogonal axes define any quantum stack choice in 2026: **modality** (physics of the qubit), **SDK / cloud** (programming + orchestration layer), and **era** (NISQ / early-FTQC / FTQC). Pick one point on each axis before writing a line of code — most wrong turns in quantum projects come from mismatches between these three.

**Modalities (physical qubit):**
| Modality | Leaders | 2-q fidelity | Clock | Connectivity | Best for |
|---|---|---|---|---|---|
| Superconducting (SC) | IBM, Google, Rigetti, IQM | 99.7–99.9% | MHz | nearest-neighbor (heavy-hex / square) | fast cycles, broad access |
| Trapped ion | IonQ, Quantinuum | 99.8–99.97% | kHz | all-to-all | high fidelity, QCCD |
| Neutral atom | QuEra, Pasqal, Atom Comp. | 99.5% | kHz | reconfigurable | analog + digital, 1000+ atoms |
| Photonic | PsiQuantum, Xanadu | measurement-based | GHz | fusion-based | FTQC roadmap, room-temp |
| Spin (Si, diamond) | Intel, Diraq, Quantum Brilliance | 99.5%+ | MHz | NN | CMOS compatibility |
| Topological | Microsoft (Majorana) | projected high | — | engineered | long-term FTQC bet |

**SDK / cloud stacks:**
| Stack | Language | Hardware access | Strengths |
|---|---|---|---|
| **Qiskit** + IBM Runtime | Python | IBM QPUs (Heron, Condor) | Primitives V2, pulse, dynamic circuits, largest ecosystem |
| **Amazon Braket** | Python SDK | IonQ, Rigetti, QuEra, IQM | multi-vendor, pay-per-shot, Hybrid Jobs |
| **Azure Quantum** | Q#, Qiskit, Cirq | Quantinuum, IonQ, Rigetti, QCI | Resource Estimator, QIR, enterprise |
| **PennyLane** | Python | all major QPUs + simulators | autodiff, QML, device-agnostic |
| **Cirq** | Python | Google QPUs, simulators | circuit-level control |
| **NVIDIA CUDA-Q** | C++ / Python | simulators, hybrid | GPU-accelerated sim, FTQC research |

**Era layers:**
| Era | Logical qubits | Arbitrary depth? | Killer apps (real) | Stack implication |
|---|---|---|---|---|
| **NISQ** (today) | 0 | no | VQE demos, QAOA, QML, sensing | Estimator / Sampler, mitigation |
| **Early-FTQC** (~2027–2030) | 10–100 | limited T-budget | small Shor, QPE for chemistry, QML | logical primitives, magic-state budgets |
| **FTQC** (late 2030s?) | 1000+ | yes | Shor-RSA-2048, full QPE, HHL | code-level programming, decoders |

**Decision starter — "which combination fits my project?":**
```
Is my timeline < 3 years?  ── yes ──▶ NISQ
                              │
                              ▼
Do I need chemical-accuracy       Do I need provable speedup?
  expectation values?                     │
     │                                    │
     ▼                                    ▼
  VQE / QAOA on SC or ion       ──▶  Plan for early-FTQC
  (Qiskit Runtime or Braket)         (Azure Resource Estimator first)
```

**Example — same circuit, three stacks:**
```python
# Qiskit + IBM Runtime
from qiskit import QuantumCircuit
from qiskit_ibm_runtime import SamplerV2
qc = QuantumCircuit(2); qc.h(0); qc.cx(0,1); qc.measure_all()
SamplerV2(mode=backend).run([(isa(qc),)], shots=1024).result()

# PennyLane (any device)
import pennylane as qml
dev = qml.device("braket.aws.qubit", wires=2, device_arn="...ionq...")

# Cirq (Google)
import cirq; q0,q1 = cirq.LineQubit.range(2)
c = cirq.Circuit([cirq.H(q0), cirq.CNOT(q0,q1), cirq.measure(q0,q1)])
```

**Trade-offs:**
- **Modality-portable SDKs (PennyLane, Braket) vs. native (Qiskit on IBM, Cirq on Google):** portability costs access to hardware-specific features (pulse, dynamic circuits, native ZZ).
- **NISQ optimism vs FTQC realism:** 2026 consensus — no demonstrated quantum advantage on a commercial problem; early-FTQC is the inflection, not NISQ.

**Pitfalls:**
- Prototyping on a statevector sim and declaring victory — real hardware noise collapses most NISQ results.
- Locking into a single vendor before pricing multi-vendor via Braket/Azure.
- Confusing "physical qubit count" with "logical qubit count" in roadmaps — a 1000-physical-qubit SC chip has 0 logical qubits without a QEC code.

**Rule of thumb:** Pick era first (what can actually run?), then modality (fidelity × connectivity × access), then SDK (ecosystem fit) — never the other way round, and expect to migrate stacks at least once as early-FTQC hardware arrives.
