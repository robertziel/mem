### CKA — Certified Kubernetes Administrator

**Exam quick facts:**

| Item | Value |
|---|---|
| Code | CKA |
| Duration | 120 min, 15–20 hands-on tasks |
| Pass | 66% |
| Cost | $445 USD (one free retake) |
| Validity | 2 years |
| K8s version | Current minus a release (e.g. v1.31+ at time of writing) |
| Format | Remote-proctored, real cluster terminal |
| Allowed docs | kubernetes.io/docs, kubernetes.io/blog, helm.sh/docs |

**Domain weights:**

| # | Domain | Weight | Headline focus |
|---|---|---:|---|
| 1 | Storage | 10% | PV / PVC / StorageClass, dynamic provisioning, volume types |
| 2 | **Troubleshooting** | **30%** | Node, cluster, app debug — biggest single bucket |
| 3 | Workloads & Scheduling | 15% | Deployments / DaemonSets, scheduling (affinity, taints, priority), Helm |
| 4 | Cluster Architecture & Config | 25% | `kubeadm`, upgrades, etcd backup/restore, RBAC, HA |
| 5 | Services & Networking | 20% | CNI, NetworkPolicies, Services, Ingress, CoreDNS |

**CKA vs CKAD vs CKS — pick the right cert:**

| | CKA | CKAD | CKS |
|---|---|---|---|
| Audience | Platform / SRE | App developer | DevSecOps |
| Cluster install / upgrade | ✅ | ❌ | ❌ (assumes CKA) |
| etcd backup / restore | ✅ | ❌ | ❌ |
| Node-level debugging | ✅ | ❌ | ✅ |
| Scheduling deep dives | ✅ | partial | ✅ |
| RBAC | ✅ | partial | ✅ deep |
| Pod / workload focus | basic | ✅ deep | hardened pods |
| Security (PSA, Falco, cosign) | ❌ | ❌ | ✅ |
| Prereq | None | None | **Active CKA** |

**Troubleshooting flow — the 30% lens for any failure:**

| Layer | Symptom | First command | Then |
|---|---|---|---|
| App | Pod stuck `Pending` / `CrashLoopBackOff` | `kubectl describe pod <p>` | Read **Events** at the bottom |
| App | Container logs needed (incl. last crash) | `kubectl logs <p> -c <c> --previous` | Compare with current run |
| App | Order all events by time | `kubectl get events --sort-by=.lastTimestamp -A` | Spot resource quota / scheduler errors |
| App | Inside-the-container check | `kubectl exec -it <p> -- sh` | DNS / connectivity probe |
| Node | Node `NotReady` | `kubectl describe node <n>` | Conditions + last heartbeat |
| Node | kubelet itself broken | `systemctl status kubelet` on the node | `journalctl -u kubelet -f` for live logs |
| Node | Container runtime broken | `systemctl status containerd` (or docker) | `crictl ps` to see runtime view |
| Control plane | API server / scheduler / controller-manager down | `ls /etc/kubernetes/manifests/` | **Edit static-pod YAML** — kubelet auto-restarts it |
| Control plane | etcd unhealthy | `crictl ps` for the etcd container; `etcdctl endpoint health` | If totally broken → restore from snapshot |
| Cluster | DNS resolution failing | `kubectl -n kube-system logs deploy/coredns` | Test from a debug pod: `nslookup kubernetes.default` |
| RBAC | "Forbidden" errors | `kubectl auth can-i <verb> <resource>` | Match Role/Binding to ServiceAccount |

> **`describe` + `get events` reveals 80% of issues** — make them muscle memory.

**etcd backup / restore (exam staple):**

```bash
# Backup
ETCDCTL_API=3 etcdctl snapshot save /tmp/snap.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Verify
etcdctl snapshot status /tmp/snap.db -w table

# Restore — kube-apiserver must be stopped first
etcdctl snapshot restore /tmp/snap.db --data-dir=/var/lib/etcd-restored
# Then point the etcd static-pod manifest at the new --data-dir
```

