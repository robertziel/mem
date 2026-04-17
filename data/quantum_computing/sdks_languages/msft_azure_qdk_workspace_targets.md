### Microsoft Azure QDK — Workspaces and Targets

**What it is:**
`azure.quantum.Workspace` is the Python entry point to Azure Quantum: it resolves subscription + resource group + workspace name into a session that can enumerate providers, list **targets** (`target_id`s like `ionq.qpu` or `quantinuum.sim.h1-1e`), submit jobs, and fetch results. Every quantum backend — simulator or QPU — is identified by a single string, the `target_id`. Targets that appear for your subscription depend on which providers you added when the workspace was created.

**API shape:**
```python
from azure.quantum import Workspace

ws = Workspace(
    subscription_id="...",
    resource_group="quantum-rg",
    name="my-workspace",
    location="westus",
)
for t in ws.get_targets():
    print(t.name, t.provider_id, t.current_availability)
```

**Target naming convention — `<provider>.<kind>[.<machine>]`:**
| target_id | Kind | Billing |
|---|---|---|
| `ionq.simulator` | Cloud simulator | Free tier |
| `ionq.qpu` | IonQ Harmony | $ per shot |
| `ionq.qpu.aria-1` | IonQ Aria 1 | $$ per shot |
| `quantinuum.sim.h1-1e` | Emulator mirroring H1 | $ per HQC (Quantinuum Credit) |
| `quantinuum.qpu.h1-1` | Real H1-1 | $$$ per HQC |
| `rigetti.sim.qvm` | Rigetti QVM | $ per minute |
| `rigetti.qpu.ankaa-2` | Rigetti Ankaa-2 | $$ per shot |
| `microsoft.estimator` | Resource estimator | Free |

Availability is per-subscription and per-region. Never hardcode — call `ws.get_targets()` and branch.

**Submission paths — Python SDK:**
```python
from azure.quantum import Workspace
import qsharp

ws = Workspace(resource_id="/subscriptions/.../my-workspace", location="westus")

# Compile a Q# operation defined elsewhere
bell = qsharp.compile("""
    operation Bell() : (Result, Result) {
        use qs = Qubit[2];
        H(qs[0]); CNOT(qs[0], qs[1]);
        let r = (M(qs[0]), M(qs[1]));
        ResetAll(qs);
        return r;
    }
""")

target = ws.get_targets("ionq.qpu")
job = target.submit(bell, shots=500, name="bell-demo")
print(job.id, job.details.status)            # Waiting / Executing
hist = job.get_results()                     # dict of counts
```

**Submission paths — Q#-native (`%azure` magics in notebooks):**
```
%azure.connect "/subscriptions/.../my-workspace" location=westus
%azure.target ionq.qpu
%azure.execute Bell shots=500
```
The notebook flow is shorter but opaque in CI; prefer the Python SDK in automation.

**Provider-specific quirks:**
| Provider | Notable |
|---|---|
| IonQ | Results returned as `histogram` dict keyed by bitstring; no mid-circuit measurement on `ionq.qpu` |
| Quantinuum | Billing in HQCs — a non-linear function of shots × ops × depth; estimate via `target.estimate_cost(...)` first |
| Rigetti | Native set includes CZ; heavy transpilation passes done server-side |
| Microsoft estimator | Not an execution target — returns resource counts, not measurements |

**Workspace-level features:**
- `ws.list_jobs(status="Executing", created_after=...)` — browse submitted work.
- `ws.storage_account` — every workspace has a linked storage account; results land there under `azure-quantum-jobs` container.
- `ws.cancel_job(job_id)` — stops a Waiting job (Executing jobs may already have incurred cost).

**Pitfalls:**
- Target availability is subscription-scoped. A sample that works on demo subs may throw `TargetNotFound` on enterprise tenants.
- `target.estimate_cost(program, shots)` returns a *best-effort* number — Quantinuum HQCs depend on runtime-observed gate counts and can exceed the estimate by 20–30%.
- Jobs linger in `Waiting` when the QPU calendar is closed (maintenance windows). Always surface `job.details.status` in your UI.
- The `Workspace` object is thread-safe but the Azure SDK auth token is not — re-instantiate `Workspace` in each process rather than sharing.

**Rule of thumb:** Enumerate targets from the live workspace before hardcoding IDs, and exercise `ionq.simulator` / `quantinuum.sim.h1-1e` in CI so you only cut hardware bills on vetted circuits.
