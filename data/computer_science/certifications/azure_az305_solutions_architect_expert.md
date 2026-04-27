### Microsoft Certified: Azure Solutions Architect Expert (AZ-305)

**The senior Azure cert.** Equivalent of AWS SAP — for designing Azure cloud solutions end-to-end.

**Exam logistics:**
- Code: AZ-305 (single exam as of 2022; was AZ-303 + AZ-304 previously)
- Duration: 120 min, 40-60 questions (mix: multiple choice, case studies, drag-drop, yes/no)
- Passing: 700/1000
- Cost: $165 USD
- Validity: 1 year (must renew annually via free online assessment — unique to Microsoft)
- Prerequisite: AZ-104 Administrator Associate strongly recommended

**Domain weights (AZ-305):**

| Domain | Weight | Focus |
|---|---|---|
| 1. Design Identity, Governance, and Monitoring | 25-30% | Entra ID (formerly AAD), RBAC, Policy, Blueprints, Monitor |
| 2. Design Data Storage | 25-30% | Cosmos DB, SQL DB, Storage Accounts, redundancy, caching |
| 3. Design Business Continuity | 10-15% | Site Recovery, Backup, DR strategies |
| 4. Design Infrastructure | 25-30% | Compute (VM, VMSS, AKS, App Service, Functions, Container Apps), networking, hybrid, migration |

**Core Azure services (must know):**
- **Compute**: VMs, VMSS, App Service, Functions, AKS, Container Apps, Batch, Service Fabric
- **Storage**: Storage Accounts (blob/table/queue/file), redundancy (LRS/ZRS/GRS/GZRS/RA-GRS/RA-GZRS), access tiers (hot/cool/cold/archive)
- **Database**: Azure SQL (DB / Managed Instance / VM), Cosmos DB (APIs: SQL/Mongo/Cassandra/Gremlin/Table), PostgreSQL Flexible Server
- **Networking**: VNet, subnets, NSG, ASG, Azure Firewall, Front Door, Application Gateway, Load Balancer (L4), Traffic Manager, ExpressRoute, VPN Gateway
- **Identity**: Entra ID (P1/P2), PIM, Conditional Access, managed identities (system vs user-assigned), B2B vs B2C
- **Security**: Key Vault, Defender for Cloud, Sentinel, encryption (CMK vs platform-managed)
- **Messaging**: Service Bus (queues/topics), Event Grid, Event Hubs, Storage Queues
- **Monitoring**: Monitor, Log Analytics, Application Insights, Alerts, Action Groups

**Cosmos DB consistency levels (common exam topic):**
- Strong → Bounded Staleness → Session (default) → Consistent Prefix → Eventual
- Trade-off: strong = higher latency + RU cost; eventual = lowest latency, most throughput

**AKS + identity integration (common scenario):**
- Workload identity (replaces pod-managed identity — deprecated)
- Azure RBAC for Kubernetes
- Private cluster + Private Link

**Key decision patterns:**
- App Service vs AKS vs Container Apps vs Functions (PaaS → serverless containers → serverless functions)
- Blob vs File Storage vs Data Lake Gen2 (object vs SMB/NFS vs analytics hierarchical)
- Cosmos DB vs Azure SQL vs PostgreSQL (NoSQL global multi-region vs relational vs open-source relational)
- Front Door vs Application Gateway vs Load Balancer (global L7 vs regional L7 vs L4)
- Private Endpoint vs Service Endpoint (VNet-injected IP vs firewall exception)

**Killer topics (appear often):**
- Hub-and-spoke networking + Azure Firewall for egress inspection
- Hybrid identity (Entra ID Connect sync / pass-through auth / federation)
- Passwordless auth (FIDO2, Microsoft Authenticator)
- Zero-trust network design
- Multi-region active-active with Cosmos DB + Traffic Manager
- Cost optimization: Reserved Instances, Spot VMs, Azure Hybrid Benefit

**Study path:**
- John Savill YouTube (the absolute best, free)
- Microsoft Learn free learning paths (official, updated frequently)
- Tim Warner on Pluralsight
- MeasureUp / WhizLabs practice exams
- Azure Architecture Center (reference architectures)

**Existing memos:**
- No Azure-specific content yet — this is a gap in the existing corpus

**Who it's for:** Architects in Microsoft-heavy shops (enterprise, financial services with MS stack, government). Many fintech built on Azure.

**Rule of thumb:** AZ-305 is heavily scenario-based with case studies (4-6 long scenarios each with 5-10 questions). Know Entra ID patterns cold — identity is the dominant theme. Cosmos DB consistency levels and Storage Account redundancy tiers appear on nearly every exam. Renew annually via the free online assessment — don't let it lapse.
