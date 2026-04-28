### Terraform State

**Definition:** Terraform's **state file** is the JSON map between your config and real infrastructure. Without state, Terraform has **no idea what exists** — every plan would propose creating everything from scratch. Use **remote state with locking** for any team or CI usage.

**What state holds:**

| Piece | Detail |
|---|---|
| Resource → infra mapping | `aws_instance.web` → `i-0abc...` |
| Resource attributes | All data Terraform fetched |
| Resource dependencies | DAG between resources |
| Outputs | Computed values |
| Sensitive data | **Plaintext** unless explicit |
| Provider config / version | For reproducibility |

**Local vs remote state:**

| Property | Local (default) | Remote (S3 + DynamoDB / Terraform Cloud) |
|---|---|---|
| File | `terraform.tfstate` (working dir) | S3 / TFC backend |
| Team sharing | ❌ — collaboration breaks | ✅ — central source of truth |
| Locking | ❌ — concurrent applies corrupt | ✅ — DynamoDB / built-in |
| Encryption at rest | ❌ | ✅ (SSE) |
| Audit trail | git or nothing | S3 versioning + access logs |
| Use case | Solo experiments | **All team / CI** |

> Move to remote state on day one of team usage. Local state on a shared repo is a footgun.

**Remote backend example (AWS):**

```hcl
terraform {
  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "services/web/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
    kms_key_id     = "alias/terraform-state"
  }
}
```

| Setting | Purpose |
|---|---|
| `bucket` | S3 bucket holding state |
| `key` | Path within bucket |
| `dynamodb_table` | Lock table (CreateTable: PK = `LockID`) |
| `encrypt = true` | SSE-S3 |
| `kms_key_id` | Or SSE-KMS (preferred for compliance) |
| Versioning | **Enable on bucket** for state recovery |

**Backends compared:**

| Backend | Pros | Cons |
|---|---|---|
| **S3 + DynamoDB** | Mature, ubiquitous | Self-managed |
| **Terraform Cloud / Enterprise** | Locking + UI + run history | Cost; vendor |
| **Azure Blob** | Native locking | Azure-only |
| **GCS** | Built-in locking | GCP-only |
| **HTTP** | Custom | DIY locking |
| **Consul** | HA, distributed | Consul ops |
| **PG** (community) | Familiar | Self-managed |

**State locking — what it solves:**

| Without lock | With lock |
|---|---|
| Two `apply`s race | First-come-first-serve |
| State corrupted | Atomic |
| Confusing diffs | Predictable |
| Lock acquired on `plan` and `apply` | Released after |
| `terraform force-unlock LOCK_ID` | Use only if truly stuck |

**State commands:**

