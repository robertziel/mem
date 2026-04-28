### AWS VPC — Subnets, NAT Gateway, Peering, Transit Gateway

**Definition:** AWS networking deep dive. **VPC** = isolated virtual network in a region. **Subnets** subdivide it per AZ; **IGW** for public access; **NAT Gateway** for private outbound; **VPC Endpoints** to bypass NAT for AWS services; **Peering** or **Transit Gateway** to connect VPCs.

**VPC essentials:**

| Property | Detail |
|---|---|
| Defined by CIDR | `/16` typical (65,536 IPs) |
| Spans all AZs in region | Subnets are per-AZ |
| One default per region | Use only for testing |
| Per-account | Multiple VPCs OK |
| Required for most resources | EC2, RDS, ECS, etc. |

**Subnet types — by route table:**

| Type | Internet access | Default route | Use for |
|---|---|---|---|
| **Public** | Direct (IGW) | `0.0.0.0/0 → IGW` | ALB, NAT Gateway, bastion |
| **Private** | Outbound only (NAT) | `0.0.0.0/0 → NAT GW` | App servers, ECS tasks |
| **Isolated** | None | No `0.0.0.0/0` route | Databases, internal-only |

**Typical 3-AZ architecture:**

```
VPC: 10.0.0.0/16
  AZ-a:
    Public:    10.0.1.0/24   ALB, NAT-a
    Private:   10.0.11.0/24  App servers
    Isolated:  10.0.21.0/24  RDS primary
  AZ-b:
    Public:    10.0.2.0/24   ALB, NAT-b
    Private:   10.0.12.0/24  App servers
    Isolated:  10.0.22.0/24  RDS standby
  AZ-c:
    Public:    10.0.3.0/24   ALB, NAT-c
    Private:   10.0.13.0/24  App servers
    Isolated:  10.0.23.0/24  Reserved
```

**Internet Gateway (IGW):**

| Property | Detail |
|---|---|
| Connects VPC to internet | Bidirectional |
| One per VPC | Required for public access |
| Public subnets route via IGW | `0.0.0.0/0 → IGW` |
| Free | No charge for the gateway itself |

**NAT Gateway — outbound for private:**

| Property | Detail |
|---|---|
| Allows private subnet → internet | Outbound only |
| **No inbound from internet** | Inbound blocked |
| **One per AZ** for HA | Otherwise cross-AZ data fees |
| Cost | ~$0.045/hr + $0.045/GB processed |
| Use case | App servers fetching updates / external API calls |

**Cost-saving alternatives to NAT Gateway:**

| Alternative | When |
|---|---|
| **Gateway Endpoint (S3, DynamoDB)** | **Free**; route table entry |
| **Interface Endpoint (PrivateLink)** | $0.01/hr + data; for SSM, KMS, Secrets Manager, etc. |
| **NAT Instance** (legacy EC2) | Cheaper but no built-in HA |
| **Single NAT for all AZs** | Saves $ but cross-AZ fees + SPOF |

**VPC Endpoints — types:**

| Type | Protocol | Cost | Examples |
|---|---|---|---|
| **Gateway Endpoint** | Routing-based | **Free** | S3, DynamoDB |
| **Interface Endpoint** | ENI in subnet | Hourly + data | EC2, Lambda, KMS, SQS, Secrets Manager |
| **Endpoint Service** | Expose your service | Hourly + data | PrivateLink for your own service |

**Gateway Endpoint setup (free S3 / DynamoDB access):**

```bash
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-abc123 \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids rtb-xyz789
```

**VPC Peering — 1:1 connections:**

| Property | Detail |
|---|---|
| Direct connection between two VPCs | Same / different account / region |
| **Non-transitive** | A↔B and B↔C ≠ A↔C |
| No overlapping CIDR blocks | Required |
| Cost | Data transfer only |
| Limit | ~125 active peerings per VPC |
| Best for | Few VPCs, simple connectivity |

**Transit Gateway — hub-and-spoke for many VPCs:**

```
Before (mesh — N² peerings):
  VPC-A ↔ VPC-B
  VPC-A ↔ VPC-C
  VPC-B ↔ VPC-C
  ... grows quadratically

After (hub-and-spoke):
  VPC-A ─┐
  VPC-B ─┼──► Transit Gateway ◄── VPN to on-prem
  VPC-C ─┘                       ◄── Direct Connect
```

