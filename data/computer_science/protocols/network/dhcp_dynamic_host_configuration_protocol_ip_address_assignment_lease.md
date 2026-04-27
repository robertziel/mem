### DHCP (Dynamic Host Configuration Protocol)

**What DHCP does:**
- Automatically assigns IP addresses to devices on a network
- Also provides: subnet mask, default gateway, DNS servers
- Eliminates manual IP configuration

**DORA process (how a device gets an IP):**
```
1. Discover: Client broadcasts "Anyone have an IP for me?" (255.255.255.255)
2. Offer:    DHCP server responds with available IP + lease duration
3. Request:  Client accepts the offer "I'll take 10.0.1.50"
4. Acknowledge: Server confirms "10.0.1.50 is yours for 24 hours"
```

**Lease lifecycle:**
- IP assigned with a lease duration (e.g., 24 hours)
- Client renews at 50% of lease time (silently, in background)
- If renewal fails, tries again at 87.5% of lease time
- If all renewals fail, lease expires → device must restart DORA

**What DHCP provides:**
| Parameter | Example | Purpose |
|-----------|---------|---------|
| IP address | 10.0.1.50 | Device's network address |
| Subnet mask | 255.255.255.0 (/24) | Network boundary |
| Default gateway | 10.0.1.1 | Router for external traffic |
| DNS servers | 10.0.1.2, 8.8.8.8 | Name resolution |
| Lease time | 86400 (24 hours) | How long the IP is valid |

**Static IP vs DHCP:**
| Feature | DHCP (dynamic) | Static |
|---------|---------------|--------|
| Configuration | Automatic | Manual |
| IP changes | May change on renewal | Never changes |
| Management | Easy, centralized | Error-prone at scale |
| Use for | Workstations, phones, laptops | Servers, printers, network devices |

**In cloud (AWS VPC):**
- DHCP handled automatically by VPC
- Each subnet has a DHCP options set (DNS, NTP servers)
- EC2 instances get private IP via DHCP on launch
- Elastic IPs are static public IPs (not DHCP)

**Rule of thumb:** DHCP for end-user devices (automatic, zero-touch). Static IPs for servers and infrastructure. In cloud environments, DHCP is managed by the platform. Understanding DORA helps debug "no IP" connectivity issues.
