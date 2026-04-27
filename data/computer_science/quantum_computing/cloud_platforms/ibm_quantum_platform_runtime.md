### IBM Quantum Platform — Runtime Access & Instances

**What it is:**
The cloud entry point for IBM's fleet of superconducting QPUs (Eagle, Heron, and their successors) and the Qiskit Runtime service. You authenticate once with an API token, select an **instance** (a namespace bound to a specific plan, CRN, and set of accessible backends), and submit **pubs** through `SamplerV2` / `EstimatorV2` primitives. Everything — queue position, accounting, device allowlisting, fair-share weights — is scoped to that instance, not to the raw account.

**Access model:**
| Layer | What it maps to |
|---|---|
| Account | IBM Cloud identity + API token |
| Instance | `hub/group/project` (legacy) or CRN (new) — billing + access scope |
| Channel | `ibm_quantum` (legacy) or `ibm_cloud` (preferred going forward) |
| Service | `QiskitRuntimeService` — the client handle |
| Backend | A named QPU or simulator inside the instance |

**Plans (durable tiers, not a price list):**
| Plan | Intent | Fair-share behavior |
|---|---|---|
| Open | Free exploration on small open-access systems | Low priority, capped monthly minutes |
| Pay-as-you-go / On-demand | Per-second QPU billing, no commitment | Shared queue, weight set by spend |
| Premium / Flex / Reserved | Contracted capacity | Dedicated or boosted fair-share weight |

Instances under a paid plan get higher fair-share priority — IBM's scheduler ranks jobs by `(plan_weight, recent_usage)`, so heavy users drop to the back of the queue until their rolling window decays.

**Save and load credentials:**
```python
from qiskit_ibm_runtime import QiskitRuntimeService

# Persist token + default instance to ~/.qiskit/qiskit-ibm.json
QiskitRuntimeService.save_account(
    channel="ibm_cloud",
    token="YOUR_API_TOKEN",
    instance="crn:v1:bluemix:public:quantum-computing:us-east:a/...::",
    name="prod",
    overwrite=True,
)

# Later, anywhere:
service = QiskitRuntimeService(name="prod")
backend = service.least_busy(operational=True, simulator=False, min_num_qubits=127)
print(backend.name, backend.status().pending_jobs)
```

**Execution modes inside an instance:**
| Mode | Use | Fair-share cost |
|---|---|---|
| Job (single primitive call) | One-off run | Per-job queue entry |
| `Batch` | Many independent pubs, submitted together | Single queue entry, parallel inside |
| `Session` | Iterative workflows (VQE, QAOA) — reserves a device window | Holds the slot; charges wall time |

Batch is almost always the right default — it amortizes queue time without locking you to a device window the way a Session does.

**Fair-share queuing:**
The scheduler is not FIFO. Priority per submission = f(plan weight, recent usage on that backend, job size). Two consequences:
- A big estimator sweep submitted as one Batch lands faster than 100 separate jobs.
- After a burst, your next job may wait behind lower-usage accounts even on a "paid" plan.

**Backend selection tips:**
`service.least_busy(...)` returns the backend with the lowest `pending_jobs` that matches your filters. Combine with `operational=True` to skip backends in maintenance. Calibration data (`backend.properties()`) is regenerated daily; don't cache it across sessions.

**Pitfalls:**
- Saving an account with the wrong `channel` — the token is silently accepted but no backends appear.
- Hardcoding a backend name — IBM retires systems regularly; filter by qubit count and coupling map instead.
- Opening a `Session` and forgetting to `close()` — the device slot keeps ticking until the max TTL expires.
- Assuming paid plan = no queue; fair-share still applies within the plan tier.

**Rule of thumb:** Save the account once with `save_account`, pick backends dynamically via `least_busy(...)`, and default to `Batch` mode — use `Session` only when the algorithm genuinely needs a held device slot.
