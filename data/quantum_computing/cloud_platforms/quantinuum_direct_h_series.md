### Quantinuum Direct — H-Series QCCD & Nexus

**What it is:**
Quantinuum's own cloud, reachable through the UserPortal web UI and the Nexus platform for programmatic access. It exposes the **H-series** trapped-ion systems — QCCD (Quantum Charge-Coupled Device) architectures with ion-transport zones — and their matched emulators. Like IonQ, Quantinuum QPUs also surface through Microsoft Azure Quantum; direct access (via Nexus) is the path with the tightest feature coupling and the native submission shape.

**Access model:**
| Layer | What it is |
|---|---|
| Account | Quantinuum UserPortal login |
| Nexus project | Logical workspace + credential scope for programmatic access |
| Authentication | OAuth device flow / long-lived token |
| Target | `H1-1`, `H2-1`, matched `H1-1E` / `H2-1E` emulators (names evolve by generation) |
| Submission | OpenQASM 3 (preferred) or Quantinuum-specific IR, via Nexus SDK |

**What makes H-series distinctive (durable, not roadmap):**
- **QCCD architecture** — ions shuttle between interaction zones, enabling **effectively all-to-all connectivity** without SWAP chains, at the cost of ion-transport time.
- **Mid-circuit measurement + reset + classical feedforward** are first-class, with low latency from measurement to conditional gate.
- **High two-qubit fidelity** — among the lowest error rates reported for gate-model QPUs.
- **Paired classical emulators** (`H1-1E`, `H2-1E`) run the same compiler toolchain and noise model as the hardware, so emulator results transfer cleanly.

**Connecting via Nexus SDK (`qnexus`):**
```python
import qnexus as qnx

# OAuth device flow on first run; token is cached afterwards
qnx.login()

# Pick a project; or create one: qnx.projects.create(name="demo")
project = qnx.projects.get_or_create(name="demo")

# Build a circuit in pytket (Quantinuum's native SDK)
from pytket import Circuit
c = Circuit(2, 2).H(0).CX(0, 1).measure_all()

# Enumerate devices the token can reach
for d in qnx.devices.get_all():
    print(d.backend_name, d.status)

# Submit to the emulator first
cref = qnx.circuits.upload(circuit=c, name="bell", project=project)
job = qnx.start_execute_job(
    circuits=[cref], project=project,
    backend_config=qnx.QuantinuumConfig(device_name="H1-1E"),
    n_shots=[1000], name="bell-run",
)
qnx.jobs.wait_for(job)
print(qnx.jobs.results(job)[0].download_result().get_counts())
```

**Pytket-first stack:**
| Layer | Role |
|---|---|
| `pytket` | Circuit DSL + compiler |
| `pytket-quantinuum` | Backend shim → H-series |
| `qnexus` | Nexus platform client (projects, jobs, results) |
| OpenQASM 3 | Interchange for conditional/feedforward circuits |

**Direct vs Azure route:**
| Route | Best for |
|---|---|
| Direct (Nexus + pytket) | Full feature surface: mid-circuit, feedforward, WASM extern calls |
| Azure Quantum | You already live in Azure; accept a slightly trimmed feature envelope |

Feature availability (especially advanced control-flow features like conditional gates and WASM extern calls) tends to land on the direct path first.

**H-series capabilities that shape your circuits:**
- Arbitrary mid-circuit measurement and qubit reuse — write loops, not flat circuits.
- Classical feedforward on measurement outcomes within a single shot.
- WASM extern calls for in-shot classical computation (where supported on the target).
- Expect wall-clock per shot to scale with transport time, not just gate depth.

**Pitfalls:**
- Writing QASM 2 for a feedforward-heavy workload — QASM 3 is the supported path for conditional / mid-circuit semantics.
- Assuming the emulator runs instantly — Nexus queues it like any other job, just without physics.
- Hardcoding `H1-1` — device names evolve across generations; enumerate at runtime.
- Forgetting that the login token is device-scoped; rotating it invalidates cached credentials on every box.

**Rule of thumb:** Go through Nexus + pytket when you want the full H-series capability surface (mid-circuit measurement, feedforward, WASM), validate on the matched `*-E` emulator before spending hardware time, and enumerate devices at runtime rather than pinning generation-specific names.
