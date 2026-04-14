### Terraform Basics

**What Terraform does:**
- Declarative Infrastructure as Code (IaC)
- Provider-agnostic (AWS, GCP, Azure, Kubernetes, Datadog, etc.)
- Tracks state of managed infrastructure
- Plans changes before applying

**Core workflow:**
```bash
terraform init      # download providers and modules, initialize backend
terraform plan      # preview changes (diff between desired and actual)
terraform apply     # apply changes (creates/updates/deletes resources)
terraform destroy   # destroy all managed resources
```

**Basic configuration:**
```hcl
# provider.tf
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}
```

```hcl
# main.tf
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.private.id

  tags = {
    Name        = "web-server"
    Environment = var.environment
  }
}

output "instance_ip" {
  value = aws_instance.web.private_ip
}
```

```hcl
# variables.tf
variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Must be dev, staging, or prod."
  }
}
```

**Key concepts:**
- **Resource** - infrastructure object to create/manage
- **Data source** - read existing infrastructure (not managed by this config)
- **Variable** - input parameter
- **Output** - expose values (for other modules or display)
- **Provider** - plugin for a specific platform (AWS, GCP, etc.)
- **Provisioner** - run scripts on resource (avoid; use user_data or Ansible instead)

**Useful commands:**
```bash
terraform fmt              # format code
terraform validate         # syntax check
terraform state list       # list managed resources
terraform state show aws_instance.web    # show resource details
terraform import aws_instance.web i-123  # import existing resource
terraform apply -replace=aws_instance.web  # force recreation on next apply (replaces deprecated `taint`)
terraform output                         # show outputs
```

**Rule of thumb:** Always run `plan` before `apply`. Use remote state with locking. Pin provider versions. Never edit state manually.
