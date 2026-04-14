### GitOps and ArgoCD

**GitOps principles:**
- Git is the single source of truth for infrastructure and application state
- All changes via pull requests (auditable, reviewable)
- Automated reconciliation: system converges to match Git state
- Declarative: describe desired state, not imperative steps

**GitOps workflow:**
```
Developer -> PR to config repo -> Merge -> ArgoCD detects change -> Syncs to cluster
```

**ArgoCD:**
- Kubernetes-native continuous delivery tool
- Watches a Git repo and syncs K8s manifests to the cluster
- UI dashboard showing sync status, health, diff
- Supports Helm, Kustomize, plain YAML, Jsonnet

**ArgoCD Application:**
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/k8s-manifests
    targetRevision: main
    path: apps/myapp/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true        # delete resources removed from Git
      selfHeal: true     # revert manual kubectl changes
    syncOptions:
      - CreateNamespace=true
```

**Sync strategies:**
- **Manual** - click sync in UI or CLI
- **Automated** - auto-sync when Git changes detected
- **Self-heal** - revert out-of-band changes (someone does `kubectl edit`)
- **Prune** - delete resources that no longer exist in Git

**Repo structure patterns:**

**App of Apps:**
```
k8s-manifests/
  apps/
    myapp/
      base/
      overlays/
        staging/
        production/
    another-app/
  bootstrap/
    argocd-apps.yaml    # defines all Application resources
```

**ArgoCD vs Flux:**
| Feature | ArgoCD | Flux |
|---------|--------|------|
| UI | Built-in web UI | No native UI |
| Architecture | Centralized | Per-cluster agent |
| Multi-cluster | Yes | Yes (with Flux) |
| Helm support | Yes | Yes (HelmRelease CRD) |
| Maturity | More popular, CNCF graduated | CNCF graduated |

**Pull vs Push deployment:**
- **Push** (traditional CI/CD) - pipeline pushes to cluster (`kubectl apply`, `helm upgrade`)
- **Pull** (GitOps) - agent in cluster pulls from Git
- Pull is more secure: cluster credentials never leave the cluster

**Rule of thumb:** Use GitOps for production Kubernetes. ArgoCD if you want a UI and centralized management. Store manifests in a separate config repo from application code. Enable self-heal and prune for production.
