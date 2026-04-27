### AWS Braket Cost Controls — maxTaskCost, quotas, CloudWatch alarms

**What it is:**
A layered set of guardrails for keeping Braket spend bounded while you iterate. Braket bills on three axes — per-task (fixed, ~$0.30 on most QPUs), per-shot (QPU- and vendor-specific, from $0.00035 to $0.035), and on-demand simulator minutes. A single runaway script can spend hundreds of dollars in seconds. The controls are: **per-task `max_cost`**, **per-account service quotas**, and **CloudWatch billing/metric alarms**.

**API shape — per-task cost cap:**
```python
from braket.aws import AwsDevice, AwsQuantumTask
from braket.circuits import Circuit

device = AwsDevice("arn:aws:braket:us-east-1::device/qpu/ionq/Aria-1")
circ = Circuit().h(0).cnot(0, 1)

task = device.run(
    circ,
    shots=10_000,
    tags={"project": "bell-demo", "owner": "alice"},
    max_cost=5.00,           # HARD STOP — task aborts if projected cost exceeds $5
)
```
`max_cost` is evaluated against the device's per-shot × shots + per-task price. Exceeding it raises `ValidationException` *before* any shots run — no partial billing.

**Service quotas worth raising (or lowering):**
| Quota | Default | Notes |
|---|---|---|
| Concurrent on-demand simulator tasks | ~ 50 | SV1/DM1/TN1 combined |
| Concurrent QPU tasks | 1–5 per device | vendor-specific |
| Max shots per task | 100,000 | can't exceed without quota increase |
| Quantum tasks per month (soft) | Account-level | tighten this to cap blast radius |

All live in Service Quotas console under `braket`. The `BRAKET_ON_DEMAND_SIMULATOR` throttle will return `ThrottlingException` on excess submissions — not silent loss of tasks, but will still abort batch jobs.

**CloudWatch alarms:**
Braket publishes custom metrics under `AWS/Braket`:
- `TaskCount` — per device, per status
- `TaskDuration` — per device
- AWS billing publishes `EstimatedCharges` with `ServiceName=AmazonBraket`

Typical safety alarm (pseudo-Terraform):
```python
import boto3
cw = boto3.client("cloudwatch")
cw.put_metric_alarm(
    AlarmName="BraketDailySpendOver100",
    MetricName="EstimatedCharges",
    Namespace="AWS/Billing",
    Dimensions=[{"Name":"ServiceName","Value":"AmazonBraket"},
                {"Name":"Currency","Value":"USD"}],
    Statistic="Maximum", Period=21600, EvaluationPeriods=1,
    Threshold=100.0, ComparisonOperator="GreaterThanThreshold",
    AlarmActions=["arn:aws:sns:us-east-1:1234:billing-topic"],
)
```
Pair with an SNS topic that emails you *and* triggers a Lambda that calls `braket:CancelQuantumTask` on all `RUNNING | QUEUED` tasks — a programmable kill-switch.

**Tagging strategy:**
Every task supports `tags={...}`. Combined with Cost Explorer's cost-allocation tags this lets you slice spend by project, user, or experiment. Enable the tag keys in Billing → Cost allocation tags before they become queryable.

**Defence-in-depth recipe:**
| Layer | Control |
|---|---|
| Code | `max_cost=X` on every `device.run()` |
| Account | Service quota cap on concurrent QPU tasks |
| Monitoring | CloudWatch alarm on `EstimatedCharges` |
| Response | SNS + Lambda that cancels in-flight tasks |
| Audit | Cost-allocation tags on every task |

**Pitfalls:**
- `max_cost` does *not* cover queued tasks that haven't started — a script submitting 200 tasks in a tight loop can still rack up 200 × per-task fees.
- On-demand simulator billing is per minute, not per shot — `max_cost` does not apply to SV1/DM1/TN1. Budget via quotas + alarms instead.
- Pricing is region- and vendor-specific; a `max_cost=5` that was fine last quarter may reject after a price bump. Read `device.properties.paradigm.cost` at runtime if you care.
- Billing alarms lag ~6 hours. Don't rely on them as real-time circuit breakers — use in-loop guards for that.

**Rule of thumb:** Always ship a kill-switch before your first QPU submission — `max_cost` in the code, a quota cap on the account, and a CloudWatch alarm that emails or triggers cancellation — because Braket will happily spend your entire credit balance on a misplaced `for` loop.
