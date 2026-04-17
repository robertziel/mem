### AWS Braket Hybrid Jobs — @hybrid_job decorator

**What it is:**
A managed runtime for quantum-classical workloads that need a persistent classical process next to the QPU. Instead of running a VQE/QAOA loop from your laptop (where every `device.run()` re-queues behind other users), you package the whole loop as a Braket Hybrid Job — Braket provisions a container, runs your entry point, and grants the job **priority access** to the selected QPU for its duration. The job is created either via `AwsQuantumJob.create(...)` or the higher-level `@hybrid_job` decorator.

**API shape:**
```python
from braket.jobs import hybrid_job
from braket.jobs.metrics import log_metric

@hybrid_job(device="arn:aws:braket:us-east-1::device/qpu/ionq/Aria-1",
            include_modules=["my_ansatz"])
def vqe(iters: int = 50, lr: float = 0.1):
    ...
```
The decorator returns a *launcher*; calling `vqe(iters=30)` does not run locally — it packages your code, uploads to S3, and kicks off a `BraketHybridJob`. The in-container process is what actually executes `vqe`'s body.

**Key parameters of `@hybrid_job`:**
| Parameter | Purpose |
|---|---|
| `device` | QPU/simulator ARN that the job gets priority on |
| `hyperparameters` | Serialized to JSON, available inside the job via `get_hyperparameters()` |
| `input_data` | S3 URIs mounted into the container |
| `instance_config` | EC2 instance type for the classical driver (`ml.m5.xlarge` default) |
| `role_arn` | IAM execution role — *different* from your user role |
| `image_uri` | Custom container; default is the Braket base image (PennyLane + Braket SDK) |
| `checkpoint_config` | S3 location for resumable state |

**Example — small VQE hybrid job:**
```python
from braket.jobs import hybrid_job
from braket.jobs.metrics import log_metric
from braket.circuits import Circuit
from braket.devices import LocalSimulator

@hybrid_job(device="local:braket/braket_sv", wait_until_complete=False)
def vqe_demo(iters: int = 30, lr: float = 0.2):
    import numpy as np
    from braket.aws import AwsDevice   # available inside the container
    theta = np.array([0.1, 0.2])
    for step in range(iters):
        c = Circuit().rx(0, theta[0]).ry(0, theta[1])
        r = LocalSimulator("braket_sv").run(c, shots=500).result()
        p1 = r.measurement_counts.get("1", 0) / 500
        energy = 1 - 2 * p1          # toy Hamiltonian = Z
        # classical gradient — finite-difference
        grad = np.array([0.01, 0.01])  # stub
        theta -= lr * grad
        log_metric(metric_name="energy", value=energy, iteration_number=step)
    return {"energy": float(energy), "theta": theta.tolist()}

job = vqe_demo(iters=20)
print(job.arn, job.state())
```
`log_metric` writes to CloudWatch; the Braket console plots the curve live.

**Priority queuing:**
During a Hybrid Job's lifetime its quantum tasks jump ahead of regular on-demand tasks on the same device. That's *the* reason to use Hybrid Jobs for VQE/QAOA — it turns a 3-hour wall-clock into minutes of actual compute.

**Cost model:**
Cost = (classical instance-hours) + (per-shot QPU cost) + (per-task QPU cost). Instance hours bill from `starting` to `completed`, including waiting on queued quantum tasks. A stuck VQE is a money leak — always set `maxRuntimeInSeconds`.

**Pitfalls:**
- Hybrid Jobs run under an **execution role**, not your user identity. The role needs `braket:*`, `s3:*` on your buckets, and `logs:*`. Missing `iam:PassRole` is the #1 failure mode.
- The decorator serializes your *module graph* at submit time — globals, open files, and un-serializable captures (DB connections) break the job in the container.
- Custom containers must include `amazon-braket-sdk` and the `braket-job-executor` entrypoint; basing on the official image is strongly recommended.
- You cannot nest Hybrid Jobs. A hybrid job cannot spawn another hybrid job from inside.

**Rule of thumb:** Reach for Hybrid Jobs the moment your loop has more than ~5 QPU submissions — the priority queue alone typically pays for the classical instance-hours, and CloudWatch metrics beat rolling your own log scraping.
