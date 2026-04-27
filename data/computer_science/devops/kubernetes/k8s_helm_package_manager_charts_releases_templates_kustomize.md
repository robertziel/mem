### Helm (Kubernetes Package Manager)

**What Helm does:**
- Package K8s manifests as reusable charts
- Template values into manifests
- Manage releases (install, upgrade, rollback)
- Share via chart repositories

**Key concepts:**
- **Chart** - package of K8s resource templates
- **Release** - an instance of a chart deployed in the cluster
- **Values** - configuration that customizes a chart
- **Repository** - collection of charts (like Docker Hub for images)

**Commands:**
```bash
# Repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm search repo nginx

# Install
helm install my-release bitnami/nginx
helm install my-release bitnami/nginx -f values.yaml
helm install my-release bitnami/nginx --set replicaCount=3
helm install my-release ./my-chart     # from local chart

# Manage releases
helm list                              # list installed releases
helm status my-release                 # release status
helm upgrade my-release bitnami/nginx -f values.yaml
helm rollback my-release 1             # rollback to revision 1
helm uninstall my-release              # delete release

# Debugging
helm template my-release ./my-chart    # render templates locally
helm install --dry-run --debug my-release ./my-chart
helm get values my-release             # view applied values
helm get manifest my-release           # view rendered manifests
```

**Chart structure:**
```
my-chart/
  Chart.yaml          # metadata (name, version, dependencies)
  values.yaml         # default values
  templates/
    deployment.yaml
    service.yaml
    ingress.yaml
    _helpers.tpl       # template helpers
    NOTES.txt          # post-install notes
```

**Templating basics:**
```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-web
spec:
  replicas: {{ .Values.replicaCount }}
  template:
    spec:
      containers:
        - name: web
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          {{- if .Values.resources }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          {{- end }}
```

**Helm vs Kustomize:**
| Feature | Helm | Kustomize |
|---------|------|-----------|
| Approach | Templating | Patching/overlays |
| Packaging | Charts with repos | Plain YAML |
| Complexity | Higher | Simpler |
| Best for | Shared packages, complex apps | Environment overlays |

**Rule of thumb:** Use Helm for third-party apps (nginx, cert-manager, prometheus). Consider Kustomize for simpler in-house apps. Always use `--dry-run` before applying. Pin chart versions in CI.
