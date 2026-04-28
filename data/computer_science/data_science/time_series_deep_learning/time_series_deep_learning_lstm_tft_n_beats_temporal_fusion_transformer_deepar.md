### Time-Series Deep Learning (LSTM, TFT, N-BEATS, Temporal Fusion Transformer, DeepAR)

**When:** time-series forecasting that needs **non-linear dynamics**, **many related series**, **rich features (calendar / static / dynamic)**, or **probabilistic forecasts**. Modern alternatives to ARIMA / ETS / Prophet — pay off at scale (1000+ series) or when feature richness matters.

**Schema (architectures):**

| Model | Architecture | Best for |
|---|---|---|
| **RNN / LSTM / GRU** | Recurrent | Single series, simple |
| **Seq2Seq encoder-decoder** | Two RNNs | Multi-step forecast |
| **DeepAR (Amazon)** | Autoregressive RNN, probabilistic | Many related series; uncertainty |
| **N-BEATS** | Stacked MLP residual blocks | Univariate; SOTA on M3/M4 |
| **N-HiTS** | Hierarchical N-BEATS | Long-horizon |
| **Temporal Fusion Transformer (TFT)** | Transformer + LSTM + variable-selection | Many features, interpretability |
| **Informer / Autoformer / FEDformer** | Long-horizon transformers | Very long context |
| **PatchTST** | Patch-based transformer | Strong recent baseline |
| **TimesNet** | 2D variations on time | Multiple periodicities |
| **Chronos / TimeGPT** | Pre-trained foundation models | Zero-shot forecasting |

> **No single best model** — depends on horizon, # series, feature richness, latency needs.

#### Picking by setup

| Setup | Choice |
|---|---|
| Few series, short history | ARIMA / ETS / Prophet |
| 1000s of related series | DeepAR / TFT / global LightGBM |
| Need feature importance | TFT |
| Pure univariate, M-competition style | N-BEATS / N-HiTS / PatchTST |
| Long horizon (> 1 cycle) | N-HiTS / Informer / Autoformer |
| Need probabilistic forecasts | DeepAR / TFT / DeepHit |
| Pre-trained foundation models | Chronos / TimeGPT / Lag-Llama |

#### Encoder-decoder seq2seq

```
[Past observations + features] → Encoder (LSTM / Transformer) → context vector
                                                                  ↓
                                                              Decoder → forecast
```

```python
class Seq2Seq(nn.Module):
    def __init__(self, input_dim, hidden=128, output_dim=1, horizon=24):
        super().__init__()
        self.encoder = nn.LSTM(input_dim, hidden, batch_first=True)
        self.decoder = nn.LSTM(hidden, hidden, batch_first=True)
        self.head = nn.Linear(hidden, output_dim)
        self.horizon = horizon
    def forward(self, x):
        _, (h, c) = self.encoder(x)
        # Decoder unroll
        decoder_input = torch.zeros(x.size(0), self.horizon, h.size(-1), device=x.device)
        out, _ = self.decoder(decoder_input, (h, c))
        return self.head(out)            # [B, horizon, output_dim]
```

#### N-BEATS (univariate, MLP-based)

| Property | Detail |
|---|---|
| **Stacked MLP blocks** | Each block predicts a forecast + a backcast (subtracted from input) |
| **Residual learning** | Each block fits residual from previous |
| **Trend + seasonality stacks** | Interpretable variant |
| **No recurrence / attention** | Pure MLPs |
| **Won M4 competition** | 100K series benchmark |

```python
# darts library
from darts.models import NBEATSModel
model = NBEATSModel(input_chunk_length=24, output_chunk_length=12, num_stacks=30)
model.fit(series_train)
forecast = model.predict(n=24)
```

#### N-HiTS (multi-rate downsampling)

Improves N-BEATS for long horizons via **hierarchical interpolation** at multiple frequencies. Scales to long-horizon forecasts efficiently.

#### DeepAR (Amazon, probabilistic + global)

Train **one model on many related series** (cross-series transfer); output **probabilistic forecast** (parametric distribution).

