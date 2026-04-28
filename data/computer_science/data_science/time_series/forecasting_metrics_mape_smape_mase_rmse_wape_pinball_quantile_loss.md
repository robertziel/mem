### Forecasting Metrics (MAPE, sMAPE, MASE, RMSE, WAPE, pinball, quantile loss)

**When:** evaluating forecasts and comparing models — choosing the right metric is more impactful than choosing the right model. Each metric optimizes for a different decision: MAPE penalizes relative error, RMSE penalizes squared error, MASE compares against naive baseline.

**Schema:**

| Metric | Formula | Range | Optimal under |
|---|---|---|---|
| **MAE** | `mean(|y − ŷ|)` | [0, ∞) | Median forecast (L1) |
| **RMSE** | `√(mean((y − ŷ)²))` | [0, ∞) | Mean forecast (L2) |
| **MAPE** | `mean(|y − ŷ| / |y|) × 100%` | [0, ∞) | Median multiplicative |
| **sMAPE** | `mean(2|y − ŷ| / (|y| + |ŷ|)) × 100%` | [0, 200%] | Symmetric percentage |
| **WAPE** (weighted MAPE) | `Σ|y − ŷ| / Σ|y|` | [0, ∞) | When y has many zeros |
| **MASE** | `MAE / MAE(naive forecast)` | [0, ∞), 1 = naive | Cross-series comparison |
| **R²** | `1 − SS_res/SS_tot` | (−∞, 1] | Linear regression |
| **Pinball loss** (quantile q) | `Σ max(q(y−ŷ), (q−1)(y−ŷ))` | [0, ∞) | Quantile forecast |
| **CRPS** | Continuous ranked probability score | [0, ∞) | Probabilistic forecast |

> **No metric is universally correct.** Pick by **business cost** of over- vs under-forecasting and by data characteristics.

#### Quick formulas (Python)

```python
import numpy as np

def mae(y, yhat):  return np.mean(np.abs(y - yhat))
def rmse(y, yhat): return np.sqrt(np.mean((y - yhat)**2))
def mape(y, yhat): return np.mean(np.abs((y - yhat) / y)) * 100
def smape(y, yhat):
    return np.mean(2 * np.abs(y - yhat) / (np.abs(y) + np.abs(yhat))) * 100
def wape(y, yhat): return np.sum(np.abs(y - yhat)) / np.sum(np.abs(y))
def mase(y, yhat, y_train, m=1):
    naive_mae = np.mean(np.abs(y_train[m:] - y_train[:-m]))
    return mae(y, yhat) / naive_mae
def pinball(y, yhat, q):
    return np.mean(np.maximum(q*(y - yhat), (q - 1)*(y - yhat)))
```

#### MAE vs RMSE — the core trade-off

| Property | MAE | RMSE |
|---|---|---|
| Penalty for large errors | Linear | **Quadratic** (squared) |
| Optimal forecast | Median | Mean |
| Outlier sensitivity | Robust | **Sensitive** |
| Same units as target | ✓ | ✓ |
| When to use | Robust target, asymmetric errors | Care about big misses |

> RMSE > MAE always (unless errors are constant). The **gap = MAE × (RMSE/MAE − 1)** indicates outlier severity.

#### MAPE — convenient but flawed

**Problems with MAPE:**

| Issue | Why |
|---|---|
| **Undefined / huge when y near 0** | `1 / 0.001` = blowup |
| **Asymmetric** | Over-forecasting is penalized **less** (caps at 100%); under-forecasting **uncapped** |
| **Biased toward low forecasts** | Optimal forecast under MAPE is **below** the median |
| **Across series with different scales** | Smaller-scale series dominate average |

> **Don't use MAPE on series with zeros or near-zeros.** Use sMAPE or WAPE instead.

#### sMAPE (symmetric MAPE)

`sMAPE = mean(2|y − ŷ| / (|y| + |ŷ|))`

| Property | Detail |
|---|---|
| Range | [0%, 200%] (some definitions [0%, 100%]) |
| Symmetric | Penalizes over- and under-forecasting equally (mostly) |
| Defined when y or ŷ is zero | Yes, unless both are zero |
| Used in M3 / M4 forecasting competitions | Yes |
| Limitation | Not truly symmetric in some edge cases |

#### MASE — the "safest" cross-series metric

`MASE = MAE / MAE(naive_forecast)`

| Property | Detail |
|---|---|
| Naive forecast | `ŷ_t = y_{t−m}` (last value, or last seasonal value) |
| Interpretation | MASE > 1 = worse than naive; MASE < 1 = better |
| Scale-invariant | ✓ Comparable across series |
| Defined for zeros | ✓ |
| Standard in forecasting research | ✓ (M4 competition) |

> **MASE is the recommended metric for comparing forecasts across series of different scales.**

#### WAPE — for sparse / zero-heavy series

