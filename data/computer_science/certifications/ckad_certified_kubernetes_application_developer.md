### CKAD — Certified Kubernetes Application Developer

**Exam quick facts:**

| Item | Value |
|---|---|
| Code | CKAD |
| Duration | 120 min, 15–20 hands-on tasks (weighted) |
| Pass | 66% |
| Cost | $445 USD (one free retake) |
| Validity | 2 years |
| K8s version | Current minus a release (e.g. v1.31+) |
| Format | Remote-proctored, real cluster terminal |
| Allowed docs | kubernetes.io/docs, kubernetes.io/blog, helm.sh/docs |

**Domain weights:**

| # | Domain | Weight | Headline focus |
|---|---|---:|---|
| 1 | Application Design & Build | 20% | Multi-container pods, init containers, probes, Jobs, CronJobs |
| 2 | Application Deployment | 20% | Deployments, rollouts, rollbacks, Helm basics, blue/green, canary |
| 3 | Observability & Maintenance | 15% | Probes, logs, debug |
| 4 | **Environment, Config, Security** | **25%** | ConfigMaps, Secrets, SAs, SecurityContext, RBAC |
| 5 | Services & Networking | 20% | Services, Ingress, NetworkPolicies |

**CKAD vs CKA vs CKS:** see [cka_certified_kubernetes_administrator.md](cka_certified_kubernetes_administrator.md) for the cert-comparison matrix.

**Imperative commands — generate YAML fast (the entire exam strategy):**

| Goal | Command |
|---|---|
| Pod skeleton | `kubectl run nginx --image=nginx --dry-run=client -o yaml > pod.yaml` |
| Deployment skeleton | `kubectl create deployment app --image=nginx --replicas=3 --dry-run=client -o yaml > d.yaml` |
| ConfigMap from literal | `kubectl create configmap app --from-literal=KEY=value` |
| ConfigMap from file | `kubectl create configmap app --from-file=config.yaml` |
| Secret | `kubectl create secret generic db --from-literal=password=xxx` |
| Job | `kubectl create job hi --image=busybox -- /bin/sh -c "echo hi"` |
| CronJob | `kubectl create cronjob cron --image=busybox --schedule="*/1 * * * *" -- ls` |
| Service from deployment | `kubectl expose deployment app --port=80 --target-port=8080 --type=ClusterIP` |
| Scale | `kubectl scale deployment app --replicas=5` |
| Rollout status / undo | `kubectl rollout status deployment app` / `... rollout undo deployment app` |

**Aliases / env vars to set first thing on the exam:**

| Set up | Effect |
|---|---|
| `alias k=kubectl` | One letter saves seconds × dozens of commands |
| `export do='--dry-run=client -o yaml'` | `k run x --image=nginx $do` instantly produces YAML |
| `export now='--force --grace-period=0'` | Fast pod delete |
| `source <(kubectl completion bash)` | Tab completion for resources |
| `complete -F __start_kubectl k` | Same completion under the alias |

**`kubectl explain` for any field you forget:**

| Use | Command |
|---|---|
| Top-level fields | `k explain pod` |
| Drill | `k explain pod.spec.containers` |
| Show **everything** | `k explain pod.spec.containers --recursive` |
| Probes | `k explain pod.spec.containers.livenessProbe --recursive` |
| Volumes | `k explain pod.spec.volumes --recursive` |
| NetworkPolicy | `k explain networkpolicy.spec --recursive` |

**YAML patterns to have at fingertips:**

| Pattern | What to remember |
|---|---|
| **Multi-container pod** | Containers in `spec.containers[]`, communicate via shared `emptyDir` volume or `localhost` |
| **Init container** | `spec.initContainers[]` runs to completion before main containers |
| **Probes** (`liveness`, `readiness`, `startup`) | One of `httpGet` / `exec` / `tcpSocket`; tune `initialDelaySeconds`, `periodSeconds`, `failureThreshold` |
| **Resource requests/limits** | `resources: { requests: { cpu, memory }, limits: { cpu, memory } }` |
| **ConfigMap as env** | `envFrom: [{ configMapRef: { name } }]` or `env: [{ name, valueFrom: { configMapKeyRef } }]` |
| **ConfigMap as volume** | `volumes: [{ name, configMap: { name } }]` + `volumeMounts: [{ name, mountPath }]` |
| **Secret as env / volume** | Same shape as ConfigMap, swap `configMapRef` → `secretRef` |
| **ServiceAccount + RBAC** | `Role` (verbs/resources) + `RoleBinding` (subjects) — namespace-scoped |
| **SecurityContext (pod)** | `runAsUser`, `runAsNonRoot`, `fsGroup` — hardening defaults |
| **SecurityContext (container)** | `capabilities.drop: ["ALL"]`, `readOnlyRootFilesystem`, `allowPrivilegeEscalation: false` |
| **NetworkPolicy** | `podSelector`, `policyTypes: [Ingress, Egress]`, rules with `podSelector`/`namespaceSelector`/`ipBlock` |
| **Ingress** | `rules[].host`, `paths[].path` + `pathType` (`Prefix` / `Exact`), `backend.service.name` |
| **Job** | `completions`, `parallelism`, `backoffLimit`, `restartPolicy: Never` |
| **CronJob** | `schedule` (cron string), `concurrencyPolicy` (`Allow`/`Forbid`/`Replace`), `successfulJobsHistoryLimit` |

