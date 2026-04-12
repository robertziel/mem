### StatefulSets, DaemonSets, Jobs

**StatefulSet:**
- For stateful applications (databases, message queues, distributed systems)
- Provides stable pod identity: `pod-0`, `pod-1`, `pod-2`
- Ordered deployment and scaling (pod-0 before pod-1)
- Stable persistent storage (each pod gets its own PVC)
- Stable network identity via headless service: `pod-0.service.namespace.svc`

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres      # headless service name
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
  volumeClaimTemplates:       # each pod gets its own PVC
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast
        resources:
          requests:
            storage: 50Gi
```

**DaemonSet:**
- Runs one pod on every node (or a subset via nodeSelector)
- Use cases: log collectors, monitoring agents, network plugins

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentbit
spec:
  selector:
    matchLabels:
      app: fluentbit
  template:
    metadata:
      labels:
        app: fluentbit
    spec:
      containers:
        - name: fluentbit
          image: fluent/fluent-bit:latest
          volumeMounts:
            - name: varlog
              mountPath: /var/log
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
```

**Job (run-to-completion):**
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
spec:
  backoffLimit: 3              # retries on failure
  activeDeadlineSeconds: 600   # timeout
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: myapp:1.0
          command: ["rake", "db:migrate"]
```

**CronJob:**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-backup
spec:
  schedule: "0 2 * * *"       # 2 AM daily
  concurrencyPolicy: Forbid    # skip if previous still running
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: backup
              image: backup-tool:1.0
```

**Rule of thumb:** Use StatefulSet only when you need stable identity or ordered operations. Use DaemonSet for per-node agents. Use Jobs for one-off tasks and CronJobs for scheduled work. Prefer Deployment for everything else.
