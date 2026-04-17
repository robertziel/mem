### Microsoft Azure Quantum — Workspaces & Providers

**What it is:**
Microsoft's multi-provider quantum cloud. Like AWS Braket, Azure Quantum is a broker: you provision a **Workspace** (an Azure resource under a subscription and resource group), add one or more **providers** (IonQ, Quantinuum, Rigetti, Pasqal, and Microsoft's own simulators / resource estimator), and every job submission carries the provider's target name plus the workspace's credentials. Billing rolls up to the Azure subscription.

**Access model:**
| Layer | What it is |
|---|---|
| Subscription | Azure billing account |
| Resource group | Logical container for workspace + storage |
| Workspace | `azure.quantum.Workspace` — the client handle |
| Provider | A vendor plan attached to the workspace |
| Target | A named device/simulator inside a provider (e.g. `ionq.qpu.aria-1`) |
| Storage | A required Azure Storage account for job inputs/results |

**Provider catalog (durable set):**
| Provider | Paradigm | Targets reachable this way |
|---|---|---|
| IonQ | Gate-model, trapped ion | Simulator + QPU generations |
| Quantinuum | Gate-model, trapped ion (QCCD) | H-series system models + emulators |
| Rigetti | Gate-model, superconducting | Ankaa-class QPUs |
| Pasqal | Analog + gate-model, neutral atom | Fresnel-class QPUs |
| Microsoft | Simulators, **Resource Estimator** | Logical-qubit cost modeling |

Providers are opt-in per workspace — you pick which you need when you create the workspace, and credentials flow through the single Azure login.

**Connecting:**
```python
from azure.quantum import Workspace
from azure.identity import DefaultAzureCredential

ws = Workspace(
    subscription_id="YOUR_SUB_ID",
    resource_group="my-rg",
    name="my-qws",
    location="eastus",
    credential=DefaultAzureCredential(),
)

# Enumerate targets across all attached providers
for t in ws.get_targets():
    print(t.name, t.provider_id, t.current_availability)

# Qiskit path — submit a circuit to a provider target
from qiskit import QuantumCircuit
from azure.quantum.qiskit import AzureQuantumProvider

provider = AzureQuantumProvider(ws)
backend = provider.get_backend("ionq.simulator")
qc = QuantumCircuit(2); qc.h(0); qc.cx(0, 1); qc.measure_all()
job = backend.run(qc, shots=1000)
print(job.id(), job.status())
counts = job.result().get_counts()
```

**Integrated Hybrid flag:**
Azure Quantum supports two submission modes:
| Mode | Behavior |
|---|---|
| Pass-through | Circuit submitted as-is; classical control lives in your client |
| **Integrated Hybrid** | Mid-circuit measurement + classical feedforward executed inside the device session, low-latency |

The flag is set per job (e.g. `targetCapability="AdaptiveExecution"` in the job metadata or an SDK option). Only certain provider targets accept it — check `target.capabilities` before enabling.

**SDK surfaces:**
| Library | Use |
|---|---|
| `azure-quantum` | Raw job submit, target catalog, resource estimator |
| `azure-quantum[qiskit]` | `AzureQuantumProvider` — Qiskit backend shim |
| `azure-quantum[cirq]` | Cirq engine shim for Google-style code |
| Q# + QDK | Microsoft's own language and the Resource Estimator entry point |

**Pitfalls:**
- Workspace creation needs a linked Storage account in the same region — forgetting this yields a half-provisioned workspace that accepts logins but fails every `.submit()`.
- Provider-specific target names are case-sensitive and not portable across workspaces; list them at runtime.
- Integrated Hybrid isn't universally supported — submitting an adaptive circuit to a pass-through-only target silently strips the feedforward.
- Azure RBAC (`Quantum Workspace Data Contributor`) is distinct from subscription-level roles; users who can see the workspace in the portal may still fail to submit jobs.

**Rule of thumb:** Create the Workspace once with `DefaultAzureCredential`, enumerate targets at runtime rather than hardcoding provider IDs, and flip the Integrated Hybrid flag only when the target advertises the capability — otherwise your feedforward logic gets silently dropped.