```python
from gluonts.torch.model.deepar import DeepAREstimator
from gluonts.dataset.pandas import PandasDataset

estimator = DeepAREstimator(
    freq="D",
    prediction_length=14,
    context_length=60,
    num_layers=2,
    hidden_size=40,
    distr_output="StudentTOutput",
    trainer_kwargs={"max_epochs": 20},
)
predictor = estimator.train(training_data)
forecasts = list(predictor.predict(test_data))
```

| Property | Detail |
|---|---|
| **Probabilistic** | Outputs distribution params (Gaussian, Student-T, NegBin) |
| **Global model** | One model across all series |
| **Categorical embeddings** | Series-level features (item_id, category) |
| **Scaling** | Auto-rescales per series |

#### Temporal Fusion Transformer (TFT)

State-of-the-art for **forecasting with rich features**:

| Component | Role |
|---|---|
| **Variable selection networks** | Pick informative features per timestep |
| **LSTM encoder + decoder** | Local temporal dynamics |
| **Multi-head attention** | Cross-time interactions |
| **Quantile output** | Probabilistic forecasts |
| **Static + known-future + observed-past variables** | Rich feature taxonomy |

```python
# pytorch-forecasting
from pytorch_forecasting import TemporalFusionTransformer, TimeSeriesDataSet

training = TimeSeriesDataSet(
    df_train, time_idx="time_idx", target="value",
    group_ids=["series_id"],
    max_encoder_length=60, max_prediction_length=14,
    static_categoricals=["category"],
    time_varying_known_reals=["holiday", "promo"],
    time_varying_unknown_reals=["value"],
)
model = TemporalFusionTransformer.from_dataset(training, hidden_size=64, lstm_layers=2)
trainer.fit(model, train_dataloaders=train_loader)
```

> **TFT gives feature importance over time** — interpretability that other deep models lack.

#### Informer / Autoformer / FEDformer (long-horizon transformers)

Specialized self-attention reductions for very long sequences:

| Model | Trick |
|---|---|
| **Informer** | ProbSparse attention; query selection |
| **Autoformer** | Auto-correlation instead of self-attention |
| **FEDformer** | Frequency-domain attention |
| **PatchTST** | Patch tokens (like ViT) for long sequences |

#### Foundation models (Chronos, TimeGPT, Lag-Llama)

Pre-trained on huge time series → zero-shot forecasting.

```python
# Chronos (Amazon)
from chronos import ChronosPipeline
pipeline = ChronosPipeline.from_pretrained("amazon/chronos-t5-small")
forecast = pipeline.predict(context, prediction_length=12)
```

| Pro | Con |
|---|---|
| Zero-shot — no fine-tuning needed | Larger models; slow |
| Strong baseline | Less specialized |
| Probabilistic | New, evolving |

#### Probabilistic forecasts (essential)

| Method | Output |
|---|---|
| Gaussian / Student-T | Mean + variance |
| Negative Binomial | Discrete counts |
| Quantile regression | Direct quantile predictions |
| MQRNN / Quantile loss | Multiple quantiles |
| Sample-based (variational) | Distribution samples |

> **Always include uncertainty intervals**, especially for downstream decisions.

#### Loss functions

| Loss | Use |
|---|---|
| **MSE / RMSE** | Point forecast |
| **MAE / L1** | Robust to outliers |
| **Huber** | Mix of L1 / L2 |
| **Quantile / pinball** | Probabilistic |
| **NLL** | Parametric distribution |
| **CRPS** | Probabilistic; strictly proper |
| **Tweedie** | Compound Poisson-Gamma (count + zero) |

#### Common feature engineering for DL models

| Feature | Detail |
|---|---|
| **Lags** | Past values at offsets `1, 7, 28` |
| **Rolling stats** | Mean / std / max over windows |
| **Calendar** | Day-of-week (sin/cos), is-holiday |
| **Static** | Per-series identity / category embeddings |
| **Future-known** | Holidays, promotions, weather forecasts |
| **External** | Macroeconomic indicators |

#### Training considerations

| Concern | Detail |
|---|---|
| **Per-series scaling** | Normalize each series; common practice |
| **Long sequences** | Use truncated BPTT or transformers with windowed attention |
| **Batch sampling** | Randomize across series, but maintain temporal context |
| **Validation split** | Always temporal — never random |
| **Mini-batch with variable lengths** | Pack and mask |
| **Mixed precision** | BF16 for transformer training |

