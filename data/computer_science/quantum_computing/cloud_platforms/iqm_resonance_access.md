### IQM Resonance — European SC Transmon Cloud

**What it is:**
IQM's native cloud service for its superconducting-transmon QPUs. Resonance is the cloud product: Europe-based infrastructure, IQM Garnet-class (and successor) processors, a star-topology and square-lattice family of devices, matched simulators, and a Python SDK (`iqm-client` + `qiskit-on-iqm` + `cirq-on-iqm`). IQM QPUs also surface through Amazon Braket for some systems, but Resonance is the direct route with EU-residency guarantees.

**Access model:**
| Layer | What it is |
|---|---|
| Account | IQM Resonance identity |
| API token | Long-lived bearer token per account/project |
| Cocos server | The cloud endpoint backing each device |
| Target | Named device (e.g. `garnet`) or its simulator twin |
| Submission | Circuit in IQM-native JSON or via Qiskit/Cirq adapters |

**Why Europe matters (durable):**
IQM markets Resonance with **EU data residency** — workloads stay on EU infrastructure, which matters for regulated industries (finance, healthcare, public sector) that can't route data through US clouds. This is a positioning invariant, not a roadmap item.

**Hardware family traits:**
| Trait | Implication |
|---|---|
| Superconducting transmons | Fast gate clock, microsecond-scale coherence |
| Star topology (small systems) / square lattice (larger) | Compilation must insert SWAPs for non-local gates — same as Rigetti Ankaa |
| Native 2-qubit gate varies per generation | Qiskit/Cirq adapters decompose to the native set |
| Matched simulators | Noisy replay of target calibration for iteration |

**Connecting (Qiskit adapter):**
```python
from qiskit import QuantumCircuit
from iqm.qiskit_iqm import IQMProvider

# The server URL + token pairs identify the device
SERVER_URL = "https://cocos.resonance.meetiqm.com/garnet"    # placeholder; enumerate at runtime
provider = IQMProvider(SERVER_URL, token="YOUR_IQM_API_TOKEN")
backend = provider.get_backend()

qc = QuantumCircuit(2, 2)
qc.h(0); qc.cx(0, 1); qc.measure([0, 1], [0, 1])

job = backend.run(qc, shots=1000)
print(job.job_id(), job.status())
counts = job.result().get_counts()
```

**Cirq-IQM variant:**
```python
import cirq
from iqm.cirq_iqm import IQMSampler

sampler = IQMSampler(url=SERVER_URL, token="YOUR_IQM_API_TOKEN")
q0, q1 = cirq.NamedQubit("QB1"), cirq.NamedQubit("QB2")
circuit = cirq.Circuit(cirq.H(q0), cirq.CNOT(q0, q1), cirq.measure(q0, q1, key="m"))
result = sampler.run(circuit, repetitions=1000)
print(result.histogram(key="m"))
```

**Ecosystem surfaces:**
| Library | Role |
|---|---|
| `iqm-client` | Raw REST client, thinnest surface |
| `qiskit-on-iqm` | Qiskit backend shim → Resonance |
| `cirq-on-iqm` | Cirq sampler shim → Resonance |
| IQM-native JSON IR | Direct submission format (client handles it) |

**Resonance vs Braket route:**
| Capability | Resonance direct | Braket (where available) |
|---|---|---|
| EU data residency | Yes | Depends on device/region |
| Earliest device/feature access | Usually Resonance | Later via Braket |
| AWS-native orchestration | No | Yes |

**Pitfalls:**
- Hardcoding a specific device URL — each device has its own Cocos endpoint; enumerate or inject via config.
- Submitting Cirq `GridQubit` or Qiskit physical-qubit indices without running IQM's transpiler pass — the target topology isn't a square grid and layout matters.
- Treating EU residency as automatic when routing through Braket — that depends on the Braket region, not on IQM's own cloud.
- Letting the API token leak into logs — Resonance tokens are long-lived, so rotate on exposure.

**Rule of thumb:** Reach for Resonance directly when EU residency or earliest feature access matters, use the Qiskit / Cirq adapters over raw `iqm-client` unless you're building infra tooling, and never hardcode a device URL — enumerate so your code survives generation changes.
