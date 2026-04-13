### AWS ECS & Fargate (Container Service)

**ECS architecture:**
```
ECS Cluster
  └── Service (desired count, load balancer, auto-scaling)
        └── Task (running instance of a Task Definition)
              └── Container(s) (Docker containers)
```

**Launch types:**
| Feature | EC2 launch type | Fargate launch type |
|---------|----------------|-------------------|
| Infrastructure | You manage EC2 instances | AWS manages everything |
| Scaling | Manage ASG + task scaling | Just task scaling |
| Pricing | EC2 instance cost | Per vCPU + memory per second |
| Control | Full (SSH, custom AMI) | Limited (no SSH) |
| Best for | GPU, large clusters, cost optimization | Simplicity, most workloads |

**Task Definition (like a pod spec):**
```json
{
  "family": "web-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "web",
      "image": "123456.dkr.ecr.us-east-1.amazonaws.com/web:abc123",
      "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],
      "environment": [{ "name": "RAILS_ENV", "value": "production" }],
      "secrets": [
        { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:..." }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/web-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "web"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

**Key roles:**
- **Execution Role**: ECS agent permissions (pull images from ECR, write logs, read secrets)
- **Task Role**: application permissions (access S3, DynamoDB, etc.)

**Service (keeps tasks running):**
- Desired count: maintain N running tasks
- Load balancer: register tasks with ALB target group
- Deployment: rolling update (min/max healthy percent)
- Auto-scaling: target tracking on CPU, memory, or ALB request count

**Deployment strategies:**
```
Rolling update (default):
  minimumHealthyPercent: 100    # never go below desired count
  maximumPercent: 200            # allow 2x during deploy

Blue/Green (with CodeDeploy):
  Deploy new task set, shift traffic, rollback if unhealthy
```

**Service Connect / Service Discovery:**
- ECS Service Connect: built-in service mesh (Envoy-based)
- Cloud Map: DNS-based service discovery (`web.local`, `api.local`)
- Tasks find each other by name, no hardcoded IPs

**Fargate Spot:**
- Up to 70% discount
- Tasks can be interrupted with 2-min warning
- Good for: batch processing, non-critical workers
- NOT for: web servers, APIs

**ECS Exec (debugging):**
```bash
aws ecs execute-command --cluster prod --task abc123 --container web --interactive --command "/bin/sh"
```

**Rule of thumb:** Fargate for most workloads (no infra management). EC2 launch type only for GPU, cost optimization at large scale, or special requirements. Always set health checks. Use Secrets Manager for credentials (not env vars in task definition). Use Service Connect for service-to-service communication.
