### Threshold Theorem and Fault-Tolerant Scaling

**What it is:** The foundational result of QEC theory. States that if physical error rate per gate is below a constant threshold p_th, then with polylog-overhead encoding, logical error rate can be driven to any desired target. Proven for concatenated codes by Aharonov–Ben-Or, Knill–Laflamme–Zurek, Kitaev, Preskill (1997–1998); extended to topological codes by Kitaev and later Aliferis, Gottesman, Preskill.

**Formal statement (paraphrased):**

Let p = worst-case diamond-norm error per gate. There exists p_th > 0 such that for p < p_th, for any target logical error ε, there exists an encoding and fault-tolerant protocol using:

- Physical qubits per logical: O(polylog(1/ε))
- Time overhead per logical gate: O(polylog(1/ε))

Logical error decreases super-polynomially as encoding scales up.

**Two regimes of threshold:**

| Approach | Threshold p_th | Scaling |
|---|---|---|
| Concatenated (Steane, Knill) | ~10^-4 to 10^-3 | doubly-exp in levels |
| Topological (surface) | ~1% | exp in distance d |
| qLDPC (good codes) | constant, ~0.1–1% | exp in √n |

**Concatenation scaling:**

For a code correcting t errors with threshold p_th:
- Level-1 logical error: p_1 ≈ C·p² (if t = 1).
- Level-L logical: p_L ≈ (p/p_th)^(2^L) · p_th.

Double-exponential suppression — but overhead 7^L or 15^L etc., polynomial in log(1/ε).

**Surface-code scaling:**

For distance d, below-threshold:
p_L(d) ≈ A · (p / p_th)^((d+1)/2)

Per-logical qubit cost is O(d²). To reach p_L = 10^−12 at p = 0.001, p_th = 0.01:

d such that (0.001/0.01)^((d+1)/2) = 10^−12
→ (d+1)/2 · log10(0.1) = −12
→ d ≈ 23.

Physical qubits per logical ≈ 2·23² ≈ 1058.

**Assumptions for the theorem:**

1. **Local, Markovian noise:** no long-range correlations between errors.
2. **Bounded error rate:** applies to every location (gate, idle, measurement).
3. **Fast classical computation:** decoder runs in real time (faster than error accumulation).
4. **Parallel operation:** many qubits operated simultaneously with O(1) locality.
5. **Non-adversarial noise:** stochastic, independent or weakly correlated.

**Violations that can kill the theorem:**
- Leakage (not in Pauli group) — needs LRU.
- Coherent drift (not twirled) — handled via randomized compiling.
- Correlated noise (cosmic rays, TLS bursts) — active research area.
- Time-correlated 1/f noise — dynamical decoupling helps.

**Historical thresholds:**

| Code / protocol | First proof | Refined threshold |
|---|---|---|
| Concatenated Steane (KLZ 1996) | 10^-6 | 10^-4 (Knill 2005) |
| Concatenated C4/C6 (Knill) | — | 3e-3 |
| Surface (Fowler 2012) | 1% | 0.57–1% depending on gate set |
| Flag-qubit fault tolerance | — | ~1e-3 for small codes |
| qLDPC (Panteleev–Kalachev) | constant > 0 | ~1e-3 expected |

**Why topological thresholds beat concatenation:**

- No recursive ancilla verification overhead.
- Local checks mean errors have to "transport" across the code to be logical — geometric suppression.
- Easier to parallelize in hardware.
- Downside: polynomial (not exponential) overhead in qubit count for fixed p_L.

**Sub-threshold experimental demos:**

| Year | Group | System | Milestone |
|---|---|---|---|
| 2022 | Google | Sycamore | first d=3 vs d=5 memory comparison (barely) |
| 2023 | Quantinuum | H2 | logical break-even on Steane [[7,1,3]] |
| 2024 | Google | Willow | exponential suppression, d=3→5→7 |
| 2024 | QuEra | Aquila | d=7 logical-qubit demo |
| 2024 | IBM | Heron | Gross code design announced |

**Rule of thumb:** To escape the "threshold clamp," drive your physical gate error to 0.5× of your code's threshold — anything closer buys you only polynomial suppression; the exponential starts paying off well below half.
