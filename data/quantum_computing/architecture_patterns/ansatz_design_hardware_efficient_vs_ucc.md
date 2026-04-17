### Ansatz Design — Hardware-Efficient vs UCC / ADAPT-VQE

**Pattern:** The parameterized circuit `U(θ)` is the single biggest lever on VQE/QAOA success. Two families anchor the design space: **hardware-efficient** (shallow, QPU-native, problem-agnostic) and **physically-motivated** (UCCSD, ADAPT-VQE — deeper, chemistry-accurate, structured).

**When to use — hardware-efficient (HEA):**
- NISQ QPU with depth budget `< ~100` two-qubit gates.
- Problem structure unknown or irrelevant (generic optimization).
- You need a quick baseline or energy-landscape sanity check.

**When to use — UCCSD / ADAPT-VQE:**
- Quantum chemistry where **chemical accuracy** (`1.6 mHa` vs FCI) is required.
- You have a Hartree–Fock reference state and a fermion→qubit mapping.
- Circuit budget is large (simulator or early-FTQC) or ADAPT can keep it shallow.

**Trade-offs:**
| Ansatz | Depth | Accuracy | Barren plateau risk | Param count | Problem-aware |
|---|---|---|---|---|---|
| HEA (`EfficientSU2`, brick-wall) | low (`O(reps·n)`) | poor for strongly-correlated | high at random init | `~3n·reps` | no |
| UCCSD | high (`O(n^4)` 2-q gates after JW) | chemical acc. for small | low (HF init) | `~n^4` | yes (fermionic) |
| HVA (Hamiltonian variational) | medium | good for lattice models | low | `O(p · #terms)` | yes (problem H) |
| ADAPT-VQE | grown layer-by-layer | chemical acc., shallow | low (greedy) | minimal | yes |
| QAOA | `2p` layers | problem-dep. | moderate | `2p` | yes (cost H) |

**Design decision tree:**
```
┌─ Is it chemistry / condensed-matter with known H?
│    ├─ Yes → Can I afford O(n^4) depth?
│    │         ├─ Simulator / early-FTQC → UCCSD
│    │         └─ NISQ QPU → ADAPT-VQE or k-UpCCGSD
│    └─ No (combinatorial / generic) → QAOA (if Ising) or HEA
│
└─ Is the problem a lattice Hamiltonian (Hubbard, Heisenberg)?
     └─ Yes → HVA (respects translation / locality)
```

**Example — HEA baseline vs UCCSD (Qiskit):**
```python
from qiskit.circuit.library import EfficientSU2
from qiskit_nature.second_q.circuit.library import UCCSD, HartreeFock
from qiskit_nature.second_q.mappers import JordanWignerMapper

# Hardware-efficient: agnostic, shallow
hea = EfficientSU2(num_qubits=4, reps=2, entanglement="linear")

# Chemistry-native: HF reference + singles/doubles excitations
mapper = JordanWignerMapper()
hf = HartreeFock(num_spatial_orbitals=2, num_particles=(1,1), qubit_mapper=mapper)
ucc = UCCSD(num_spatial_orbitals=2, num_particles=(1,1),
            qubit_mapper=mapper, initial_state=hf)
```

**Pitfalls:**
- **HEA + random init → barren plateau.** Layer-wise training or warm starts from a smaller instance are nearly mandatory at `n ≥ 10`.
- **UCCSD on hardware without error mitigation.** Depth makes noise bias dominant; ADAPT + ZNE is the practical path.
- **Over-parameterizing HEA** ("more reps = more expressive") increases barren-plateau probability and shots-per-gradient linearly.
- **Ignoring entanglement topology:** `entanglement="full"` compiles to heavy SWAP overhead on a heavy-hex or square grid — pick `"linear"` / `"circular"` matching the coupling map.

**ADAPT idea:** Start from `|HF⟩`. At each step, measure gradients of a candidate operator pool (singles, doubles); add the largest-gradient operator; re-optimize all existing parameters; repeat until gradient norm `< ε`. Keeps circuit shallow *and* expressive.

**Rule of thumb:** Default to HEA for a first demo and to benchmark hardware; switch to ADAPT-VQE the moment you need chemical accuracy or see barren-plateau symptoms — depth-for-free from smart ansatz design beats shot-budget brute force every time.
