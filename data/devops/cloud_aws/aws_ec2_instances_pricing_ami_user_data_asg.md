### AWS EC2 (Elastic Compute Cloud)

**What EC2 is:**
- Virtual machines (instances) in the cloud
- Full control: OS, networking, storage, security groups
- Launch in a VPC subnet, assign IAM role for AWS API access

**Instance families:**
| Family | Optimized for | Examples | Use case |
|--------|--------------|---------|----------|
| t3/t4g | Burstable CPU | t3.micro, t4g.medium | Dev, small apps, burst workloads |
| m6i/m7g | General purpose | m6i.xlarge | Web servers, app servers |
| c6i/c7g | Compute | c6i.2xlarge | Batch, ML inference, encoding |
| r6i/r7g | Memory | r6i.4xlarge | Caches, in-memory DBs |
| g5 | GPU | g5.xlarge | ML training, video processing |
| i3/i4i | Storage I/O | i3.large | Databases, data warehousing |

**Pricing models:**
| Model | Discount | Commitment | Best for |
|-------|----------|-----------|----------|
| On-Demand | 0% | None | Unpredictable, short-term |
| Reserved (RI) | Up to 72% | 1 or 3 years | Steady-state baseline |
| Savings Plans | Up to 72% | 1 or 3 years (flexible) | Flexible across instance types |
| Spot | Up to 90% | None (can be interrupted) | Fault-tolerant batch, CI runners |

**AMI (Amazon Machine Image):**
- Snapshot of an instance (OS + packages + config)
- Launch new instances from AMI (consistent, fast)
- Build custom AMIs with Packer for immutable infrastructure
- Community AMIs, AWS Marketplace AMIs, or your own

**User data (bootstrap script):**
```bash
#!/bin/bash
yum update -y
yum install -y docker
systemctl start docker
docker run -d -p 80:3000 myapp:latest
```
- Runs on first boot only
- Used for: install packages, pull containers, configure instance

**Auto Scaling Group (ASG):**
```
ASG: min=2, desired=3, max=10
Launch Template: ami-abc123, t3.medium, SG, IAM role
Scaling policies:
  Scale out: CPU > 70% for 5 min → add 2 instances
  Scale in:  CPU < 30% for 10 min → remove 1 instance
```

- Target tracking: "keep CPU at 60%" (simplest)
- Step scaling: different actions at different thresholds
- Scheduled: scale up before known traffic peaks
- Health checks: EC2 status + ELB health check
- Cooldown period: prevent rapid scale in/out flapping

**Instance metadata (IMDS):**
```bash
# v2 (recommended, requires token)
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id
```

**Rule of thumb:** Use t3/t4g for small workloads, m-series for general, c-series for CPU-heavy. Savings Plans over Reserved Instances (more flexible). Spot for batch/CI. Always use launch templates (not launch configs). Enforce IMDSv2 for security.
