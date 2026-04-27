### Terraform Modules

**What modules do:**
- Reusable, encapsulated groups of resources
- Like functions: inputs (variables), outputs, internal logic
- DRY: define once, use for multiple environments/services

**Module structure:**
```
modules/
  vpc/
    main.tf
    variables.tf
    outputs.tf
  ecs-service/
    main.tf
    variables.tf
    outputs.tf
environments/
  production/
    main.tf          # calls modules
    terraform.tfvars
  staging/
    main.tf
    terraform.tfvars
```

**Using a module:**
```hcl
module "vpc" {
  source = "../../modules/vpc"

  cidr_block  = "10.0.0.0/16"
  environment = "production"
  az_count    = 3
}

module "web_service" {
  source = "../../modules/ecs-service"

  name        = "web"
  image       = "123456.dkr.ecr.us-east-1.amazonaws.com/web:abc123"
  vpc_id      = module.vpc.vpc_id           # reference output from another module
  subnet_ids  = module.vpc.private_subnet_ids
}
```

**Module sources:**
```hcl
# Local path
source = "./modules/vpc"

# Terraform Registry
source  = "terraform-aws-modules/vpc/aws"
version = "5.1.0"

# Git
source = "git::https://github.com/org/modules.git//vpc?ref=v1.2.0"

# S3
source = "s3::https://bucket.s3.amazonaws.com/modules/vpc.zip"
```

**Module best practices:**
- Always pin module versions (`version = "5.1.0"`, `ref=v1.2.0`)
- Keep modules focused (one responsibility)
- Expose only necessary variables
- Document with `description` on variables and outputs
- Use community modules for standard infrastructure (VPC, EKS, RDS)
- Test modules with Terratest or `terraform plan` in CI

**Project organization patterns:**
- **Flat** - all in one directory (small projects)
- **Environment directories** - `env/prod/`, `env/staging/` each calling shared modules
- **Terragrunt** - wrapper that reduces boilerplate for multi-environment setups

**Rule of thumb:** Use modules for anything you create more than once. Pin versions. Prefer official registry modules for standard AWS resources. Keep modules small and composable.
