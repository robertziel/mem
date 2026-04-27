### AWS Certified Solutions Architect - Professional (SAP-C02)

**The senior-level AWS cert.** Multi-account, migration, and complex architectures. 2x salary impact on top of SAA.

**Exam logistics:**
- Code: SAP-C02
- Duration: 180 min, 75 questions (longer scenarios, 3-5 sentences each)
- Passing: 750/1000
- Cost: $300 USD
- Validity: 3 years
- Prerequisite: none officially (SAA strongly recommended; 2+ years hands-on AWS)

**Domain weights (SAP-C02):**

| Domain | Weight | Focus |
|---|---|---|
| 1. Design Solutions for Organizational Complexity | 26% | Multi-account, networking, security org-wide |
| 2. Design for New Solutions | 29% | Greenfield architecture, requirements decomposition |
| 3. Continuous Improvement for Existing Solutions | 25% | Optimization, modernization, troubleshooting |
| 4. Accelerate Workload Migration and Modernization | 20% | Migration strategies, refactoring, lift-shift |

**What SAP tests that SAA doesn't:**
- **AWS Organizations** — SCPs, OUs, centralized billing, Control Tower
- **Multi-account networking** — Transit Gateway, PrivateLink, Direct Connect + VPN, RAM
- **Migration** — 7 Rs (Rehost/Replatform/Refactor/Repurchase/Retire/Retain/Relocate), DMS, SMS, Schema Conversion Tool, MGN, DataSync, Snow family
- **Hybrid** — Storage Gateway, Outposts, ECS/EKS Anywhere, Local Zones, Wavelength
- **Advanced DR** — pilot light / warm standby / multi-region active-active; RTO/RPO trade-offs
- **SAML/OIDC federation** — IAM Identity Center (formerly SSO), AD integration
- **Data lake architectures** — Lake Formation, Glue, EMR, Athena, Redshift Spectrum
- **ML platform** — SageMaker (overview, not deep)

**Killer exam topics (appear repeatedly):**
- Centralizing VPC outbound via TGW + inspection VPC
- Hub-and-spoke with Direct Connect gateway for multi-region hybrid
- S3 cross-region replication + KMS multi-region keys
- Blue-green for ECS/EKS/Lambda with CodeDeploy
- Event-driven multi-account (EventBridge cross-account buses)
- Data lake with Lake Formation permissions + Glue catalog
- Cost allocation via tags + Organizations + Cost Categories

**Exam strategy:**
- 180 min / 75 questions = 2.4 min per question — still rushed with long scenarios
- Expect 3-4 "all of these look right" questions per exam — pick the MOST appropriate
- Eliminate obviously wrong answers first (2 out of 4 usually), then compare the remaining 2
- Flag and return — don't dwell

**Study path:**
- Adrian Cantrill SAP (the definitive course)
- Stephane Maarek SAP (more condensed)
- Jon Bonso (Tutorials Dojo) practice exams — essential, do 4+ full sets
- AWS whitepapers: Well-Architected, Security Pillar, Reliability Pillar, Cost Optimization

**Existing memos:**
- `devops/cloud_aws/` covers most services at SAP depth
- `system_design_hld_high_level_design/` has architecture patterns that match SAP's scenario style

**Prep time:** 150-250 hours if you passed SAA recently. Significantly harder than SAA due to scenario complexity.

**Rule of thumb:** SAP is 80% decision-making between 3-4 plausible architectures, 20% service knowledge. Read the constraint words carefully ("MOST cost-effective WITH MINIMAL operational overhead" — both must hold). Multi-account Organizations patterns appear constantly — know SCPs, Control Tower, and cross-account IAM cold.
