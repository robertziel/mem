### Google Cloud Professional Cloud Architect (PCA)

**The senior GCP cert.** Consistently ranked as one of the highest-paying IT certifications by Global Knowledge / Skillsoft surveys.

**Exam logistics:**
- Code: none (just "Professional Cloud Architect")
- Duration: 120 min, 50-60 questions (multiple choice + multi-select)
- Passing: not published (target ~80%)
- Cost: $200 USD
- Validity: 2 years
- Prerequisite: none official; 3+ years cloud + 1+ year GCP recommended
- Language: English, Japanese, Spanish (varies)

**Exam sections:**

| Section | Focus |
|---|---|
| 1. Designing and planning a cloud solution architecture | Business/technical requirements, migration |
| 2. Managing and provisioning solution infrastructure | Networking, compute, storage, data, security |
| 3. Designing for security and compliance | IAM, VPC Service Controls, encryption |
| 4. Analyzing and optimizing processes | Cost optimization, performance, SLOs |
| 5. Managing implementations | Deployment, Terraform, CI/CD |
| 6. Ensuring solution and operations reliability | SRE, monitoring, DR |

**Exam format — the "case studies" differentiator:**
- ~30% of questions tied to 4 persistent case studies (Mountkirk Games, Helicopter Racing League, EHR Healthcare, TerramEarth)
- You must read and remember the case study business/tech context
- The other 70% are standalone scenario questions

**Core GCP services (must know deeply):**
- **Compute**: Compute Engine, GKE, Cloud Run, Cloud Functions, App Engine (Std/Flex), Batch, VMware Engine
- **Storage**: Cloud Storage (classes: Standard/Nearline/Coldline/Archive), Persistent Disk, Filestore
- **Database**: Cloud SQL (MySQL/PG/MSSQL), Spanner (globally consistent SQL), Firestore, Bigtable, Memorystore (Redis/Memcached)
- **Networking**: VPC (global, unlike AWS), Cloud Load Balancing (global HTTP(S)), Cloud CDN, Cloud Interconnect, Cloud NAT, Shared VPC, VPC Peering
- **Data**: BigQuery (serverless DW), Dataflow (Apache Beam), Dataproc (managed Spark/Hadoop), Pub/Sub, Composer (managed Airflow)
- **Identity**: Cloud IAM, Workload Identity Federation, Identity-Aware Proxy (IAP), BeyondCorp
- **Security**: Cloud KMS, Secret Manager, Cloud Armor (WAF), VPC Service Controls, Binary Authorization, Chronicle
- **Ops**: Cloud Monitoring, Cloud Logging, Cloud Trace, Cloud Profiler, Error Reporting (all under "Cloud Operations Suite" / Stackdriver)

**GCP distinctives (vs AWS/Azure):**
- **VPC is global** (not regional) — one VPC can span all regions
- **Spanner** — globally strongly consistent relational DB (no AWS/Azure equivalent at this scale)
- **BigQuery** — serverless data warehouse, separates storage from compute, per-query pricing
- **Live Migration** for VMs (minimal disruption during maintenance)
- **Workload Identity Federation** — use external OIDC providers without service account keys
- **Shared VPC** — host project + service projects (common in enterprise)
- **Sustained-use discounts** (automatic, not pre-commitment like Reserved Instances)

**Key decision patterns:**
- Cloud SQL vs Spanner vs Firestore vs Bigtable (regional relational → global relational → doc → wide-column time-series)
- App Engine vs Cloud Run vs GKE vs Compute Engine (PaaS → serverless container → managed K8s → IaaS)
- Pub/Sub vs Pub/Sub Lite (global vs regional/zonal, cost trade-off)
- Dataflow vs Dataproc (serverless beam vs managed Hadoop/Spark)
- Cloud Run vs Cloud Run Jobs vs Cloud Functions (request-driven → batch → event-driven)
- Shared VPC vs VPC Peering vs VPN (multi-project → simple peer → hybrid)

**Killer exam topics:**
- VPC Service Controls (data exfiltration prevention) — THE Google-specific security concept
- Organization hierarchy + folders + projects + IAM inheritance
- Shared VPC networking for multi-project orgs
- BigQuery partitioning (time vs integer range) and clustering
- Spanner split points and schema design
- GKE autopilot vs standard, private clusters, Workload Identity
- Case study: migrate legacy on-prem to GCP (lift-and-shift vs re-platform)

**Study path:**
- Google Cloud Skills Boost (official, includes hands-on labs via Qwiklabs)
- Dan Sullivan's book "Google Cloud Certified Professional Cloud Architect Study Guide"
- Whizlabs practice exams
- Official Google case studies — read and re-read until familiar
- Coursera "Preparing for Google Cloud Certification" specialization (free to audit)

**Existing memos:**
- No GCP-specific content yet — this is a gap

**Who it's for:** Architects in data-heavy companies, GCP shops (Spotify, Twitter/X historically, many fintech/ad-tech). Prep time: 100-200 hours.

**Rule of thumb:** Case studies dominate — know all 4 fictional companies' requirements cold. The exam rewards understanding GCP's unique differentiators (global VPC, Spanner, BigQuery separation of compute/storage, VPC Service Controls). Higher pass-rate than AWS SAP because format is less tricky, but the 2-year renewal is the catch.
