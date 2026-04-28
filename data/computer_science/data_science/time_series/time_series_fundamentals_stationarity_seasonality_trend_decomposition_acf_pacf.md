### Time Series Fundamentals (stationarity, seasonality, trend, decomposition, ACF/PACF)

**When:** any data indexed by time — sales / traffic / metrics / sensor readings / financial. The first thing to do **before** picking a model is decompose, check stationarity, and inspect autocorrelation. Skipping these → fitting noise.

**Schema (the four components):**

| Component | What | Symbol |
|---|---|---|
| **Trend** (`T_t`) | Long-run upward / downward direction | Slow movement |
| **Seasonality** (`S_t`) | Regular pattern with fixed period (daily, weekly, yearly) | Period `m` |
| **Cyclic** (`C_t`) | Non-periodic ups/downs (business cycles) | Variable period |
| **Residual / noise** (`ε_t`) | What's left over after extracting structure | Should be ~white noise |

> Standard decomposition: **`y_t = T_t + S_t + ε_t`** (additive) or **`y_t = T_t · S_t · ε_t`** (multiplicative).

#### Additive vs multiplicative decomposition

| Choose additive when | Choose multiplicative when |
|---|---|
| Seasonal swings are **constant** in magnitude | Seasonal swings **grow with the level** |
| Variance roughly constant | Variance grows with mean |
| Bounded data | Strictly positive data |
| Linear trend | Exponential trend |

> If unsure: take **log**, then use additive decomposition. Log-transform converts multiplicative to additive.

#### Decomposition methods

| Method | When |
|---|---|
| **Classical** (moving average + seasonal indices) | Quick baseline; assumes constant seasonality |
| **STL** (Seasonal-Trend decomposition with LOESS) | Robust, handles changing seasonality |
| **X-13ARIMA-SEATS** | Government statistical agencies |
| **Hodrick-Prescott filter** | Macroeconomics — separates trend from cycle |
| **Wavelet decomposition** | Multi-scale signals |

```python
from statsmodels.tsa.seasonal import STL, seasonal_decompose

# Classical
res = seasonal_decompose(series, model="additive", period=7)

# STL — preferred
stl = STL(series, period=7, robust=True).fit()
trend, seasonal, resid = stl.trend, stl.seasonal, stl.resid
```

#### Stationarity (the central concept)

A series is **stationary** if its statistical properties don't change over time:

| Type | Definition |
|---|---|
| **Strict stationarity** | Joint distribution invariant under shift |
| **Weak (covariance) stationarity** | Constant mean, constant variance, autocovariance depends only on lag |
| Most algorithms assume | **Weak stationarity** |

**Why it matters:** classical models (ARIMA, AR) require stationarity. Trends and seasonality break it.

#### Tests for stationarity

| Test | Null hypothesis | Reject → |
|---|---|---|
| **ADF** (Augmented Dickey-Fuller) | Unit root (non-stationary) | Stationary |
| **KPSS** | Stationary around trend | Non-stationary |
| **Phillips-Perron** | Unit root | Stationary |
| **Variance ratio** | Random walk | Mean-reverting |

```python
from statsmodels.tsa.stattools import adfuller, kpss

adf_stat, p, *_ = adfuller(series, autolag="AIC")
# p < 0.05 → reject unit root → stationary

kpss_stat, p, *_ = kpss(series, regression="c")
# p < 0.05 → reject stationarity → non-stationary
```

> **Use both ADF and KPSS for robustness** — they have opposite null hypotheses; agreement is reassuring.

#### Making series stationary

| Problem | Fix |
|---|---|
| Trend | **Differencing**: `Δy_t = y_t − y_{t−1}` (or higher order) |
| Seasonality | **Seasonal differencing**: `Δ_m y_t = y_t − y_{t−m}` |
| Variance growing with level | **Log transform** (or Box-Cox) |
| Outliers | Winsorize / replace |
| Trend + seasonality | Combine: `Δ Δ_m y_t` |
| Heteroscedasticity | Box-Cox / Yeo-Johnson |

> **Order of differencing** = `d` in ARIMA(p, d, q). Usually `d = 1` is enough; rarely > 2.

#### Autocorrelation function (ACF) and Partial ACF (PACF)

| Function | Tells you |
|---|---|
| **ACF(`k`)** | Correlation of `y_t` with `y_{t−k}` (including indirect through `y_{t−1}, …, y_{t−k+1}`) |
| **PACF(`k`)** | Correlation of `y_t` with `y_{t−k}` controlling for `y_{t−1}, …, y_{t−k+1}` |

**Reading the plots:**

