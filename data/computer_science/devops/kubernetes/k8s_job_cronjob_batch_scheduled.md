### Kubernetes Job & CronJob

**Job (run-to-completion):**
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
spec:
  backoffLimit: 3
  activeDeadlineSeconds: 600
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: myapp:1.0
          command: ["rake", "db:migrate"]
```

**CronJob (scheduled):**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-backup
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
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

**concurrencyPolicy:** `Allow` (default), `Forbid` (skip if previous still running), `Replace` (stop previous, start new).

**Rule of thumb:** Job for one-off tasks (migrations, data processing). CronJob for scheduled work (backups, cleanup). Set `backoffLimit` to prevent infinite retries. Use `Forbid` for jobs that shouldn't overlap.
