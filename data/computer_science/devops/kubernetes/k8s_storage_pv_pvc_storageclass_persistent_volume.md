### Kubernetes Storage (PV, PVC, StorageClass)

**PersistentVolume (PV):**
- Cluster-level storage resource (like a node is a compute resource)
- Provisioned by admin or dynamically via StorageClass
- Has a lifecycle independent of any pod

**PersistentVolumeClaim (PVC):**
- A request for storage by a user/pod
- Binds to a PV that satisfies the request

**StorageClass:**
- Defines how to dynamically provision storage
- Different classes for different performance tiers

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "5000"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

**PVC example:**
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast
  resources:
    requests:
      storage: 50Gi
```

**Using PVC in a pod:**
```yaml
volumes:
  - name: data
    persistentVolumeClaim:
      claimName: postgres-data
containers:
  - volumeMounts:
      - name: data
        mountPath: /var/lib/postgresql/data
```

**Access modes:**
- `ReadWriteOnce (RWO)` - single node read-write (most common, EBS)
- `ReadOnlyMany (ROX)` - many nodes read-only
- `ReadWriteMany (RWX)` - many nodes read-write (EFS, NFS)

**Reclaim policies:**
- `Delete` - PV deleted when PVC is deleted (default for dynamic)
- `Retain` - PV kept for manual recovery

**volumeBindingMode:**
- `Immediate` - provision volume as soon as PVC is created
- `WaitForFirstConsumer` - wait until a pod uses it (ensures AZ match)

**emptyDir and hostPath (non-persistent):**
- `emptyDir` - temp storage, deleted when pod dies (good for scratch/cache)
- `hostPath` - mounts host filesystem path (avoid in production, breaks portability)

**Rule of thumb:** Use StorageClass with dynamic provisioning. Use `WaitForFirstConsumer` to avoid AZ mismatch. RWO for databases, RWX (EFS) when multiple pods need shared access. Always use PVCs, never hostPath in production.
