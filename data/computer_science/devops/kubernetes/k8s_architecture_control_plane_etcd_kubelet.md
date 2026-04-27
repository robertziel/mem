### Kubernetes Architecture

**Control plane components:**
- **kube-apiserver** - REST API frontend, all communication goes through it
- **etcd** - distributed key-value store, holds all cluster state
- **kube-scheduler** - assigns pods to nodes (based on resources, affinity, taints)
- **kube-controller-manager** - runs controllers (ReplicaSet, Deployment, Node, Job controllers)
- **cloud-controller-manager** - integrates with cloud provider (load balancers, volumes, nodes)

**Node components:**
- **kubelet** - agent on each node, ensures containers are running per pod spec
- **kube-proxy** - network rules for Service routing (iptables or IPVS)
- **container runtime** - runs containers (containerd, CRI-O; Docker deprecated as runtime)

**Request flow (e.g., `kubectl apply`):**
1. kubectl -> API server (authenticated, authorized via RBAC)
2. API server validates and stores in etcd
3. Controller detects desired state change
4. Scheduler assigns pod to a node
5. kubelet on that node pulls image and starts container
6. kube-proxy updates network rules for service discovery

**Key concepts:**
- **Declarative model** - you describe desired state, K8s reconciles
- **Control loop** - controllers continuously compare desired vs actual state
- **Namespace** - logical isolation within a cluster (default, kube-system, etc.)
- **Label** - key-value metadata for selecting/grouping resources
- **Annotation** - key-value metadata for non-identifying info (build version, owner)

**Managed Kubernetes:**
- **EKS** (AWS) - control plane managed, you manage worker nodes (or use Fargate)
- **GKE** (GCP) - most mature managed K8s, Autopilot mode
- **AKS** (Azure) - control plane free, pay for nodes

**Rule of thumb:** You declare what you want (desired state), Kubernetes figures out how to make it happen (actual state). etcd is the single source of truth. Never modify etcd directly.
