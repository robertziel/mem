### Credential and Token Management — IBM IAM, AWS STS, Azure SAS

**What it is:** Each quantum cloud uses a different auth primitive: **IBM Cloud** issues IAM API keys that mint short-lived bearer tokens. **AWS** uses IAM roles with STS temporary credentials (or legacy long-lived access keys). **Azure Quantum** authenticates via workspace-scoped service principals and shared access signatures. Mixing them up — or leaving any in a git-tracked file — is the leading cause of quantum-cloud spend incidents.

**The three auth models:**

| Provider | Primary credential | Lifetime | Rotation unit |
|---|---|---|---|
| IBM Cloud / Qiskit Runtime | IAM API key → IAM bearer token | Key: indefinite; Token: 1 h | Rotate API key via IAM |
| AWS Braket (recommended) | IAM role + STS temporary creds | 15 min – 12 h | STS renews automatically |
| AWS Braket (legacy) | Access key ID + secret | Indefinite | Rotate manually, audit with Access Analyzer |
| Azure Quantum | Service principal + client secret | Secret: 1–2 y max | Rotate secret, not tenant |
| Azure (delegated) | Workspace SAS / connection string | Configurable | Regenerate via portal |

**Canonical pattern — load all three from env + secret manager:**
```python
import os, boto3
from qiskit_ibm_runtime import QiskitRuntimeService
from azure.identity import ClientSecretCredential
from azure.quantum import Workspace
from braket.aws import AwsSession

# IBM — API key sourced from env, never a file committed to git
ibm = QiskitRuntimeService(channel="ibm_quantum_platform",
                           token=os.environ["QISKIT_IBM_TOKEN"],
                           instance=os.environ["QISKIT_IBM_INSTANCE"])

# AWS — STS role assumption beats static keys; 1h token
sts = boto3.client("sts").assume_role(
    RoleArn=os.environ["AWS_BRAKET_ROLE"],
    RoleSessionName="quantum-job", DurationSeconds=3600,
)["Credentials"]
aws = AwsSession(boto_session=boto3.Session(
    aws_access_key_id=sts["AccessKeyId"],
    aws_secret_access_key=sts["SecretAccessKey"],
    aws_session_token=sts["SessionToken"], region_name="us-east-1"))

# Azure — service principal via Key Vault-backed env vars
ws = Workspace(subscription_id=os.environ["AZ_SUBSCRIPTION_ID"],
    resource_group="qrg", name="ws1", location="eastus",
    credential=ClientSecretCredential(os.environ["AZ_TENANT_ID"],
        os.environ["AZ_CLIENT_ID"], os.environ["AZ_CLIENT_SECRET"]))
```
Attach a minimum-privilege IAM policy (`braket:CreateQuantumTask`, `braket:GetQuantumTask`, scoped S3) to the AWS role. Prefer **managed identity** on Azure VMs / Functions — no secret to rotate at all.

**Key rotation discipline:**

| Credential | Rotation cadence | Method |
|---|---|---|
| IBM API key | Quarterly; immediately on suspected exposure | Create new key, update secret manager, delete old |
| AWS IAM user key | ≤ 90 days (or never — use roles) | `aws iam create-access-key` → swap → `delete-access-key` |
| AWS STS token | Auto (15 min – 12 h) | Set `DurationSeconds` appropriately |
| Azure client secret | ≤ 12 months (6 if exposed to CI) | Create new with overlap window, swap, revoke old |
| Azure SAS | Regenerate weekly for persistent access | Portal or `az storage account keys renew` |

**Storage — what to use and never use:**

| Good | Bad |
|---|---|
| AWS Secrets Manager, HashiCorp Vault, Azure Key Vault | `.env` committed to git |
| 1Password / Bitwarden CLI (`op read`) on dev laptops | Plaintext in Jupyter cells |
| GitHub Actions secrets (CI only) | `~/.qiskit/qiskit-ibm.json` with 0644 perms |
| Short-lived tokens via OIDC federation | Shared team account with permanent keys |

**Decision rule:**
- Running locally → secret manager CLI → env vars → SDK. Never touch a config file.
- Running in CI → OIDC federation if available; else scoped secret with 24h lifetime.
- Running on cloud compute → **managed identity or IAM role**. Zero secrets on disk.

**Detection & incident response:**
- Enable AWS CloudTrail for Braket API calls; alarm on `CreateQuantumTask` outside expected source IPs.
- IBM exposes recent jobs per instance; daily cron should diff against expected workload.
- Azure Activity Log + Cost Anomaly Detection flag unusual workspace submissions.
- On suspected exposure: **rotate first, investigate second**. Every hour of delay is billable at QPU rates.

**Pitfalls:**
- Storing tokens in `~/.qiskit/qiskit-ibm.json` in plaintext — default 0644. `chmod 600` minimum; prefer secret manager.
- Long-lived AWS access keys in CI. Use OIDC federation with GitHub/GitLab — zero persistent secrets.
- Reusing one IBM API key across dev/staging/prod. A leaked notebook from staging burns prod budget.
- Azure service principal with `Owner` on the subscription — scope to the workspace resource only.
- Logging full SDK responses in debug mode; job IDs are mostly safe but token echoes are not.
- `printenv | grep -i token` leaves tokens in shell history. Scrub `~/.zsh_history` or use `HISTCONTROL=ignorespace`.

**Rule of thumb:** Use short-lived credentials everywhere you can (STS, IAM tokens, managed identity), rotate long-lived secrets on a calendar you keep *before* they leak, and never commit anything from `os.environ` into source — because a leaked quantum credential will spend faster than your billing alarm can fire.
