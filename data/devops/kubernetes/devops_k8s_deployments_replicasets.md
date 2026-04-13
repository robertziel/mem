### Deployments and ReplicaSets

**Deployment:**
- Manages ReplicaSets, which manage Pods
- Declarative updates: change the spec, K8s handles rollout
- Supports rolling updates, rollbacks, scaling

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1          # max pods above desired during update
      maxUnavailable: 0     # zero downtime
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: myapp:1.2.0
          ports:
            - containerPort: 8080
```

**Deployment strategies:**
- **RollingUpdate** (default) - gradually replace old pods with new
  - `maxSurge: 1` + `maxUnavailable: 0` = zero-downtime rolling update
- **Recreate** - kill all old pods, then create new (causes downtime, use for stateful apps that can't run two versions)

**Rollout commands:**
```bash
kubectl rollout status deployment/web        # watch rollout progress
kubectl rollout history deployment/web       # list revisions
kubectl rollout undo deployment/web          # rollback to previous
kubectl rollout undo deployment/web --to-revision=2   # specific revision
kubectl rollout restart deployment/web       # trigger rolling restart
```

**Scaling:**
```bash
kubectl scale deployment/web --replicas=5
```

**ReplicaSet:**
- Ensures N pod replicas are running
- Rarely created directly; Deployment manages them
- Each Deployment update creates a new ReplicaSet (old ones kept for rollback)

**Deployment vs StatefulSet vs DaemonSet:**

| Resource | Use case | Pod identity |
|----------|----------|-------------|
| Deployment | Stateless apps (web servers, APIs) | Interchangeable |
| StatefulSet | Stateful apps (databases, Kafka) | Stable hostname, ordered |
| DaemonSet | One pod per node (log collector, monitoring agent) | Per-node |

**Rule of thumb:** Use Deployments for stateless workloads. Set `maxUnavailable: 0` for zero-downtime deploys. Always keep rollout history for fast rollbacks.
