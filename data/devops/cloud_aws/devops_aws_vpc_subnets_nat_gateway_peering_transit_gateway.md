### AWS VPC Deep Dive (Networking)

**VPC (Virtual Private Cloud):**
- Isolated virtual network for your AWS resources
- Defined by CIDR block (e.g., `10.0.0.0/16` = 65,536 IPs)
- Spans all AZs in a region

**Subnet types:**
| Type | Internet access | Route | Use for |
|------|----------------|-------|---------|
| Public | Direct (IGW) | 0.0.0.0/0 → Internet Gateway | ALB, bastion hosts |
| Private | Outbound only (NAT) | 0.0.0.0/0 → NAT Gateway | App servers, databases |
| Isolated | None | No route to internet | Databases, internal services |

**Typical architecture:**
```
VPC: 10.0.0.0/16
  AZ-a:
    Public subnet:  10.0.1.0/24  → ALB, NAT Gateway
    Private subnet: 10.0.3.0/24  → App servers (ECS, EC2)
    Isolated subnet: 10.0.5.0/24 → RDS, ElastiCache
  AZ-b:
    Public subnet:  10.0.2.0/24  → ALB, NAT Gateway
    Private subnet: 10.0.4.0/24  → App servers
    Isolated subnet: 10.0.6.0/24 → RDS standby
```

**Internet Gateway (IGW):**
- Connects VPC to the internet
- One per VPC
- Public subnets route 0.0.0.0/0 → IGW

**NAT Gateway:**
- Allows private subnets to make outbound internet requests (package updates, API calls)
- No inbound connections from internet
- Per AZ ($0.045/hr + $0.045/GB processed — expensive!)
- Cost tip: use VPC endpoints for AWS service traffic instead of NAT

**VPC Endpoints (avoid NAT costs):**
| Type | Protocol | Use for |
|------|----------|---------|
| Gateway endpoint | S3, DynamoDB | Free, add route to route table |
| Interface endpoint | Most other AWS services | ENI in subnet, costs per hour + data |

```bash
# Gateway endpoint for S3 (free)
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-abc123 \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids rtb-xyz789
```

**VPC Peering:**
- Connect two VPCs privately (same or different account/region)
- Non-transitive: A↔B and B↔C doesn't mean A↔C
- No overlapping CIDR blocks

**Transit Gateway:**
- Hub-and-spoke for connecting multiple VPCs + on-premises
- Transitive routing (A↔Hub↔B works)
- Simplifies complex multi-VPC architectures

```
Before (mesh):           After (hub-and-spoke):
VPC-A ↔ VPC-B            VPC-A ↔ Transit Gateway ↔ VPC-B
VPC-A ↔ VPC-C                                     ↔ VPC-C
VPC-B ↔ VPC-C                                     ↔ On-prem VPN
```

**Security layers:**
| Layer | Level | Stateful | Rules |
|-------|-------|----------|-------|
| Security Groups | Instance/ENI | Yes | Allow only |
| NACLs | Subnet | No | Allow + Deny |

**Flow Logs:**
```bash
# VPC Flow Logs → capture network traffic metadata
aws ec2 create-flow-logs \
  --resource-type VPC --resource-ids vpc-abc123 \
  --traffic-type ALL \
  --log-destination-type s3 --log-destination arn:aws:s3:::flow-logs-bucket
```
- Captures: source IP, dest IP, port, protocol, action (ACCEPT/REJECT)
- Does NOT capture: packet contents (not a packet sniffer)
- Use for: security analysis, troubleshooting connectivity

**Rule of thumb:** Public subnets for load balancers only. Everything else in private subnets. Use VPC endpoints for S3/DynamoDB (saves NAT costs). Security Groups are the primary firewall. Transit Gateway for 3+ VPCs. Always enable Flow Logs for security visibility.
