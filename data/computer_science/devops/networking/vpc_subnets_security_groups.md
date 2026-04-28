### VPC, Subnets, Security Groups (AWS networking primitives)

**Definition:** the four foundational pieces of AWS networking — **VPC** (isolated network), **subnets** (per-AZ subdivisions), **Security Groups** (instance-level stateful firewall), **NACLs** (subnet-level stateless firewall). Most networks are: public subnets for ingress (LB), private subnets for everything else, NAT Gateway for outbound.

**The hierarchy:**

```
   Region
     │
     ├── VPC (10.0.0.0/16)
     │      │
     │      ├── AZ-a
     │      │     ├── public subnet (10.0.1.0/24)   → IGW
     │      │     └── private subnet (10.0.2.0/24)  → NAT GW
     │      │
     │      ├── AZ-b
     │      │     ├── public subnet (10.0.3.0/24)
     │      │     └── private subnet (10.0.4.0/24)
     │      │
     │      └── AZ-c
     │            └── ...
     │
     └── Other VPCs
```

**Components:**

| Component | What | Scope |
|---|---|---|
| **VPC** | Isolated virtual network | Region |
| **Subnet** | Subdivision of VPC | One AZ |
| **Internet Gateway (IGW)** | Connect VPC to internet | One per VPC |
| **NAT Gateway** | Outbound-only internet for private | Per AZ (HA) |
| **Route Table** | Where traffic goes | Per subnet |
| **Security Group** | Firewall at instance/ENI | Per resource |
| **NACL** | Firewall at subnet | Per subnet |
| **VPC Endpoint** | Private access to AWS services | Per VPC |
| **VPC Peering** | Connect two VPCs | Non-transitive |
| **Transit Gateway** | Hub for many VPCs | Per region |

**CIDR sizing:**

| Block | IPs | Use |
|---|---|---|
| `/8` | 16.7M | RFC 1918: `10.0.0.0/8` |
| `/12` | 1M | RFC 1918: `172.16.0.0/12` |
| `/16` | 65,536 | Typical VPC size |
| `/20` | 4,096 | Large subnet |
| `/24` | 256 | Typical subnet |
| `/28` | 16 | Smallest AWS subnet |

> AWS reserves the **first 4 + last 1** IPs in every subnet (5 total). A `/28` gives 11 usable IPs.

**Public vs private subnets — by route table:**

| Subnet type | Default route | Inbound from internet? |
|---|---|---|
| **Public** | `0.0.0.0/0 → IGW` | Yes (with public IP) |
| **Private** | `0.0.0.0/0 → NAT Gateway` | No (outbound only) |
| **Isolated** | No `0.0.0.0/0` route | No |

**Typical 3-tier network:**

```
   Public subnet (per AZ):     ALB / NLB / Bastion
   Private subnet (per AZ):    App servers / EKS pods
   Database subnet (per AZ):   RDS / ElastiCache (isolated, no internet)
```

**Security Group — stateful, instance-level:**

| Property | Detail |
|---|---|
| Attached to ENI / instance | Multiple SGs per resource |
| **Stateful** | Inbound allowed → response auto-allowed |
| Default: deny inbound, allow outbound | Modify as needed |
| Rules: Allow only | No deny rules |
| Reference CIDR or other SG | SG-to-SG more flexible |
| Limits | Default 60 rules per SG |

**Example — typical 3-tier SGs:**

| SG | Inbound | Outbound |
|---|---|---|
| **alb-sg** | 80, 443 from `0.0.0.0/0` | All to `app-sg` on 8080 |
| **app-sg** | 8080 from `alb-sg` | All; restrict by service if needed |
| **db-sg** | 5432 from `app-sg` | (none typically) |
| **bastion-sg** | 22 from corporate VPN range | All |

> Reference SGs by ID, not by CIDR. Adding instances doesn't require updating CIDRs.

**NACL — stateless, subnet-level:**

| Property | Detail |
|---|---|
| Attached to subnet | One per subnet |
| **Stateless** | Must allow both inbound + outbound explicitly |
| Rules: Allow + Deny | Ordered (lowest number first) |
| First match wins | Like a firewall ACL |
| Default NACL allows all | Custom NACLs default deny |
| Use case | Coarse blocks (e.g. block known-bad IPs) |

**SG vs NACL — when each is right:**

