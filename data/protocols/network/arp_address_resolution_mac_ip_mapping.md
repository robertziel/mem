### ARP (Address Resolution Protocol)

**What ARP does:**
- Maps IP addresses to MAC (hardware) addresses on a local network
- Works at Layer 2 (Data Link) ↔ Layer 3 (Network) boundary
- Required because switches forward frames by MAC address, not IP

**How ARP works:**
```
1. Host A wants to send to 10.0.1.50 but doesn't know its MAC address
2. Host A broadcasts: "Who has 10.0.1.50? Tell 10.0.1.10" (ARP Request)
3. Host at 10.0.1.50 replies: "10.0.1.50 is at AA:BB:CC:DD:EE:FF" (ARP Reply)
4. Host A caches this mapping and sends the frame to AA:BB:CC:DD:EE:FF
```

**ARP cache:**
```bash
# View ARP table
arp -a
# 10.0.1.1 at 00:1A:2B:3C:4D:5E on en0 [ethernet]
# 10.0.1.50 at AA:BB:CC:DD:EE:FF on en0 [ethernet]

# Entries expire (typically 20 minutes) and are re-resolved
```

**ARP only works within a subnet:**
- Same subnet (10.0.1.x): ARP resolves directly to destination MAC
- Different subnet: ARP resolves to the default GATEWAY's MAC, gateway routes the packet

```
Same subnet:   Host A (10.0.1.10) → ARP for 10.0.1.50 → direct frame to destination MAC
Cross subnet:  Host A (10.0.1.10) → ARP for gateway (10.0.1.1) → gateway routes to 10.0.2.50
```

**ARP spoofing (security attack):**
- Attacker sends fake ARP replies: "10.0.1.1 (gateway) is at ATTACKER_MAC"
- Traffic intended for the gateway goes to the attacker (man-in-the-middle)
- Prevention: static ARP entries for critical hosts, Dynamic ARP Inspection (DAI) on switches, network segmentation

**In cloud environments:**
- ARP is handled by the cloud provider's virtual networking layer
- You don't manage ARP tables in AWS/GCP/Azure
- VPC networking abstracts Layer 2 entirely

**Rule of thumb:** ARP maps IP→MAC within a local subnet. Cross-subnet traffic goes to the gateway's MAC first. ARP is invisible in cloud environments (abstracted by virtual networking). Understanding ARP helps debug "can ping gateway but not beyond" issues on physical networks.
