### Kubernetes RBAC, NetworkPolicy, and Pod Security

**RBAC components:**
- **Role** - set of permissions within a namespace
- **ClusterRole** - set of permissions cluster-wide
- **RoleBinding** - binds a Role to a user/group/ServiceAccount in a namespace
- **ClusterRoleBinding** - binds a ClusterRole cluster-wide

**Role example (namespace-scoped):**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: pod-reader
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
```

**RoleBinding:**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: production
subjects:
  - kind: User
    name: jane
  - kind: ServiceAccount
    name: ci-deployer
    namespace: production
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

**ServiceAccount:**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
  namespace: production
---
# Pod using the ServiceAccount
spec:
  serviceAccountName: app-sa
  automountServiceAccountToken: false   # disable if not needed
```

**NetworkPolicy (pod-level firewall):**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-policy
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: db
      ports:
        - port: 5432
```

**Pod security:**
```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
  containers:
    - securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
```

**Rule of thumb:** Least privilege everywhere. Use namespace-scoped Roles over ClusterRoles. Disable automountServiceAccountToken when not needed. Use NetworkPolicies to restrict pod-to-pod traffic. Run containers as non-root with read-only filesystem.
