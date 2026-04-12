### AWS Compute Services

**EC2 (Elastic Compute Cloud):**
- Virtual machines (instances) in the cloud
- Choose instance type (CPU, memory, storage profile)
- Common families: `t3` (burstable), `m6i` (general), `c6i` (compute), `r6i` (memory), `g5` (GPU)
- Launch in a VPC, assign security groups
- User data: bootstrap script run on first launch

**EC2 pricing:**
- **On-Demand** - pay per second, no commitment
- **Reserved** (1 or 3 year) - up to 72% discount
- **Spot** - up to 90% discount, can be terminated with 2-min notice
- **Savings Plans** - flexible commitment (compute or EC2-specific)

**Auto Scaling Group (ASG):**
- Maintains desired number of EC2 instances
- Scales based on metrics (CPU, custom CloudWatch metrics)
- Replaces unhealthy instances automatically
- Works with ALB target groups

```
ASG: min=2, desired=3, max=10
     Scale out: CPU > 70% for 5 min
     Scale in:  CPU < 30% for 10 min
```

**ECS (Elastic Container Service):**
- AWS-managed container orchestration
- **EC2 launch type** - you manage the EC2 instances
- **Fargate launch type** - serverless, no instances to manage
- Task Definition = pod spec (container image, CPU, memory, ports)
- Service = ensures desired count of tasks running behind a load balancer

**EKS (Elastic Kubernetes Service):**
- Managed Kubernetes control plane
- Worker nodes: managed node groups, self-managed, or Fargate
- Integrates with ALB (Ingress), EBS (storage), IAM (auth)
- Use when you need K8s portability or ecosystem

**Lambda:**
- Serverless functions, event-driven
- Pay per invocation + duration (ms)
- Max 15 min execution, 10 GB memory
- Triggers: API Gateway, S3, SQS, EventBridge, CloudWatch Events
- Cold starts: first invocation latency (mitigate with provisioned concurrency)

**When to use what:**

| Service | Best for |
|---------|----------|
| EC2 | Full control, stateful workloads, legacy apps |
| ECS Fargate | Containerized apps, no infra management |
| EKS | Multi-cloud K8s, K8s ecosystem tools |
| Lambda | Event-driven, short tasks, glue logic |

**Rule of thumb:** Default to Fargate for containers (simplest). Use EKS when you need K8s portability or tooling. Lambda for event-driven glue. EC2 for special requirements (GPU, custom kernel, licensing).
