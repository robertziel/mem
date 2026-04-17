### QPU Topology — All-to-All, Grid, Heavy-Hex, 1D Chain

**What it is:** The physical 2-qubit connectivity graph of a device. It dictates which pairs of physical qubits can be directly entangled, and thus how many SWAPs a compiler must insert to realize a given logical circuit. Topology choice is an engineering compromise between fidelity, wiring density, routability, and code compatibility.

**Typical topologies:**

| Topology | Degree (avg) | Platforms | Diameter (N qubits) | SWAP overhead vs all-to-all |
|---|---|---|---|---|
| All-to-all | n − 1 | Ion traps (Quantinuum, IonQ), small photonic | 1 | 1× (none) |
| 2D grid | 4 | Google Sycamore/Willow, Rigetti Ankaa | O(√N) | 1–3× typical |
| Heavy-hex | 2–3 | IBM Heron, Eagle | O(√N) | 1.5–4× |
| 1D linear chain | 2 | Early spin-qubit, some ions | O(N) | 5–100× (quadratic in N) |
| Hexagonal / triangular | 3–6 | Research chips | O(√N) | 1–2× |
| Bipartite | varies | LDPC-code-tailored | varies | depends on code |

**SWAP overhead intuition:** Moving two logical qubits from distance `d` in the device graph to adjacent takes ~ `d − 1` SWAPs, each costing 3× a CNOT. For an n-qubit fully-connected circuit compiled to a linear chain: **Θ(n²)** SWAPs.

**Rule-of-thumb SWAP estimate:**
```
expected_swaps_per_2Q_gate ≈ average_shortest_path_length − 1
surface:    1D chain   : (N+1)/3
            2D grid    : ~ 0.6 · √N
            heavy-hex  : ~ 0.8 · √N
            all-to-all : 0
```
For N = 100: 1D ≈ 33 SWAPs, grid ≈ 6, heavy-hex ≈ 8, all-to-all = 0 per 2Q gate.

**Why heavy-hex (IBM's choice)?**
- Reduces ZZ crosstalk: each qubit has only 2–3 neighbors → fewer simultaneous interactions to schedule.
- Each physical qubit is either "data" (degree 2) or "ancilla" (degree 3) in a natural way — maps to a subsystem code (heavy-hex code).
- Easier frequency allocation for fixed-coupling architectures (fewer collisions).
- Cost: higher SWAP overhead than a grid for random circuits.

**Why grid (Google's choice)?**
- Native for 2D surface code: data and ancilla qubits alternate on a checkerboard, 4 connections per ancilla.
- Highest degree without exotic wiring in a planar chip.
- Cost: more crosstalk to manage; tunable couplers become essential.

**Why all-to-all (ions)?**
- Ions in a shared trap can be paired via collective motional modes — any-to-any by construction (up to ~30 ions per chain); past that, use QCCD shuttling which preserves effective all-to-all.
- Cost: 2Q gate time grows with ion count (mode crowding); wall-clock bottleneck.

**Algorithm → topology fit:**

| Circuit class | Best topology | Why |
|---|---|---|
| Surface code QEC | 2D grid | Code is literally a grid |
| Heavy-hex QEC | heavy-hex | Matches IBM code |
| qLDPC codes (bivariate bicycle) | bipartite or grid with long-range bonds | Code graph is non-planar |
| QAOA / VQE on dense Ising | All-to-all preferred | Every pair may interact |
| Quantum chemistry (Jordan-Wigner) | 1D chain OK (already 1D) | Mapping is already linear |
| Shor, Grover | 2D grid + efficient routing | Modest depth; depth > connectivity |

**Trade-offs:**
- Higher degree → more crosstalk, worse simultaneous gates. Good layout + tunable couplers mandatory.
- Lower degree → trivially parallel gates, but massive SWAP penalty.
- All-to-all is an illusion on scaled ion systems (mode crowding); QCCD regains it with shuttle time cost.

**When relevant:**
- Choosing a backend for a given algorithm.
- Designing a new chip: pick topology around your dominant workload and your QEC code.
- Writing a transpiler: routing strategy depends on graph structure (SABRE on sparse, tensor-network on dense).

**Pitfalls:**
- Assuming "higher connectivity = always better" — crosstalk and wiring density cancel the gain at degree > ~ 5 on planar chips.
- Ignoring effective connectivity: on a heavy-hex chip with bad calibration, some edges are unusable → real graph is sparser than advertised.
- Comparing gate counts pre-transpile vs post-transpile when SWAPs are involved — the raw CNOT count drastically changes.

**Rule of thumb:** For NISQ depth, grid and heavy-hex are close (within 2×) in SWAP overhead; the real differentiator is crosstalk-managed 2Q fidelity, not the topology name — and all-to-all ions beat both on SWAP count but lose on gate time and scaling beyond ~30 ions.
