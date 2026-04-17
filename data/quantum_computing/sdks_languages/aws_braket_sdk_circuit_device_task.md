### AWS Braket SDK — Circuit, Device, Task

**What it is:**
The three load-bearing abstractions in the Amazon Braket Python SDK. A `Circuit` is a gate-model DSL (`braket.circuits.Circuit`), a `Device` is either a `LocalSimulator` or an `AwsDevice` (QPU or on-demand simulator looked up by ARN), and an `AwsQuantumTask` is the async handle returned from `device.run(circuit, shots=...)`. Tasks have a lifecycle — `CREATED → QUEUED → RUNNING → COMPLETED | FAILED | CANCELLED` — and their results are persisted to S3 whether or not your Python process is still alive.

**API shape:**
- `Circuit()` — fluent builder; methods are gate names (`.h(0)`, `.cnot(0,1)`, `.rx(0, angle)`) and return `self`.
- `AwsDevice(arn)` — catalog lookup; throws if the ARN is wrong, region is wrong, or the device is retired.
- `device.run(circuit, s3_destination_folder=(bucket, prefix), shots=1000, poll_timeout_seconds=...)` → `AwsQuantumTask`.
- `task.state()` — live poll; `task.result()` — blocks until `COMPLETED` then pulls JSON from S3.
- `task.id` is the task ARN; you can rehydrate with `AwsQuantumTask(arn=...)` from any machine.

**Task states:**
| State | Meaning | Billable? |
|---|---|---|
| CREATED | Accepted, not yet scheduled | No |
| QUEUED | Waiting in device queue (can be long on QPUs) | No |
| RUNNING | Executing shots on device | Yes (on QPUs) |
| COMPLETED | Results in S3 | N/A |
| FAILED | Device/validation error | Usually no |
| CANCELLED | `task.cancel()` called | Partial shots may bill |

**Example — Bell pair on IonQ Aria 1:**
```python
from braket.circuits import Circuit
from braket.aws import AwsDevice

# Build the circuit in the SDK DSL
bell = Circuit().h(0).cnot(0, 1)

# Local path (free, instantaneous)
from braket.devices import LocalSimulator
local_result = LocalSimulator().run(bell, shots=1000).result()
print(local_result.measurement_counts)

# On-demand QPU path (priced per shot + per task)
aria = AwsDevice("arn:aws:braket:us-east-1::device/qpu/ionq/Aria-1")
task = aria.run(
    bell,
    s3_destination_folder=("amazon-braket-myacct", "bell/"),
    shots=1000,
)
print(task.id, task.state())   # CREATED / QUEUED
counts = task.result().measurement_counts   # blocks until COMPLETED
```

**Device ARN anatomy:**
ARNs are the only identifier Braket trusts — names and aliases are not honored. Shape:
`arn:aws:braket:<region>::device/<category>/<vendor>/<name>`
- `category` ∈ {`quantum-simulator`, `qpu`}
- On-demand simulators live in specific regions (SV1 in us-east-1, DM1/TN1 in us-west-2). A cross-region `run()` silently fails schema validation.

**Pitfalls:**
- `task.result()` pulls from the S3 bucket you specified at submission — if the bucket was deleted mid-flight, the task still shows `COMPLETED` but `.result()` raises.
- `shots=0` means *exact statevector* on simulators and *error* on QPUs. Don't copy-paste simulator scripts to QPUs without checking.
- `AwsDevice` is region-sticky; default region from `boto3` must match or construction silently returns an object that throws on `.run()`.
- Rebuilding a Task from its ARN (`AwsQuantumTask(arn)`) does *not* require the original bucket — the ARN carries the S3 location.

**Local vs on-demand:**
| Use | Object | Latency | Cost |
|---|---|---|---|
| Unit tests, iteration | `LocalSimulator('braket_sv')` | in-proc, ms | free |
| Scale > 25 qubits, noise | `AwsDevice("...simulator/sv1")` | seconds | per-minute |
| Real hardware | `AwsDevice("...qpu/...")` | minutes–hours queue | per-shot + per-task |

**Rule of thumb:** Build and debug against `LocalSimulator`; only swap in an `AwsDevice` ARN for the last mile, because every QPU submission burns real money and queue time.