| Property | Detail |
|---|---|
| **Transitive** | A↔TG↔C works |
| Connects up to 5,000 VPCs | Massive scale |
| Cross-region peering | Multi-region hub |
| VPN + Direct Connect | Hybrid architectures |
| Cost | ~$0.05/hr per attachment + data |

**Peering vs Transit Gateway:**

| Property | Peering | Transit Gateway |
|---|---|---|
| Number of VPCs | 2 | Many (5,000+) |
| Transitive | ❌ | ✅ |
| Cost | Data only | Hourly + data |
| Setup | Per pair | Central hub |
| Best for | 2–4 VPCs | 5+ VPCs, on-prem hybrid |

**VPN options:**

| Option | Detail |
|---|---|
| **Site-to-Site VPN** | IPsec tunnel; on-prem ↔ VPC |
| **Client VPN** | OpenVPN-based; user devices |
| **Direct Connect** | Dedicated fiber; high throughput, low latency, expensive |
| **Direct Connect + VPN backup** | Resilient hybrid |

**Security layering:**

| Layer | Level | Stateful | Rules |
|---|---|---|---|
| **Security Group** | Instance / ENI | ✅ | Allow only |
| **NACL** | Subnet | ❌ | Allow + Deny |
| **Network Firewall** (managed) | VPC | ✅ | Stateful filtering |
| **GuardDuty** | Account | N/A | Threat detection |

**VPC Flow Logs — visibility:**

```bash
aws ec2 create-flow-logs \
  --resource-type VPC --resource-ids vpc-abc123 \
  --traffic-type ALL \
  --log-destination-type s3 \
  --log-destination arn:aws:s3:::flow-logs-bucket
```

| Property | Detail |
|---|---|
| Capture metadata only | Source / dest IP, port, protocol, action (ACCEPT/REJECT) |
| **Not packet contents** | Not a sniffer |
| Destination | S3, CloudWatch Logs, Kinesis Firehose |
| Use case | Security analysis, troubleshooting |
| Cost | CloudWatch ingestion $$, S3 cheap |

**CIDR planning tips:**

| Tip | Detail |
|---|---|
| Plan for growth | `/16` VPC gives room |
| Reserve unused ranges | For future subnets |
| Don't overlap with on-prem or partner VPCs | Required for peering / VPN |
| Consistent across regions | Helps multi-region |
| Document who owns what range | Prevents collisions |

**Common architecture patterns:**

| Pattern | Detail |
|---|---|
| **3-tier (default)** | Public ALB, private app, isolated DB |
| **Hub-and-spoke** | TG connects multiple VPCs (shared services VPC) |
| **Multi-account landing zone** | Per-account VPC + TG hub |
| **Egress-only** | Centralized outbound + inspection |
| **Inspection VPC** | All east-west via firewalls |
| **Privatelink-only** | No internet at all |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Using default VPC in prod | Auditing nightmare |
| Single AZ deployment | Outage on AZ failure |
| Single NAT GW for all AZs | Cross-AZ data fees + SPOF |
| Overlapping CIDR | Can't peer / VPN |
| `0.0.0.0/0` SG ingress | Open to internet |
| Forgetting Gateway Endpoints for S3 / DynamoDB | NAT bill explodes |
| Peering N² mesh of VPCs | Use TG instead |
| No Flow Logs | No security visibility |
| Subnet too small | Can't grow |
| Mixing public + private in same subnet | Security boundary blurred |

**Cross-references:**

- VPC + SG basics: [vpc_subnets_*.md](../networking/vpc_subnets_security_groups.md)
- Route 53 (DNS): [aws_route53_*.md](aws_route53_dns_routing_policies_health_checks_alias.md)
- IAM + least privilege: [iam_*.md](iam_roles_policies_least_privilege.md)
- AWS Organizations: [aws_organizations_*.md](aws_organizations_accounts_scp.md)

**Rule of thumb:** **Public subnets for ingress (LB, bastion), private for app, isolated for DB. One NAT Gateway per AZ for HA.** Use **Gateway Endpoints (free)** for S3 / DynamoDB to bypass NAT bandwidth costs. Use **Transit Gateway** for 5+ VPCs or hybrid (on-prem + cloud); **VPC Peering** is fine for 2–4 VPCs. **Always enable Flow Logs** for security visibility.
