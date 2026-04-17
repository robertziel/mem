### IonQ Direct — Cloud API for Trapped-Ion QPUs

**What it is:**
IonQ's own cloud, reachable through `cloud.ionq.com` and the `ionq-client` / `qiskit-ionq` / `cirq-ionq` SDKs. It exposes trapped-ion QPU generations and their matched noisy simulators as uniform **targets**. You can also reach the same devices through AWS Braket and Azure Quantum — the direct API is just one of three routes, and it typically offers the thinnest surface (REST + JWT) with the earliest access to new features.

**Access model:**
| Layer | What it is |
|---|---|
| Account | IonQ Cloud identity |
| API key | Long-lived bearer token; scoped to account |
| Target | Named device or simulator (`simulator`, `qpu.aria`, `qpu.forte`, etc.) |
| Job | Submitted circuit (JSON or OpenQASM) with target + shot count |
| Result | Retrieved from the job endpoint after completion |

**Target naming pattern:**
| Target | Role |
|---|---|
| `simulator` | Ideal/noisy simulator, fast turnaround |
| `qpu.aria` | Production trapped-ion QPU generation |
| `qpu.forte` | Next-generation trapped-ion QPU |
| `qpu.<newer>` | Future QPU generations follow the same prefix |

Target names follow the `qpu.<generation>` convention; list them live from `/v0.3/backends` rather than hardcoding, because generation names evolve and specific models may be gated by plan tier.

**Distinctive hardware traits (durable, not roadmap):**
- **All-to-all connectivity** within an ion chain — no SWAP networks for 2-qubit gates in the ideal case.
- **Native gate set** includes GPI, GPI2, and MS (Mølmer-Sørensen) — the compiler will decompose standard gates to these.
- **High gate fidelity, slow clock** compared to superconducting; circuit count is usually the bottleneck before depth is.
- **Algorithmic qubits (#AQ)** — IonQ's benchmark metric emphasizing usable qubits over raw count.

**Connecting (direct SDK):**
```python
from ionq import Client

client = Client(token="YOUR_IONQ_API_KEY")            # or IONQ_API_KEY env var

# Catalog lookup
for b in client.backends():
    print(b.name, b.status, b.num_qubits)

# Submit a circuit in IonQ's native JSON IR
job = client.jobs.create(
    target="simulator",
    shots=1024,
    body={
        "qubits": 2,
        "circuit": [
            {"gate": "h",  "target": 0},
            {"gate": "cnot", "target": 1, "control": 0},
        ],
    },
)
result = job.get_result()                             # blocks until done
print(result.get("probabilities") or result.get("histogram"))
```

**Qiskit / Cirq equivalents:**
```python
# Qiskit
from qiskit_ionq import IonQProvider
prov = IonQProvider("YOUR_IONQ_API_KEY")
backend = prov.get_backend("ionq_simulator")
# Cirq
import cirq_ionq as ci
service = ci.Service(api_key="YOUR_IONQ_API_KEY")
```

**Direct vs broker access:**
| Route | Best for |
|---|---|
| Direct (ionq-client) | Thinnest surface, earliest feature access, native IR |
| AWS Braket | You already live in AWS (IAM, S3, Step Functions) |
| Azure Quantum | You already live in Azure (workspaces, Storage) |

Pricing, quota, and priority can differ across routes — the same QPU may have different effective cost depending on which broker's contract you go through.

**Pitfalls:**
- Hardcoding `qpu.aria-1` or a specific model name — list backends at runtime; generation names evolve.
- Submitting raw native-gate circuits but forgetting that the target's compiler stage still runs — set the compiler stage explicitly when you need full control.
- Expecting low-latency iteration: trapped-ion gate times make even "small" jobs minutes rather than seconds on QPU targets.
- Assuming all-to-all means no compilation cost — you still pay decomposition into GPI/GPI2/MS.

**Rule of thumb:** Use the direct SDK when you want the shortest path and earliest feature access, prefer `qpu.<generation>` over specific model names in code, and iterate on `simulator` targets first — every QPU submission is minutes of real ion-trap time you'll pay for.
