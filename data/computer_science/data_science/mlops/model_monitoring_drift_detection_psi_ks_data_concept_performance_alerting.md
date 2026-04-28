### Model Monitoring (drift detection — PSI, KS, data / concept drift, performance, alerting)

**When:** any model in production. **Models silently degrade**. Without monitoring, you find out from users, dashboards, or revenue drops — never in time. Monitoring is the **production-feedback loop** that closes MLOps.

**Schema (the four monitoring dimensions):**

| Dimension | What | Detect via |
|---|---|---|
| **Data drift** | Input distributions change | PSI, KS test, JS divergence per feature |
| **Concept drift** | P(Y \| X) changes | Performance metrics; needs labels |
| **Performance** | Accuracy / AUC / regression error | Compare to baseline / training |
| **Operational** | Latency, throughput, error rate, payload size | Standard infra observability |

> **Data drift** = inputs change. **Concept drift** = relationship changes. Both can degrade the model; neither is detected by the other.

#### Drift example

| Type | Scenario | Detection |
|---|---|---|
| Data drift | New user demographic browses (different `age` distribution) | PSI on `age` alarms; model accuracy still OK if relationship holds |
| Concept drift | "Spam" definition changes (new tactics) | Inputs same; predictions worse — performance metrics drop |
| Both | New product launches (new categories + new pricing dynamics) | PSI + performance both signal |

#### Drift detection methods

| Method | Use | Detects |
|---|---|---|
| **PSI** (Population Stability Index) | Continuous / categorical | Distribution shift |
| **KS test** | Continuous | Distribution shift (non-parametric) |
| **Chi-square test** | Categorical | Distribution shift |
| **JS divergence** | Both | Symmetric distribution distance |
| **Wasserstein / Earth Mover's** | Continuous | Distance robust to bin choice |
| **MMD** (Maximum Mean Discrepancy) | High-d | Multivariate; kernel-based |
| **DDM, EDDM, ADWIN** | Streaming | Online drift detection |
| **Page-Hinkley** | Streaming | Change-point detection |

#### PSI (the practical workhorse)

```python
import numpy as np

def psi(reference, current, bins=10):
    """Population Stability Index between two distributions."""
    cuts = np.unique(np.quantile(reference, np.linspace(0, 1, bins + 1)))
    ref_pct, _ = np.histogram(reference, bins=cuts)
    cur_pct, _ = np.histogram(current, bins=cuts)
    ref_pct = (ref_pct + 1e-6) / (ref_pct.sum() + 1e-6)
    cur_pct = (cur_pct + 1e-6) / (cur_pct.sum() + 1e-6)
    return np.sum((ref_pct - cur_pct) * np.log(ref_pct / cur_pct))
```

| PSI | Interpretation |
|---|---|
| < 0.1 | No significant change |
| 0.1–0.25 | Moderate drift — investigate |
| > 0.25 | Major drift — alert / retrain |

> PSI computed **per feature**. Aggregated to a "total drift score" or "max-PSI feature".

#### Performance monitoring (when labels available)

| Setting | Latency to feedback |
|---|---|
| Online classification (e.g., recommendations + click feedback) | Minutes |
| Click-through prediction | Hours |
| Conversion / churn | Days |
| Long-cycle outcomes (LTV) | Months |

> If labels are **delayed**, monitor **proxies** (intermediate metrics) to catch problems sooner.

#### What to monitor — checklist

| Layer | Metric |
|---|---|
| **Inputs** | PSI per feature; null rate; new categorical values |
| **Predictions** | Score distribution; class proportion; KS vs training |
| **Performance** | AUC / accuracy / RMSE on labeled subset |
| **Calibration** | Expected vs actual rate (reliability diagram) |
| **Per-segment** | Same metrics broken by region / device / cohort |
| **Operational** | Latency p50/p95/p99, error rate, QPS |
| **Cost** | Inference $$ per 1000 predictions |
| **Fairness** | Demographic parity, equalized odds drift |

#### Reference and current windows

| Window | Detail |
|---|---|
| **Reference** | Baseline (training distribution, last week, last month) |
| **Current** | Recent traffic (last hour, day, week) |
| **Comparison** | PSI / KS / Wasserstein on each |

> Pick comparison windows by **how fast you can act**: if retraining takes a day, alert on day-over-day shifts.

#### Drift on predictions / labels

| Distribution | Insight |
|---|---|
| **Input feature distribution shifts** | Data drift |
| **Prediction score distribution shifts** | Likely model still working but inputs different — verify with performance |
| **Label distribution shifts** | Class imbalance change; could be real or sampling bias |
| **Joint (P(X, Y))** shifts | Concept drift; harder to detect |

#### Calibration drift

```python
def reliability_diagram(y_true, y_pred_proba, bins=10):
    """Plot predicted probabilities vs actual frequencies."""
    bin_edges = np.linspace(0, 1, bins + 1)
    bin_idx = np.digitize(y_pred_proba, bin_edges) - 1
    expected = pd.Series(y_pred_proba).groupby(bin_idx).mean()
    actual = pd.Series(y_true).groupby(bin_idx).mean()
    return expected, actual
```

> If expected ≠ actual at the same bins as before, **calibration has drifted**. Re-calibrate (Platt / isotonic) without full retrain.

#### Tools

| Tool | Strength |
|---|---|
| **Evidently** | Open-source; great for batch reports |
| **Arize** | Real-time observability; LLM monitoring |
| **Fiddler** | Explainability + monitoring |
| **WhyLabs** | Statistical profiling |
| **NannyML** | Specialized in concept-drift estimation |
| **Vertex AI Model Monitoring** | GCP-native |
| **SageMaker Model Monitor** | AWS-native |
| **Datadog ML / Prometheus + Grafana** | DIY metrics |

