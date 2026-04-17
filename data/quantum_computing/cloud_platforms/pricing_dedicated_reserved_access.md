### Dedicated and Reserved Access — Hourly Block Pricing vs On-Demand

**What it is:** Most QPU providers offer a second pricing tier alongside on-demand: a **reserved time block** where you pay a flat hourly rate for exclusive machine access, regardless of how many shots you run inside the window. Braket calls it "reservations", IBM calls it "dedicated service instances" on premium plans, Azure exposes provider-specific equivalents (IonQ dedicated capacity, Quantinuum direct reservations). The core math question is: at what shot volume does reservation beat on-demand?

**Formula — break-even:**
- `on_demand_cost(shots) = tasks × task_fee + shots × per_shot_rate`
- `reserved_cost(hours) = hours × hourly_rate`
- `shots_breakeven = (hours × hourly_rate − tasks × task_fee) / per_shot_rate`

If you will execute *more* than `shots_breakeven` inside the reserved window, reservation wins. Below that, on-demand is cheaper.

**Example — Braket-style reservation break-even:**
```python
# Illustrative: IonQ Aria reservation at $7 000/hour
hourly_rate   = 7000
task_fee      = 0.30
per_shot_rate = 0.03
hours         = 2
tasks_est     = 200          # expected tasks in the window

block_cost = hours * hourly_rate         # $14 000

# Break-even shots over the 2h window:
shots_be = (block_cost - tasks_est * task_fee) / per_shot_rate
# = (14000 - 60) / 0.03 ≈ 464 666 shots

# With typical 1024 shots/task, need ~454 tasks in 2h (~4/min)
# to hit break-even. If you can't sustain that rate, stay on-demand.
def should_reserve(shots_planned, shots_be, deadline_critical):
    if shots_planned >= 1.1 * shots_be or deadline_critical:
        return "reserve"
    return "on-demand"
```

**Hourly rate tiers — order of magnitude:**

| Tier | Typical $/hr | Who uses it |
|---|---|---|
| Superconducting shared (IBM open) | $0 (quota-limited) | Students, exploratory |
| Superconducting premium (IBM dedicated) | $1 000–$2 000 | Mid-size research |
| Trapped-ion reservation (Braket IonQ/Quantinuum) | $5 000–$10 000 | Production benchmarks |
| Fault-tolerance-class dedicated capacity | $10 000+ | Enterprise / government |

Rates drift quarterly; always confirm at purchase. You're paying for *guaranteed access* — not just throughput.

**Utilization realism — the key honest question:**

| Expected utilization | Recommendation |
|---|---|
| >90% | Reserve — you'll save 30–60%. |
| 60–90% | Borderline — reserve only if queue risk matters. |
| 30–60% | On-demand — reservation wastes idle hours. |
| <30% | On-demand + session bursts. |

Most teams *overestimate* utilization by 2–3×. Classical post-processing, network hiccups, and IDE distractions eat 20–40% of any reserved window. Measure historical rate on a smaller on-demand job first, then apply a 0.7 discount factor.

**Decision rule:**
- **Throughput ≥ break-even** AND **latency matters** → reserve.
- **Burst of 5–50 tasks** with gaps between → on-demand + session for bursts.
- **Compliance / reproducibility runs** where "submission deadline on Tuesday" matters → reserve (queue risk is the enemy).
- **Exploration / debugging** → never reserve; you will idle most of the window.

**Pitfalls:**
- Counting tasks you *might* submit instead of tasks you will actually submit. Use historical throughput, not aspiration.
- Forgetting that reserved windows have fixed start times — a delay in classical pre-processing means you pay for empty minutes.
- Some providers (IonQ via Braket) require 4-hour minimum blocks; no partial-hour refunds.
- Cancellation windows: many reservations lock in 24–72h ahead. Weather/logistics delays cost the full block.
- Reservation doesn't guarantee calibration state — a QPU may recalibrate mid-window, burning 10–20 min of your block.
- Reserving on a specific ARN / backend name means an unplanned maintenance cycle loses your window entirely. Some providers refund, most don't.

**Rule of thumb:** Reserve only when your *measured* submission rate on on-demand, times the full reserved window, exceeds `0.8 × break-even shots` — anything less and you're buying expensive idle time; anything more and on-demand queue risk will bite before you finish.
