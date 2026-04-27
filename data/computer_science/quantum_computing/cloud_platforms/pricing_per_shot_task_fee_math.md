### Quantum Cloud Pricing — Per-Shot, Task Fee, and Second-Based Math

**What it is:** Three fundamentally different billing models across the major quantum cloud providers. AWS Braket charges a flat per-task fee plus a per-shot rate. IBM Qiskit Runtime charges per QPU-second of actual execution. Azure Quantum passes through provider-priced units — IonQ QPU-seconds, Quantinuum HQCs, Rigetti task-seconds — each with their own meter. Getting the math wrong by even a factor of ten on shot count can 10x your bill.

**Formulas — the three models:**
- Braket: `cost = task_fee + (shots × per_shot_rate)`. Task fee ~ $0.30 on most QPUs. Per-shot ranges from $0.00035 (Rigetti) to $0.03 (IonQ/Quantinuum).
- IBM Runtime: `cost = qpu_seconds × per_second_rate`. Premium plans bill ~ $1.60/QPU-s. Shots affect cost only via wall-time — deep circuits cost more per shot because each shot takes longer.
- Azure: `cost = sum(provider_meter_units × provider_rate)`. For Quantinuum H1: `HQCs ≈ 5 + C × (N_1q + 10·N_2q + 5·N_meas) × shots / 5000`. Incomparable across providers without converting to USD via the live rate card.

**Concrete math — 10-qubit VQE, 200 iters × 1024 shots × 5 Pauli terms:**
```python
shots_total = 200 * 1024 * 5                 # 1.024M total shots
tasks       = 200 * 5                         # 1000 distinct tasks

# Braket IonQ Aria: per-task fee dominates for small shots
braket_aria = tasks * 0.30 + shots_total * 0.03
# = $300 + $30 720 ≈ $31 020

# Braket Rigetti (superconducting): per-shot tiny
braket_rig = tasks * 0.30 + shots_total * 0.00035
# = $300 + $358 ≈ $658

# IBM Torino Session: 6 µs/shot + 20% session idle overhead
ibm_sec = shots_total * 6e-6 * 1.20
ibm_usd = ibm_sec * 1.60
# ≈ 7.4 QPU-s × $1.60 ≈ $11.80
```
For iterative hybrid work, the per-second model is typically 1–3 orders of magnitude cheaper than per-shot trapped-ion.

**Small vs large job comparison (illustrative):**

| Scenario | Braket (Aria) | Braket (Rigetti) | IBM (Torino) | Azure (H1-1) |
|---|---|---|---|---|
| 100 shots, 1 circuit | $3.30 | ~$0.30 | ~$0.0007 | ~5 HQCs ≈ $62 |
| 10 000 shots, 1 circuit | $300 | ~$3.80 | ~$0.07 | ~15 HQCs ≈ $187 |
| 1 000 shots × 100 circuits | $3 030 | ~$65 | ~$0.66 | ~500 HQCs ≈ $6 250 |

Two takeaways: (1) on Braket per-shot dominates at scale; (2) IBM's per-second model makes shots cheap but wall-time expensive; (3) trapped-ion is 100–1000× more expensive per shot than superconducting — but fidelity often justifies it (see cross-vendor budget math).

**Small-job task-fee amortization on Braket (per-shot $0.03):**

| Shots per task | Task fee share of cost | Effective $/shot |
|---|---|---|
| 10 | 50.0% | $0.060 |
| 100 | 9.1% | $0.033 |
| 1 000 | 1.0% | $0.0303 |
| 10 000 | 0.1% | $0.03003 |

Under ~300 shots, you're paying more for the privilege of submitting than for the work itself. Batch circuits together or use `Batch` mode to amortize.

**Per-second model quirks (IBM):** The shot cost equals `shot_time × rate`. Deep circuits (many 2-qubit gates) have longer per-shot times, so *same shot count* costs more on deeper circuits. A 20-qubit GHZ takes ~3× longer per shot than a single-qubit rotation. Session mode adds wall-clock overhead — opening the session costs a few seconds, and any classical gap bills at the full per-second rate.

**Decision rule:**
- **Shallow, many shots** → Braket Rigetti or IBM. Per-shot and per-second both favor shallow work.
- **Deep, few shots, need fidelity** → trapped-ion (IonQ/Quantinuum on Braket or Azure). Per-shot premium buys mitigation-free results.
- **Hybrid VQE / QAOA with tight loops** → IBM Session — seconds model fits iterative work and sub-second latency.
- **Parameter sweeps** → batch on Braket or IBM Batch mode to amortize task fees.

**Pitfalls:**
- Forgetting the per-task fee on Braket during parameter sweeps — 10 000 tasks at $0.30 is $3 000 *before* a single shot runs.
- Assuming IBM shots are "free" because the headline is per-second — deep circuits at high shot count still take real wall time.
- Mixing Azure providers in one budget without normalizing to USD — HQCs and QPU-seconds are incomparable.
- Reading stale rate cards. Providers reprice quarterly; pin `device.properties.service.deviceCost` or equivalent at runtime.
- Counting simulators against QPU budget on Braket — SV1/DM1/TN1 bill per-minute, not per-shot.

**Rule of thumb:** Compute `(task_fee / shots) + per_shot_rate` on Braket and `(session_overhead_s + shot_time_s) × rate` on IBM before submitting — if those two numbers aren't within 2x of your target per-run budget, change shot count or vendor before you hit Enter.
