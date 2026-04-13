### Kubernetes Debugging

**Pod not starting:**
```bash
kubectl get pods                          # check STATUS and RESTARTS
kubectl describe pod <name>               # events section shows scheduling/pull errors
kubectl logs <pod>                        # application logs
kubectl logs <pod> -c <container>         # specific container in multi-container pod
kubectl logs <pod> --previous             # logs from crashed container
kubectl get events --sort-by=.metadata.creationTimestamp
```

**Common pod states and causes:**
| Status | Cause |
|--------|-------|
| `Pending` | No node has enough resources, or PVC not bound |
| `ImagePullBackOff` | Wrong image name/tag, registry auth failure |
| `CrashLoopBackOff` | Container starts and immediately crashes (check logs) |
| `OOMKilled` | Exceeded memory limit (increase limit or fix leak) |
| `Evicted` | Node under resource pressure |
| `ContainerCreating` | Stuck mounting volume or pulling image |

**Interactive debugging:**
```bash
kubectl exec -it <pod> -- /bin/sh              # shell into pod
kubectl exec -it <pod> -c <container> -- bash  # specific container
kubectl port-forward pod/<name> 8080:8080      # access pod locally
kubectl port-forward svc/<name> 8080:80        # access service locally
kubectl cp <pod>:/path/file ./local-file       # copy file from pod
```

**Debug ephemeral container (distroless images):**
```bash
kubectl debug -it <pod> --image=busybox --target=<container>
```

**Resource issues:**
```bash
kubectl top pods                     # CPU/memory per pod (needs metrics-server)
kubectl top nodes                    # CPU/memory per node
kubectl describe node <name>         # allocatable vs allocated resources
```

**Network debugging:**
```bash
# From inside a pod
kubectl exec -it <pod> -- nslookup <service>
kubectl exec -it <pod> -- curl <service>:<port>
kubectl exec -it <pod> -- wget -qO- <service>:<port>

# Check service endpoints
kubectl get endpoints <service>       # are pods registered?
```

**Common debugging flow:**
1. `kubectl get pods` - what's the status?
2. `kubectl describe pod` - what do events say?
3. `kubectl logs` - what does the app say?
4. `kubectl exec` - can I reach dependencies?
5. `kubectl get events` - cluster-level issues?

**Rule of thumb:** Start with `describe` for infrastructure issues (scheduling, images, volumes) and `logs` for application issues. CrashLoopBackOff = check logs and `--previous`. OOMKilled = raise memory limit.
