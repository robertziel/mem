### Sample Ratio Mismatch (SRM — diagnostic, chi-square check, assignment bug detection)

**When:** **first sanity check** in any A/B test analysis — verify the observed split between arms matches the planned split. SRM = "we said 50/50, but we observe 49.3/50.7". A small SRM blows up the rest of the analysis even when the experiment "looks fine".

**Schema:**

| Concept | Detail |
|---|---|
| Expected split | What randomization promised (e.g., 50/50, 90/10) |
| Observed split | Actual unit counts per arm |
| **SRM** | Statistically significant deviation between expected and observed |
| Test | **Chi-square goodness-of-fit** (or binomial for two arms) |
| Threshold | p < **0.001** typically — much stricter than usual α |
| Implication | If SRM detected → **stop, find root cause, do not interpret results** |

> If your randomization is broken, **everything downstream is suspect** — even if effects look strongly significant. SRM is the single most-violated A/B sanity check in industry.

#### Chi-square SRM test

For two arms with expected counts `(E_A, E_B)` (e.g., `(N/2, N/2)`) and observed `(O_A, O_B)`:

```python
from scipy import stats

def srm_check(observed, expected):
    chi2, p = stats.chisquare(f_obs=observed, f_exp=expected)
    return chi2, p, p < 0.001

# Example: 50/50 split, observed 49,000 vs 51,000
chi2, p, srm = srm_check([49_000, 51_000], [50_000, 50_000])
# chi2 ≈ 40, p ≈ 2e-10 → SRM!
```

For multi-arm:

```python
chi2, p = stats.chisquare(f_obs=[12_000, 11_800, 13_200, 12_100],
                          f_exp=[12_275, 12_275, 12_275, 12_275])
```

#### Why p < 0.001 (not 0.05)

Running the SRM check + then doing the actual analysis is **multiple testing**. Stricter threshold ensures the **family-wise** error rate stays low. The trade-off is fewer false alarms in exchange for catching real bugs.

| Bonferroni-like reasoning |
|---|
| If you run 100 experiments per quarter and use SRM α = 0.05, you'll see ~5 false SRM alarms |
| With α = 0.001, you see ~0.1 false alarms — actionable signal |

#### What SRM looks like

| Observed split | Expected | SRM? |
|---|---|---|
| 49,500 / 50,500 (n = 100k) | 50/50 | p ≈ 0.026 — borderline; investigate |
| 49,000 / 51,000 (n = 100k) | 50/50 | p ≈ 2e-10 — **SRM** |
| 9,500 / 10,500 (n = 20k) | 50/50 | p ≈ 0.0014 — **SRM** |
| 99,000 / 101,000 (n = 200k) | 50/50 | p ≈ 1.5e-12 — **SRM** |

> Even 1% deviations are highly significant at large n. **SRM is sensitive — exactly because randomization should be near-perfect.**

#### Common SRM root causes

| Cause | Symptom |
|---|---|
| **Bot / crawler asymmetry** | One arm has more bots (e.g., new variant blocked by some bots) |
| **Cookie-based assignment + cookie blocking** | Treatment users with rejected cookies fall out |
| **Telemetry / logging bug** | One arm's events are dropped before reaching analytics |
| **Differential opt-out / consent** | "Variant B" UI prompts more privacy declines |
| **Pre-experiment selection** | Filter applied after randomization (e.g., "active users only") asymmetrically |
| **Non-stable hash** | Users get re-bucketed mid-experiment |
| **Differential page-load failure** | One variant times out more, never logs |
| **Eligibility check after assignment** | Should be **before** randomization |
| **Cross-experiment interference** | Another experiment's exposure changes who reaches yours |
| **Rate-limiting / sampling differences** | One arm hits a quota that drops events |
| **Geo / language filter** | Asymmetric coverage |

> **The most common SRM cause: "filter then assign" instead of "assign then filter".** Always randomize the **eligible** universe, then track exposure consistently.

