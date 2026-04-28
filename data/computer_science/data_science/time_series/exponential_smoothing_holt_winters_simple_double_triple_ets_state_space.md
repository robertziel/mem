### Exponential Smoothing (Holt-Winters: simple / double / triple, ETS state-space)

**When:** robust, fast forecasting on series with trend and / or seasonality — sales, demand, traffic. **Default forecasting baseline** at most companies; almost always competitive with much fancier models.

**Schema (the three levels):**

| Variant | Captures | Components |
|---|---|---|
| **Simple Exp. Smoothing (SES)** | Level only | `α` |
| **Holt's (double)** | Level + trend | `α`, `β` |
| **Holt-Winters (triple)** | Level + trend + seasonality | `α`, `β`, `γ` |
| **ETS** state-space | All of the above + statistical model | Same params + error type |

> "Exponential" because more recent observations get exponentially higher weight: `weight(t−k) ∝ (1−α)ᵏ`.

#### Simple Exponential Smoothing (SES)

```
ℓ_t = α · y_t + (1 − α) · ℓ_{t−1}     (level update)
ŷ_{t+h | t} = ℓ_t                       (forecast = current level)
```

| Parameter | Range | Behavior |
|---|---|---|
| **α** (smoothing) | [0, 1] | High α → reactive; low α → smooth |

> Use when: no trend, no seasonality. Forecast is **flat** at last level estimate.

#### Holt's linear trend

```
ℓ_t = α · y_t + (1 − α)(ℓ_{t−1} + b_{t−1})
b_t = β · (ℓ_t − ℓ_{t−1}) + (1 − β) · b_{t−1}
ŷ_{t+h | t} = ℓ_t + h · b_t
```

| Parameter | Role |
|---|---|
| **β** | Trend smoothing — high β → fast trend updates |
| **Damped trend** (`φ`) | Multiply trend by `φ < 1` per step → trend dies out gracefully |

> Plain Holt's tends to **over-extrapolate** trends. Use **damped trend** (Gardner) almost always.

#### Holt-Winters (additive seasonality)

```
ℓ_t = α(y_t − s_{t−m}) + (1 − α)(ℓ_{t−1} + b_{t−1})
b_t = β(ℓ_t − ℓ_{t−1}) + (1 − β) b_{t−1}
s_t = γ(y_t − ℓ_{t−1} − b_{t−1}) + (1 − γ) s_{t−m}
ŷ_{t+h | t} = ℓ_t + h · b_t + s_{t−m+h_m}
```

> `m` = seasonal period. `s_{t−m+h_m}` = the seasonal index for the same point in the next cycle.

#### Additive vs multiplicative seasonality

| Choose | When |
|---|---|
| **Additive** | Seasonal swings constant in magnitude |
| **Multiplicative** | Seasonal swings grow with level |

Multiplicative form: `ŷ = (ℓ + h·b) × s_{t−m+h_m}`.

#### ETS state-space (the proper model)

ETS = **Error · Trend · Seasonal** triplet. Each component can be:

| Component | Options |
|---|---|
| Error | A (additive), M (multiplicative) |
| Trend | N (none), A, Ad (damped), M, Md |
| Seasonal | N, A, M |

> 30 valid combinations. **`ETS(M, A, M)` is multiplicative error / additive trend / multiplicative seasonal** — common for retail.

```python
from statsmodels.tsa.holtwinters import ExponentialSmoothing, SimpleExpSmoothing
from statsmodels.tsa.api import ETSModel

# SES
ses = SimpleExpSmoothing(series).fit(smoothing_level=0.2)
fc = ses.forecast(14)

# Holt's damped
holt = ExponentialSmoothing(series, trend="add", damped_trend=True).fit()
fc = holt.forecast(14)

# Holt-Winters additive
hw = ExponentialSmoothing(series, trend="add", seasonal="add", seasonal_periods=7).fit()
fc = hw.forecast(14)

# ETS — auto-selects components
ets = ETSModel(series, error="add", trend="add", seasonal="mul",
               damped_trend=True, seasonal_periods=12).fit()
fc = ets.get_prediction(steps=12).predicted_mean
```

#### Choosing parameters

| Param | Default | Tune via |
|---|---|---|
| α (level) | Optimized via MLE | Grid + AIC |
| β (trend) | MLE | Same |
| γ (seasonal) | MLE | Same |
| φ (damping) | 0.98 | Don't over-tune |

> Statsmodels / sktime fit by maximum likelihood automatically.

#### Forecast intervals — built-in

Unlike Holt-Winters historically, **ETS** in state-space form gives **proper prediction intervals** that account for parameter and innovation uncertainty:

```python
res = ets.get_prediction(steps=12)
res.predicted_mean
res.conf_int(alpha=0.05)
```

#### Picking the right exponential model

```
Seasonality?
├─ Yes → Holt-Winters (triple) / ETS with seasonal component
└─ No
   └─ Trend?
      ├─ Yes → Holt's (double) — usually with damping
      └─ No → SES
```

#### Holt-Winters vs ARIMA

| Property | Holt-Winters | ARIMA |
|---|---|---|
| Setup | Pick (additive/multiplicative, seasonal period) | Pick (p, d, q)(P, D, Q)_m |
| Auto-tuning | ETS auto-selects components | `auto_arima` |
| Prediction intervals | ETS state-space gives them | Closed-form |
| Robust to small data | **More robust** | Needs adequate samples |
| Multivariate / exogenous | ETS doesn't natively support | ARIMAX does |
| Speed | Fast | Slightly slower |
| When to pick | Default baseline; clear seasonality | When ACF/PACF suggest specific structure |

> **In practice ETS and ARIMA give very similar forecasts on similar data. Pick by what's natural to interpret.**

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Holt's without damping on long horizons | Trends explode; use damped trend |
| Multiplicative seasonality on series that touches zero | Use additive or log-transform |
| Wrong seasonal period | Plot ACF — peaks at multiples of `m` |
| Forecasting log-transformed series and forgetting to invert | Always exp() back |
| Treating `α` close to 1 as good | Means the model just predicts the last value — likely needs trend / seasonality |
| Using HW on series with multiple seasonalities | Use TBATS / Prophet / state-space with multiple seasonalities |
| Reporting only point forecast | Use ETS state-space for prediction intervals |
| Insufficient seasonal cycles in training data | Need ≥ 2 full cycles to fit seasonal component |

#### Multiple seasonalities (e.g., daily and weekly)

Plain Holt-Winters handles **one** seasonal period. For multiple:

| Method | What |
|---|---|
| **TBATS** | Trigonometric Box-Cox ARMA Trend Seasonal — handles multiple complex seasonalities |
| **Prophet** | Additive components for daily / weekly / yearly |
| **MSTL** + ETS | Multi-seasonal STL decomposition, then ETS on residual |
| **State-space with multiple seasonal terms** | More flexible, more complex |

#### Initialization

ETS / Holt-Winters fits depend on how the level / trend / seasonal indices are initialized:

| Method | What |
|---|---|
| **Heuristic** (statsmodels default) | Average of first cycle for level, etc. |
| **MLE jointly with parameters** | Treat init values as optimization variables |
| **Concentrated likelihood** | Profile out init values analytically |

> Differences usually negligible for long series, can matter for short ones.

#### Damped trend — why it matters

Imagine forecasting 60 days ahead with Holt's linear trend at +2% / day. Without damping, that's `1.02⁶⁰ = 3.28×` — usually nonsense. Damping with `φ = 0.95`:

```
b_t = β(ℓ_t − ℓ_{t−1}) + (1 − β) · φ · b_{t−1}
ŷ_{t+h} = ℓ_t + (φ + φ² + … + φ^h) · b_t
```

> The geometric series saturates at `φ / (1 − φ)`; trend dies out gracefully. **Damped trend is the safer default for any horizon > 5 steps**.

#### Anti-pattern: predicting too far

| Horizon | Reliability of any exp-smoothing model |
|---|---|
| 1–5 steps | Excellent |
| 1 cycle ahead | Good |
| 2 cycles | OK with damping |
| 3+ cycles | Don't forecast that far without strong domain knowledge |

#### Code: full pipeline

```python
import pandas as pd
from statsmodels.tsa.api import ETSModel

# Daily series with weekly seasonality
ets = ETSModel(
    train,
    error="add",
    trend="add",
    seasonal="mul",
    damped_trend=True,
    seasonal_periods=7,
).fit(disp=False)

# Forecast with intervals
pred = ets.get_prediction(steps=14)
mean = pred.predicted_mean
ci_lower = pred.summary_frame(alpha=0.05)["pi_lower"]
ci_upper = pred.summary_frame(alpha=0.05)["pi_upper"]
```

**Rule of thumb:** **Exponential smoothing = robust, fast forecasting baseline**. Use **SES** for level-only, **Holt's damped** for trend, **Holt-Winters / ETS** for trend + seasonality. Always **damp the trend** for horizons > 5 steps. **ETS state-space** gives proper prediction intervals; use it instead of legacy Holt-Winters where possible. For multiple seasonalities, use **TBATS** or **Prophet**.