```python
# Evidently example
import evidently as ev
import evidently.report as ep

report = ep.Report(metrics=[
    ev.metrics.DataDriftPreset(),
    ev.metrics.TargetDriftPreset(),
])
report.run(reference_data=ref_df, current_data=cur_df)
report.save_html("drift_report.html")
```

#### Alerting strategy

| Severity | Trigger | Action |
|---|---|---|
| **P0 (page)** | Performance metric breach AND drift detected | On-call investigates immediately |
| **P1 (alert)** | Drift detected, no performance impact yet | Investigate next business day |
| **P2 (log)** | Slight drift | Log; rolling check |

> Pair drift alerts with **performance alerts**: drift alone is noisy; performance + drift = definitely a problem.

#### Concept drift estimation without labels

When labels are delayed, estimate concept drift via:

| Technique | How |
|---|---|
| **NannyML CBPE** (Confidence-Based Performance Estimation) | Use prediction confidence to estimate true performance |
| **DLE** (Direct Loss Estimation) | Estimate loss from features without labels |
| **Domain classifier** | Train classifier to distinguish reference vs current — high AUC = drift |
| **Reconstruction error** (autoencoder) | Train AE on reference; high error on current = drift |

```python
# NannyML
import nannyml as nml
estimator = nml.CBPE(
    y_pred_proba="prediction_proba",
    y_pred="prediction",
    y_true="true_label",
    timestamp_column_name="ts",
    chunk_period="W",
    metrics=["roc_auc", "f1"],
)
estimator.fit(reference_df)
performance_estimate = estimator.estimate(current_df)
```

#### Retraining triggers

| Trigger | Detail |
|---|---|
| **Scheduled** | Daily / weekly / monthly |
| **Drift-based** | PSI > threshold |
| **Performance-based** | Holdout metric drops below threshold |
| **Volume-based** | New labeled batch arrives |
| **Manual** | Engineer initiates after release |

> Combine: scheduled baseline + drift / performance triggers for early intervention.

#### Multi-segment monitoring (essential)

A model can pass overall metrics but fail catastrophically on a subgroup:

```python
for segment in ["country", "device", "tier"]:
    for value, sub in df.groupby(segment):
        psi_value = psi(reference[segment_features], sub[segment_features])
        if psi_value > 0.25:
            alert(f"Drift in {segment}={value}: PSI={psi_value}")
```

> Aggregate metrics hide segment-level drift. **Always monitor per-segment.**

#### Operational monitoring

| Metric | Threshold |
|---|---|
| p95 latency | < SLA (e.g., 200 ms) |
| Error rate | < 1% |
| Throughput (QPS) | Tracked over time |
| Memory / CPU | Per-pod limits |
| Payload size | Block adversarial / oversized |
| Schema validation failures | Caught at ingress |

#### Logging predictions

```python
{
    "request_id": "abc123",
    "user_id": 42,
    "model_name": "churn-classifier",
    "model_version": "3",
    "feature_version": "2024-12-01",
    "features": {...},
    "prediction": 0.83,
    "predicted_class": "churn",
    "ts": "2024-12-15T14:23:11Z",
}
```

> Log **everything needed to reconstruct the prediction**: model version, feature versions, full input, output. Required for incident debugging and offline evaluation.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Monitoring only aggregate metrics | Add per-segment, per-feature drift |
| No alerting | Wire to PagerDuty / Slack |
| Drift threshold not tuned to use case | Calibrate thresholds with historical data |
| One reference window forever | Refresh reference periodically (sliding) |
| Drift alarm fatigue | Tighten thresholds; combine with performance |
| Ignoring delayed labels | Use NannyML / CBPE to estimate performance |
| No prediction logging | Need it for offline evaluation and debugging |
| Reactive (only on outage) | Build proactive dashboards |
| Single dashboard for all models | Per-model + global summary view |

#### Reliability budget for ML

| Component | Target |
|---|---|
| Model uptime | 99.9% |
| Inference p95 latency | < SLA |
| Performance metric ≥ baseline | 99% of days |
| Drift events per quarter | < N (tunable) |
| MTTR for drift | Hours to days |

#### Decision: when to retrain

```
Performance drop?
├─ Yes + drift detected           → Retrain
├─ Yes + no drift                  → Investigate code, infra, label quality first
└─ No
   ├─ Drift detected, perf OK    → Monitor; pre-position to retrain if perf drops
   └─ Stable                       → Routine schedule retrain (weekly / monthly)
```

#### LLM monitoring (special)

| Concern | Approach |
|---|---|
| Hallucination | Sample + LLM-as-judge / human eval |
| Toxicity | Classifier on outputs |
| Cost | Tokens / call; aggregate $$ |
| Latency | Same as standard ML |
| Prompt injection | Input filters; output diffing |
| Drift in user prompts | Embedding-distance shifts |
| Eval regression | Held-out test suite per release |

#### Monitoring stack

```
[Predictions logs]   → [Aggregator (S3 / Kafka)]
[Feature snapshots]  → [Drift detector (Evidently / custom)]
[Labels (delayed)]   → [Performance evaluator]
                          ↓
                  [Dashboards (Grafana / Evidently UI)]
                          ↓
                   [Alerts (PagerDuty / Slack)]
                          ↓
                 [Retraining trigger / rollback]
```

**Rule of thumb:** **monitor data drift, concept drift, performance, and operations**. Alert on **PSI > 0.25** combined with **performance degradation** to reduce noise. Always **monitor per-segment**, not just aggregate. Use **prediction logs** as the foundation — every prediction should be auditable. When labels are delayed, use **CBPE / NannyML** to estimate performance from features. Pair drift detection with **automated retraining triggers** so problems become routine pipeline runs, not incidents.
