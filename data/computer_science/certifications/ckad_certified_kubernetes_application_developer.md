### CKAD — Certified Kubernetes Application Developer

**The hands-on Kubernetes cert for developers.** 100% performance-based (you SSH into a cluster and solve problems). Essential for SaaS/microservices engineers.

**Exam logistics:**
- Code: CKAD
- Duration: 120 min, 15-20 hands-on tasks (weighted)
- Passing: 66% (was 66% historically; check Linux Foundation for current)
- Cost: $445 USD (includes one free retake)
- Validity: 2 years
- Format: Remote-proctored, real Kubernetes clusters (v1.31+ typically)
- Retake: one free retake included

**Domain weights (CKAD):**

| Domain | Weight | Focus |
|---|---|---|
| 1. Application Design and Build | 20% | Multi-container pods, init containers, probes, Jobs, CronJobs |
| 2. Application Deployment | 20% | Deployments, rollouts, rollbacks, Helm basics, blue/green, canary |
| 3. Application Observability and Maintenance | 15% | Liveness/Readiness/Startup probes, logging, debugging |
| 4. Application Environment, Configuration, and Security | 25% | ConfigMaps, Secrets, ServiceAccounts, SecurityContext, RBAC |
| 5. Services and Networking | 20% | Services (ClusterIP/NodePort/LoadBalancer), Ingress, NetworkPolicies |

**kubectl commands you MUST know cold (speed is everything):**
```bash
# Create resources imperatively
kubectl run nginx --image=nginx --port=80 --dry-run=client -o yaml > pod.yaml
kubectl create deployment nginx --image=nginx --replicas=3 --dry-run=client -o yaml
kubectl create configmap app --from-literal=KEY=value --from-file=config.yaml
kubectl create secret generic db --from-literal=password=xxx
kubectl create job hello --image=busybox -- /bin/sh -c "echo hello"
kubectl create cronjob cron --image=busybox --schedule="*/1 * * * *" -- ls

# Expose / service
kubectl expose deployment nginx --port=80 --target-port=80 --type=ClusterIP

# Scale / rollout
kubectl scale deployment nginx --replicas=5
kubectl rollout status deployment nginx
kubectl rollout undo deployment nginx

# Quick edits / debug
kubectl edit deployment nginx
kubectl logs -f pod/mypod -c container-name --previous
kubectl exec -it pod/mypod -- sh
kubectl port-forward pod/mypod 8080:80

# Namespace-aware
kubectl config set-context --current --namespace=dev
```

**YAML patterns to memorize:**
- Init containers (wait for DB, seed data)
- Pod with multiple containers + shared emptyDir volume
- Probes (httpGet, exec, tcpSocket with thresholds)
- ResourceRequests and ResourceLimits
- ConfigMap / Secret via env and volume mount
- ServiceAccount + RBAC Role + RoleBinding
- NetworkPolicy (ingress/egress with podSelector and namespaceSelector)
- Ingress with path-based + host-based routing
- Jobs with completions/parallelism + backoffLimit
- CronJob with schedule + concurrencyPolicy

**Critical exam tips:**
- **Enable aliases early**: `alias k=kubectl`, `export do="--dry-run=client -o yaml"`, `export now="--force --grace-period 0"`
- **Use `kubectl explain`**: memorize `k explain pod.spec.containers.livenessProbe --recursive` for quick field lookup
- **Always use `-n <namespace>`** — exam questions specify a namespace; getting it wrong = 0 marks
- **Context switching**: every task starts with `kubectl config use-context <context>` — forgetting loses marks
- **Speed drills**: aim for 5-7 min per task; flag hard ones, return later
- **Vim basics**: set tab→2spaces in `.vimrc` beforehand if you bring custom config
- **Copy-paste from docs**: kubernetes.io and kubectl doc are accessible during exam — use them for YAML templates

**Allowed resources during exam:**
- https://kubernetes.io/docs/ (entire site)
- https://kubernetes.io/blog/
- https://helm.sh/docs/ (new in 2024+)

**Study path:**
- Mumshad Mannambeth KodeKloud CKAD course (the standard)
- KillerCoda/Killer.sh practice sessions (2 free included with exam — use them!)
- Daily kubectl practice for 2-3 weeks before exam
- Speed practice: set a 2-hour timer and simulate full exam

**Existing memos:**
- `devops/kubernetes/` — 16+ K8s files covering architecture, probes, storage, ingress, RBAC, etc.

**Who it's for:** Backend/platform engineers deploying to Kubernetes. Prep time: 40-80 hours with K8s experience; 100-150 hours without.

**Rule of thumb:** CKAD is about speed and accuracy — you know the material or you don't; there's no guessing multiple choice. Imperative commands generate most YAML (`--dry-run=client -o yaml > f.yaml`) — memorize the flags. Do Killer.sh the night before — it's much harder than the actual exam, which calibrates your speed.