| Property | **Security Group** | **NACL** |
|---|---|---|
| Layer | Instance / ENI | Subnet |
| Stateful | ✅ | ❌ |
| Allow rules | ✅ | ✅ |
| Deny rules | ❌ | ✅ |
| Rule order | All evaluated | First match wins |
| Typical usage | **Primary firewall** | Edge case / explicit deny |
| Default | Deny inbound | Allow all |

> SGs are the primary control. NACLs are rarely modified outside specific scenarios.

**NAT Gateway — outbound for private subnets:**

| Property | Detail |
|---|---|
| Allows private subnet → internet (outbound) | No inbound |
| Per AZ | Deploy one per AZ for HA |
| Cost | Significant ($30+/AZ/month + data) |
| Alternatives | NAT Instance (cheaper, less HA), VPC Endpoints |
| Egress to S3 / DynamoDB | Use **Gateway Endpoint** (free) |
| Egress to other AWS services | **Interface Endpoint** ($) |

**VPC Endpoints — avoid NAT Gateway costs for AWS traffic:**

| Type | For | Cost |
|---|---|---|
| **Gateway Endpoint** | S3, DynamoDB | Free |
| **Interface Endpoint** (AWS PrivateLink) | EC2, Lambda, Secrets Manager, etc. | ~$0.01/hour + data |
| **Endpoint Service** | Expose your service to other VPCs | Same as Interface |

**Inter-VPC connectivity:**

| Pattern | Detail |
|---|---|
| **VPC Peering** | 1:1 connection between VPCs; **non-transitive** |
| **Transit Gateway** | Hub-and-spoke for many VPCs; transitive |
| **VPN** | On-prem ↔ VPC over IPsec |
| **Direct Connect** | Dedicated fiber link (huge throughput, low latency) |
| **PrivateLink** | Expose service to other VPCs without peering |

**Common architectures:**

| Architecture | Description |
|---|---|
| **3-tier (default)** | ALB in public, app in private, DB in isolated subnet |
| **Hub-and-spoke** | Transit Gateway connects VPCs (shared services VPC) |
| **Multi-account** | Separate VPC per account; TG for connectivity |
| **Egress-only** | Egress VPC for centralized outbound + inspection |
| **Inspection VPC** | All east-west traffic flows through firewalls |

**Design checklist:**

| Item | Detail |
|---|---|
| Use 2–3 AZs minimum | HA |
| Right-size CIDR | Plan for growth (don't go too small) |
| Don't overlap CIDR with other VPCs | Required for peering |
| Reserve IP space for expansion | Future subnets |
| One NAT GW per AZ | HA + lower cross-AZ data fees |
| VPC Endpoints for AWS services | Big NAT cost reduction |
| Tag everything | Cost allocation, automation |
| Flow Logs to S3 / CloudWatch | Audit, debugging |
| Restrict SG references | Reference SG, not 0.0.0.0/0 |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Single AZ deployment | One AZ outage = full outage |
| `0.0.0.0/0` in SG ingress | Open to whole internet |
| NAT Gateway only in one AZ | Cross-AZ data fees, single point of failure |
| Overlapping CIDR | Can't peer with other VPCs |
| Smallest possible subnet | No room to grow |
| Mixing public + private workloads in same subnet | Security boundary blurred |
| Using NACLs as primary firewall | Stateless = pain to maintain |
| Forgetting VPC Endpoints | NAT Gateway bill explodes |
| Default VPC in production | Auditing nightmare |

**Cross-references:**

- AWS VPC + NAT + Transit Gateway deep dive: [aws_vpc_*.md](../cloud_aws/aws_vpc_subnets_nat_gateway_peering_transit_gateway.md)
- AWS Route 53 (DNS): [aws_route53_*.md](../cloud_aws/aws_route53_dns_routing_policies_health_checks_alias.md)
- IAM + least privilege: [iam_*.md](../cloud_aws/iam_roles_policies_least_privilege.md)

**Rule of thumb:** **Public subnets for ingress (LB, bastion), private subnets for everything else, isolated subnets for databases.** Use **Security Groups** as the primary firewall — reference SGs by ID, not CIDR. **One NAT Gateway per AZ** for HA + lower cross-AZ data fees. **VPC Endpoints** for S3/DynamoDB/other AWS services to avoid NAT Gateway bandwidth costs.
