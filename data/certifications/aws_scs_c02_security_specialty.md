### AWS Certified Security - Specialty (SCS-C02)

**The fintech/banking-critical AWS cert.** Deep dive into AWS security: IAM, KMS, data protection, incident response. Highest salary impact of any AWS associate/specialty cert.

**Exam logistics:**
- Code: SCS-C02
- Duration: 170 min, 65 questions
- Passing: 750/1000
- Cost: $300 USD
- Validity: 3 years
- Prerequisite: none official; SAA strongly recommended; 2+ years AWS security experience

**Domain weights (SCS-C02):**

| Domain | Weight | Focus |
|---|---|---|
| 1. Threat Detection and Incident Response | 14% | GuardDuty, Detective, Security Hub, incident playbooks |
| 2. Security Logging and Monitoring | 18% | CloudTrail (multi-region, org trails), CloudWatch Logs, VPC Flow Logs, Athena queries |
| 3. Infrastructure Security | 20% | VPC security, network ACLs, SGs, AWS Network Firewall, Shield, WAF |
| 4. Identity and Access Management | 16% | IAM policies, STS, SCPs, permission boundaries, resource-based policies |
| 5. Data Protection | 18% | KMS (envelope encryption, grants, key policies), S3 encryption, Certificate Manager, Macie |
| 6. Management and Security Governance | 14% | AWS Organizations, Config, Control Tower, IAM Access Analyzer |

**What SCS tests deeply:**
- **IAM policy evaluation logic** — explicit deny > SCP > permission boundary > identity policy + resource policy
- **KMS internals** — customer managed vs AWS managed vs AWS owned, multi-region keys, grants vs key policies, key rotation (annual), envelope encryption at scale, cross-account key usage
- **S3 security** — bucket policies vs IAM vs ACL, block public access, server-side encryption (SSE-S3 vs SSE-KMS vs SSE-C vs DSSE-KMS), object lock (governance/compliance modes)
- **Encryption in transit** — TLS versions, ACM vs ACM PCA (private CA), certificate validation (DNS vs email)
- **Network security** — NACL vs SG (stateless vs stateful), VPC endpoints (gateway vs interface), PrivateLink, Network Firewall vs WAF vs Shield Advanced
- **GuardDuty** — threat findings categories (reconnaissance, instance compromise, account compromise, bucket), EKS audit, malware protection
- **Security Hub** — CIS benchmarks, PCI DSS, foundational security best practices
- **Incident response** — quarantine (SG swap), snapshot for forensics, CloudTrail Lake for investigation
- **Secrets management** — Secrets Manager (auto-rotation with Lambda), Parameter Store (SecureString), difference in features/cost

**PCI DSS / fintech-specific content:**
- VPC design for payment-card data (subnet isolation, no public access)
- CloudHSM for PCI-required HSM use
- AWS Artifact for compliance reports (SOC, PCI attestation)
- Logging retention (PCI requires ≥1 year)
- Key rotation cadence
- Macie for sensitive data discovery

**Killer exam topics:**
- Policy evaluation order and precedence
- Cross-account access: role chaining, ExternalId, trust policies
- Cross-account KMS usage patterns
- Detecting and responding to compromised IAM credentials
- VPC Flow Log + Athena forensics
- S3 bucket exposure remediation
- AWS Config rules for compliance-as-code

**Study path:**
- Adrian Cantrill SCS course (deep, slow but thorough)
- Stephane Maarek SCS
- Tutorials Dojo practice exams
- AWS whitepapers: Security Best Practices, Security Pillar of Well-Architected

**Existing memos:**
- `devops/cloud_aws/aws_iam_*`, `aws_kms_*`, `aws_secrets_*`, `aws_cloudtrail_*`, `aws_security_hub_*`, etc.
- `design_patterns/payment_network/pci_dss_scope_reduction_tokenization_encryption_segmentation.md`
- `web_security/` — OWASP Top 10

**Who it's for:** Security engineers, DevSecOps, compliance engineers in fintech/healthcare/regulated industries. Significantly higher salary than SAA-only.

**Rule of thumb:** SCS is heavily scenario-based around IAM policy evaluation and KMS patterns. Memorize the policy evaluation flowchart. Know KMS grants vs key policies cold. Understand the difference between Config (compliance), GuardDuty (threat), Security Hub (aggregator), Macie (data). For fintech, pair with CCSP or CISSP for broader governance context.
