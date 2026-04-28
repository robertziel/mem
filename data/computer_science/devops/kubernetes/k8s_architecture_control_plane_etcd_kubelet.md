### Kubernetes Architecture (Control Plane, etcd, kubelet)

**The big picture — control plane vs data plane:**

```
┌────────────────────────  Control Plane  ────────────────────────┐
│                                                                 │
│   kube-apiserver  ──►  etcd  (cluster state, single source)     │
│        ▲                ▲                                       │
│        │                │                                       │
│   kube-scheduler ──┐    │                                       │
│   kube-controller-manager                                       │
│   cloud-controller-manager                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼  watch / list
┌────────────────────────  Data Plane (per node)  ────────────────┐
│                                                                 │
│   kubelet ──► container runtime (containerd / CRI-O)            │
│   kube-proxy (iptables / IPVS / nftables)                       │
│   CNI plugin (Cilium / Calico / Flannel)                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Control plane components:**

| Component | Role |
|---|---|
| **kube-apiserver** | REST + watch API; **all communication funnels through it** |
| **etcd** | Distributed KV store (Raft); **single source of truth** for cluster state |
| **kube-scheduler** | Picks a node for each unscheduled Pod (resources, affinities, taints) |
| **kube-controller-manager** | Hosts built-in controllers (Deployment, ReplicaSet, Node, Job, Endpoint, …) |
| **cloud-controller-manager** | Cloud-specific controllers (LoadBalancer, Volume, Node lifecycle) |
| **(optional) addons** | CoreDNS, Metrics Server, Ingress controller, CSI / CNI |

**Node components:**

| Component | Role |
|---|---|
| **kubelet** | Node agent; reconciles pod spec → running containers; reports status to apiserver |
| **kube-proxy** | Maintains network rules for Service routing (iptables / IPVS / nftables / eBPF) |
| **container runtime** | Runs containers via CRI (containerd, CRI-O); Docker dropped in K8s 1.24+ |
| **CNI plugin** | Pod networking (Cilium, Calico, Flannel, AWS VPC CNI) |
| **CSI plugin** | Storage volumes |
| **node-problem-detector** (optional) | Reports node-level conditions back |

**etcd specifics:**

| Property | Detail |
|---|---|
| Backed by Raft | Strongly consistent consensus |
| Cluster size | 3 / 5 / 7 (always odd) |
| Stores | All K8s resources (pods, services, configmaps, etc.) |
| Sized | A few GB even for large clusters; **don't store huge objects** |
| Snapshot | `etcdctl snapshot save` — back up regularly |
| Failure tolerance | `(N-1)/2` nodes |
| Direct edits | **Never** — go via the API |

**The reconciliation loop (the central K8s pattern):**

| Step | Detail |
|---|---|
| 1 | User declares **desired state** (`kubectl apply -f`) |
| 2 | apiserver validates + writes to etcd |
| 3 | Controllers **watch** for changes |
| 4 | Controller compares desired vs actual; takes action |
| 5 | Action observed; status reported back |
| 6 | Repeat continuously |

> Everything in K8s is a **controller reconciling toward a desired state**. Custom resources + controllers (operators) extend this pattern.

**Request flow — `kubectl apply -f deploy.yaml`:**

| Step | What happens |
|---|---|
| 1 | `kubectl` resolves kubeconfig + authenticates |
| 2 | Sends to **apiserver** (HTTPS, mTLS, OIDC, or token) |
| 3 | apiserver runs **authentication** plugins |
| 4 | apiserver runs **authorization** (RBAC) |
| 5 | apiserver runs **admission controllers** (validating + mutating webhooks; PSA; quotas) |
| 6 | apiserver writes to **etcd** |
| 7 | **Controllers** (Deployment / ReplicaSet) notice; create child objects |
| 8 | **Scheduler** assigns each Pod to a node |
| 9 | **kubelet** on assigned node pulls image and runs container |
| 10 | **kube-proxy** updates network rules for Service endpoints |
| 11 | Status flows back through apiserver to etcd |

**Key cluster-level objects:**

| Concept | Detail |
|---|---|
| **Namespace** | Logical isolation (RBAC, NetworkPolicy, ResourceQuota) |
| **Label** | Identifying key-value (selector-targeted) |
| **Annotation** | Non-identifying metadata (build SHA, owner, contact) |
| **Selector** | Label-based matching (Service, Deployment, NetworkPolicy) |
| **Finalizer** | Controller hook before deletion |
| **OwnerReference** | Garbage collection chain |
| **ResourceVersion** | Concurrent-update optimistic concurrency |

**Standard built-in controllers:**

| Controller | What it watches/manages |
|---|---|
| Deployment | Manages ReplicaSets |
| ReplicaSet | Maintains pod replica count |
| StatefulSet | Stable identity + per-pod PVC |
| DaemonSet | One pod per matching node |
| Job / CronJob | Run-to-completion / scheduled |
| Service / Endpoints / EndpointSlice | Service abstraction |
| Node | Heartbeat, readiness, taints |
| HPA (HorizontalPodAutoscaler) | Replica count from metrics |
| PV / PVC binders | Storage |

**Authentication mechanisms:**

| Mechanism | Use |
|---|---|
| Client cert (mTLS) | `kubectl` from admin laptops |
| Bearer token | Service accounts, OIDC ID tokens |
| OIDC | SSO via IdP (Okta, Entra, Google) |
| Webhook | Custom auth servers |
| Anonymous (locked down) | Effectively disabled in modern clusters |

**Authorization (RBAC):**

| Resource | Detail |
|---|---|
| `Role` / `RoleBinding` | Namespace-scoped permissions |
| `ClusterRole` / `ClusterRoleBinding` | Cluster-scoped |
| Subjects | User / group / ServiceAccount |
| Verbs | `get`, `list`, `watch`, `create`, `update`, `patch`, `delete`, ... |
| Resources | `pods`, `pods/log`, `pods/exec`, `deployments`, custom resources |

**Admission controllers — the "safety net" between apiserver and etcd:**

| Type | Examples |
|---|---|
| **Validating** | PodSecurity (`baseline` / `restricted`), ResourceQuota, LimitRanger |
| **Mutating** | DefaultStorageClass, ServiceAccount, MutatingAdmissionWebhook |
| **Webhook-driven** | Kyverno, OPA Gatekeeper, Sigstore policy-controller |
| Order | Mutating first, then validating |

**Pod scheduling — what the scheduler considers:**

| Factor | Detail |
|---|---|
| Resource requests | CPU + memory must fit on node |
| Affinity / anti-affinity | Co-locate / separate workloads |
| Taints + tolerations | "This node only runs X" |
| Topology spread | Distribute across zones / nodes |
| Priority class | Preempt lower-priority pods if needed |
| Volume topology | PV affinity (e.g., AZ-locked EBS) |
| Custom schedulers / plugin framework | Specialized workloads |

**Networking model rules:**

| Rule | Detail |
|---|---|
| Every pod has a unique IP | Cluster-wide |
| Pods communicate without NAT | Across nodes |
| Service IP is virtual | kube-proxy maps it to pod endpoints |
| NetworkPolicy is opt-in | Default-allow until you apply policies |

**Service types — quick recap:**

| Type | Reachable from |
|---|---|
| `ClusterIP` (default) | Inside cluster |
| `NodePort` | `<NodeIP>:30000–32767` |
| `LoadBalancer` | Cloud LB IP |
| `ExternalName` | DNS CNAME |
| `Headless` (`clusterIP: None`) | Pod IPs via DNS — for StatefulSet peers |

**Storage model:**

| Concept | Detail |
|---|---|
| `PersistentVolume` (PV) | Cluster resource — actual disk |
| `PersistentVolumeClaim` (PVC) | App's request |
| `StorageClass` | How to provision dynamically |
| `CSI` | Storage driver interface |

> See [k8s_storage_*.md](k8s_storage_pv_pvc_storageclass_persistent_volume.md) for depth.

**Managed K8s offerings:**

| Provider | Notable |
|---|---|
| **GKE** (Google) | Most mature; **Autopilot** mode managed nodes |
| **EKS** (AWS) | Control plane managed; you manage workers (or Fargate) |
| **AKS** (Azure) | Control plane free; pay for workers |
| **DOKS** (DigitalOcean) | Simpler; cheap |
| **Linode LKE** | Same niche |
| **Rancher / Tanzu / OpenShift** | Distros with extra layers |
| Self-hosted | `kubeadm`, k3s, kind / minikube (dev) |

**Cluster lifecycle commands (admin-ish):**

| Goal | Command |
|---|---|
| Init cluster | `kubeadm init` |
| Join worker | `kubeadm join <ctrl>:<port> --token ... --discovery-token-ca-cert-hash ...` |
| Upgrade | `kubeadm upgrade plan` / `apply` |
| etcd snapshot | `etcdctl snapshot save /tmp/snap.db` |
| Restore | `etcdctl snapshot restore` + edit etcd manifest |

**Common operational patterns:**

| Pattern | Detail |
|---|---|
| **Operators** | Custom controllers + CRDs for stateful workloads (databases, ML platforms) |
| **GitOps** | Argo CD / Flux reconcile cluster from git repo |
| **Multi-tenancy** | Namespaces + ResourceQuotas + NetworkPolicies + RBAC |
| **Multi-cluster** | KubeFed / Karmada / Cluster API / GitOps replication |
| **Service mesh** | Istio / Linkerd / Cilium for mTLS + observability |

**etcd performance / sizing:**

| Concern | Detail |
|---|---|
| Disk | Fast SSD/NVMe (write-heavy) |
| Object size limit | 1 MB default; raise carefully (`--max-request-bytes`) |
| Compaction | Set retention to keep DB small |
| Snapshots | Daily + before upgrades |
| Multiple etcd clusters | Use a separate etcd for big CRDs / event-heavy workloads |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Modifying etcd directly | Bypasses validation; corrupts cluster state |
| Storing huge objects in ConfigMaps / etcd | Performance + 1 MB cap |
| Single etcd node | No HA; one disk failure = cluster gone |
| Disabling audit logs | No forensics |
| Letting kubelet run as root with no PSA | Compromised pod = node root |
| Using LoadBalancer service per microservice | Cloud LB bill explodes (use Ingress) |
| Not setting resource requests | Scheduler bin-packs blindly; OOMs |
| `kubectl edit` in production | No git history; drift |
| Out-of-date node OS | Kernel CVEs; missing eBPF features |
| Mixing Helm + raw YAML + Kustomize | Drift between source-of-truth |

**Quick checklist for a healthy cluster:**

| Check | Pass? |
|---|---|
| 3+ control-plane nodes (multi-AZ) | ✅ |
| etcd backups + tested restore | ✅ |
| RBAC defined per team | ✅ |
| NetworkPolicy default-deny per namespace | ✅ |
| Pod Security Admission at `restricted` | ✅ |
| Resource requests + limits + LimitRange | ✅ |
| Audit logging enabled | ✅ |
| Cluster autoscaler / Karpenter | ✅ |
| Metrics + tracing for control plane and apps | ✅ |
| GitOps or IaC for declarative state | ✅ |
| Regular minor-version upgrades (every quarter) | ✅ |

**Cross-references:**

- Workload resources (Deployment / StatefulSet / DaemonSet): [k8s_deployments_replicasets.md](k8s_deployments_replicasets.md)
- Probes: [k8s_probes_*.md](k8s_probes_liveness_readiness_startup_healthcheck.md)
- Storage: [k8s_storage_*.md](k8s_storage_pv_pvc_storageclass_persistent_volume.md)
- Service mesh: [service_mesh_istio_*.md](../../microservices/service_mesh_istio_sidecar_mtls.md)
- Cluster security: [cks_*.md](../../certifications/cks_certified_kubernetes_security_specialist.md)

**Rule of thumb:** **declarative model + reconciliation loop is the entire mental model**. **etcd is the single source of truth** — never edit directly, always go through apiserver. **Every concern (deploy, scale, network, storage, security, custom logic) is a controller** — the operator pattern lets you extend the cluster with your own. Multi-AZ control plane + etcd backups + GitOps + RBAC + NetworkPolicy is the production baseline.
