### Prophet (Facebook forecasting — holidays, changepoints, growth, additive components)

**When:** business time-series forecasting (sales, demand, traffic, KPIs) where you want **fast, robust, easy-to-tune** results without deep time-series expertise. Prophet's defaults are sensible; failure modes are well-documented; it handles **holidays, missing data, and outliers** out of the box. Used heavily at Meta, Uber, Lyft, Snap.

**Schema (additive decomposition):**

`y(t) = g(t) + s(t) + h(t) + ε(t)`

| Component | What | Notes |
|---|---|---|
| **Trend `g(t)`** | Long-term growth | Linear (default) or **logistic** (with carrying capacity) |
| **Seasonality `s(t)`** | Periodic patterns | Yearly, weekly, daily, custom — Fourier series |
| **Holidays `h(t)`** | Calendar events | User-supplied with windows |
| **Error `ε(t)`** | Residual noise | Assumed Normal |

> "Forecasting at scale" paper (Taylor & Letham 2017). Successor library: **NeuralProphet** (extends with auto-regression, neural lags).

#### Quick start

```python
import pandas as pd
from prophet import Prophet

# Input: DataFrame with columns 'ds' (datestamp) and 'y' (value)
m = Prophet()
m.fit(df)

# Forecast 90 days ahead
future = m.make_future_dataframe(periods=90)
forecast = m.predict(future)

# Plot
m.plot(forecast)
m.plot_components(forecast)        # decomposed trend + seasonalities
```

#### Trend types

| Type | When | Code |
|---|---|---|
| **Linear** (default) | Linear long-term growth | `Prophet()` |
| **Logistic** | Bounded above (saturating) | `Prophet(growth="logistic")` + `df["cap"] = max_value` |
| **Flat** | No growth | `Prophet(growth="flat")` |

For logistic growth (e.g., user adoption with TAM = 10M):

```python
df["cap"] = 10_000_000          # carrying capacity
df["floor"] = 0                  # optional lower bound
m = Prophet(growth="logistic")
m.fit(df)
future["cap"] = 10_000_000
future["floor"] = 0
forecast = m.predict(future)
```

#### Changepoints (regime shifts in the trend)

Prophet automatically detects changepoints — places where the trend's slope changes.

| Parameter | Default | Effect |
|---|---|---|
| `n_changepoints` | 25 | Maximum candidate changepoints in first 80% of history |
| `changepoint_range` | 0.8 | Don't detect in last 20% (avoid spurious end-of-series changes) |
| `changepoint_prior_scale` | **0.05** | Higher = more flexible trend; lower = stiffer |

```python
m = Prophet(changepoint_prior_scale=0.5)   # very flexible
m = Prophet(changepoint_prior_scale=0.01)  # very smooth
```

> **Tune `changepoint_prior_scale` first** when forecasts look wrong — it's the most impactful hyperparameter.

#### Seasonality

| Type | Default | Period |
|---|---|---|
| **Yearly** | Auto-on if span ≥ 2 yrs | 365.25 days |
| **Weekly** | Auto-on if span ≥ 2 wks | 7 days |
| **Daily** | Auto-on if sub-daily data | 1 day |
| **Custom** | None | User-specified |

Each is modeled as a **Fourier series** of order `K` (more terms = more wiggly):

```python
m = Prophet(yearly_seasonality=20, weekly_seasonality=3, daily_seasonality=False)
m.add_seasonality(name="monthly", period=30.5, fourier_order=5)
```

#### Multiplicative seasonality

If seasonal swings **grow with the level** (typical for retail revenue), switch to multiplicative:

```python
m = Prophet(seasonality_mode="multiplicative")
```

> Equivalent to additive on log-transformed data, but more readable.

#### Holidays

```python
holidays = pd.DataFrame({
    "holiday": "black_friday",
    "ds": pd.to_datetime(["2023-11-24", "2024-11-29", "2025-11-28"]),
    "lower_window": -1,           # 1 day before
    "upper_window": 1,            # 1 day after
})
m = Prophet(holidays=holidays)
m.add_country_holidays(country_name="US")    # adds US federal holidays
m.fit(df)
```

> Pass holidays as a DataFrame with `holiday`, `ds`, optional `lower_window` and `upper_window` (number of days before/after to also flag). Useful for **multi-day events** like Christmas week.

#### Regressors (exogenous covariates)

```python
m = Prophet()
m.add_regressor("ad_spend")
m.add_regressor("temperature", standardize=False)
m.fit(df)         # df must include the regressor columns

future["ad_spend"]   = forecast_ad_spend
future["temperature"] = weather_forecast
forecast = m.predict(future)
```

> You must **forecast the regressors** to forecast `y`. Common pitfall: assuming you have future regressor values when you don't.

#### Uncertainty intervals

Prophet provides intervals via:

| Component | Mechanism |
|---|---|
| Trend uncertainty | MCMC (or MAP) over changepoints |
| Seasonality uncertainty | Disabled by default for speed |
| Observation noise | Gaussian likelihood |

```python
m = Prophet(interval_width=0.95, mcmc_samples=300)   # MCMC for full uncertainty
```

#### Hyperparameter tuning

| Parameter | Default | Tune over |
|---|---|---|
| `changepoint_prior_scale` | 0.05 | [0.001, 0.5] log-scale |
| `seasonality_prior_scale` | 10.0 | [0.01, 10] log-scale |
| `holidays_prior_scale` | 10.0 | [0.01, 10] log-scale |
| `seasonality_mode` | "additive" | ["additive", "multiplicative"] |

```python
from prophet.diagnostics import cross_validation, performance_metrics

cv = cross_validation(m, initial="730 days", period="90 days", horizon="90 days")
metrics = performance_metrics(cv)
print(metrics.head())
```

> `cross_validation` runs **expanding-window** evaluation. Pair with grid / random search.

#### When Prophet shines

| Situation | Why |
|---|---|
| Strong seasonal patterns | Fourier seasonality handles multiple periods |
| Holidays / promo days | Native support |
| Missing data / irregular timestamps | Robust to gaps |
| Outliers | Robust trend estimation |
| Quick baseline | Sensible defaults; minimal tuning |
| Daily / hourly business KPIs | Natural fit |
| Non-statisticians on the team | Easy to explain |

#### When Prophet underperforms

| Situation | Better choice |
|---|---|
| Strong autocorrelation in residuals | ARIMA / SARIMA, or NeuralProphet |
| Many related series (1000s SKUs) | Global ML model (LightGBM, DeepAR) |
| Need many features | XGBoost / LightGBM with lags |
| Sub-hourly volatility | State-space / Kalman / RNN |
| Bounded outcomes (proportions) | Beta regression / dedicated bounded models |
| Strict probabilistic guarantees | DeepAR / GluonTS |

#### Prophet vs alternatives

| Method | Best for | Caveat |
|---|---|---|
| **Prophet** | Business KPIs, holidays, daily/weekly | No autocorrelation modeling |
| **ARIMA / SARIMA** | Stationary or differenceable | Manual `(p, d, q)` |
| **ETS / Holt-Winters** | Robust baseline, simple seasonality | Single seasonal period |
| **TBATS** | Multiple seasonalities | Slower, harder to interpret |
| **NeuralProphet** | Prophet + autocorrelation + lags | Newer, requires more data |
| **DeepAR** | Many related series, deep learning | Hungry for data |
| **N-BEATS / TFT** | Long horizons, heavy feature use | Heavy tuning |
| **LightGBM / XGBoost with lags** | Many features, large data | No native uncertainty intervals |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Default `changepoint_prior_scale` for very flat / very volatile series | Tune (often 0.01 or 0.5) |
| Forgetting to set `cap` for logistic growth | Will silently use linear |
| Wrong column names | Must be `ds` (datetime) and `y` (value) — not `date` / `value` |
| Treating Prophet residuals as iid | Often autocorrelated; check with ACF |
| Forecasting regressors with the same model | Circular — forecast regressors separately |
| Using Prophet without uncertainty samples | `mcmc_samples=0` gives MAP only — narrower intervals |
| Many short series (cold start) | Prophet needs ≥ 2 cycles of seasonality data |
| Daily seasonality with weekly data | Doesn't make sense; turn off |
| Yearly seasonality with < 2 years of data | Disable or pass less data with `yearly_seasonality=False` |
| Trusting auto-detected changepoints near the end | Set `changepoint_range=0.8` (default) |

#### Diagnostics workflow

| Step | Action |
|---|---|
| 1 | `m.plot_components(forecast)` — sanity check trend + each seasonality |
| 2 | Plot residuals vs time — look for missed structure |
| 3 | ACF of residuals — should be near zero (Prophet doesn't model autocorrelation) |
| 4 | Run `cross_validation` + `performance_metrics` |
| 5 | Compare to seasonal-naive baseline |

#### Python ecosystem

| Library | What |
|---|---|
| **`prophet`** (Meta) | The original |
| **`neuralprophet`** | + AR / lags / neural extensions |
| **`statsmodels`** | ARIMA, ETS, state space |
| **`pmdarima`** | Auto-ARIMA |
| **`sktime`** | Unified time-series API (wraps many) |
| **`darts`** | Deep + classical, unified API |
| **`gluonts`** (Amazon) | Probabilistic deep learning |

**Rule of thumb:** **Prophet is the practical baseline** for business time-series with seasonality and holidays. Its **strongest knob is `changepoint_prior_scale`**. Use **multiplicative seasonality** when swings grow with level. Validate with `cross_validation` over expanding windows. **Compare to seasonal-naive**; if Prophet can't beat it, something's wrong. For richer needs, fall back to **NeuralProphet, DeepAR, or LightGBM-with-lags**.
