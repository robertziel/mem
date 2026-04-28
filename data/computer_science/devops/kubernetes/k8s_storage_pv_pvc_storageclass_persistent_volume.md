### Kubernetes Storage (PV, PVC, StorageClass)

**Three resources, one chain:** `StorageClass` describes how to provision → `PersistentVolume (PV)` is the actual storage → `PersistentVolumeClaim (PVC)` is a pod's request that binds to a PV.

**Resource roles:**

| Resource | Owned by | Lifetime | Holds |
|---|---|---|---|
| **StorageClass** | Cluster admin | Long-lived | "How to provision N GB of storage of type X" — provisioner + parameters |
| **PersistentVolume (PV)** | Provisioner (or admin) | Independent of any pod | The actual storage object — backing disk handle, capacity, access modes |
| **PersistentVolumeClaim (PVC)** | App / namespace owner | Bound to one PV at a time | A request — size, access mode, storage class — that becomes a binding |
| **Pod `volumes`** | Pod author | Per-pod | References a PVC |

**Provisioning paths:**

| Path | Flow |
|---|---|
| **Dynamic** (default in modern clusters) | PVC names a `storageClassName` → provisioner creates PV automatically |
| **Static** | Admin pre-creates PV; PVC matches by capacity + selector + class |
| **Pre-existing volume** (e.g., existing EBS / GCE disk) | PV references it explicitly; PVC binds in static mode |

**Access modes — defines *concurrency*, not security:**

| Mode | Abbrev | Concurrent pods | Backed by |
|---|---|---|---|
| **ReadWriteOnce** | RWO | One node R/W (since K8s 1.22, multiple pods on the same node) | Block storage — EBS, GCE PD, Azure Disk |
| **ReadOnlyMany** | ROX | Many nodes R-only | NFS, S3-FUSE, EFS read-only |
| **ReadWriteMany** | RWX | Many nodes R/W | NFS, EFS, Azure Files, CephFS |
| **ReadWriteOncePod** (1.22+) | RWOP | Exactly one **pod** R/W | Block storage with strict single-mounter |

> Most cloud block storage is **RWO only**. Need RWX → reach for a file-protocol service (EFS / Azure Files / Filestore) or distributed FS (Ceph / Longhorn).

**Reclaim policies — what happens to the PV when PVC is deleted:**

| Policy | Effect |
|---|---|
| **Delete** | PV (and underlying disk) deleted automatically — default for dynamic |
| **Retain** | PV kept; admin manually decides — recovers from accidental delete |
| **Recycle** | Deprecated — don't use |

> Production rule: **`Retain` for irreplaceable state** (DBs, queues), `Delete` for scratch / scaled stateless caches.

**`volumeBindingMode` — when binding happens:**

| Mode | Behavior |
|---|---|
| `Immediate` | Provision as soon as PVC is created — may pick a wrong AZ |
| **`WaitForFirstConsumer`** (default for cloud SCs) | Provision **after** a pod is scheduled, so volume lands in the right AZ |

> Almost always **`WaitForFirstConsumer`** in multi-AZ clusters — otherwise you get a pod stuck `Pending` because its PV is in a different AZ.

**StorageClass cheat (what each parameter controls):**

| Field | Purpose |
|---|---|
| `provisioner` | CSI driver: `ebs.csi.aws.com`, `pd.csi.storage.gke.io`, `disk.csi.azure.com` |
| `parameters` | Driver-specific (`type`, `iops`, `throughput`, `fsType`, `encrypted`) |
| `reclaimPolicy` | `Delete` / `Retain` |
| `volumeBindingMode` | `Immediate` / `WaitForFirstConsumer` |
| `allowVolumeExpansion` | Allow PVC resize |
| `mountOptions` | Per-mount flags (`noatime`, `discard`) |

**Cloud disk-type mapping (rough):**

| Need | AWS | GCP | Azure |
|---|---|---|---|
| General-purpose SSD | EBS `gp3` | PD-Balanced / `pd-ssd` | Premium SSD `Premium_LRS` |
| High IOPS | EBS `io2` Block Express | PD-Extreme | Ultra Disk |
| Cheap throughput / archival | EBS `st1` / `sc1` | PD-Standard | Standard HDD |
| Shared FS (RWX) | EFS / FSx Lustre | Filestore / Cloud Storage FUSE | Azure Files |

**PVC lifecycle:**

