### CISSP — Certified Information Systems Security Professional

**The gold-standard senior security cert.** (ISC)² — required or strongly preferred for security leadership roles. High salary impact in fintech/healthcare/defense.

**Exam logistics:**
- Duration: **4 hours** (English), up to 175 questions (was 3h/150q previously)
- Format: **CAT (Computerized Adaptive Testing)** for English — difficulty adjusts based on answers
  - Can end at any point between 100-175 questions if confident pass/fail
- Passing: 700/1000 (scaled)
- Cost: $749 USD
- Validity: 3 years (maintain via 40 CPEs/year + $135 annual fee)
- **Prerequisite**: **5 years cumulative paid work experience** in 2+ of the 8 domains
  - 1 year waiver with approved degree or cert (e.g., AWS Security Specialty, CCNA Security)
  - Can take exam as "Associate of (ISC)²" without experience; have 6 years to accumulate

**The 8 CISSP domains (CBK):**

| # | Domain | Weight | Focus |
|---|---|---|---|
| 1 | Security and Risk Management | 16% | Governance, compliance, BCP/DR, professional ethics |
| 2 | Asset Security | 10% | Data classification, handling, privacy, retention |
| 3 | Security Architecture and Engineering | 13% | Secure design, crypto, physical security, vulnerabilities |
| 4 | Communication and Network Security | 13% | OSI/TCP-IP, secure protocols, network attacks |
| 5 | Identity and Access Management (IAM) | 13% | Authentication, authorization, federation, SSO |
| 6 | Security Assessment and Testing | 12% | Audits, pen testing, vulnerability scanning, metrics |
| 7 | Security Operations | 13% | Incident response, DR, forensics, logging, BCP |
| 8 | Software Development Security | 10% | SDLC, secure coding, DevSecOps, testing |

**What makes CISSP different from Security+:**
- **Management perspective** — CISSP is for security managers, not hands-on operators
- **Risk-based decisions** — pick the "best" answer assuming unlimited budget vs practical implementation
- **"Think like a manager"** — the famous exam mantra: when stuck between two options, pick the one a security manager would do (policy, governance, strategy) over the technical one (firewall rule, patch)
- **Depth over breadth** — Security+ touches everything; CISSP goes deeper into each topic with fewer pure-technical questions

**Domain 1 — Risk Management (weighted 16%):**
- Quantitative: ALE = SLE × ARO; ROSI = (ALE_before - ALE_after - cost_of_control) / cost_of_control
- Qualitative: high/medium/low heat maps
- Risk treatment: avoid / transfer / mitigate / accept
- Risk frameworks: NIST RMF, ISO 31000, FAIR, OCTAVE
- BCP/DR: RTO (Recovery Time Objective) vs RPO (Recovery Point Objective); MTD (Max Tolerable Downtime)
- DR site types: cold → warm → hot → mirror (increasing cost, decreasing RTO)

**Domain 3 — Cryptography depth:**
- Symmetric: AES (Rijndael) modes (ECB bad, CBC, CTR, GCM authenticated)
- Asymmetric: RSA, ECC, Diffie-Hellman (key exchange)
- Hash: SHA-2, SHA-3; collision resistance; birthday attack
- PKI: CA, RA, CSR, CRL, OCSP, certificate pinning
- Attacks: birthday, meet-in-the-middle, side-channel, timing, downgrade

**Domain 5 — IAM:**
- Authentication factors: know / have / are / do / where
- SSO protocols: SAML 2.0 (XML, enterprise), OIDC (JSON, modern), Kerberos (network, ticket-based)
- Access control models: DAC (owner-defined), MAC (label-based, military), RBAC (role-based), ABAC (attribute-based, XACML)
- Federation: trust relationships, assertion flows

**Domain 7 — Operations:**
- Incident response: 7 phases (preparation, detection, response, mitigation, reporting, recovery, remediation/lessons)
- Evidence handling: chain of custody, write-once media, legal hold
- Forensics order of volatility: CPU registers → memory → disk → logs → archives
- Digital forensics: imaging (dd, FTK Imager), hashing (MD5/SHA-256 for integrity)

**Study path:**
- **Official (ISC)² CISSP Study Guide (Sybex 9th ed.)** — the canonical text, ~1200 pages
- **Destination CISSP by Rob Witcher** — better structured than the official book
- **11th Hour CISSP** — condensed review (not primary, for final prep)
- **Pete Zerger "CISSP Exam Cram" YouTube** — free, condensed
- **Thor Pedersen / Destination Certification / Kelly Handerhan** on Udemy — video courses
- **Practice**: (ISC)² official practice test, Boson ExSim (best), Wiley question bank

**Exam strategy:**
- **Think like a manager** — pick governance/policy answers over technical
- Read all 4 answers before selecting — CISSP hides "more right" options
- The exam has NO time pressure for most (4 hours for potentially 100 questions)
- CAT exam: you can't go back — commit to each answer
- Eliminate obvious wrong answers, then compare remaining 2-3 by "BEST" vs "NEXT BEST"

**Existing memos:**
- `web_security/` — covers Domain 8 (software security) partially
- `protocols/security/` — covers Domain 4 and 5 partially
- `devops/security/` — covers Domain 7 partially

**Who it's for:** Senior security engineers, architects, managers, CISOs. Typical candidate has 8+ years security experience. Prep time: 200-400 hours over 3-6 months.

**Rule of thumb:** CISSP is a **management exam in security clothing**. When stuck: pick the answer that a security director in a Fortune 500 would choose — more governance, more risk-based, more "inform leadership" than "deploy firewall rule." The 5-year experience requirement is real — (ISC)² will verify. Destination Certification's 3-step study method (read, mindmap, drill) is the most effective approach.
