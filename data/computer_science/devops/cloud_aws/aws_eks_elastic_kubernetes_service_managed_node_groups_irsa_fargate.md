### AWS EKS (Elastic Kubernetes Service)

**What EKS does:**
- Managed Kubernetes control plane (API server, etcd, scheduler)
- You manage worker nodes (or use Fargate for serverless)
- Integrates with AWS: ALB (Ingress), EBS/EFS (storage), IAM (auth)

**Node options:**
| Type | Management | Scaling | Best for |
|------|-----------|---------|----------|
| Managed Node Groups | AWS manages EC2 ASG | Cluster Autoscaler or Karpenter | Most workloads |
| Self-managed Nodes | You manage EC2 + ASG | Manual or Cluster Autoscaler | Custom AMI, GPU |
| Fargate | Fully serverless | Per-pod auto-scaling | No node management |

**IRSA (IAM Roles for Service Accounts):**
```yaml
# Instead of giving all pods the node's IAM role,
# assign fine-grained IAM role per Kubernetes ServiceAccount

apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-reader
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123:role/s3-reader-role

---
# Pod uses this ServiceAccount → gets temporary AWS credentials for that role
spec:
  serviceAccountName: s3-reader
```
- Least privilege: each pod gets only the permissions it needs
- No long-lived credentials in pods
- Replaces: kube2iam, kiam

**ALB Ingress Controller (aws-load-balancer-controller):**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:...
spec:
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 80
```
- Automatically provisions an ALB per Ingress resource
- Target type `ip` for Fargate pods, `instance` for EC2 nodes

**EBS CSI Driver (persistent volumes):**
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
```

**Karpenter (node auto-scaling, replaces Cluster Autoscaler):**
- Provisions right-sized nodes in seconds (not minutes)
- Supports mixed instance types, Spot instances
- Consolidation: removes underutilized nodes automatically
- Recommended over Cluster Autoscaler for new EKS clusters

**EKS Fargate:**
```yaml
# Fargate Profile: pods matching this selector run on Fargate
apiVersion: eks.amazonaws.com/v1
kind: FargateProfile
spec:
  selectors:
    - namespace: default
      labels:
        app: web
```
- No EC2 instances to manage
- Each pod runs in its own micro-VM
- Limitation: no DaemonSets, no GPU, higher per-pod cost

**EKS vs ECS:**
| Feature | EKS | ECS |
|---------|-----|-----|
| Orchestrator | Kubernetes | AWS-native |
| Portability | Multi-cloud (K8s standard) | AWS only |
| Complexity | Higher (K8s learning curve) | Lower |
| Ecosystem | Helm, Istio, ArgoCD, etc. | AWS-native tools |
| Pricing | $0.10/hr per cluster + nodes | Free (pay for compute only) |
| Best for | K8s teams, multi-cloud | AWS-only, simpler needs |

**Rule of thumb:** EKS when you need Kubernetes portability, ecosystem tools (Helm, Istio, ArgoCD), or your team already knows K8s. ECS for simpler container workloads on AWS. Use IRSA for fine-grained IAM. Karpenter over Cluster Autoscaler. Fargate for hands-off node management.