| State | Meaning |
|---|---|
| `Pending` | Waiting for a PV (or for first consumer in WFFC mode) |
| `Bound` | Tied to a specific PV |
| `Lost` | PV no longer found |
| `Released` (PV side) | Bound to a deleted PVC; awaits reclaim |

**Volume expansion (online resize):**

| Step | Detail |
|---|---|
| 1 | StorageClass: `allowVolumeExpansion: true` |
| 2 | Edit PVC: `spec.resources.requests.storage` to a larger value |
| 3 | Driver resizes the underlying disk |
| 4 | Pod-level filesystem resize (most CSI drivers handle online) |

> Most cloud block storage allows expansion only — **never shrink.**

**Snapshots & restore (CSI Snapshot API):**

| Resource | Role |
|---|---|
| `VolumeSnapshotClass` | Driver + parameters for snapshotting |
| `VolumeSnapshot` | Request for a point-in-time copy |
| `VolumeSnapshotContent` | The actual snapshot |
| Restore | New PVC with `dataSource: { kind: VolumeSnapshot, name: ... }` |

**StatefulSets — the right way to use PVs for stateful workloads:**

| Concept | Detail |
|---|---|
| `volumeClaimTemplates` | Per-replica PVC, named `<pvc>-<sts>-<n>` |
| Stable identity | Pod name + DNS persists across restarts |
| Ordered rollout | Replicas come up `0..N-1`, terminate `N-1..0` |
| Pod `i` always gets PVC `data-<sts>-i` | Same disk on reschedule |
| Use for | Databases, queues, anything with disk-pinned state |

**Ephemeral / non-PV alternatives:**

| Type | Use |
|---|---|
| `emptyDir` | Scratch / cache; lost on pod delete |
| `emptyDir.medium: Memory` | tmpfs in RAM |
| `configMap` / `secret` volume | Inject config / creds as files |
| `projected` | Combine multiple sources (downward API + secret + token) |
| `hostPath` | Mount node filesystem — **avoid in production**, breaks portability + safety |
| `csi` ephemeral inline | One-off CSI volumes via `volumes[].csi` |
| `generic ephemeral` | PVC-shaped but per-pod lifecycle |

**Common patterns:**

| Need | Pattern |
|---|---|
| Database disk | StatefulSet + `volumeClaimTemplates` + RWO + `Retain` |
| Shared logs across pods | RWX (EFS / Filestore) |
| Per-pod cache that's lost is fine | `emptyDir` |
| Read-only static config | `configMap` volume |
| Read-only secret | `secret` volume (`HttpOnly: true` analog) |
| Worker scratch on fast disk | `emptyDir.medium: Memory` (capped) |
| Pre-baked dataset shared across pods | RWX or download-on-init via initContainer |

**Pitfalls:**

| Pitfall | Effect |
|---|---|
| `Immediate` binding in multi-AZ cluster | Pod scheduled in wrong AZ → can't mount |
| `hostPath` in production | Pod tied to one node; breaks DR; security risk |
| `Delete` reclaim on a DB PV | Accidental PVC deletion = data loss |
| RWO PVC mounted by Deployment with `replicas: 2` | Second pod stuck `ContainerCreating` |
| Forgetting `allowVolumeExpansion` | Can't grow the disk online |
| Shrinking by editing PVC down | Not supported; data loss if you force it |
| Snapshots without testing restore | Untested backups don't exist |
| Using one giant PVC across many tenants | Noisy-neighbor I/O contention |
| Mixing storage classes within a StatefulSet's replicas | Inconsistent perf |
| EBS `gp2` for a DB on a hot table | IOPS-limited; switch to `gp3` or `io2` |

**Health-check / debug commands:**

| Goal | Command |
|---|---|
| List PVCs in a namespace | `kubectl get pvc -n <ns>` |
| Show PV details | `kubectl describe pv <name>` |
| Check why PVC is `Pending` | `kubectl describe pvc <name>` (events) |
| List StorageClasses | `kubectl get sc` |
| See what's mounting the PVC | `kubectl get pods --field-selector spec.volumes.persistentVolumeClaim.claimName=<pvc>` |
| Snapshot resources | `kubectl get volumesnapshots,volumesnapshotcontents` |

**Rule of thumb:** **dynamic provisioning via StorageClass + `WaitForFirstConsumer`** — the modern default. **`Retain` reclaim policy for stateful data**, `Delete` for ephemeral. **RWO for databases (StatefulSet + `volumeClaimTemplates`)**, **RWX (EFS / Filestore / Azure Files)** when multiple pods truly need shared write. **Never `hostPath` in production.** Test snapshot restore before you need it.
