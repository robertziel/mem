### Immutable vs Mutable Infrastructure

**Definition:** **mutable** infrastructure updates servers in-place (`apt upgrade`, deploy code, change config). **Immutable** infrastructure never modifies running servers — changes mean **building a new image and replacing instances**. Immutable wins on consistency, rollback, scaling, debugging — at the cost of state-management discipline.

**Side-by-side:**

| Aspect | **Mutable** | **Immutable** |
|---|---|---|
| Update mechanism | In-place (SSH, apt, deploy script) | Replace (new image / container) |
| Configuration drift | **Likely** over time ("snowflake servers") | Impossible by design |
| Rollback | Reverse changes (risky) | Deploy previous image (easy) |
| Debugging | "What happened to this server?" | "What's in this image version?" |
| Scaling | Configure new servers (slow, error-prone) | Launch from image (fast) |
| State location | On the server | **External** (S3, RDS, EFS) |
| Tooling | Ansible, Chef, Puppet | Packer, Docker, Terraform |
| CI/CD pattern | Long-lived servers + deploy script | Build pipeline → image → replace |

**Mutable workflow (the legacy way):**

```
1. New code → SSH into server → run deploy script
2. Updates → SSH → run apt upgrade
3. Config change → SSH → edit file
4. Drift accumulates over time
5. Server X works, server Y doesn't (mystery)
```

**Immutable workflow (the modern way):**

```
1. Code change → Build new Docker image (or AMI) with Packer
2. Test image
3. Deploy: launch new instances from image
4. Health check passes → kill old instances
5. Server is replaced, never modified
```

**Common patterns:**

| Pattern | Detail |
|---|---|
| **Containers (Docker)** | Most common today; image = artifact |
| **VM images (AMIs via Packer)** | EC2-native; longer build, faster boot |
| **Serverless (Lambda)** | Inherently immutable per-invocation |
| **K8s Deployments** | Rolling update with image version |
| **Blue/Green** with images | Two image versions side by side |

**Packer example — build a machine image:**

```hcl
source "amazon-ebs" "base" {
  ami_name      = "myapp-${formatdate("YYYYMMDDhhmmss", timestamp())}"
  source_ami    = "ami-0123456789abcdef0"
  instance_type = "t3.micro"
  ssh_username  = "ubuntu"
  region        = "us-east-1"
}

build {
  sources = ["source.amazon-ebs.base"]
  provisioner "shell" {
    script = "setup.sh"
  }
}
```

| Property | Detail |
|---|---|
| Source AMI as base | Stable parent |
| Provisioner runs once | At build time |
| Output: AMI ID | Used by Terraform / ASG |
| Built periodically | Even without code change (security patches) |

**Externalizing state — the prerequisite for immutability:**

| State type | Location |
|---|---|
| **Application data** | RDS, DynamoDB |
| **File uploads** | S3, EFS |
| **Sessions** | Redis, DynamoDB |
| **Logs** | CloudWatch, ELK, Datadog |
| **Secrets** | Secrets Manager, Parameter Store, Vault |
| **Config** | Environment variables, Parameter Store |
| **Static assets** | S3 + CDN |
| **Cache** | ElastiCache (Redis / Memcached) |

> **If you SSH into a production server to fix something, the immutable design has been broken.**

**Twelve-Factor App alignment:**

| Factor | How |
|---|---|
| Codebase | One codebase, many deploys |
| Dependencies | Declared explicitly (`requirements.txt`, `Gemfile.lock`) |
| Config | Via environment variables |
| Backing services | Treat as attached resources |
| Build, release, run | Strict separation |
| Stateless processes | No local memory between requests |
| Port binding | Self-contained service |
| Concurrency | Scale via process model |
| Disposability | Start fast, shut gracefully |
| Dev/prod parity | Same images everywhere |
| Logs | Stdout streams |
| Admin processes | One-off tasks via image |

**When mutable still makes sense:**

