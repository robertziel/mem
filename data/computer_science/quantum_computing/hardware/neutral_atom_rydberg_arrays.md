### Neutral-Atom Rydberg Arrays — Optical-Tweezer Qubits

**What it is:**
A quantum computer built from neutral atoms (typically Rb-87, Cs, or alkaline-earth Sr/Yb) individually trapped in an array of focused laser beams ("optical tweezers"). Each atom is a qubit; two-qubit gates use the Rydberg blockade, a strong dipole-dipole interaction activated by exciting atoms to high principal-quantum-number states (n ~ 50–100). Arrays of hundreds to thousands of atoms are routinely assembled.

**Physics:**
- Atoms are laser-cooled to μK and loaded into tweezers (depth ~mK).
- Qubit encoded in ground-state hyperfine sublevels (clock qubit, MHz frequency) or in alkaline-earth nuclear-spin states (long-lived, field-insensitive).
- To entangle, a laser pulse drives atoms toward the Rydberg state |r⟩. When two atoms are within the blockade radius R_b, only one can be excited at a time — this nonlinearity realizes a CZ gate.
- Blockade energy V_blockade ≫ Rabi frequency Ω → excitation doubly-excited state is forbidden.

**Rydberg blockade geometry:**
```
          R < R_b                    R > R_b
   ●─────────●                  ●         ●
   blockaded             both can go to |r⟩
   (only one → |r⟩)
```
Blockade radius R_b scales as (C_6 / ℏΩ)^{1/6} ≈ 5–10 μm for n ≈ 70.

**Typical numbers:**
| Parameter | Range |
|---|---|
| Atoms per array | 100 – 10000 |
| Tweezer spacing | 2–10 μm |
| T1 (ground-state) | 1–10 s |
| T2 (ground-state, echo) | 1–2 s |
| T_Rydberg lifetime | 50–200 μs |
| 1Q gate time | 0.1–10 μs |
| 2Q Rydberg gate time | 0.1–1 μs |
| 1Q fidelity | 99.9% |
| 2Q fidelity | 99.0–99.6% |
| Readout (fluorescence) | 1–50 ms |

**Reconfigurable geometry:**
Tweezer positions are set by a spatial-light modulator or acousto-optic deflectors. Between gates, atoms can be physically moved → non-local connectivity without shuttling chains. Enables efficient embedding of graph problems and surface-code layouts.

**Strengths:**
- Large qubit count scales with optical power, not fabrication.
- All qubits identical (atoms).
- Long ground-state coherence (seconds).
- Reconfigurable connectivity — a compiler asset.
- Natural fit for analog Hamiltonian simulation (quantum annealing, Ising models).

**Weaknesses:**
- Slower 2Q gate than superconducting (~μs vs ns).
- Rydberg state is short-lived (~100 μs) — sets a hard limit on pulse duration.
- Atom loss (tweezer loading is ~50–90% per site per cycle, must re-assemble).
- Readout destroys the atom (fluorescence) — mid-circuit measurement uses zone transfer or species multiplexing.
- Laser-system complexity (UV Rydberg lasers, high stability required).
- Cross-talk from stray Rydberg excitations.

**Analog vs digital modes:**
| | Analog (Hamiltonian) | Digital (gate-based) |
|---|---|---|
| How | Global Rydberg pulse drives whole array under a fixed H | Individual addressing + CZ gates |
| Strength | Scales to 1000+ atoms cleanly | Universal computation |
| Use case | QUBO, MaxCut, quantum magnetism | General algorithms, QEC |

**When to use:**
- Analog simulation of spin/Ising Hamiltonians at large N.
- Digital circuits needing many qubits and flexible connectivity, where a few-μs gate time is acceptable.
- Early QEC demonstrations on reconfigurable code patches.

**Rule of thumb:** Neutral atoms are the platform with the most qubits and the most reconfigurable geometry; speed and Rydberg-lifetime-limited fidelity are the cost of admission, and atom loss is the operational tax you must engineer around.
