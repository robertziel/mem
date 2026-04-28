### ARIMA / SARIMA (p, d, q, seasonal, Box-Jenkins, ARIMAX exogenous)

**When:** classical statistical forecasting on a stationary or stationary-after-differencing series — sales / demand / call volume / metric forecasting where you want **interpretable** linear time-series structure. The default before reaching for ML.

**Schema:**

| Parameter | Meaning |
|---|---|
| `p` | **AR order**: # of autoregressive lags |
| `d` | **Differencing**: # of differences to make stationary |
| `q` | **MA order**: # of moving-average (residual) lags |
| `P, D, Q` | Seasonal counterparts |
| `m` | Seasonal period (7 = weekly, 12 = monthly, 24 = hourly daily) |
| `ARIMA(p, d, q)` | Non-seasonal model |
| `SARIMA(p, d, q)(P, D, Q)_m` | Adds seasonal terms |
| `ARIMAX` | ARIMA with **exogenous regressors** (covariates) |

> ARIMA = AR + I (integrated / differenced) + MA. The Box-Jenkins methodology is **identify (ACF/PACF), estimate (MLE), diagnose (residuals), forecast**.

#### Model components

| Term | Equation |
|---|---|
| **AR(p)** | `y_t = φ₁ y_{t−1} + … + φ_p y_{t−p} + ε_t` |
| **MA(q)** | `y_t = ε_t + θ₁ ε_{t−1} + … + θ_q ε_{t−q}` |
| **ARMA(p, q)** | Sum of AR + MA terms |
| **ARIMA(p, d, q)** | ARMA on `d`-th differenced series |
| **SARIMA** | + seasonal `(P, D, Q)_m` |

#### Box-Jenkins methodology

| Step | Action |
|---|---|
| 1. **Identify** | Plot series → decompose → check stationarity (ADF, KPSS) → difference if needed → ACF/PACF to read off (p, q) |
| 2. **Estimate** | Fit by MLE; pick `p, q` by AIC / BIC |
| 3. **Diagnose** | Ljung-Box on residuals (should be white noise); QQ plot; ACF of residuals |
| 4. **Forecast** | Generate point forecasts + prediction intervals |
| 5. **Validate** | Out-of-sample CV (rolling / walk-forward) |

#### Reading ACF / PACF for orders (cheat sheet)

| ACF | PACF | Likely model |
|---|---|---|
| Cuts off after lag `q` | Tails off | **MA(q)** |
| Tails off | Cuts off after lag `p` | **AR(p)** |
| Both tail off | Both tail off | **ARMA(p, q)** — start small (p=1, q=1) |
| Slow linear decay | Slow decay | **Non-stationary** — difference first |
| Spike at lag `m` (multiples) | Same | **Seasonal** — seasonal difference |

#### Code

```python
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX

# ARIMA(2, 1, 2)
model = ARIMA(series, order=(2, 1, 2)).fit()
forecast = model.forecast(steps=14)

# SARIMA(1, 1, 1)(1, 1, 1, 7) — daily data with weekly seasonality
model = SARIMAX(series, order=(1, 1, 1), seasonal_order=(1, 1, 1, 7)).fit()
fc = model.get_forecast(steps=14)
mean = fc.predicted_mean
ci = fc.conf_int()

# Auto-selection via AIC (pmdarima)
import pmdarima as pm
auto = pm.auto_arima(series, seasonal=True, m=7, stepwise=True, suppress_warnings=True)
```

> `pmdarima.auto_arima` is the practical workhorse — it searches `(p, d, q)(P, D, Q)` by AIC.

#### Selecting orders — heuristics

| Method | When |
|---|---|
| **AIC / BIC minimization** | Default; lower = better, BIC penalizes more |
| **Visual ACF / PACF** | Pre-modern but instructive |
| **Auto-ARIMA** (`pmdarima`) | Production default |
| **Cross-validation MAPE** | Most predictive; slowest |

> AIC tends to over-fit (more parameters), BIC under-fit. **Use both** and pick the simpler model among similar scores.

#### Common configurations

| Series | Typical model |
|---|---|
| Daily sales with weekly seasonality | SARIMA(1, 1, 1)(1, 1, 1)_7 |
| Monthly demand with yearly seasonality | SARIMA(1, 1, 1)(1, 1, 1)_12 |
| Hourly with daily seasonality | SARIMA(p, d, q)(P, D, Q)_24 |
| Random walk | ARIMA(0, 1, 0) |
| White noise around trend | ARIMA(0, 0, 0) on detrended |

#### ARIMAX (exogenous variables)

```python
model = SARIMAX(y, exog=X, order=(1, 1, 1), seasonal_order=(1, 1, 1, 7)).fit()
forecast = model.get_forecast(steps=14, exog=X_future)
```

