### Lattice Surgery — Logical Gates via Patch Merge/Split

**What it is:** The standard technique for doing fault-tolerant logical gates on surface-code patches without moving qubits around. You perform a logical CNOT (or Bell measurement, or `M_{XX}`/`M_{ZZ}`) by **temporarily merging two patches into one, then splitting them back** — all via stabilizer measurements along the shared boundary.

**Intuition:** Two patches stacked side by side share a "seam" of ancilla qubits. Turn on the stabilizers that span the seam for `d` rounds → the two logical qubits become one merged code (encoding their joint `X_LX_L` or `Z_LZ_L`). Measure those seam stabilizers, then turn them off → the patches split again, the joint parity has been measured non-destructively.

**Why it exists:** Bravyi–König 2013: no single 2D topological code admits a universal transversal gate set. Surface code has *no* transversal 2-qubit gates. Lattice surgery is the workaround — use 2D geometry and classical feedback, pay `d` rounds per logical op.

**Logical CNOT via lattice surgery:** Combines three measurements plus an ancillary logical qubit:
1. `M_{ZZ}` between control and ancilla patch (merge along Z-boundary, measure, split).
2. `M_{XX}` between ancilla and target patch (merge along X-boundary, measure, split).
3. `M_X` on ancilla (destructively measure).
4. Classical Pauli corrections on control/target based on the three measurement outcomes.

**Stim circuit sketch (merge two d=3 patches along Z):**
```python
import stim
c = stim.Circuit()
# ... preparation of two independent rotated d=3 patches ...

# Turn on seam stabilizers spanning the boundary between patches A and B
for _ in range(3):                                # d=3 rounds
    for seam_stab in seam_Z_stabilizers():        # new weight-4 Z checks
        c.append_operation("MPP", seam_stab)
    for stab in interior_stabilizers():
        c.append_operation("MPP", stab)
    c.append_operation("TICK", [])

# Result of seam measurements = Z_L Z_L of the two logicals (modulo known random corrections)
# Turn seams off -> patches decouple
```

**Boundary types:** Surface-code patches have two kinds of boundaries:
- **Rough (X-boundary):** logical `X̄` terminates here. Merging two X-boundaries measures `X̄X̄`.
- **Smooth (Z-boundary):** logical `Z̄` terminates here. Merging Z-boundaries measures `Z̄Z̄`.

Choosing which boundaries to merge picks the logical operator being measured.

**Overhead:**

| Operation | Cost (rounds) | Cost (qubits) |
|---|---|---|
| Single-qubit Clifford (S, H) | `~d` (via patch deformation) | 1 patch |
| Logical `M_{ZZ}` or `M_{XX}` | `d` | 2 patches + seam |
| Logical CNOT | `~3d` | 3 patches (2 data + 1 ancilla) |
| T gate | `d` + distillation | Data patch + magic-state factory |

**Lattice surgery vs alternatives:**

| Technique | FT in 2D? | Overhead | Notes |
|---|---|---|---|
| Transversal CNOT (color code) | Yes | 1× depth | Requires transversal-friendly code |
| Braiding / defect moves | Yes | `~d` | Older; superseded by surgery |
| Lattice surgery | Yes | `~d` | **Current practice** for surface-code FT |
| Teleportation-based | Yes | State injection + Bell meas | Used for T |

**Pitfalls:**
- Classical feedback is on the critical path — decoder latency must complete in one round time (~μs for superconducting), else the logical depth stalls.
- Merging patches requires careful *boundary matching* — a single-qubit error on the seam can create a logical error if decoder history is too short.
- Surgery generates classical Pauli byproducts that must be tracked (and sometimes commuted through subsequent gates) — this "Pauli frame" tracking is pure classical bookkeeping but easy to get wrong.

**Rule of thumb:** Lattice surgery is the **dominant practical FT logical-gate approach** for surface codes and is what every serious surface-code compiler (PyPanda, OpenSquare, Alice&Bob stack) emits. If you're costing out a surface-code algorithm, count operations in terms of surgery ops and magic states, not gates.
