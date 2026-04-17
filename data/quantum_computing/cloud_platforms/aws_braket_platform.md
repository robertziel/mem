### Amazon Braket — Multi-Vendor Platform

**What it is:**
AWS's managed quantum service. Braket is a **broker**, not a device maker: it exposes QPUs from multiple vendors (IonQ, Rigetti, IQM, QuEra, and others) plus AWS-hosted on-demand simulators (SV1, DM1, TN1) behind a uniform `AwsDevice` ARN interface. Submissions are IAM-authorized, results persist to S3, and everything composes with the rest of AWS (Lambda, Step Functions, SageMaker).

**Access model:**
| Layer | What it is |
|---|---|
| IAM principal | Your AWS identity; needs `braket:*` + S3 write to the result bucket |
| Region | Devices are region-scoped; ARN must match the SDK region |
| Device ARN | `arn:aws:braket:<region>::device/<category>/<vendor>/<name>` |
| Task / Job | `AwsQuantumTask` (single circuit) or `AwsQuantumJob` (hybrid algorithm) |
| Result store | An S3 bucket you own; ARNs carry the path |

**Three execution surfaces:**
| Surface | Use | Billing shape |
|---|---|---|
| **On-demand tasks** | Submit a circuit, wait in the shared queue | Per-shot + per-task |
| **Braket Direct (reserved)** | Book a contiguous device window (an hour or a day) | Flat rate for the window, no queue |
| **Hybrid Jobs** | Long-running classical+quantum loop (VQE, QAOA) | Classical container price + device time |

Reserved windows bypass fair-share queuing entirely — useful for demos and experiments where queue jitter would invalidate results. Hybrid Jobs run a classical container next to the device so the outer optimizer doesn't pay network RTT per iteration.

**Device catalog:**
`AwsDevice.get_devices()` lists every QPU + simulator the caller's region exposes. Filter by provider, status, or paradigm (`gate-based`, `analog-hamiltonian`). The catalog is source of truth — ARNs change when vendors ship new generations, and retired ARNs start returning `DeviceOfflineException`.

**Connecting (SDK + boto3):**
```python
from braket.aws import AwsDevice, AwsQuantumTask
from braket.circuits import Circuit
import boto3

# Catalog lookup
for d in AwsDevice.get_devices(statuses=["ONLINE"]):
    print(d.name, d.arn, d.provider_name)

# Submit a task (SDK — the normal path)
dev = AwsDevice("arn:aws:braket:us-east-1::device/qpu/ionq/Aria-1")
task = dev.run(Circuit().h(0).cnot(0, 1), shots=1000,
               s3_destination_folder=("amazon-braket-myacct", "demo/"))

# Equivalent boto3 surface (raw API — for infra/IaC)
client = boto3.client("braket", region_name="us-east-1")
resp = client.search_devices(filters=[])                    # catalog
client.get_quantum_task(quantumTaskArn=task.id)             # status
```

**SDK vs boto3:**
| Concern | `amazon-braket-sdk` | `boto3` |
|---|---|---|
| Build circuits | Yes (`Circuit` DSL, OpenQASM export) | No — expects pre-serialized IR |
| Submit + wait | `task.result()` blocks and pulls S3 | `get_quantum_task` polling loop |
| Right tool for | Notebooks, experiments | Infra, automation, cross-language code |

**Pitfalls:**
- Region mismatch: SDK session region ≠ device ARN region → silent failure at `.run()`.
- S3 bucket must be in the **same region as the device**, not your laptop's default.
- `shots=0` = exact statevector on simulators, `ValidationException` on QPUs — don't port simulator scripts unchanged.
- Hybrid Jobs and on-demand tasks have separate quotas; raising one doesn't raise the other.
- Reserved windows are non-refundable — you pay for the hour whether or not you submit jobs.

**Rule of thumb:** Treat Braket as a device-agnostic broker — iterate on `LocalSimulator`, catalog-lookup ARNs at runtime (never hardcode), and reach for reserved windows or Hybrid Jobs only when on-demand queue jitter would ruin the experiment.
