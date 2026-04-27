### Terraform State

**What is state:**
- JSON file mapping your config to real infrastructure
- Terraform uses it to know what it manages and to compute diffs
- Without state, Terraform has no idea what exists

**Local vs remote state:**

| Feature | Local | Remote (S3 + DynamoDB) |
|---------|-------|------------------------|
| File | `terraform.tfstate` | S3 bucket |
| Team collaboration | No (conflicts) | Yes |
| Locking | No | Yes (DynamoDB) |
| Encryption | No | Yes (SSE) |
| Use case | Local dev only | All team/CI usage |

**Remote backend setup (AWS):**
```hcl
terraform {
  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "services/web/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"    # prevents concurrent applies
    encrypt        = true
  }
}
```

**State locking:**
- Prevents two people running `apply` simultaneously
- DynamoDB for S3 backend, built-in for Terraform Cloud
- Lock is acquired on `plan`/`apply`, released after
- `terraform force-unlock LOCK_ID` if lock is stuck (use cautiously)

**State commands:**
```bash
terraform state list                          # list all resources in state
terraform state show aws_instance.web         # details of one resource
terraform state mv aws_instance.old aws_instance.new   # rename without recreate
terraform state rm aws_instance.web           # remove from state (doesn't destroy)
terraform state pull                          # download remote state
```

**Drift detection:**
- `terraform plan` detects drift (manual changes outside Terraform)
- Plan shows what Terraform would change to match config
- Options: update config to match reality, or apply to revert drift

**State file security:**
- Contains sensitive data (passwords, keys in plaintext)
- Never commit to Git
- Encrypt at rest (S3 SSE, backend encryption)
- Restrict access (IAM policies on S3 bucket)

**Workspaces (state isolation):**
```bash
terraform workspace new staging
terraform workspace select production
terraform workspace list
```
- Each workspace has its own state file
- Alternative: separate directories per environment (more explicit)

**Rule of thumb:** Always use remote state with locking for anything beyond solo dev. Never manually edit state. Use `state mv` for renames. Treat state as sensitive data.
