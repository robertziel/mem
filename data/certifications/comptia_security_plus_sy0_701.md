### CompTIA Security+ (SY0-701)

**The entry-level security cert.** Industry-standard baseline — required for DoD 8570 IAT II. Often the starter cert before CISSP/CCSP.

**Exam logistics:**
- Code: SY0-701 (current since Nov 2023)
- Duration: 90 min, up to 90 questions (multiple choice + performance-based "drag and drop" simulations)
- Passing: 750/900 (scaled)
- Cost: $404 USD (often cheaper with bundles/vouchers)
- Validity: 3 years (renew via CEUs or higher cert)
- Prerequisite: none officially; CompTIA Network+ recommended; 2 years IT experience recommended

**Domain weights (SY0-701):**

| Domain | Weight | Focus |
|---|---|---|
| 1. General Security Concepts | 12% | CIA triad, zero trust, change management, crypto fundamentals |
| 2. Threats, Vulnerabilities, and Mitigations | 22% | Malware, social engineering, DoS, supply chain, mitigations |
| 3. Security Architecture | 18% | Cloud, serverless, microservices, IaC, network segmentation |
| 4. Security Operations | 28% | SIEM, IDS/IPS, endpoint, DLP, incident response, forensics |
| 5. Security Program Management and Oversight | 20% | Governance, risk management, compliance, third-party, privacy |

**Key concepts by domain:**

**1. General concepts:**
- CIA triad (Confidentiality, Integrity, Availability) + AAA (Authentication, Authorization, Accounting)
- Zero Trust: "never trust, always verify" — no implicit trust based on network location
- Crypto basics: symmetric (AES-256) vs asymmetric (RSA, ECC), hashing (SHA-256, bcrypt/argon2 for passwords), HMAC, digital signatures
- Key management: HSM, key escrow, PKI (CA hierarchy, CRL vs OCSP)

**2. Threats & attacks:**
- Malware types: virus, worm, trojan, ransomware, RAT, rootkit, spyware, fileless
- Social engineering: phishing, spear phishing, whaling, vishing, smishing, BEC, pretexting, tailgating
- Web attacks: XSS, SQL injection, CSRF, directory traversal, SSRF, race conditions, TOCTOU
- Network attacks: DNS poisoning, ARP spoofing, MITM, DoS/DDoS, amplification, replay
- Password attacks: brute force, dictionary, rainbow tables, credential stuffing, password spraying
- Supply chain: compromised dependencies (SolarWinds), malicious packages (npm typosquatting)

**3. Security architecture:**
- Network segmentation: VLANs, subnets, micro-segmentation (SDN), air-gapped
- Firewall types: stateless, stateful, NGFW (app-layer), WAF (L7)
- IDS vs IPS (detect vs prevent), SIEM (aggregation + correlation), SOAR (automation)
- VPN types: IPsec (site-to-site), SSL/TLS (remote access), WireGuard
- Cloud models: IaaS/PaaS/SaaS, shared responsibility (who secures what by model)

**4. Security operations:**
- Incident response: preparation → identification → containment → eradication → recovery → lessons learned
- Forensics: chain of custody, order of volatility (memory → disk → logs), write-blockers, hashing evidence
- Log sources: Windows Event Logs, syslog, firewall logs, IDS/IPS, EDR, DNS logs
- Vulnerability management: scanning (Nessus, Qualys), CVSS scoring (base/temporal/environmental), patch management
- EDR/XDR: endpoint detection + extended (cross-domain telemetry)

**5. Governance & risk:**
- Risk management: identify → assess → treat (accept/avoid/transfer/mitigate)
- Quantitative vs qualitative risk (SLE, ARO, ALE formulas vs high/medium/low)
- Frameworks: NIST CSF, ISO 27001/27002, CIS Controls, COBIT
- Compliance: GDPR (EU privacy), HIPAA (US health), PCI DSS (payment cards), SOX (finance), CCPA
- Third-party risk: BAA, MSA, SLA, right-to-audit
- Privacy: PII, PHI, data classification, data retention, right to be forgotten

**Performance-based questions (PBQs) — 5-7 typically, weighted higher:**
- Configure a firewall rule set based on requirements
- Identify vulnerabilities in a network diagram
- Match attack types to scenarios (drag-drop)
- Identify log entries showing specific attacks

**Study path:**
- Professor Messer free videos (the standard — completely free on YouTube)
- Mike Chapple's Security+ Study Guide (Sybex) — most popular book
- Dion Training practice exams (Jason Dion)
- CompTIA's official CertMaster Practice (not free but thorough)

**Existing memos:**
- `web_security/` — OWASP Top 10, XSS, CSRF, SSRF, SQL injection
- `protocols/security/` — IPsec, OIDC, SAML, LDAP
- `devops/security/` — network security, container security, secrets

**Who it's for:** Junior security analysts, helpdesk moving to security, developers wanting baseline security knowledge, DoD contractors (8570 requirement). Prep time: 80-150 hours.

**Rule of thumb:** Security+ is broad not deep — ~500 acronyms to know. Professor Messer's free YouTube series + Jason Dion practice exams is the gold-standard free path. Focus study on Domain 4 (Security Operations, 28%) and Domain 2 (Threats, 22%) — they account for half the exam. PBQs take disproportionate time; save them for last.
