### NISQ vs Early-FTQC vs FTQC — The Three-Era Mental Model

**Pattern:** Every quantum algorithm, hardware claim, and vendor roadmap slots into one of three eras distinguished by **what a "qubit" means** and **how deep a circuit can run**. NISQ has only noisy physical qubits and heuristics. Early-FTQC has a handful of *logical* qubits with a finite budget of non-Clifford gates. Full FTQC has many logical qubits and arbitrary depth. Most confusion in quantum discourse comes from applying one era's assumptions to another.

**The three eras at a glance:**
| Dimension | NISQ (today) | Early-FTQC (≈ 2027–2030) | FTQC (late 2030s?) |
|---|---|---|---|
| Qubit abstraction | physical (noisy) | few logical (`10–100`) | many logical (`1000+`) |
| Gate errors | `10⁻³–10⁻²` | logical `10⁻⁶–10⁻⁹` | logical `< 10⁻¹²` |
| Depth limit | `~10²` two-q gates | `10⁵–10⁸` but T-budgeted | arbitrary |
| T-gate regime | N/A (physical gates direct) | expensive (magic-state bottleneck) | abundant |
| Programming model | circuits + shots + mitigation | logical primitives + QEC codes | algorithm-as-written |
| Proofs? | heuristic (no speedup proof) | partial (some FTQC algos work) | full (Shor, QPE, Grover…) |

**What each era *can actually do*:**
```
NISQ (today):
  ✓ Variational heuristics (VQE, QAOA) on small instances
  ✓ Quantum simulation (short-time Trotter) of 10–50 qubits
  ✓ Quantum machine learning demos
  ✓ Quantum sensing, metrology, randomness certification
  ✗ Shor's algorithm (any cryptographically-interesting size)
  ✗ Chemical accuracy for > ~10 orbital chemistry
  ✗ Provable speedup on a commercial problem

Early-FTQC (emerging):
  ✓ Small-scale QPE (100-orbital chemistry — FeMoco-class)
  ✓ Shor on factoring practice sizes (RSA-100 class)
  ✓ Quantum signal processing / QSVT at limited polynomial degree
  ✓ Deep Trotter simulation with QEC-protected qubits
  ✗ Breaking RSA-2048 (needs ~20M physical qubits under surface code)
  ✗ General-purpose quantum database search at scale

FTQC:
  ✓ Shor-RSA-2048 (by assumption — resource estimates, not demonstrated)
  ✓ Arbitrary-depth QPE, full HHL, quantum recommendation
  ✓ Algorithms currently constrained only by asymptotic complexity
```

**What changes with the model:**
```
       NISQ                    Early-FTQC                  FTQC
    ┌────────┐              ┌─────────────┐            ┌────────┐
    │ shots, │              │ logical qb, │            │ algo-  │
    │ noise, │   ──────▶    │ T-budget,   │   ─────▶   │ as-    │
    │ mitig. │              │ magic-state │            │ written│
    │ loops  │              │ factories   │            │        │
    └────────┘              └─────────────┘            └────────┘
```

**Code-level contrast:**
```python
# NISQ idiom — variational, shot-budgeted, mitigation-wrapped
from qiskit_ibm_runtime import EstimatorV2
est = EstimatorV2(mode=session, options={"resilience_level": 2})  # mitigation ON
e   = est.run([(isa, H, theta)]).result()[0].data.evs

# Early-FTQC idiom — logical qubits, T-counted
# (schematic — APIs like stim, Azure QIR, PsiQ's PECOS evolving)
logical = encode_surface_code(data_qubits, distance=9)
cycle   = logical.apply(qft_logical, t_budget=10_000)

# FTQC idiom — write the algorithm, trust the stack
phase = quantum_phase_estimation(U_hamiltonian, precision=2**-10)
```

**Trade-offs:**
- NISQ is available *now* but provides no theoretical guarantees; time-to-insight short, time-to-advantage unclear.
- Early-FTQC gives you a handful of reliable logical qubits — enough for watershed demos (FeMoco-like chemistry) but not industrial-scale factoring.
- FTQC is where the classic textbook speedups live — and also where most commercial value resides — but timelines are honest 10-year-plus bets.

**Pitfalls:**
- Calling Shor "broken soon" by extrapolating NISQ qubit counts — confuses physical with logical.
- Demanding error-corrected guarantees from a NISQ demo.
- Designing an application assuming the current era will persist — the migration NISQ → early-FTQC changes the *shape* of the code (shots/mitigation → logical primitives).
- Treating "T-count" as the relevant cost metric in NISQ or "physical error rate" as the metric in FTQC.

**Rule of thumb:** Before reading any quantum paper, claim, or roadmap, ask which era it assumes — NISQ papers that claim "production advantage" and FTQC papers that claim "available next year" are both worth a hard second look; the mental model telling you "this is logical, not physical" saves you from 90% of quantum hype.