#### Investigation checklist when SRM detected

| Step | Question |
|---|---|
| 1 | Verify the assignment hash is correct and stable (same user → same arm always) |
| 2 | Check arm-level event-loss rates; compare to expected |
| 3 | Look at SRM by **dimension**: device, country, browser, OS, app version, signup time |
| 4 | Check if a deploy / config change happened during the experiment |
| 5 | Confirm "exposure" event fires identically in both variants |
| 6 | Check pre-experiment counts (last week with same assignment hash) — were they 50/50? |
| 7 | Inspect bot-traffic share per arm |

> SRM **broken by dimension** (e.g., only on iOS) usually pinpoints the bug.

#### What NOT to do when SRM detected

| Don't | Why |
|---|---|
| Just "renormalize" the means | Doesn't fix selection bias — only hides it |
| Drop excess users from the bigger arm | Still selecting on outcome |
| Reduce sample size and re-test | Missing data is **not at random** |
| Continue and hope it self-corrects | Bias usually accumulates |
| Trust the lift estimate | Random assignment is broken; nothing recovers it |

#### Multiple-arm SRM

For an A/B/C/D test with expected proportions `(p_A, p_B, p_C, p_D)`:

```python
expected = [p * total for p in (p_A, p_B, p_C, p_D)]
chi2, p = stats.chisquare(observed_counts, expected)
```

> **Pairwise SRM** can also matter: even if global χ² is fine, a 50/49 split between two arms might be SRM relative to expected 50/50 within just those arms.

#### SRM-resistant designs

| Approach | How |
|---|---|
| Re-randomize for new users daily, not on request | Smoother assignment |
| Stable hash with experiment_id salt | Same user always gets same arm |
| Apply eligibility **before** assignment | Assign only the universe you'll analyze |
| Symmetric exposure event in both arms | Same event fires regardless of variant |
| Server-side assignment | Less exposure to cookie / client-side issues |
| Long pre-experiment A/A test | Catches platform-level bias |

#### A/A testing

A pure SRM-detection tool: run "experiment" with **no actual change**.

| Result | Implication |
|---|---|
| 50/50 within tolerance, all metrics flat | Platform healthy |
| SRM in A/A | Assignment bug — fix before running real experiments |
| Flat metrics with SRM | Confirms randomization issue, not metric issue |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Using α = 0.05 for SRM | **Use 0.001** — multiple-testing context |
| Running SRM only on primary universe | Also check by device, geography, etc. |
| SRM check after filtering active users | **Check before any filter** |
| Treating SRM as "small effect" | At large n even 0.5% deviations matter |
| Reporting SRM-impacted experiments as ship/no-ship | Don't ship; investigate first |
| Running SRM only at the end | Run **continuously** during the experiment |
| Ignoring SRM "because it's marginal" | If `p < 0.001`, take it seriously regardless of magnitude |

#### Detection by dimension (powerful)

```python
def srm_by_dim(df, dim_col, expected_split=0.5):
    """Returns dim values where SRM is detected."""
    out = []
    for dim_value, group in df.groupby(dim_col):
        n_a = (group["arm"] == "A").sum()
        n_b = (group["arm"] == "B").sum()
        n = n_a + n_b
        if n < 100: continue                          # too small to test
        chi2, p = stats.chisquare([n_a, n_b], [n*expected_split, n*(1-expected_split)])
        if p < 0.001:
            out.append((dim_value, n_a, n_b, p))
    return out
```

> Often: SRM disappears when you remove one device-type / country / browser version. **That's your bug.**

**Rule of thumb:** **SRM is the first sanity check in any A/B analysis.** Test with **chi-square at p < 0.001**. SRM detected → **stop, do not interpret experiment results, find the root cause** (usually "filter then assign" or asymmetric event loss). Even tiny percentage deviations matter at large n. **Pair every A/B test with an SRM check by dimension** — it's the single most-effective way to catch broken randomization.