> **Exogenous regressors** (X): holidays, marketing spend, weather, price changes — they get **coefficients** alongside the AR / MA terms. Required to forecast their future values to forecast `y`.

#### When ARIMA is the right choice

| Situation | ARIMA fit |
|---|---|
| Univariate, stationary-after-differencing | ✓ |
| Strong autocorrelation pattern | ✓ |
| Linear dynamics | ✓ |
| Need interpretable coefficients | ✓ |
| Need uncertainty intervals | ✓ |
| Many features / external drivers | ✗ — use ARIMAX or ML |
| Very long horizon | Errors compound; consider ML |
| Multiple related series with shared structure | Use VAR / hierarchical / global ML |
| Strong non-linear dynamics | Use ML / state-space / RNN |
| Highly irregular spacing | Use Gaussian process / state space |

#### ARIMA vs alternatives

| Method | Strength | Weakness |
|---|---|---|
| **ARIMA / SARIMA** | Interpretable, classical | Linear, univariate, sensitive to outliers |
| **Exponential smoothing (ETS)** | Robust, easy | Less flexible than ARIMA on autocorrelation |
| **Prophet** | Handles holidays, missing data, easy | Less rigorous; over-relied-on |
| **State-space / Kalman** | Handles irregular spacing, online updates | Complex setup |
| **VAR / VARMAX** | Multivariate | Many parameters, overfit-prone |
| **ML (XGBoost, LightGBM)** | Many features, large data | Needs feature engineering, no native uncertainty |
| **DeepAR / N-BEATS / TFT** | Deep learning, many series | Hungry for data and tuning |
| **Hierarchical / global** | Pool across series | Complex |

#### Diagnostics

| Diagnostic | What it checks |
|---|---|
| Ljung-Box on residuals (lag 10–20) | Residual autocorrelation (should be absent) |
| ACF of residuals | Same — visual check |
| QQ plot of residuals | Normality |
| Plot residuals vs time | Heteroscedasticity |
| AIC / BIC vs nearby models | Comparable simpler models |

> If Ljung-Box rejects on residuals → the model **missed structure**. Increase order or add seasonal terms.

#### Forecast intervals

ARIMA gives **closed-form prediction intervals** that **widen with horizon** — naturally incorporates parameter uncertainty + innovation variance. Use them; never report point forecast alone.

| Horizon | Behavior |
|---|---|
| 1-step | Narrowest; based on innovation σ |
| h-step | Widens with √h (and faster if non-stationary) |
| Long horizon | May saturate at unconditional variance |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Fitting ARIMA on non-stationary series | Always difference (or use `d > 0`) |
| Over-differencing | Excessive variance; check ACF after each difference |
| Ignoring seasonality | If `m` is obvious (7, 12, 24), use SARIMA |
| `auto_arima` without sanity check | Always look at residual diagnostics |
| Long horizon with naive ARIMA | Errors compound — switch to state-space or ML |
| Mean-reverting forecasts in non-stationary series | Confirm stationarity before fitting |
| Treating exogenous future as known | You must forecast `X` too |
| Refitting on every new observation | Use **online state-space update** if speed matters |

#### Step-by-step for a daily metric

```python
import pandas as pd, statsmodels.api as sm
import pmdarima as pm

# 1. Plot + decompose
sm.tsa.seasonal_decompose(series, period=7).plot()

# 2. Stationarity
print(sm.tsa.adfuller(series))
print(sm.tsa.kpss(series))

# 3. Auto-fit
model = pm.auto_arima(series, seasonal=True, m=7, stepwise=True)
print(model.summary())

# 4. Validate
from sklearn.metrics import mean_absolute_percentage_error
preds = model.predict(n_periods=14)
print(mean_absolute_percentage_error(test, preds))

# 5. Diagnose residuals
resid = model.resid()
sm.stats.acorr_ljungbox(resid, lags=[7, 14, 21])
```

#### When to leave ARIMA

| Signal | Move to |
|---|---|
| Many predictors / external features | XGBoost / LightGBM with lag features |
| Many related series (1000s SKUs) | Global model: DeepAR, LightGBM with series-id |
| Holidays, special days | Prophet (or ARIMAX with holiday dummies) |
| Long horizon, complex patterns | N-BEATS, TFT, NeuralProphet |
| Need online updates | Kalman filter / state-space |

**Rule of thumb:** **ARIMA = classical interpretable forecasting**. Use **`pmdarima.auto_arima`** to search `(p, d, q)(P, D, Q)_m`. Always **plot, decompose, test stationarity, then fit**. **Difference for trend, seasonal-difference for seasonality**. After fitting, **check residuals via Ljung-Box** — if it fails, the model missed structure. For richer feature use, **Prophet / XGBoost / state space** are better; ARIMA stays the default for univariate baseline.
