### Lattice-Surgery Schedulers — Logical-Gate Compilation for FTQC

**What it is:** In surface-code fault tolerance, multi-qubit logical operations are realized as **lattice-surgery** primitives (patch merges and splits, along Pauli boundaries). A program of logical gates must be translated into a **schedule** of surgery operations on a 2D tile plane — which merges happen when, along which boundary, routed through which ancilla regions. This is to FT what SWAP routing is to NISQ — except the scheduled object is no longer a CNOT but a `Z tensor Z` merge spanning many physical cycles.

**The cost model:** logical gate time is measured in **code cycles**. One lattice-surgery merge is typically `~d` cycles (distance `d` surface code). The scheduler's job is to fit the program's Pauli-product measurements onto the tile layout so that independent ones run in parallel.

**The abstract objects:**

| Level       | Object                                     | Analogue in NISQ compile |
|-------------|--------------------------------------------|--------------------------|
| Algorithm   | Logical circuit: Clifford + T + measurement | Logical circuit          |
| Gate-decomp | Pauli-product measurements + magic states   | Basis-gate decomposition |
| Schedule    | Spacetime layout of patches on the tile    | Scheduling + routing     |
| Physical    | Stabilizer measurements each cycle         | Pulse schedule           |

**What a surgery scheduler decides:**
1. **Patch placement** — where each logical qubit and T-factory sits on the 2D tile.
2. **Merge routing** — which boundary paths carry each Pauli-product measurement. Parallel merges must use **disjoint** ancilla regions.
3. **Temporal scheduling** — which merges happen in the same cycle window; dependency chains set the critical path.
4. **Magic-state consumption schedule** — pair each T-gate with a factory output in time.
5. **Distillation pipelining** — insert factories (each producing one magic state per `N` cycles) so the algorithm never stalls.

**Research / tooling:**
- **Litinski's "A Game of Surface Codes"** (2019) — the canonical formalism: represent an FT program as a sequence of `pi/8` rotations, commute them via Clifford conjugation, realize each as one Pauli-product measurement.
- **OpenSurgery / LSC / Rockwood / SIMD/Litinski compilers** — research prototypes that take logical circuits and emit lattice-surgery schedules.
- **Microsoft Q# / Azure Quantum Resource Estimator** — produces physical resource counts given an FTQC target, using lattice-surgery accounting.
- **Cirq / Stim + Stimzx** — simulate the physical schedule to verify.

**Sketch of the workflow:**
```python
# Pseudocode — lattice-surgery research stack, not a Qiskit pass
from lsc import LogicalProgram, TileLayout, Scheduler

prog = LogicalProgram.from_clifford_t(circuit)   # Clifford + T on logical qubits
prog = prog.commute_cliffords_to_end()           # Litinski transform: leaves Pauli-product measurements
layout = TileLayout.rectangular(n_logical=20, n_factories=4)
sched = Scheduler(layout, merge_policy="parallel-disjoint").run(prog)
print(sched.depth_cycles, sched.total_factories_needed)
```

**Key scheduling tensions:**
- **Parallelism vs area.** More patches in parallel - more tile area - more physical qubits at fixed code distance.
- **Factory throughput vs algorithm rate.** Too few factories stall T-gates; too many waste qubits.
- **Commutation reordering.** Moving Cliffords past non-Cliffords collapses the program onto a Pauli-product-measurement schedule — any residual non-Clifford requires a factory.

**Typical results:** Shor-1024 with surface code `d = 23` and 14 factories compiles to a few hours of wall-clock at 1us cycles — the scheduler's choice of factory count vs tile area easily shifts this by 2-5x.

**Scheduling metrics to report:**

| Metric                        | What it tells you                                  |
|-------------------------------|----------------------------------------------------|
| Logical cycle count           | Depth of the surgery schedule                      |
| Physical qubit count          | Tile area x code distance squared                  |
| Factory idle rate             | Over-provisioning — lower factory count is cheaper |
| Longest dependency chain      | Parallelism ceiling (no schedule beats this)       |
| Ancilla contention rate       | Merge conflicts forcing serialization              |

**When to use:** research on FTQC architectures; resource-estimation for near-future FT proposals; architectural studies (how many physical qubits does an application need?).

**Pitfalls:**
- Still research software — APIs turn over monthly; commit to a specific scheduler and pin it.
- Schedulers often assume perfect classical control latency; real control stacks can add 10-100% overhead that breaks published cycle estimates.
- Commuting Cliffords past `T`s can explode the number of Pauli-product measurements (one per `pi/8`) — memory-bound on large programs.
- Litinski formalism assumes ideal magic states; noisy distillation post-selection contributes cycles not visible in the logical schedule.

**Rule of thumb:** Logical-gate scheduling is the frontier — if NISQ routing is about 3-CNOT SWAPs, FT scheduling is about `d`-cycle merges; every layer of compiler stack you skip at this level costs you a factor on physical qubits.