**Service types — quick discrimination:**

| Type | Reachable from | Use for |
|---|---|---|
| `ClusterIP` (default) | Inside cluster only | Service-to-service |
| `NodePort` | Any node IP at `:30000–32767` | Quick external access in dev |
| `LoadBalancer` | Cloud LB IP | External, production |
| `ExternalName` | DNS CNAME (no proxy) | Alias for an external host |
| `Headless` (`clusterIP: None`) | Direct pod IPs via DNS | StatefulSets, peer discovery |

**Probes — failure consequence by type:**

| Probe | Fails → | Use for |
|---|---|---|
| `livenessProbe` | Container restarted | Detect deadlocked process |
| `readinessProbe` | Pod removed from Service endpoints | Cold start, transient downstream issue |
| `startupProbe` | Liveness/readiness suspended until startup passes | Slow-starting apps; prevents premature liveness kill |

**Debug flow (the 15% observability bucket):**

| Step | Command |
|---|---|
| Start | `k describe pod <p>` — read **Events** at the bottom |
| Logs | `k logs <p> -c <container>` (`--previous` for last crash) |
| Inside container | `k exec -it <p> -c <c> -- sh` |
| All events sorted | `k get events --sort-by=.lastTimestamp` |
| Local port-forward | `k port-forward <p> 8080:80` |
| Wait on rollout | `k rollout status deployment <d>` |
| Drop to last good | `k rollout undo deployment <d>` |

**Time-saving exam habits:**

| Habit | Reason |
|---|---|
| Read every question's namespace + context | Wrong namespace = 0 marks even if YAML is correct |
| `k config use-context <ctx>` at the start of each task | Multi-cluster exam — easy to apply to wrong cluster |
| Generate YAML imperatively, then edit | Faster than typing from scratch |
| Use kubernetes.io/docs as a copy-paste source | YAML templates for NetworkPolicy, Ingress, etc. |
| Flag hard tasks, come back later | 5–7 min target per task |
| Vim: `set tabstop=2 expandtab` (in `.vimrc` if allowed) | YAML demands consistent 2-space indent |

**Study path (40–80 hours with K8s experience; 100–150 without):**

| Resource | Why |
|---|---|
| KodeKloud CKAD (Mumshad) | Mock labs + paced video |
| killer.sh CKAD (2 attempts free with exam) | **Harder than the real exam** — calibrates speed |
| Daily `kubectl` drills 2–3 weeks out | Muscle memory wins the speed game |
| Full 2-hour mock under timer | Build the stamina |

**Pitfalls:**

| Pitfall | Effect |
|---|---|
| Forgetting `--namespace` / context switch | Apply to wrong place — task graded as failed |
| Hand-typing YAML from memory | Slow + error-prone — use imperative + edit |
| Ignoring `kubectl explain --recursive` | Spending minutes on docs site for fields that are inline |
| Multi-container pod confusion | One pod, multiple containers, shared volume — not multiple pods |
| Mixing up Jobs vs CronJobs | Job runs once; CronJob runs on a schedule |
| Probes with same `initialDelaySeconds` for liveness as readiness | App killed during cold start — use `startupProbe` |

**Cross-references:** `devops/kubernetes/` — RBAC, probes, networking, storage, Ingress, Helm cheatsheets.

**Rule of thumb:** **CKAD is a speed exam — you know it cold or you don't finish.** Imperative commands (`run`, `create`, `expose`) **generate most YAML** for you; memorize the flags + `--dry-run=client -o yaml`. **`kubectl explain --recursive`** is faster than the website. **Always check namespace + context** before applying. **killer.sh the night before** — its difficulty calibrates your real-exam speed.
