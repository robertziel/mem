### AWS EC2 — Instances, Pricing, AMI, User Data, ASG

**Definition:** **Elastic Compute Cloud** = virtual machines in AWS. Full control: OS, networking, storage, IAM. The right pick depends on **instance family** (workload-tuned), **pricing model** (steady vs spiky vs interruptible), and **AMI** (image / boot config). **ASGs** automate scaling.

**Instance families — pick by workload:**

| Family | Optimized for | Examples | Use case |
|---|---|---|---|
| **t3 / t4g** | Burstable CPU | `t3.micro`, `t4g.medium` | Dev, small apps, burst |
| **m6i / m7g** | General purpose | `m6i.xlarge` | Web / app servers |
| **c6i / c7g** | Compute | `c6i.2xlarge` | Batch, ML inference, encoding |
| **r6i / r7g** | Memory | `r6i.4xlarge` | Caches, in-memory DBs |
| **g5 / g6** | GPU | `g5.xlarge`, `g6.4xlarge` | ML training, video |
| **p5** | Massive GPU | `p5.48xlarge` | LLM training |
| **i3 / i4i** | Local NVMe storage | `i4i.large` | Databases, data warehousing |
| **d3 / d3en** | HDD | `d3.4xlarge` | Hadoop, log processing |
| **inf2** | Inference (Inferentia) | `inf2.xlarge` | ML inference |
| **trn1** | Training (Trainium) | `trn1.32xlarge` | ML training (cheaper than P5 sometimes) |

> **Graviton (`g`)** = ARM-based, ~20% cheaper, often faster than x86.

**Pricing models:**

| Model | Discount | Commitment | Best for |
|---|---|---|---|
| **On-Demand** | 0% | None | Unpredictable, short-term |
| **Reserved (RI)** | Up to 72% | 1 / 3 years | Steady-state baseline |
| **Savings Plans** | Up to 72% | 1 / 3 years (flexible) | Across instance types — flexible |
| **Spot** | Up to 90% | None (can be interrupted) | Fault-tolerant batch, CI |
| **Dedicated Hosts** | Higher | Multi-year | Compliance, BYOL |
| **Capacity Reservations** | None | Flexible | Guarantee capacity in AZ |

**Savings Plans vs Reserved Instances:**

| Property | RI | Savings Plans |
|---|---|---|
| Lock-in | Specific instance type / AZ | Spend commitment ($/hour) |
| Flexibility | Low | **High** (across types, regions, families) |
| Compute Savings Plan | — | Across EC2, Fargate, Lambda |
| EC2 Instance Savings Plan | — | One family, AZ-flexible |
| Recommendation | Most cases | **Savings Plans** preferred today |

**Spot pricing:**

| Property | Detail |
|---|---|
| Up to 90% off | Bidding-style |
| Interrupted with 2-min warning | Can lose at any time |
| Spot Fleet / EC2 Auto Scaling spot | Manage interruptions |
| Capacity-optimized strategy | Picks pools with most spare |
| Use case | CI runners, ML training, batch, stateless web |
| **Don't use for**: critical state, primary DB |

**AMI (Amazon Machine Image):**

| Property | Detail |
|---|---|
| Snapshot of an instance | OS + packages + config |
| Source for new instances | Consistent boot |
| Custom AMIs via Packer | Immutable infrastructure |
| Community AMIs / Marketplace | Pre-built |
| AMI per region | Copy across regions for DR |
| Versioning via tags / naming | `app-2026-04-27` |

**Building custom AMIs (Packer):**

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

**User data — bootstrap script:**

```bash
#!/bin/bash
set -e
yum update -y
yum install -y docker
systemctl enable --now docker
docker run -d --restart=always -p 80:3000 myapp:latest
```

| Property | Detail |
|---|---|
| **Runs on first boot only** | Idempotent recommended |
| Used for | Install packages, start services, fetch config |
| Visible via IMDS | `/latest/user-data` |
| Limit: 16 KB | Keep brief; pull rest from S3 / git |
| Cloud-init format also supported | YAML alternative |

**Auto Scaling Group (ASG):**

```
ASG settings:
   min:     2
   desired: 3
   max:     10

Launch Template:
   AMI:       ami-abc123
   Instance:  t3.medium
   SG:        web-sg
   IAM role:  app-role

Scaling policies:
   Target tracking: CPU utilization at 60%   ← simplest
   Step:            CPU > 70%: +2 instances
                    CPU < 30%: -1 instance
```

**ASG features:**

| Feature | Detail |
|---|---|
| **Min / desired / max** | Bounds |
| **Target tracking** | "Keep CPU at 60%" — simplest |
| **Step scaling** | Different actions at different thresholds |
| **Scheduled scaling** | Pre-traffic-peak adjustments |
| **Predictive scaling** | ML-based, anticipates load |
| **Health checks** | EC2 + ELB health |
| **Cooldown period** | Prevent flapping |
| **Lifecycle hooks** | Pre-terminate / pre-launch actions |
| **Mixed instances policy** | On-Demand + Spot mix |
| **Warm pools** | Pre-baked instances for fast scale-out |

