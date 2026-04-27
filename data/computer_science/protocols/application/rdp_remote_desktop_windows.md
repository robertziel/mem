### RDP (Remote Desktop Protocol)

**What RDP does:**
- Access a remote Windows desktop graphically over the network
- Developed by Microsoft
- Port 3389 (TCP/UDP)
- Transmits: screen output, keyboard/mouse input, audio, clipboard, printers

**How RDP works:**
```
[Client PC] ←RDP over port 3389→ [Windows Server/Desktop]
Client sends: keyboard, mouse input
Server sends: screen updates (compressed bitmaps, GDI commands)
```

**Common use cases:**
- Administer Windows servers
- Remote work (access office desktop from home)
- Virtual desktop infrastructure (VDI)
- Cloud Windows instances (AWS EC2 Windows, Azure VMs)

**Security concerns:**
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Brute force | Account compromise | Network Level Authentication (NLA), account lockout |
| Exposed to internet | Ransomware entry point | Never expose 3389 to internet |
| BlueKeep (CVE-2019-0708) | Remote code execution | Patch, disable if unused |
| Credential theft | Lateral movement | MFA, strong passwords |

**Best practices:**
- **Never expose RDP to the public internet** (top ransomware entry point)
- Access via VPN, bastion host, or AWS Systems Manager Session Manager
- Enable Network Level Authentication (NLA)
- Use multi-factor authentication
- Restrict via firewall/Security Group to specific IPs
- Keep Windows patched

**Alternatives to direct RDP:**
| Alternative | How | Advantage |
|-------------|-----|-----------|
| AWS SSM Session Manager | Browser-based, no inbound ports | No exposed ports, audit trail |
| Azure Bastion | Managed bastion host | No public IP on VM needed |
| Guacamole | Web-based remote desktop gateway | Browser access, no client needed |
| VPN + RDP | RDP only accessible over VPN | Not exposed to internet |

**RDP vs SSH:**
| Feature | RDP | SSH |
|---------|-----|-----|
| Protocol | Graphical desktop | Command line |
| OS | Windows | Linux/Unix |
| Port | 3389 | 22 |
| Bandwidth | High (graphical) | Low (text) |
| Typical use | Windows admin, desktop apps | Linux admin, automation |

**Rule of thumb:** RDP for Windows administration, SSH for Linux. Never expose RDP port 3389 to the internet. Use SSM Session Manager or VPN for remote access. Enable NLA and MFA. In cloud, prefer SSM or bastion hosts over direct RDP.
