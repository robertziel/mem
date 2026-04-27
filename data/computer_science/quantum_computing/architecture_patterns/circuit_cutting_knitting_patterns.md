### Circuit Cutting and Knitting — Architectural Pattern for Larger-than-Device Circuits

**Pattern:** Treat the device size as a hard wall. When the logical problem is `n + k` qubits and the backend is `n`, partition the circuit into subcircuits that each fit on the device, execute them independently, and classically **knit** (reconstruct) expectation values from the joint bitstream. The cost is exponential in the number of cuts — the pattern buys you hardware you do not own, not free compute.

**Two cut primitives:**

| Primitive | Replaces | Per-cut gamma | Variance multiplier | Backend needs |
|-----------|----------|---------------|---------------------|---------------|
| Gate cut  | 2q gate  | 2 (CX)        | `gamma^2 = 4` | None beyond standard |
| Wire cut  | Qubit edge | 4           | `gamma^2 = 16` | Mid-circuit measure + reset + conditional prep |

**Algorithmic shape (knitting):**
```python
from qiskit_addon_cutting import (
    partition_problem, generate_cutting_experiments,
    reconstruct_expectation_values,
)
from qiskit.quantum_info import SparsePauliOp

# Mark partition on a 12q ansatz, 6q device
subexp, coeffs, subobs = partition_problem(
    circuit=ansatz, partition_labels="AAAAAABBBBBB",
    observables=SparsePauliOp.from_list([("Z"*12, 1.0)]),
)
# Run subexp[A], subexp[B] on backend independently
# Each subexperiment is many variants (basis prep / meas sampled from QPD)
results_A = sampler.run(subexp["A"]).result()
results_B = sampler.run(subexp["B"]).result()
exp_val = reconstruct_expectation_values(
    {"A": results_A, "B": results_B}, coeffs, subobs,
)
```

**Shot-cost table (variance multiplier vs cut count `k`):**

| k | 2 CX cuts | 5 CX cuts | 2 wire cuts | 5 wire cuts |
|---|-----------|-----------|-------------|-------------|
| Multiplier | 16x | 1024x | 256x | ~10^6x |

**When to use:**
- Problem is `k <= 5` CX cuts away from fitting. Beyond that, shot budget usually explodes.
- Two weakly-coupled fragments (chemistry bonds, QAOA graph bridges).
- Running in parallel on two smaller QPUs and fusing results.
- Benchmarking what a near-future bigger device would produce.

**When NOT to use:**
- Densely entangled circuits across the cut line — every entangler is another cut.
- Shallow circuits where you can just pay for a bigger device.
- Production workloads — the multiplicative shot cost is brutal when jobs are metered.

**Trade-offs:**
- **Gate cut** requires only classical post-processing — no mid-circuit dynamics. Use whenever possible.
- **Wire cut** works when few qubits bridge two regions but many gates cross that bridge. Needs dynamic-circuit-capable hardware.
- Cut-point optimization is a **graph-partitioning problem**: minimize cuts subject to each fragment fitting on-device. Tools: METIS-style partitioning, branch-and-bound over small circuits.

**Pitfalls:**
- Noise on the extra measurements/preparations can swamp the cut's benefit. Cut theory assumes **noiseless subcircuits**.
- `gamma^(2k)` is multiplicative with the base shot count, not additive. A 10x-shot problem becomes a 10240x-shot problem after 5 cuts.
- Current addons (Qiskit) support only `CutWire` and `CutTwoQubitGate`. Custom nonlocal gates must first be decomposed into CX.
- Wire cuts generate **many** subexperiments per cut (one per basis prep x one per basis meas) — job-count can explode even before shot count does.

**Example:** A 15q ring-QAOA on a 10q device — one wire cut splits into 2x8q subcircuits, shot cost x16. A 12q VQE across two fragments joined by two bonds — two CX cuts, shot cost x16. Both survivable.

**Comparison — cut vs just wait for bigger hardware:**

| Axis | Circuit cutting | Wait for bigger QPU |
|------|-----------------|---------------------|
| Time-to-result | Immediate, expensive | Months, cheap per-shot |
| Shot overhead | `gamma^(2k)` | 1x |
| Research signal | Shows the algorithm works | Shows the device works |
| Production fit | Poor | Good once available |

**Rule of thumb:** Cut only when not-cutting means not-running — budget shots as `base_shots * gamma^(2k)` up front, and if that number exceeds your monthly quota, change the algorithm, not the cut count.
