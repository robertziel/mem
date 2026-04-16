### HashiCorp Certified: Terraform Associate (003)

**The IaC gateway cert.** Validates ability to use Terraform for infrastructure automation. Open-book exam, relatively easy, high industry recognition.

**Exam logistics:**
- Code: 003 (current version)
- Duration: 60 min, 57 questions (multiple choice + multiple response + text match + true/false)
- Passing: 70% (not officially published, inferred from retakes)
- Cost: $70.50 USD
- Validity: 2 years
- Format: online proctored
- **No prerequisites**

**Exam domains (9 objectives, roughly equal weight):**

| Domain | Focus |
|---|---|
| 1. Understand IaC concepts | Declarative vs imperative, benefits, versioning |
| 2. Understand purpose of Terraform (vs others) | Multi-cloud, state, providers, modules |
| 3. Understand Terraform basics | Providers, resources, data sources, init workflow |
| 4. Use Terraform outside core workflow | `import`, workspaces, `terraform state mv/rm` |
| 5. Interact with Terraform modules | Module sources, versioning, inputs/outputs |
| 6. Use the core Terraform workflow | init / validate / plan / apply / destroy |
| 7. Implement and maintain state | Local vs remote state, locking, backends |
| 8. Read, generate, and modify configuration | HCL syntax, variables, expressions, functions |
| 9. Understand Terraform Cloud capabilities | Remote operations, VCS integration, Sentinel |

**Core CLI commands (must know):**
```bash
terraform init            # download providers, set up backend
terraform fmt             # format .tf files
terraform validate        # syntax + semantic check (no provider calls)
terraform plan            # preview changes (can save to file)
terraform apply           # apply (with auto-approve flag in CI)
terraform destroy         # tear down

# State
terraform state list
terraform state show <addr>
terraform state mv <src> <dst>      # rename in state without destroy/recreate
terraform state rm <addr>            # forget resource (not destroy)
terraform state pull > state.json
terraform state push state.json
terraform import <addr> <id>         # adopt existing resource into state

# Workspaces
terraform workspace list / new / select / delete

# Introspection
terraform output [name]
terraform graph
terraform console         # REPL for testing expressions
```

**HCL patterns to know:**
```hcl
# Variables
variable "region" {
  type    = string
  default = "us-east-1"
  validation {
    condition     = contains(["us-east-1", "eu-west-1"], var.region)
    error_message = "Region must be us-east-1 or eu-west-1"
  }
}

# Data source (read, not manage)
data "aws_ami" "ubuntu" {
  most_recent = true
  filter { name = "name"; values = ["ubuntu-*"] }
  owners = ["099720109477"]
}

# Resource
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  count         = var.create ? 1 : 0
  # or: for_each = toset(var.names)
}

# Output
output "instance_ip" {
  value     = aws_instance.web[*].public_ip
  sensitive = false
}

# Module
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"          # version constraint
  cidr    = "10.0.0.0/16"
}

# Backend (remote state)
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = { source = "hashicorp/aws"; version = "~> 5.0" }
  }
  backend "s3" {
    bucket = "my-tf-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
    dynamodb_table = "tf-locks"      # state locking
    encrypt = true
  }
}
```

**Key exam concepts:**
- **Terraform state** — where Terraform tracks real-world resources; NEVER manually edit the state file
- **State locking** — prevents concurrent applies (S3+DynamoDB, Consul, Terraform Cloud)
- **Remote state** — S3, Azure Storage, GCS, Consul, Terraform Cloud; supports workspaces
- **Module versioning** — `version = "~> 3.0"` (allow patch/minor), `"= 3.0.2"` (pin exact), `">= 3, < 4"` (range)
- **Dependencies** — implicit (references) vs explicit (`depends_on`)
- **Count vs for_each** — count: list-indexed, breaks on insert/delete middle; for_each: key-based, stable
- **Sensitive values** — `sensitive = true` on variables/outputs hides from plan output
- **Provisioners** — `local-exec`, `remote-exec`, `file`; last resort (HashiCorp prefers config management tools)
- **Terraform Cloud features** — remote runs, VCS triggers, Sentinel (policy-as-code), private module registry, workspace variables

**Common gotchas tested:**
- `terraform plan` exit codes: 0 = no changes, 1 = error, 2 = changes pending (with `-detailed-exitcode`)
- `.terraform.lock.hcl` is committed, locks provider versions
- `.tfvars` auto-loaded: `terraform.tfvars`, `*.auto.tfvars`
- Env vars: `TF_VAR_<name>` for variables, `TF_LOG=DEBUG` for debug logging
- `terraform init -upgrade` to get newer provider versions
- `terraform refresh` deprecated as standalone; now `plan/apply -refresh-only`

**Study path:**
- HashiCorp's free Terraform Associate learning path (study guide + labs)
- Zeal Vora / Bryan Krausen courses on Udemy
- Terraform documentation (key reference)
- Practice exams (Bryan Krausen Practice Exams on Udemy)

**Existing memos:**
- `devops/infrastructure_as_code/` — Terraform files already present

**Who it's for:** Anyone using Terraform — DevOps, platform engineers, cloud engineers, SREs. Prep time: 20-40 hours with Terraform experience; 60-80 hours without.

**Rule of thumb:** Easiest major cert — 60 questions in 60 minutes, pass with reasonable hands-on experience + 2 weeks of focused study. Know state management inside-out (backends, locking, import, mv/rm) — that's where the trick questions live. Know the difference between count and for_each. Understand Terraform Cloud features even if you've never used them (they appear on the exam).
