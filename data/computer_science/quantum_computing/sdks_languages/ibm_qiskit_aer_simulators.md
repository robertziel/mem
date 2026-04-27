### IBM Qiskit Aer — Simulator Backends

**What it is:** `AerSimulator` is Qiskit's high-performance classical simulator. It bundles several distinct simulation *methods* behind a single backend interface. Picking the right method is the difference between simulating 30 qubits in seconds and running out of memory on 25.

**Methods at a glance:**

| Method | Max practical qubits | Handles noise | Handles non-Clifford | Memory/runtime scaling |
|---|---|---|---|---|
| `statevector` | ~30 (dense) | yes (density_matrix preferred) | yes | 2^n complex amplitudes |
| `density_matrix` | ~15 | yes (native) | yes | 4^n entries |
| `matrix_product_state` | 100+ (low entanglement) | yes | yes | poly(n) × bond dim χ² |
| `stabilizer` | 1000s | yes (Pauli noise only) | **no** (Clifford only) | O(n²) |
| `extended_stabilizer` | ~60 (few T gates) | partial | yes (with T-gate overhead) | exponential in #T gates |
| `unitary` | ~15 | no | yes | 4^n entries (no measurement) |
| `superop` | ~10 | yes | yes | 16^n entries (full channel) |

`automatic` picks one based on circuit structure (default).

**API shape:**
```python
from qiskit_aer import AerSimulator
from qiskit import transpile

sim = AerSimulator(method='matrix_product_state',
                   matrix_product_state_max_bond_dimension=256)
isa = transpile(qc, sim)
result = sim.run(isa, shots=4096).result()
counts = result.get_counts()
```

**When to pick each:**

- **statevector** — default for ≤28 qubits, arbitrary gates, no noise or depolarizing via Kraus. Memory wall: 2^28 complex128 = 4 GiB; 2^30 = 16 GiB.
- **density_matrix** — exact open-system simulation. 4^n entries means the qubit budget halves; 14 qubits ≈ 4 GiB. Use for benchmarking small noisy protocols.
- **matrix_product_state (MPS)** — the workhorse for >28 qubits with limited entanglement (shallow circuits, 1D topology, QAOA-p≤3, Trotter steps on local Hamiltonians). Cost is polynomial in `n` but exponential in entanglement (bond dim χ). Tune `matrix_product_state_max_bond_dimension`.
- **stabilizer** — for **Clifford-only** circuits (H, S, CNOT, measurement, Pauli noise). Scales to thousands of qubits; essential for surface-code decoding, randomized benchmarking, GHZ prep. Adding a single T gate makes this method error out.
- **extended_stabilizer** — Clifford + limited T gates via stabilizer-rank decomposition. Cost grows exponentially in the number of non-Clifford gates (~2^(0.5·#T)). Use for magic-state studies.
- **unitary / superop** — analytical: return the full process matrix (no sampling). Tiny qubit budget; mostly for verification.

**Memory cliff (noiseless statevector):**

| Qubits | Complex128 memory |
|---|---|
| 20 | 16 MiB |
| 25 | 512 MiB |
| 28 | 4 GiB |
| 30 | 16 GiB |
| 32 | 64 GiB |

Past 28 qubits on a laptop, **switch to MPS or stabilizer** — statevector will swap and crash.

**GPU acceleration:**
`AerSimulator(method='statevector', device='GPU')` uses cuStateVec if built with GPU support — ~10–50× speedup on dense statevector sims; no benefit for stabilizer or small MPS.

**Pitfalls:**
- Forgetting to `transpile(qc, sim)` — AerSimulator supports many gates but still wants basis legality for some methods (MPS prefers local 2Q gates).
- Running a T gate on `stabilizer` → error "non-Clifford instruction not supported".
- Using MPS on a highly entangled circuit (e.g., random universal circuits at depth > O(log n)) — bond dim saturates and it's slower than statevector.
- Requesting `get_statevector()` under `matrix_product_state` without enabling `save_statevector` — MPS keeps a compressed state.

**Rule of thumb:** ≤28 qubits → `statevector`; >28 qubits with structure → `matrix_product_state`; Clifford circuits at any scale → `stabilizer`; small noisy benchmarks → `density_matrix`.
