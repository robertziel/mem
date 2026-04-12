### Firewalls and iptables

**iptables basics:**
- Packet filtering firewall in the Linux kernel
- Organized in chains: INPUT, OUTPUT, FORWARD
- Rules processed top-to-bottom, first match wins
- Default policy: ACCEPT or DROP

**Common commands:**
```bash
# List rules
iptables -L -n -v

# Allow SSH
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Drop everything else
iptables -P INPUT DROP

# Allow specific IP
iptables -A INPUT -s 10.0.1.0/24 -p tcp --dport 3306 -j ACCEPT

# Delete rule by number
iptables -D INPUT 3

# Save rules (persist across reboot)
iptables-save > /etc/iptables/rules.v4
```

**ufw (simpler frontend for iptables):**
```bash
ufw enable
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow from 10.0.1.0/24 to any port 3306
ufw status verbose
```

**firewalld (RHEL/CentOS):**
```bash
firewall-cmd --add-service=http --permanent
firewall-cmd --add-port=8080/tcp --permanent
firewall-cmd --reload
firewall-cmd --list-all
```

**Cloud vs host firewalls:**
- Cloud: Security Groups + NACLs (managed, API-driven)
- Host: iptables/ufw/firewalld (OS-level, defense in depth)
- Best practice: use both (belt and suspenders)

**Rule of thumb:** Default deny inbound, allow only what's needed. In cloud environments, SGs are primary; host firewalls add defense in depth. Always allow established/related connections.
