### Color Codes — 2D Triangular Lattice with Transversal Clifford Gates

**What it is:** A family of 2D topological stabilizer codes (Bombin–Martin-Delgado 2006) on a 3-colorable lattice. Each plaquette carries both an X-stabilizer and a Z-stabilizer supported on the same qubits. The main draw vs the surface code: **all Clifford gates are transversal in a single patch**, and some variants (6.6.6, 4.8.8) admit transversal T on 3D "color code" extensions.

**Geometry:**
- Qubits on vertices of a 3-colorable trivalent lattice (every vertex has degree 3; every face is one of three colors).
- Common lattices: hexagonal (6.6.6 — all faces are hexagons) and square-octagonal (4.8.8).
- Each face of color `c` carries two stabilizers: `X`-type `∏ X` and `Z`-type `∏ Z` over its vertices.

**Stabilizers and distance:**
For the 6.6.6 hexagonal color code of side length `d`:
- Number of qubits: `n = (3d² + 1) / 4` for the triangular patch (vs `d²` for rotated surface).
- Logical operators: strings along the boundary; distance `d`.
- Parameters: `[[n, 1, d]]`.

**Transversal gates — the big deal:**

| Gate | Surface code | Color code (2D) | Color code (3D) |
|---|---|---|---|
| X, Z | transversal | transversal | transversal |
| H | lattice surgery / patch deformation | **transversal** | transversal |
| S | lattice surgery | **transversal** | transversal |
| CNOT | lattice surgery | **transversal** (two copies) | transversal |
| T | magic-state distillation | magic-state distillation | **transversal (gauge)** |

Transversal = apply the physical gate to each qubit independently; automatically fault-tolerant. No patch deformation, no ancilla protocols.

**Stim code (toy 6.6.6 d=3 memory circuit):**
```python
import stim

# Stim ships a generator for color codes
circuit = stim.Circuit.generated(
    code_task="color_code:memory_xyz",
    distance=3,
    rounds=10,
    after_clifford_depolarization=0.001,
    before_measure_flip_probability=0.005,
    after_reset_flip_probability=0.005,
)
sampler = circuit.compile_detector_sampler()
print(sampler.sample(shots=10).mean(axis=0))
```

**Color code vs surface code:**

| Property | Surface code | 2D color code |
|---|---|---|
| Qubits per logical at distance d | ~2d² | ~(3d²+1)/4 (smaller!) |
| Stabilizer weight | 4 | 6 (hex) or 8 (square-oct) |
| Threshold (circuit noise) | ~0.7% | ~0.1–0.3% (lower) |
| Decoder | MWPM | Projection to matching on 3 restricted lattices, or harder |
| Transversal Cliffords | No | **Yes** |
| Transversal T | No | Only in 3D variant |
| Connectivity | Degree-4 | Degree-3 (but weight-6 checks) |

**Pitfalls:**
- Decoding is genuinely harder — each syndrome bit depends on 6 qubits (not 4), and the "matching on three color restrictions" trick has higher overhead than MWPM on the surface code.
- Higher-weight stabilizers mean more measurement circuitry, more places for errors to enter during syndrome extraction → the nominal qubit savings are eroded in practice.
- No 2D code can have transversal T (Bravyi–König); to get transversal T you need 3D color codes and extra physical dimensions (stacked 2D layers with transversal gauge fixing).

**Rule of thumb:** Color codes trade a lower threshold and harder decoding for transversal Cliffords. Worth the complexity when your bottleneck is logical-gate overhead (lots of Cliffords between T gates); stick with the surface code when your bottleneck is the threshold itself.
