### SNMP (Simple Network Management Protocol)

**What SNMP does:**
- Monitor and manage network devices (routers, switches, servers, printers)
- Collect metrics: CPU, memory, bandwidth, disk, interface status, errors
- Port 161 (queries), Port 162 (traps/notifications)

**Components:**
```
[SNMP Manager (NMS)]  ←→  [SNMP Agent on device]
  Nagios, Zabbix,          Runs on routers, switches,
  PRTG, Datadog            servers, firewalls
```

- **Manager**: monitoring system that queries agents
- **Agent**: software on the device that responds to queries and sends traps
- **MIB (Management Information Base)**: database of manageable objects (OIDs)
- **OID (Object Identifier)**: unique address for each metric (e.g., `1.3.6.1.2.1.1.3.0` = system uptime)

**Operations:**
| Operation | Direction | Purpose |
|-----------|-----------|---------|
| GET | Manager → Agent | Read a specific value |
| SET | Manager → Agent | Change a configuration |
| GETNEXT | Manager → Agent | Walk through the MIB tree |
| TRAP | Agent → Manager | Alert on event (interface down, high CPU) |

**SNMP versions:**
| Version | Auth | Encryption | Status |
|---------|------|-----------|--------|
| v1 | Community string (plaintext) | None | Deprecated |
| v2c | Community string (plaintext) | None | Still common |
| v3 | Username + auth protocol | DES/AES encryption | Recommended |

**Common OIDs:**
```
sysDescr     1.3.6.1.2.1.1.1.0    System description
sysUpTime    1.3.6.1.2.1.1.3.0    Uptime in ticks
ifInOctets   1.3.6.1.2.1.2.2.1.10 Interface incoming bytes
ifOutOctets  1.3.6.1.2.1.2.2.1.16 Interface outgoing bytes
hrProcessorLoad 1.3.6.1.2.1.25.3.3.1.2 CPU load
```

**SNMP vs modern monitoring:**
| Feature | SNMP | Prometheus/CloudWatch |
|---------|------|-----------------------|
| Protocol | UDP (SNMP) | HTTP (pull/push) |
| Devices | Network hardware | Applications, cloud |
| Format | OIDs (numeric) | Named metrics |
| Age | 1988 | 2010s+ |
| Use | Network infrastructure | Cloud-native apps |

**Rule of thumb:** SNMP for network hardware monitoring (routers, switches, firewalls). Use SNMPv3 (encrypted). For application and cloud monitoring, use Prometheus, Datadog, or CloudWatch instead. SNMP is legacy but still essential for network infrastructure.