`WAPE = Σ|y − ŷ| / Σ|y|` (one ratio over all observations, not average of ratios)

> Equivalent to "MAE divided by mean(|y|)". Doesn't blow up on zeros if any non-zero values exist. **Default for retail demand forecasting** with intermittent products.

#### Pinball loss / quantile loss — for prediction intervals

For quantile `q ∈ (0, 1)`:

`Pinball(y, ŷ_q) = max((y − ŷ_q) · q, (ŷ_q − y) · (1 − q))`

| q | What it gives |
|---|---|
| 0.5 | Median (= MAE / 2) |
| 0.1 | Lower bound (penalizes over-prediction more) |
| 0.9 | Upper bound (penalizes under-prediction more) |

> To evaluate a prediction interval `[ŷ_{0.05}, ŷ_{0.95}]`: average pinball at 0.05 and 0.95.

#### CRPS (continuous ranked probability score)

For probabilistic forecasts (a CDF `F`):

`CRPS(F, y) = ∫ (F(z) − 𝟙[y ≤ z])² dz`

> Integrates over all quantiles. **Strictly proper scoring rule** — minimized in expectation by the true distribution. Standard for probabilistic / Bayesian forecast evaluation.

#### Picker

| Goal | Use |
|---|---|
| Single series, no zeros, care about outliers | RMSE |
| Single series, no zeros, robust | MAE |
| Single series, percentage error matters | MAPE (if no zeros) or sMAPE |
| Sparse / zero-heavy demand | WAPE |
| Compare across series | **MASE** |
| Probabilistic forecast | Pinball / CRPS |
| Confidence interval coverage | Empirical interval coverage % |
| Direction (up / down) | Direction accuracy / Theil's U |

#### Forecast bias (over- vs under-)

`Bias = mean(ŷ − y)` — positive = over-forecast on average.

| Tool | Use |
|---|---|
| Mean error / mean bias | First-look bias check |
| Tracking signal | `cumulative_error / MAD` over rolling window |
| Asymmetric loss | When over- and under-forecast cost differently |

#### Asymmetric loss

When over-forecasting and under-forecasting have **different business costs**:

| Industry | Cost asymmetry |
|---|---|
| Retail (under-forecast → stockout) | Under-forecast more costly |
| Cloud capacity | Under-forecast → outage; over → wasted $$ |
| Inventory | Over-forecast → carrying cost; under → lost sales |
| Energy | Both sides costly; symmetric usually |

Use **quantile loss** to forecast directly at, e.g., the 90th percentile if stockouts are 5× worse than excess inventory.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| MAPE on series with zeros | Use sMAPE or WAPE |
| Comparing RMSE across series with different scales | Use MASE |
| Reporting only RMSE | Pair with MAE; their ratio reveals outlier impact |
| Treating R² as universally meaningful | Misleading for time series; can be negative |
| In-sample R² as evidence of forecast quality | Use **out-of-sample** metrics |
| Ignoring forecast bias | Mean error tells you over- vs under-forecasting |
| Single-point evaluation, no horizon profile | Plot metric vs horizon `h` |
| Symmetric metric when costs are asymmetric | Switch to quantile / asymmetric loss |
| Using RMSE for an outlier-prone series | Outliers dominate; use MAE or robust loss |

#### Horizon profile

Forecast accuracy degrades with horizon. Plot **MAE / RMSE / MAPE vs `h`** to see how fast:

| Horizon | Typical behavior |
|---|---|
| 1-step | Best |
| Short (≤ 1 cycle) | Acceptable |
| Long (≫ 1 cycle) | Mean-revert to climatology |

> Reporting "MAPE = 8%" without horizon is incomplete.

#### Naive baselines (always compare against)

| Baseline | Forecast |
|---|---|
| **Naive** | `ŷ_t = y_{t−1}` |
| **Seasonal naive** | `ŷ_t = y_{t−m}` |
| **Drift** | `ŷ_t = y_n + h·(y_n − y_1)/(n−1)` |
| **Mean** | `ŷ_t = ȳ` |
| **Climatology** | Long-run mean for that calendar position |

> If your fancy model can't beat **seasonal naive**, you have a problem.

#### Connection to losses for training

| Training loss | Implied metric |
|---|---|
| MSE | RMSE |
| L1 / MAE loss | MAE |
| Quantile loss | Pinball at that quantile |
| Tweedie | RMSE adjusted for compound distributions (insurance, demand) |
| Huber | MAE + RMSE hybrid (robust) |

> **Train on the loss whose evaluation metric you'll be judged on.** If your metric is MAE, train with MAE loss — not MSE.

**Rule of thumb:** **MAE / RMSE** for single-series, scale-aware. **MASE** for cross-series comparison. **WAPE** for zero-heavy demand. **Pinball / CRPS** for probabilistic forecasts. **Always compare against seasonal naive baseline**. **Plot metric vs horizon**, not just an average. **Train on the loss matching your evaluation metric**.