| Signal | Why |
|---|---|
| Legacy systems that can't be containerized | Migration cost too high |
| Long-running stateful servers | DBs, especially self-managed |
| Quick hotfixes (rare!) | Speed over hygiene |
| Constraints (no container runtime) | Embedded, regulated environments |
| Existing investment in Ansible / Chef / Puppet | Don't re-platform |

**Trade-offs to acknowledge:**

| Aspect | Mutable | Immutable |
|---|---|---|
| Build time | Fast (just deploy code) | Slower (rebuild image) |
| Disk space | Lower | Higher (image registry) |
| Hot-fix speed | Faster (SSH + edit) | Slower (rebuild + redeploy) |
| Operational maturity required | Lower | Higher (need CI/CD, registry, externalized state) |
| Long-term reliability | Lower (drift) | Higher (consistency) |

**Containers vs AMIs:**

| Property | Containers | AMIs |
|---|---|---|
| Build time | Seconds-minutes | Minutes |
| Boot time | Seconds | Minute (full VM boot) |
| Resource overhead | Low | OS overhead per VM |
| Portability | Across clouds | AWS-specific (per provider) |
| Density | Many per host | One per VM |
| Toolchain | Docker, K8s, OCI | Packer, EC2 ASG |
| Use case | Microservices, web apps | Specialty workloads, drivers |

**Anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| SSH into prod to fix | Defeats immutability |
| Storing data on instance disk | Lost on replacement |
| `latest` tag in image registry | Can't pin / rollback |
| No image versioning | Hard to reproduce |
| Long-lived containers without rebuild | Drift creeps back in |
| Persistent /tmp / /var | Use ephemeral volumes |
| Treating immutable as "we use Docker" without externalized state | Half done |
| Ad-hoc pet servers in IaC | Defeats the cattle metaphor |

**The "pets vs cattle" metaphor:**

| Pets (mutable) | Cattle (immutable) |
|---|---|
| Named individually | Numbered |
| Cared for when sick | Replaced |
| Unique configurations | Identical |
| Long-lived | Ephemeral |
| Few | Many |
| Hard to replace | Trivially replaced |

**Decision matrix:**

| Need | Pick |
|---|---|
| Web app, microservices, modern stack | Immutable (containers) |
| Legacy enterprise app you don't own | Mutable (Ansible) |
| Need full OS control | AMIs via Packer |
| K8s shop | Containers |
| Constrained env | Mutable (no choice) |

**Migration path (mutable → immutable):**

| Step | Detail |
|---|---|
| 1 | Externalize state (DB, S3, Redis sessions) |
| 2 | Containerize one service |
| 3 | Set up image registry + CI build |
| 4 | Deploy via blue/green or rolling |
| 5 | Migrate next service |
| 6 | Decommission Ansible playbooks gradually |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| "We use Docker" but state on host volumes | Not truly immutable |
| Image tags vs digests | `latest` silently changes |
| Build secrets baked into image | Secret leakage |
| Long-running containers | Drift via `exec` or in-place updates |
| One mega-image for everything | Hard to reason about |
| Image registry without retention | Unbounded cost |
| No image vulnerability scanning | CVEs in production |
| Running `apt upgrade` inside container | Defeats reproducibility |

**Cross-references:**

- Terraform state: [terraform_state_*.md](terraform_state.md)
- Container security: [container_security_*.md](../../web_security/container_security_image_runtime_kubernetes.md)
- Kubernetes deployments: [k8s_deployments_*.md](../../kubernetes/deployments_replicaset_strategies.md)
- CI/CD pipeline: [cicd_pipeline_*.md](../ci_cd/cicd_pipeline_design.md)

**Rule of thumb:** **Prefer immutable infrastructure.** Containers (Docker + K8s) are the most common implementation; AMIs via Packer for VM-native workloads. **Externalize all state** (DB, S3, Redis, Vault). If you find yourself **SSH'ing into a production server to fix something, your design is broken**. Treat servers as **cattle, not pets** — number them, replace them, never name them.
