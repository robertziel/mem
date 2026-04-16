### AWS Certified Solutions Architect - Associate (SAA-C03)

**The most requested cloud cert industry-wide.** Validates ability to design distributed systems on AWS.

**Exam logistics:**
- Code: SAA-C03
- Duration: 130 min, 65 questions (multiple choice + multiple response)
- Passing: 720/1000 (scaled scoring)
- Cost: $150 USD
- Validity: 3 years
- Recertification: retake exam or pass any Pro-level AWS exam

**Domain weights (SAA-C03):**

| Domain | Weight | Focus |
|---|---|---|
| 1. Design Secure Architectures | 30% | IAM, KMS, VPC security, data protection |
| 2. Design Resilient Architectures | 26% | Multi-AZ, Auto Scaling, DR strategies |
| 3. Design High-Performing Architectures | 24% | Caching, read replicas, CDN, compute selection |
| 4. Design Cost-Optimized Architectures | 20% | Reserved/Spot, S3 tiers, right-sizing |

**Core services (must know deeply):**
- **Compute**: EC2, Lambda, ECS/EKS/Fargate, Auto Scaling, ELB (ALB/NLB/GWLB)
- **Storage**: S3 (classes, lifecycle, encryption), EBS (gp3/io2), EFS, FSx
- **Database**: RDS, Aurora (Serverless), DynamoDB (GSI/LSI/streams), ElastiCache (Redis/Memcached)
- **Networking**: VPC, subnets, NAT, TGW, VPC peering, Route 53 (routing policies), CloudFront
- **Security**: IAM (policies, roles, STS), KMS (envelope encryption), Cognito, Secrets Manager, Parameter Store, WAF, Shield
- **Messaging**: SQS (standard/FIFO, DLQ), SNS, EventBridge, Kinesis (Data Streams, Firehose)
- **Integration**: Step Functions, API Gateway

**Key decision patterns to memorize:**
- SQS vs SNS vs EventBridge vs Kinesis (queue vs pub/sub vs event bus vs stream)
- S3 storage classes (Standard → IA → Glacier Instant → Deep Archive)
- Aurora vs RDS (5× perf, serverless option) vs DynamoDB (NoSQL single-digit ms)
- ALB (L7, HTTP) vs NLB (L4, TCP/UDP, static IP) vs GWLB (firewall insertion)
- Multi-AZ vs Read Replica (HA vs read scale)
- EFS vs FSx vs S3 (shared file vs Windows/Lustre vs object)

**Study path:**
- Adrian Cantrill's course (the gold standard)
- Stephane Maarek on Udemy (most popular, cheap)
- AWS Skill Builder (official, free tier available)
- Tutorials Dojo practice exams (essential — closest to real exam difficulty)

**Existing memos that cover this:**
- `devops/cloud_aws/` — 40+ AWS service cheatsheets covering the entire exam blueprint
- `system_design_hld_high_level_design/fundamentals/` — CAP theorem, caching, load balancing, DB scaling

**Who it's for:** Mid-level engineers targeting cloud roles. Prerequisite for SAP-C02. Prep time: 80-120 hours for someone with 6 months AWS exposure.

**Rule of thumb:** The exam rewards knowing trade-offs, not memorizing service details. For every scenario question: "which is MOST cost-effective / MOST highly available / MOST performant?" — answer maps to the right service. Practice exams matter more than video courses.
