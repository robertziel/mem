### VPC, Subnets, Security Groups

**VPC (Virtual Private Cloud):**
- Isolated virtual network in the cloud
- Defined by a CIDR block (e.g., `10.0.0.0/16` = 65,536 IPs)
- Spans all AZs in a region

**Subnets:**
- Subdivision of a VPC, tied to one AZ
- **Public subnet** - has route to Internet Gateway (IGW), instances get public IPs
- **Private subnet** - no direct internet access, uses NAT Gateway for outbound
- Typical layout: public subnets for ALB, private subnets for app/DB

**CIDR notation:**
- `/16` = 65,536 IPs (VPC level)
- `/24` = 256 IPs (typical subnet)
- `/28` = 16 IPs (smallest AWS subnet)
- `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` = RFC 1918 private ranges

**Security Groups (SG):**
- Virtual firewall at the instance/ENI level
- **Stateful** - if inbound is allowed, response is automatically allowed
- Default: deny all inbound, allow all outbound
- Rules reference CIDR blocks OR other security groups
- Example: allow ALB SG -> app SG on port 8080

**NACLs (Network ACLs):**
- Firewall at the subnet level
- **Stateless** - must explicitly allow both inbound and outbound
- Rules processed in order (lowest number first)
- Default NACL allows all traffic
- Rarely modified; SGs are the primary control

**SG vs NACL:**
| Feature | Security Group | NACL |
|---------|---------------|------|
| Level | Instance | Subnet |
| Stateful | Yes | No |
| Rules | Allow only | Allow + Deny |
| Evaluation | All rules | Ordered |

**Other components:**
- **Internet Gateway (IGW)** - connects VPC to internet
- **NAT Gateway** - allows private subnets outbound internet (no inbound)
- **VPC Peering** - connect two VPCs (non-transitive)
- **Transit Gateway** - hub-and-spoke for multiple VPCs
- **VPC Endpoints** - private access to AWS services (S3, DynamoDB) without internet

**Rule of thumb:** Put load balancers in public subnets, everything else in private. Use SGs as the primary firewall. Reference SGs by ID rather than CIDR where possible. Use VPC endpoints to avoid NAT Gateway costs for AWS service traffic.