**Launch Template vs Launch Configuration:**

| Property | Launch Template | Launch Configuration (legacy) |
|---|---|---|
| Versioning | ✅ | ❌ |
| Mixed instances | ✅ | ❌ |
| Newer instance types | ✅ | Often missing |
| Use Launch Templates | **Always** | Avoid |

**Instance metadata (IMDS) — IMDSv2:**

```bash
# IMDSv2 (recommended; required by 2024+ instance launches)
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

curl -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/instance-id

# Get IAM credentials
curl -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/iam/security-credentials/<role-name>
```

| Why IMDSv2 | Detail |
|---|---|
| Token-based | Defeats SSRF attacks |
| Optional v1 with v2 | Default for new accounts |
| `HttpTokens=required` | Force v2 only |
| Common SSRF target | `169.254.169.254` |

**Storage options for EC2:**

| Type | Detail |
|---|---|
| **EBS** (block) | Persistent, network-attached, default |
| **Instance store** (NVMe) | Local, ultra-fast, ephemeral (lost on stop) |
| **EFS** (file, NFS) | Shared across many instances |
| **FSx** | Lustre, Windows file server, NetApp |
| **S3** (object) | Via SDK, not mounted typically |

**Hibernation:**

| Property | Detail |
|---|---|
| Save RAM to disk | Restart later in same state |
| Limited to certain instance types | Check support |
| Encrypted root volume required | Security |
| Use case | Dev environments paused overnight |

**Common patterns:**

| Pattern | Detail |
|---|---|
| **Stateless web** | ASG behind ALB, scaled by CPU / requests |
| **Stateful workers** | Single instance with EBS, manual updates |
| **Worker pool** | ASG with SQS queue depth scaling |
| **Spot for batch** | ASG mixed-instances with 90% spot |
| **Bastion / jumphost** | Single instance, restricted SG |
| **Self-healing** | ASG ensures desired count; replaces unhealthy |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `0.0.0.0/0` SSH ingress | Open to internet |
| IMDSv1 only | SSRF can steal credentials |
| User data not idempotent | Subsequent launches break |
| ASG without health check | Bad pods serve traffic |
| Spot only, mission-critical | Interruption causes outage |
| Forgetting EBS volume cleanup | Cost creeps after instance terminate |
| `latest` AMI with no version pin | Can't reproduce builds |
| One ASG per service in many regions | Operational overhead |
| No tagging strategy | Can't allocate cost |
| Public IP on private app server | Wrong subnet placement |

**Cost optimization:**

| Tactic | Detail |
|---|---|
| Use Graviton (`t4g`, `m7g`, `c7g`) | ~20% cheaper |
| Savings Plans for steady baseline | Up to 72% off |
| Spot for batch / fault-tolerant | Up to 90% |
| Right-size — Compute Optimizer suggestions | Drop oversized |
| Stop dev environments overnight | Schedules |
| Hibernate vs stop | If you need quick resume |
| Detach + delete unattached EBS | Common waste |
| Reserved Instances (legacy, prefer SP) | Still available |

**Decision matrix:**

| Need | Pick |
|---|---|
| Web app | `t3` / `m6i` + ASG + ALB |
| ML training | `g5` / `p5` / `trn1` |
| Inference | `inf2` (cheaper) or `g5` |
| Memory-heavy | `r6i` / `r7g` |
| Local NVMe DB | `i4i` |
| Burstable cheap | `t3` / `t4g` (Graviton) |
| Steady baseline | Savings Plans + On-Demand |
| Spiky | On-Demand |
| Interruptible batch | Spot |

**Cross-references:**

- VPC + subnets + SG: [vpc_subnets_*.md](../networking/vpc_subnets_security_groups.md)
- AWS EBS: [aws_ebs_*.md](aws_ebs_elastic_block_store_volumes_gp3_io2_snapshots_encryption.md)
- Lambda vs Fargate vs EC2: [lambda_*.md](lambda_cold_start_layers_concurrency.md)
- Immutable infrastructure: [immutable_*.md](../infrastructure_as_code/immutable_vs_mutable_infra.md)

**Rule of thumb:** **Pick instance family by workload** (`t` burst, `m` general, `c` compute, `r` memory, `g/p/inf/trn` accelerated). **Graviton (`g` suffix) is 20% cheaper** — use it. Pricing: **Savings Plans for baseline, On-Demand for variable, Spot for fault-tolerant batch**. Use **Launch Templates** (not Launch Configurations) and **ASGs** for self-healing + scale. Always enforce **IMDSv2**.
