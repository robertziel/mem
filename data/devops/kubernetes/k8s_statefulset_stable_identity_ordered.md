### Kubernetes StatefulSet

**What StatefulSet does:**
- Stable pod identity: `pod-0`, `pod-1`, `pod-2`
- Ordered deployment and scaling (pod-0 before pod-1)
- Stable persistent storage (each pod gets its own PVC)
- Stable network identity: `pod-0.service.namespace.svc`

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 50Gi
```

**Use for:** databases, Kafka, ZooKeeper, Elasticsearch — anything needing stable identity or ordered operations.

**Rule of thumb:** StatefulSet only when you need stable pod names, ordered startup, or per-pod persistent storage. For stateless workloads, use Deployment instead.
