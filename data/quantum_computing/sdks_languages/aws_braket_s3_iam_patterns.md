### AWS Braket S3 and IAM Patterns

**What it is:**
Braket tasks don't return results to the caller — they write them to S3, and the SDK fetches them on `task.result()`. Which bucket, under which role, and with which KMS key is all your responsibility. Getting S3 and IAM right is the difference between a clean prod deployment and tasks that run, bill, and then 403 when you try to download the answer.

**The result-bucket rule:**
Braket will only write to buckets whose name starts with **`amazon-braket-`**. This is hard-coded — you cannot substitute another prefix, cross-account writes still require the prefix. Additional constraints:
- Bucket must be in the **same region** as the task submission.
- Bucket must allow `PutObject` from the Braket service principal (`braket.amazonaws.com`).
- If SSE-KMS is on, the key policy must grant `kms:GenerateDataKey` to the Braket service principal *and* to any downstream consumer role.

**S3 layout per task:**
```
s3://amazon-braket-myacct/
  my/prefix/
    <task-arn>/
      results.json          ← measurement counts, metadata
      input/action.json     ← circuit payload Braket received
```
`AwsQuantumTask.result()` simply fetches `results.json` at the ARN path — so renaming or deleting it retroactively breaks `.result()`.

**API shape:**
```python
task = device.run(
    circuit,
    s3_destination_folder=("amazon-braket-myacct", "bell/"),
    shots=1000,
)
# Rehydrate later (even from another machine):
from braket.aws import AwsQuantumTask
task = AwsQuantumTask(arn="arn:aws:braket:us-east-1:1234:quantum-task/...")
result = task.result()   # downloads results.json from S3
```

**IAM roles — two flavours:**
| Role | Used for | Key permissions |
|---|---|---|
| **User / caller** | `device.run`, `.result()`, Notebook sessions | `braket:*`, `s3:GetObject` on result buckets |
| **Hybrid Job execution role** | The container Braket runs on your behalf | `braket:*`, `s3:*` on buckets, `logs:*`, `iam:PassRole` |

**Trust policy for the Hybrid Jobs execution role:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "braket.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
```

**Permissions policy (minimum viable):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow",
      "Action": ["braket:CreateQuantumTask","braket:CancelQuantumTask",
                 "braket:GetQuantumTask","braket:SearchQuantumTasks"],
      "Resource": "*" },
    { "Effect": "Allow",
      "Action": ["s3:GetObject","s3:PutObject","s3:ListBucket"],
      "Resource": ["arn:aws:s3:::amazon-braket-myacct",
                   "arn:aws:s3:::amazon-braket-myacct/*"] },
    { "Effect": "Allow",
      "Action": ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],
      "Resource": "*" }
  ]
}
```

**Common failure modes:**
| Symptom | Root cause |
|---|---|
| `Bucket must begin with 'amazon-braket-'` | Wrong bucket name |
| `CrossRegionAccessException` | Task region ≠ bucket region |
| `.result()` 403 AccessDenied | Caller can submit but lacks `s3:GetObject` |
| Hybrid Job stuck in `starting` | Execution role missing `iam:PassRole` |
| Cannot decrypt results | SSE-KMS key policy excludes caller or service |

**Hardening patterns:**
- **Per-project buckets** (`amazon-braket-<team>-<project>`), lifecycle-ruled to auto-delete old results.
- **Bucket policy** that restricts `PutObject` to `aws:SourceAccount == <your-account>`, blocking confused-deputy writes.
- **Separate read/write roles** — analysts get only `s3:GetObject`; only CI identities get `braket:CreateQuantumTask`.
- **VPC endpoints** for `braket` and `s3` so traffic stays inside your VPC.

**Pitfalls:**
- Deleting the results S3 object makes `.result()` permanently fail — tasks remain `COMPLETED` but unreadable.
- Default bucket created by Braket notebooks is account-wide and often oversized on permissions — replace with a scoped bucket for real workloads.
- `AwsQuantumJob` writes *both* logs and results to the specified prefix; lifecycle rules that delete "old results" may also wipe audit logs.

**Rule of thumb:** Treat the `amazon-braket-*` bucket as the actual source of truth for task output; your IAM roles, KMS keys, and region must all line up with it, or the task runs but the results disappear behind a 403.
