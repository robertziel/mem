### CCSP — Certified Cloud Security Professional

**The cloud-focused counterpart to CISSP.** (ISC)² — vendor-neutral cloud security across AWS/Azure/GCP. Highest salary impact in banking cloud security roles.

**Exam logistics:**
- Duration: 3 hours, 125 questions (multiple choice)
- Passing: 700/1000 (scaled)
- Cost: $599 USD
- Validity: 3 years (40 CPEs/year + $135 annual)
- **Prerequisite**: **5 years cumulative IT experience, with 3 years in infosec and 1 year in 1+ of the 6 CCSP domains**
  - CISSP holders get full waiver of prerequisite experience
  - Can take exam as "Associate of (ISC)²" without experience

**The 6 CCSP domains:**

| # | Domain | Weight | Focus |
|---|---|---|---|
| 1 | Cloud Concepts, Architecture, and Design | 17% | Cloud ref architectures, service/deployment models |
| 2 | Cloud Data Security | 20% | Data lifecycle, encryption, DLP, data rights management |
| 3 | Cloud Platform and Infrastructure Security | 17% | Physical/virtual components, secure design, BCP/DR |
| 4 | Cloud Application Security | 17% | SDLC, API security, identity, supply chain |
| 5 | Cloud Security Operations | 16% | Infrastructure ops, incident response, forensics in cloud |
| 6 | Legal, Risk, and Compliance | 13% | Regulatory, privacy, audit, SLAs |

**Domain 1 — Cloud foundations:**
- NIST 800-145 cloud definitions: 5 characteristics, 3 service models, 4 deployment models
- Service models: IaaS (compute/storage/network) → PaaS (runtime/middleware) → SaaS (app)
- Deployment models: public / private / hybrid / community
- Multi-tenancy + isolation mechanisms (hypervisor, container, network)
- Shared responsibility model — who secures what at each layer
- Cloud reference architectures: NIST, CSA (Cloud Security Alliance), ISO 17788/17789

**Domain 2 — Data security (highest weight, 20%):**
- Cloud data lifecycle: Create → Store → Use → Share → Archive → Destroy
- Data dispersion vs encryption (how cloud providers protect against drive loss)
- Encryption: data at rest (volume, object, file), in transit (TLS, IPsec), in use (confidential computing, SGX, SEV)
- Key management: bring-your-own-key (BYOK), hold-your-own-key (HYOK), customer-managed keys (CMK)
- Data masking: static (ETL-time) vs dynamic (query-time), tokenization vs encryption
- DLP: network, endpoint, cloud-native (Microsoft Purview, GCP DLP, AWS Macie)
- Digital Rights Management (DRM) / Information Rights Management (IRM) — persistent encryption even after data leaves
- Secure data destruction: crypto-shredding (delete the key), overwrite is less reliable in cloud

**Domain 3 — Infrastructure:**
- Virtualization risks: VM escape, hypervisor attacks, side-channel (Spectre, Meltdown, L1TF)
- Container security: image hardening, runtime (Falco), admission control
- Serverless specifics: function isolation, cold-start security, IAM for every function
- Network virtualization: SDN, overlay networks (VXLAN), micro-segmentation
- Cloud storage security: object storage (S3/Blob/GCS) ACLs, signed URLs, bucket policies

**Domain 4 — Application security:**
- Secure SDLC phases: requirements → design → development → testing → deployment → operations
- Threat modeling: STRIDE, DREAD, PASTA, attack trees
- API security: OAuth 2.0 flows (authorization code, PKCE, client credentials), OIDC, API gateway patterns
- Input validation, output encoding, parameterized queries (same as Security+/CISSP but cloud context)
- Supply chain: SBOM, signed artifacts, provenance (SLSA framework)

**Domain 5 — Operations:**
- Cloud forensics challenges: multi-tenancy, chain of custody across providers, legal jurisdiction
- Cloud-specific logging: CloudTrail, Azure Monitor, GCP Cloud Audit Logs
- Cloud incident response: runbooks, isolation in cloud (SG swap, instance quarantine), snapshots for forensics
- BCP/DR in cloud: pilot light / warm standby / active-active (same concepts as AWS SAP)

**Domain 6 — Legal, risk, compliance:**
- Regulations: GDPR (EU), CCPA (California), LGPD (Brazil), PIPEDA (Canada), APPI (Japan)
- Industry-specific: HIPAA (US health), PCI DSS (payment), SOX (US finance), GLBA (US financial privacy)
- Cloud frameworks: CSA CCM (Cloud Controls Matrix), CCSK (Certificate), STAR Registry
- Audit standards: SOC 1 (financial), SOC 2 (security/availability/confidentiality), SOC 3 (public summary)
- International privacy: cross-border data transfer (GDPR Schrems II), adequacy decisions, SCCs (Standard Contractual Clauses)

**Study path:**
- Official (ISC)² CCSP Study Guide (Sybex, Chapple) — canonical
- Ben Malisow's "CCSP Exam Study Guide" — more concise
- Cloud Security Alliance (CSA) free resources (CCSK study material overlaps heavily)
- Thor Pedersen on Udemy (video course)
- Boson ExSim (best practice exams) or (ISC)² practice bank

**Existing memos:**
- `devops/cloud_aws/aws_kms_*`, `aws_security_hub_*`, `aws_macie_*`, `aws_cloudtrail_*`
- `web_security/` — shared with Security+/CISSP
- `design_patterns/payment_network/pci_dss_scope_reduction_tokenization_encryption_segmentation.md`
- `protocols/security/` — OIDC, SAML, IPsec, LDAP

**Who it's for:** Cloud security engineers, DevSecOps in cloud-heavy orgs, fintech/banking cloud security teams. Prep time: 120-250 hours (less for CISSP holders).

**Rule of thumb:** CCSP is basically "CISSP with cloud flavor" plus deeper data security and less general CBK. If you already have CISSP, you can prep in 80-120 hours. The regulatory/compliance domain (6) is heavier than most candidates expect — know GDPR, HIPAA, PCI cold. Focus on the NIST 800-145 definitions, CSA CCM, and data lifecycle — they appear on almost every exam.
