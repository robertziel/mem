### Immutable vs Mutable Infrastructure

**Mutable infrastructure:**
- Servers are updated in-place (apt upgrade, deploy new code, change config)
- Configuration drift: servers diverge over time ("snowflake servers")
- Tools: Ansible, Chef, Puppet
- Risk: "works on server A but not server B" because they drifted apart

**Immutable infrastructure:**
- Servers are never modified after creation
- Changes = build new image, replace old instances
- Tools: Packer (AMIs), Docker, Terraform
- Every deployment is a fresh, known-good state

**Comparison:**

| Aspect | Mutable | Immutable |
|--------|---------|-----------|
| Updates | In-place (ssh, apt, deploy) | Replace (new AMI/container) |
| Drift | Likely over time | Impossible by design |
| Rollback | Reverse changes (risky) | Deploy previous image (easy) |
| Debugging | "What happened to this server?" | "What's in this image?" |
| Scaling | Config new servers (slow) | Launch from image (fast) |
| State | On the server | External (S3, RDS, EFS) |

**Immutable infrastructure workflow:**
```
Code change -> Build Docker image / AMI -> Test -> Deploy new instances -> Kill old instances
```

**Packer (build machine images, HCL2 format):**
```hcl
source "amazon-ebs" "base" {
  ami_name      = "myapp-${formatdate("YYYYMMDDhhmmss", timestamp())}"
  source_ami    = "ami-0123456789abcdef0"
  instance_type = "t3.micro"
  ssh_username  = "ubuntu"
}

build {
  sources = ["source.amazon-ebs.base"]
  provisioner "shell" {
    script = "setup.sh"
  }
}
```

**Key requirement for immutable infra:**
- Externalize all state: databases, file storage (S3/EFS), sessions (Redis)
- Twelve-Factor App principles: config via environment, stateless processes
- Logs to stdout (shipped externally)

**When mutable still makes sense:**
- Legacy systems that can't be containerized
- Long-running stateful servers (databases, though managed services are better)
- Quick hotfixes (but prefer immutable even here)

**Rule of thumb:** Prefer immutable infrastructure. Containers (Docker + K8s) are the most common implementation. Externalize all state. If you SSH into a production server to fix something, your process is broken.
