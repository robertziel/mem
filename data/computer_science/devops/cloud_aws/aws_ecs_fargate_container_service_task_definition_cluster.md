### AWS ECS & Fargate (Cluster, Service, Task Definition)

**Hierarchy:**

```
ECS Cluster
  └── Service                ← desired count, load balancer, autoscaling, deploy
       └── Task              ← running instance of a Task Definition
            └── Container(s) ← Docker images
```

| Concept | Role |
|---|---|
| Cluster | Logical group of tasks/services (boundary for capacity providers, IAM scope) |
| Task Definition | Versioned blueprint (image, CPU/mem, env, IAM, ports, log config) |
| Task | One running instantiation of a Task Definition |
| Service | Keeps N tasks running, handles deploys, scales, registers with ALB |
| Capacity Provider | "How tasks get hosted": Fargate, Fargate Spot, EC2 ASG |

**Launch types — Fargate vs EC2:**

| Feature | EC2 launch type | **Fargate** |
|---|---|---|
| Who manages hosts | You (EC2 + ASG + AMI) | AWS |
| Scaling unit | Hosts + tasks | Tasks only |
| SSH / kernel access | Yes | No |
| Pricing | Per EC2 instance | Per `vCPU·s` + `GB-mem·s` per task |
| Custom AMI / GPU | ✅ | ❌ (Fargate has GPU now but limited) |
| Best for | Cost optimization at scale, GPU, custom kernel needs | **Default** — simplest, most workloads |

**Task Definition — the fields that matter:**

| Field | Purpose | Notes |
|---|---|---|
| `family` | Logical name of the task def | Versions auto-increment per family |
| `networkMode` | `awsvpc` (each task gets its own ENI) / `bridge` / `host` / `none` | **`awsvpc`** is required for Fargate and the only sane choice on EC2 |
| `requiresCompatibilities` | `[FARGATE]` or `[EC2]` | Pick the launch types this def is valid for |
| `cpu` / `memory` | Task-level reservation | Fargate: must match a [valid combo](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html); EC2: containers can sub-allocate |
| `executionRoleArn` | Permissions for the **ECS agent** (pull from ECR, write logs, read secrets) | Use `ecsTaskExecutionRole` |
| `taskRoleArn` | Permissions for **your application** (S3, DynamoDB, …) | App-specific least-privilege role |
| `containerDefinitions` | Array of container specs | See below |
| `runtimePlatform.cpuArchitecture` | `X86_64` or `ARM64` (Graviton) | Graviton is ~20% cheaper |
| `volumes` | Shared storage between containers | EFS, bind mount, Docker volume |
| `pidMode`, `ipcMode` | Process / IPC namespacing | Rarely set |

**Container spec fields:**