| Pattern | Likely model |
|---|---|
| ACF tails off, PACF cuts off after `p` | **AR(p)** |
| ACF cuts off after `q`, PACF tails off | **MA(q)** |
| Both tail off | **ARMA(p, q)** |
| ACF very slow decay (linear) | Non-stationary — **difference first** |
| Spike at lag `m` (and multiples) | Seasonality with period `m` |

```python
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf
plot_acf(series, lags=40); plot_pacf(series, lags=40)
```

> **Confidence band** at `±1.96/√n`: spikes outside are statistically significant.

#### White noise

Pure white noise: `ε_t ~ iid(0, σ²)`. ACF spikes only at lag 0; all other lags within confidence band.

| Test | What |
|---|---|
| **Ljung-Box** | Joint test of "no autocorrelation up to lag K" |
| **Box-Pierce** | Older variant of Ljung-Box |
| **Durbin-Watson** | Specifically lag-1 autocorrelation in regression residuals |

> After fitting a model, residuals should be **~white noise**. Run Ljung-Box on residuals as a goodness-of-fit check.

#### Common patterns

| Series | Behavior |
|---|---|
| **Random walk** `y_t = y_{t−1} + ε_t` | ACF decays slowly; needs differencing |
| **AR(1)** `y_t = φ y_{t−1} + ε_t` | ACF decays geometrically; PACF cuts at 1 |
| **MA(1)** `y_t = ε_t + θ ε_{t−1}` | ACF cuts at 1; PACF decays |
| **Seasonal random walk** `y_t = y_{t−m} + ε_t` | ACF spikes at multiples of `m` |
| **Trend + seasonality + AR** | Both tail off + spikes at seasonal lags |

#### EDA workflow for time series

| Step | Action |
|---|---|
| 1 | **Plot** the raw series — scan for trend, seasonality, regime changes |
| 2 | **Decompose** (STL) — visually separate components |
| 3 | **Test stationarity** (ADF + KPSS) — decide on differencing |
| 4 | **Plot ACF / PACF** of (differenced) series — read off model order |
| 5 | **Pick a model** (ARIMA / ETS / Prophet / ML) |
| 6 | **Fit, forecast, validate** with rolling CV |
| 7 | **Check residuals** (Ljung-Box, QQ plot, plot vs time) |

#### Outlier / anomaly handling

| Type | Approach |
|---|---|
| **Additive outlier** | Single point off — winsorize or set to interpolation |
| **Level shift** | Permanent change — model with intervention term |
| **Seasonal outlier** | One observation off in a seasonal pattern — interpolate |
| **Innovation outlier** | Outlier propagates through model — robust ARIMA |

#### Resampling and aggregation

| Need | Action |
|---|---|
| Daily → weekly | `df.resample("W").sum()` (or .mean()) |
| Hourly → daily | `df.resample("D").mean()` |
| Irregular → regular | `df.resample("D").mean().interpolate()` |
| Roll-up window | `df.rolling(7).mean()` |

> Pick aggregation by metric semantics: **sum** for counts, **mean** for rates, **last** for snapshots.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Fitting ARIMA on non-stationary series | Difference first (`d > 0`) |
| Assuming stationarity without testing | Run ADF + KPSS |
| Standard CV (random folds) on time series | **Leakage** — use rolling / expanding window |
| Reading ACF without confidence bands | Spikes within band aren't significant |
| Treating residual non-randomness as fine | Failed Ljung-Box → model is missing structure |
| Only looking at point forecast | Always include prediction intervals |
| Aggregating before checking stationarity | Aggregation can mask non-stationarity |
| Not handling missing timestamps | Use `resample` to enforce regular spacing |

#### Train / test split for time series

| Strategy | Use |
|---|---|
| **Hold-out tail** | Train on first 80%, test on last 20% — simplest |
| **Walk-forward / expanding window** | Fit on `[0, t]`, evaluate on `[t, t+h]`, slide forward |
| **Rolling window** (fixed-size) | Fit on `[t−w, t]`, evaluate on `[t, t+h]` |
| **Block CV** | Multiple non-overlapping test blocks |

> NEVER shuffle or use random k-fold on time series — leaks future into past.

#### Stationarity decision tree

```
Plot the series → trend visible?
├─ Yes → difference (d=1)
│         → check stationarity again
│           ├─ Yes → done with d
│           └─ No → difference again (d=2)
└─ No
   └─ Seasonality visible (spike at lag m)?
      ├─ Yes → seasonal difference (D=1, period m)
      └─ No → check ADF/KPSS, may already be stationary
```

**Rule of thumb:** **always plot, decompose, and test stationarity first**. **STL** for decomposition, **ADF + KPSS** for stationarity, **ACF / PACF** for model order, **Ljung-Box** on residuals. Convert non-stationary to stationary via **differencing** (trend) and **seasonal differencing** (seasonality); use **log-transform** for variance growing with level. **Use walk-forward CV** — never shuffle.
