### CKA — Certified Kubernetes Administrator

**The ops-focused K8s cert.** Cluster setup, upgrades, troubleshooting, networking. For platform engineers and SREs operating Kubernetes.

**Exam logistics:**
- Code: CKA
- Duration: 120 min, 15-20 hands-on tasks
- Passing: 66%
- Cost: $445 USD (one free retake)
- Validity: 2 years
- Format: remote-proctored, real clusters (v1.31+)

**Domain weights (CKA, 2024 curriculum):**

| Domain | Weight | Focus |
|---|---|---|
| 1. Storage | 10% | PV, PVC, StorageClass, volume types, dynamic provisioning |
| 2. Troubleshooting | 30% | Node, cluster, application debug; logs, events |
| 3. Workloads and Scheduling | 15% | Deployments, DaemonSets, scheduling (nodeSelector, affinity, taints/tolerations), Helm |
| 4. Cluster Architecture, Installation, and Configuration | 25% | kubeadm, upgrade, etcd backup/restore, RBAC, HA |
| 5. Services and Networking | 20% | CNI, NetworkPolicies, Services, Ingress, CoreDNS |

**What CKA tests that CKAD doesn't:**
- **Cluster install/upgrade via kubeadm** — `kubeadm init`, `kubeadm upgrade plan/apply`, node join tokens, certificate renewal
- **etcd backup and restore** — snapshot save/restore, WAL understanding, cluster recovery
- **Troubleshooting from the node level** — `systemctl status kubelet`, journalctl, static pod manifests (`/etc/kubernetes/manifests`), container runtime checks
- **RBAC in depth** — Role vs ClusterRole, RoleBinding vs ClusterRoleBinding, ServiceAccount tokens
- **Scheduling deep** — nodeSelector, nodeName, node/pod affinity & anti-affinity, taints/tolerations, priorityClass, preemption
- **Networking internals** — CNI plugins (Calico, Flannel, Cilium), CoreDNS config, kube-proxy modes (iptables vs IPVS)
- **Cluster components** — kube-apiserver, controller-manager, scheduler, kubelet, kube-proxy; where each runs and what they do

**Critical troubleshooting flow (30% of exam):**
```bash
# Application issue
kubectl describe pod <pod>          # events, status, conditions
kubectl logs <pod> -c <container> --previous
kubectl exec <pod> -- <cmd>
kubectl get events --sort-by=.lastTimestamp

# Node issue
kubectl get nodes
kubectl describe node <node>
ssh <node>
systemctl status kubelet
systemctl status containerd  # or docker
journalctl -u kubelet -f

# Control plane issue (self-hosted, static pods)
ssh controlplane
ls /etc/kubernetes/manifests/    # kube-apiserver.yaml, etcd.yaml, etc.
# Editing here auto-restarts the component
crictl ps                         # container runtime listing
```

**etcd backup/restore — THE exam staple:**
```bash
# Backup
ETCDCTL_API=3 etcdctl snapshot save /tmp/backup.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Verify
ETCDCTL_API=3 etcdctl snapshot status /tmp/backup.db -w table

# Restore (requires kube-apiserver stopped)
ETCDCTL_API=3 etcdctl snapshot restore /tmp/backup.db \
  --data-dir=/var/lib/etcd-restored
# Update etcd manifest to point to /var/lib/etcd-restored
```

**kubeadm cluster upgrade sequence:**
```bash
# Control plane first
apt-mark unhold kubeadm && apt-get install -y kubeadm=1.31.0-00
kubeadm upgrade plan
kubeadm upgrade apply v1.31.0
apt-mark unhold kubelet kubectl && apt-get install -y kubelet=1.31.0-00 kubectl=1.31.0-00
systemctl daemon-reload && systemctl restart kubelet

# Workers (one at a time)
kubectl drain <node> --ignore-daemonsets
# On the node:
apt-mark unhold kubeadm && apt-get install -y kubeadm=1.31.0-00
kubeadm upgrade node
apt-mark unhold kubelet && apt-get install -y kubelet=1.31.0-00
systemctl daemon-reload && systemctl restart kubelet
# Back on control plane:
kubectl uncordon <node>
```

**Killer topics:**
- Certificate renewal when kubelet client certs expire
- Fixing a broken scheduler (static pod manifest edit)
- Draining nodes for maintenance with PDBs respected
- Debugging CoreDNS resolution failures
- Fixing RBAC when a ServiceAccount can't list pods

**Study path:**
- Mumshad Mannambeth KodeKloud CKA (standard)
- killer.sh included practice sessions (MUCH harder than real exam — great calibration)
- Kelsey Hightower's "Kubernetes the Hard Way" (not required but recommended for CKA — teaches what kubeadm hides)
- Practice `kubeadm` cluster bootstrap on Vagrant/VirtualBox

**Allowed resources:**
- kubernetes.io/docs
- kubernetes.io/blog
- helm.sh/docs

**Existing memos:**
- `devops/kubernetes/` — architecture, RBAC, probes, networking, storage, helm all covered

**Who it's for:** Platform engineers, SREs, anyone running Kubernetes in production. Prep time: 60-100 hours for K8s operators; 150+ for newcomers.

**Rule of thumb:** CKA is about troubleshooting under time pressure. 30% of questions are pure debugging — know how to read kubelet journals, find broken static pods, fix etcd. Master `kubectl describe` and `kubectl get events` — they reveal 80% of issues. etcd backup/restore and kubeadm upgrade appear on nearly every exam — drill them until automatic.