#### Frameworks / libraries

| Library | Strength |
|---|---|
| **Darts** | Many models, unified API, easy switching |
| **PyTorch Forecasting** | TFT-focused, sklearn-style API |
| **GluonTS** (Amazon) | DeepAR + many probabilistic models |
| **NeuralForecast / NeuralProphet** | Production-friendly |
| **Hugging Face Transformers** | TimeSeriesTransformer, Informer |
| **Prophet / NeuralProphet** | Statistical + neural hybrid |
| **sktime** | Unified time-series API (incl. classical) |

#### Production patterns

| Pattern | Detail |
|---|---|
| **Global model** | One model for all series; inference scales |
| **Local fine-tune** | Per-series fine-tuning of global model |
| **Hierarchical** | Forecast at item × store × region; reconcile |
| **Continuous training** | Refit weekly / daily |
| **Ensemble** | Blend deep + classical |
| **Caching** | Pre-compute forecasts; serve from cache |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Random train/test split | Use temporal split |
| No per-series scaling | Big-magnitude series dominate |
| Forecasting with lookahead features | Strict temporal feature engineering |
| Ignoring missing data | Impute or mask explicitly |
| Single point forecast for risk-sensitive decision | Always probabilistic |
| Tuning on test set | Use validation period |
| Comparing only to mean baseline | Always seasonal-naive baseline |
| Optimizing MSE for MAE evaluation | Match training loss to eval metric |
| Long horizon with naive autoregressive | Errors compound; use multi-step output |
| Treating each forecast as standalone | Aggregate forecast distributions for portfolio decisions |

#### When DL beats classical

| Setup | DL wins |
|---|---|
| Many related series (1000+) | Yes — global learning |
| Rich features beyond lags | Yes — TFT, neural with covariates |
| Long horizon | Sometimes — N-HiTS / Informer |
| Single short series | Usually classical (ARIMA / ETS) |
| Need uncertainty | DeepAR / TFT (probabilistic) |
| M-competition style univariate | N-BEATS / classical ensemble |
| Latency-critical | Classical (or compiled deep model) |

> **Marcel Salinas et al. 2020**: deep learning didn't reliably beat ETS on simple benchmarks; advantage is at **scale + features**.

#### Decision tree

```
Setup?
├─ Few series, simple seasonal               → ETS / Prophet / SARIMA
├─ 1000s of related series, similar dynamics  → DeepAR / global LightGBM
├─ Many features (static + dynamic)           → TFT
├─ Univariate, want SOTA                       → N-BEATS / N-HiTS
├─ Very long context (1000+ steps)            → Informer / PatchTST
├─ Zero-shot / no training data                → Chronos / TimeGPT
└─ Need probabilistic forecasts                → DeepAR / TFT / quantile loss
```

#### Comparison: DL vs LightGBM

LightGBM with **lag + rolling features** is often **competitive or better** than DL on tabular time-series. Use LightGBM as a strong baseline before going to DL.

```python
import lightgbm as lgb

# Engineer lag + rolling features explicitly
df["lag_1"]  = df.groupby("series_id")["value"].shift(1)
df["lag_7"]  = df.groupby("series_id")["value"].shift(7)
df["roll_7"] = df.groupby("series_id")["value"].shift(1).rolling(7).mean()
# ... + calendar features

model = lgb.train({"objective": "regression", "metric": "mae"}, train_set)
```

#### Production examples

| Company | Deep TS use |
|---|---|
| **Amazon** | DeepAR for demand forecasting |
| **Uber** | DeepAR / TFT for ride-time prediction |
| **Google** | Internal probabilistic forecasting models |
| **Walmart** | Hierarchical sales forecasting |
| **NYISO** (energy) | Demand / price forecasting |

**Rule of thumb:** **classical (ETS / Prophet / ARIMA) for few series; deep (DeepAR / TFT / N-BEATS) for many related**. **Lag-based LightGBM is an underrated baseline** — try before reaching for transformers. Always include **probabilistic forecasts** (quantile / distributional) for downstream decisions. Use **temporal splits** for validation; **per-series scaling**; **feature richness > model fanciness** for many problems. Consider **foundation models (Chronos)** for zero-shot.