| Step | Reason |
|---|---|
| Stop apiserver before restore | New etcd starts fresh; concurrent writes corrupt it |
| Restore to a **new** data-dir | Don't overwrite — keep a fallback |
| Update etcd static-pod YAML's volume hostPath | Points kubelet at the restored data |

**kubeadm upgrade sequence:**

| Step | Where | Command |
|---|---|---|
| 1. Plan | Control plane | `kubeadm upgrade plan` |
| 2. Upgrade kubeadm binary | Control plane | `apt-get install kubeadm=<ver>` |
| 3. Apply control plane | Control plane | `kubeadm upgrade apply v<ver>` |
| 4. Upgrade kubelet+kubectl | Control plane | `apt-get install kubelet=<ver> kubectl=<ver>` → `systemctl restart kubelet` |
| 5. Drain worker | Control plane | `kubectl drain <node> --ignore-daemonsets` |
| 6. Upgrade kubeadm | Worker node | `apt-get install kubeadm=<ver>` |
| 7. Apply node | Worker node | `kubeadm upgrade node` |
| 8. Upgrade kubelet | Worker node | `apt-get install kubelet=<ver>` → `systemctl restart kubelet` |
| 9. Uncordon | Control plane | `kubectl uncordon <node>` |

Repeat 5–9 per worker. **Never two unready workers at once.**

**Scheduling control — pick the right tool:**

| Goal | Tool |
|---|---|
| Hard pin to a label | `nodeSelector: { disktype: ssd }` |
| Soft preference / anti-affinity | `affinity` / `podAntiAffinity` |
| Reserve nodes for some workloads | `taint` + matching `toleration` |
| Eviction priority under pressure | `PriorityClass` + preemption |
| Critical pod survives drain | `PodDisruptionBudget` |

**Networking troubleshooting cheatsheet:**

| Symptom | Where to look |
|---|---|
| Pod-to-pod fails | CNI plugin (Calico/Flannel/Cilium) — `kubectl -n kube-system logs <plugin>` |
| Service not reachable | `kubectl describe svc`; check endpoints; `kube-proxy` mode (iptables vs IPVS) |
| External DNS broken | CoreDNS pods, ConfigMap upstream, NetworkPolicy on `kube-system` |
| Ingress 404 | Ingress controller pod logs; backend service reachable? |
| NetworkPolicy too strict | Default-deny + allow rules — log denied traffic via Cilium / Calico |

**Killer topics that always show up:**

| Topic | Drill until automatic |
|---|---|
| etcd snapshot save / restore | One-shot under timed pressure |
| kubeadm upgrade across CP + workers | The whole 9-step dance |
| Static-pod manifest edit to fix CP | Path: `/etc/kubernetes/manifests/` |
| kubelet client cert renewal | `kubeadm certs renew` |
| Drain + uncordon respecting PDBs | `kubectl drain --ignore-daemonsets --delete-emptydir-data` |
| RBAC: SA can't list pods | `Role` + `RoleBinding` mapping `verbs: [list]` to `resources: [pods]` |
| CoreDNS resolution failure | `kubectl run -it --rm debug --image=busybox -- nslookup ...` |

**Study path (60–100 hours for K8s operators; 150+ for newcomers):**

| Resource | Why |
|---|---|
| Mumshad Mannambeth (KodeKloud) CKA | Best-paced course, mock labs |
| killer.sh CKA practice (2 attempts free with exam) | **Harder than the real exam** — calibrate timing |
| "Kubernetes the Hard Way" (Kelsey Hightower) | Teaches what kubeadm hides — useful for CKA depth |
| Vagrant kubeadm bootstrap | Hands-on cluster install practice |

**Cross-references:** `devops/kubernetes/` — RBAC, probes, networking, storage, Helm cheatsheets.

**Rule of thumb:** **CKA is troubleshooting under time pressure** — 30% of marks are pure debugging. **`kubectl describe` + `kubectl get events --sort-by=.lastTimestamp`** reveals most issues. **etcd backup/restore + kubeadm upgrade are on every exam** — drill them until automatic. When the control plane is broken, **the answer is almost always editing a YAML in `/etc/kubernetes/manifests/`** — kubelet restarts it for you.