| Command | Purpose |
|---|---|
| `terraform state list` | All resources in state |
| `terraform state show aws_instance.web` | Inspect one |
| `terraform state mv aws_instance.old aws_instance.new` | Rename without recreate |
| `terraform state mv -state-out=other.tfstate aws_instance.web aws_instance.web` | Move to another state file |
| `terraform state rm aws_instance.web` | Drop from state (doesn't destroy) |
| `terraform state pull` | Download remote state |
| `terraform state push <file>` | Push local → remote (dangerous) |
| `terraform state replace-provider` | Migrate provider |
| `terraform import aws_instance.web i-0abc...` | Bring existing resource into state |

**Drift detection workflow:**

```
1. Someone manually edits infra in console
2. terraform plan detects mismatch
3. Plan shows: "infra has X, config wants Y"
4. Decision:
   a. Update config to match (preserve manual change)
   b. Apply to revert to config
```

| Drift cause | Detection |
|---|---|
| Manual console edits | `plan` shows changes |
| Other tools touching same resources | `plan` shows changes |
| Resource deleted out-of-band | `plan` proposes recreating |
| Auto-scaling counts changing | Often suppressed via `lifecycle.ignore_changes` |
| External tag mutations | Same |

**`lifecycle` block — control drift behavior:**

```hcl
resource "aws_instance" "web" {
  ami           = "ami-..."
  instance_type = "t3.medium"

  lifecycle {
    ignore_changes        = [tags["LastModifiedBy"]]
    prevent_destroy       = true     # block destroy
    create_before_destroy = true     # zero-downtime replace
  }
}
```

| Hook | Effect |
|---|---|
| `ignore_changes` | Don't drift on these fields |
| `prevent_destroy` | Block destroy entirely |
| `create_before_destroy` | New resource exists before old destroyed |
| `replace_triggered_by` | Force replace when listed resource changes |

**Workspaces vs separate dirs — environment isolation:**

| Approach | Pros | Cons |
|---|---|---|
| **Workspaces** (`terraform workspace new staging`) | Quick switch; same code | Same backend; easy to mistake env |
| **Separate state files** (`environments/staging/`) | Clear separation; per-env config | More boilerplate |
| **Terragrunt / similar** | DRY plus separation | Tool-on-tool complexity |

> Most teams prefer **separate directories per environment** for clarity. Workspaces are fine for short-lived branches.

**Workspace commands:**

```bash
terraform workspace new staging
terraform workspace select production
terraform workspace list
terraform workspace show
```

**State file security — it has secrets:**

| Risk | Mitigation |
|---|---|
| Plaintext passwords / API keys | Encrypt at rest (SSE / KMS) |
| Accidentally committed | `.gitignore terraform.tfstate*` |
| Wide IAM access | Restrict S3 bucket policy |
| Audit trail | S3 versioning + CloudTrail |
| Sensitive in `output`? | Mark with `sensitive = true` |
| Snapshots / backups | Versioned bucket = built-in |

**Importing existing resources:**

```hcl
# 1. Write config first
resource "aws_instance" "legacy" {
  # config (Terraform will validate against import)
}

# 2. Run import
$ terraform import aws_instance.legacy i-0abc123def456

# 3. Run plan — confirm no diff
# 4. Iterate until plan is clean
```

| Property | Detail |
|---|---|
| State updated | Imported resource now tracked |
| Config NOT generated | You must write it |
| `terraform plan -generate-config-out=...` (1.5+) | Auto-generate |
| Always run plan after import | Verify match |

**Migration safety patterns:**

| Need | Pattern |
|---|---|
| Rename resource | `terraform state mv` |
| Move resource between modules | `state mv` with `-state` flag |
| Move state file to new backend | `terraform init -migrate-state` |
| Refactor module | `moved` block (1.1+) — declarative |
| Stop managing | `state rm` (doesn't destroy) |

**`moved` block (declarative renames):**

```hcl
moved {
  from = aws_instance.web_old
  to   = aws_instance.web
}
```

> `moved` blocks survive in code; `state mv` is one-time imperative.

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Editing state JSON directly | Corruption |
| Local state on shared codebase | Concurrent apply corrupts |
| Plaintext state in version control | Secrets leaked |
| `force-unlock` casually | Allows concurrent applies |
| Missing `dynamodb_table` | No locking |
| One state for everything | Plan time grows linearly; blast radius huge |
| Workspaces with very different infra | Drift between them |
| Importing without writing config first | Plan shows replacement |
| Not pinning provider version | Plan changes between machines |
| Skipping `terraform init` after backend change | Confusing errors |

**State sizing — when to split:**

| Signal | Action |
|---|---|
| `plan` takes > 1 minute | Split |
| State file > 10 MB | Split |
| Many unrelated services in one state | Split per service |
| Hundreds of resources | Split per logical boundary |
| Different teams owning different parts | Split + separate IAM |

**Decision matrix:**

| Need | Pick |
|---|---|
| Solo project | Local state OK |
| Team or CI | Remote state + locking |
| AWS-heavy | S3 + DynamoDB |
| GCP-heavy | GCS native |
| Want UI / approvals | Terraform Cloud / Enterprise |
| Multi-env separation | Per-dir > workspaces (usually) |
| Reusable modules | Module-level state + outputs |

**Cross-references:**

- IaC overview: [iac_*.md](iac_terraform_pulumi_cloudformation.md)
- AWS IAM (S3 access policies): [iam_*.md](../../cloud_aws/iam_roles_policies_least_privilege.md)
- CI/CD (running Terraform in pipeline): [cicd_pipeline_*.md](../ci_cd/cicd_pipeline_design.md)

**Rule of thumb:** **Always use remote state with locking for anything beyond solo dev.** S3 + DynamoDB on AWS is the standard; Terraform Cloud adds UI and approvals. **Never edit state JSON directly** — use `state mv`, `import`, `rm`. **Treat state as sensitive** (encrypt, restrict, version). Split state per service/team to keep plan time and blast radius small.