| Field | Purpose |
|---|---|
| `image` | Full ECR / Docker Hub URL — pin by digest or tag |
| `portMappings` | Map container port → host port (`awsvpc` uses task ENI, no host port mapping) |
| `essential` | If `true`, task stops when this container exits |
| `environment` | Plain env vars (don't put secrets here) |
| `secrets` | Pull from Secrets Manager / SSM Parameter Store at start |
| `logConfiguration` | `awslogs` (CloudWatch), `awsfirelens` (custom routing), `splunk`, ... |
| `healthCheck` | `["CMD-SHELL", "curl -f http://localhost/health"]` + `interval` / `timeout` / `retries` |
| `dependsOn` | Wait for another container's `START` / `COMPLETE` / `SUCCESS` / `HEALTHY` |
| `ulimits` / `linuxParameters` | Tuning for high-fd or specific kernel knobs |
| `stopTimeout` | SIGKILL after N seconds (default 30) — graceful shutdown budget |

**Two IAM roles you can't conflate:**

| Role | Granted to | Permissions |
|---|---|---|
| **Execution role** | ECS agent | `ecr:GetAuthorizationToken`, `logs:*` on log group, `secretsmanager:GetSecretValue` for the secrets in the task def |
| **Task role** | Your application code | Whatever your app needs — S3, DynamoDB, Kinesis, ... |

**Service config:**

| Setting | Effect |
|---|---|
| `desiredCount` | How many tasks to keep running |
| `loadBalancers` | Register tasks into ALB / NLB target group |
| `deploymentConfiguration.minimumHealthyPercent` | Never drop below this fraction during deploy |
| `deploymentConfiguration.maximumPercent` | Allow temporary excess during deploy |
| `deploymentController.type` | `ECS` (rolling), `CODE_DEPLOY` (blue/green), `EXTERNAL` (you drive it) |
| `healthCheckGracePeriodSeconds` | Ignore unhealthy reports while task is starting up |
| `placementStrategies` | (EC2 only) `spread`, `binpack`, `random` |
| `enableExecuteCommand` | Allow `aws ecs execute-command` for live debug |

**Deployment strategies:**

| Strategy | Mechanism | When to use |
|---|---|---|
| Rolling (default `minHealthy=100`, `maxPct=200`) | Replace tasks gradually, keep all healthy | Most cases |
| Rolling (`minHealthy=50`) | Faster, allows brief capacity dip | Cost-sensitive |
| Blue/green via CodeDeploy | Two task sets, shift ALB listener traffic, easy rollback | Critical paths, regulatory rollback needs |
| External | You orchestrate (e.g., GitOps tool) | Custom workflows |

**Autoscaling — target tracking:**

| Metric | Used for |
|---|---|
| `ECSServiceAverageCPUUtilization` | CPU-bound services |
| `ECSServiceAverageMemoryUtilization` | Memory-bound (rare; usually right-size instead) |
| `ALBRequestCountPerTarget` | Web/API services — best signal for scale-out |
| Custom CloudWatch metric | Queue depth (`ApproximateNumberOfMessagesVisible`) for workers |

**Service discovery options:**

| Option | Mechanism |
|---|---|
| ALB / NLB | Public/internal LB; tasks register as targets |
| AWS Cloud Map (DNS) | Service registers `web.local`, `api.local` — clients look up by DNS |
| **ECS Service Connect** | Envoy sidecar in each task; mTLS, retries, telemetry without code changes |
| Direct IP | Tasks call other tasks by ENI IP — only works inside the same VPC, fragile |

**Fargate Spot:**

| Property | Value |
|---|---|
| Discount | Up to ~70% off on-demand |
| Interruption | Possible — 2-minute warning via SIGTERM + ECS events |
| Good for | Batch jobs, async workers, non-critical replicas |
| **Not** for | Public APIs, single-replica services |

**Debugging in production — `ecs execute-command`:**

```bash
aws ecs execute-command \
  --cluster prod --task <task-arn> --container web \
  --interactive --command /bin/sh
```

Requires `enableExecuteCommand=true` on the service + task IAM permissions for SSM.

**Logs / observability quick map:**

| Need | Use |
|---|---|
| Container stdout/stderr | `awslogs` driver → CloudWatch Logs |
| Custom log routing (Datadog, Loki) | `awsfirelens` driver + Fluent Bit / Fluentd |
| Metrics | Container Insights (CloudWatch agent in task) |
| Traces | OTel sidecar or AWS Distro for OpenTelemetry (ADOT) |

**Common pitfalls:**

| Pitfall | Why it bites |
|---|---|
| Secrets put in `environment` | Visible in describe-task; rotate is hard. Use `secrets` → Secrets Manager |
| `essential: true` on every container | Sidecar dies → whole task dies; mark log/metric sidecars `essential: false` |
| No `healthCheck` on container | ALB target health alone won't catch zombie processes |
| Forgetting `healthCheckGracePeriodSeconds` | New deploys flap as cold-start tasks fail their first probe |
| Mixing Fargate + EC2 in one Task Definition | Use `requiresCompatibilities` to be explicit; some features (e.g. host networking) are EC2-only |
| Running Spot for the only replica of a public service | Two-minute SIGTERM = traffic drop |

**Rule of thumb:** **Fargate for most workloads**; reach for EC2 only for GPU, custom kernels, or large-scale cost optimization. **Two roles**: execution role for the agent, task role for your app — never combine them. **Secrets via Secrets Manager `secrets:` block**, never `environment:`. **ALB-request-count per target is the most reliable autoscaling signal** for web services. **ECS Service Connect** is the easy path to mTLS + telemetry without running a service mesh.
