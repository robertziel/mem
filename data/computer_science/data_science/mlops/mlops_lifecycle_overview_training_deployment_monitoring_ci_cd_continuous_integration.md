### MLOps Lifecycle (training, deployment, monitoring, CI/CD)

**When:** moving from notebook ML to production. **MLOps = DevOps for ML** — version everything (data, features, code, models), automate pipelines, monitor in production, roll back safely. The discipline that prevents "model worked on my laptop, fails in prod".

**Schema (the lifecycle):**

| Phase | Components |
|---|---|
| **1. Data** | Ingest, validate, version, label |
| **2. Features** | Engineer, store, version, ensure train/serve consistency |
| **3. Train** | Reproducible training, experiment tracking, hyperparameter tuning |
| **4. Validate** | Unit tests, integration tests, data quality, model quality, fairness |
| **5. Register** | Model registry with versioning + metadata |
| **6. Deploy** | Canary / shadow / progressive rollout |
| **7. Serve** | Online / batch inference, scaling, latency, observability |
| **8. Monitor** | Data drift, concept drift, performance, fairness |
| **9. Retrain** | Scheduled or triggered by drift / performance regression |
| **10. Govern** | Lineage, audit, compliance, model cards |

#### MLOps maturity levels (Google framework)

| Level | What |
|---|---|
| **Level 0** | Manual: Jupyter notebook → manual deploy |
| **Level 1** | Automated training pipeline; manual deploy |
| **Level 2** | Full CI/CD/CT (continuous training); automated retraining; full observability |

> Most teams aim for **Level 1** as a baseline; **Level 2** is the FAANG / data-team-of-50 target.

#### The seven principles

| Principle | Why |
|---|---|
| **Reproducibility** | Same code + data → same model |
| **Versioning** | Code, data, features, models — all versioned |
| **Automation** | Pipelines triggered by code / data changes |
| **Testing** | Data, features, model, deployment, integration |
| **Monitoring** | Data drift, concept drift, performance |
| **Continuous training** | Scheduled or drift-triggered retraining |
| **Governance** | Lineage, audit, compliance |

#### Tools by category

| Category | Tools |
|---|---|
| **Experiment tracking** | MLflow, Weights & Biases, Neptune, Comet |
| **Feature store** | Feast, Tecton, Hopsworks, Vertex AI Feature Store |
| **Pipeline orchestration** | Airflow, Prefect, Kubeflow, ZenML, Metaflow, Dagster |
| **Model registry** | MLflow Model Registry, SageMaker Model Registry, Vertex AI |
| **Serving** | KFServing, BentoML, TorchServe, TensorFlow Serving, Triton, Seldon |
| **Monitoring** | Evidently, Arize, Fiddler, WhyLabs, NannyML |
| **Data versioning** | DVC, lakeFS, Delta Lake, Iceberg |
| **CI/CD** | GitHub Actions, GitLab CI, Argo |
| **All-in-one** | Vertex AI, SageMaker, Databricks, Azure ML |

#### Reference architecture (typical)

```
[Data sources] → [Ingest (Airflow / dbt)] → [Data warehouse / lake]
       ↓                                            ↓
   [Data DQ tests]                         [Feature pipeline]
                                                   ↓
                                          [Feature store]
                                            ↓         ↓
                                      [Training]   [Serving]
                                            ↓         ↑
                                      [Registry] → [Canary / Prod]
                                                       ↓
                                                  [Monitoring]
                                                       ↓
                                              [Drift alerts → retrain]
```

#### CI/CD/CT for ML

| Pipeline | Triggers |
|---|---|
| **CI** (continuous integration) | Code push → run tests, lint, validate schemas |
| **CD** (continuous delivery) | Tested code → build artifact, push to registry |
| **CT** (continuous training) | Scheduled / drift-triggered → retrain → register |
| **CM** (continuous monitoring) | Always-on → drift / performance alerts |

```yaml
# Example GitHub Actions workflow snippet
name: ml-ci
on: [push, pull_request]
jobs:
  test:
    steps:
      - run: pytest tests/
      - run: python validate_schemas.py
      - run: python train_smoke_test.py        # 1% of data, fast
  build:
    if: github.ref == 'refs/heads/main'
    steps:
      - run: dvc repro full_pipeline.yaml
      - run: mlflow models build-docker -m runs:/$RUN_ID/model -n my-model
```

#### What to test

| Layer | Test |
|---|---|
| **Data** | Schema, range, distribution drift, freshness |
| **Feature** | Train/serve consistency (same value computed identically) |
| **Model code** | Unit tests on transformers, custom layers, losses |
| **Training pipeline** | End-to-end smoke test on tiny sample |
| **Trained model** | Held-out metric ≥ baseline; per-segment performance |
| **Inference** | Latency under load, error rate, payload validation |
| **Behavioral / invariance** | "Adding spaces to text shouldn't flip prediction" |

```python
# Behavioral / invariance test
def test_invariance_to_capitalization(model):
    preds_orig = model.predict(["hello world"])
    preds_caps = model.predict(["HELLO WORLD"])
    assert np.allclose(preds_orig, preds_caps, atol=0.01)
```

#### Versioning matrix

| Artifact | Version with |
|---|---|
| Code | Git |
| Data | DVC, lakeFS, Delta Lake |
| Features | Feature store; feature definitions in Git |
| Hyperparameters | Experiment tracker |
| Models | Model registry |
| Configs / env | Docker image, `requirements.txt` lock |
| Random seed | Logged in experiment |

> **Reproducibility = (code version, data version, env, seed) → same model**.

#### Train / serve skew (the silent killer)

| Cause | Fix |
|---|---|
| Different feature computation in training vs serving | **Use a feature store** so both pull from same logic |
| Standardization fit on train data not persisted | Persist scaler with model |
| Batch features computed differently than streaming | Define both in feature store |
| Code drift between training and serving | Same Python module; CI checks |
| Data type mismatch (float32 train, float64 serve) | Lock dtypes in serving |
| Missing-value handling differences | Define imputation in shared function |

> **Train-serve skew is the #1 production ML bug.** Feature store + shared transformation library prevents it.

#### Deployment patterns

| Pattern | What | When |
|---|---|---|
| **Shadow** | New model runs alongside old, predictions logged but not served | Compare without risk |
| **Canary** | New model serves x% of traffic; gradually ramp | Monitored rollout |
| **Blue-green** | Two prod environments; switch traffic atomically | Fast rollback |
| **A/B test** | Random users get new model; compare metrics | Statistical validation |
| **Multi-armed bandit** | Adaptive allocation to better model | Optimize during rollout |
| **Champion-challenger** | Production model + shadow challengers continuously | Continuous improvement |
| **Edge / on-device** | Model runs on user device | Privacy / latency |

#### Online vs batch inference

| Mode | Use when |
|---|---|
| **Online (real-time)** | < 1s latency required (search ranking, fraud, recommendations) |
| **Streaming** | Continuous data flow (Kafka → Flink → predictions) |
| **Batch** | Daily / hourly scoring (churn lists, recommendations refresh) |
| **Edge** | On-device, no server round trip (smartphone keyboards, drones) |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| **Notebook → prod** without refactor | Move to module + tests + pipeline |
| Manual training in production | Automate via Airflow / Kubeflow / GitHub Actions |
| Not versioning data | Use DVC or feature store |
| Single global model file (no versioning) | Use model registry |
| Train-serve skew | Feature store; integration tests |
| No drift monitoring | Automated PSI / KS / performance tracking |
| Manual rollback | Blue-green / canary infra; one-click rollback |
| Different env training vs serving | Same Docker image |
| No model card / lineage | Document; auto-generate from registry |
| Models without health endpoints | `/health` and `/ready` for orchestrator |
| No batched inference for latency-critical apps | Batch + cache |
| Model degrades silently | Continuous monitoring with alerts |

#### Model card (for governance)

| Field | Detail |
|---|---|
| Model name + version | `recsys-v1.4.2` |
| Owner / team | Slack / email |
| Use case | Where deployed |
| Training data | Source, period, size |
| Features used | List + types |
| Metrics | Per-segment + overall |
| Limitations | Known failure modes, populations under-represented |
| Ethical considerations | Fairness, privacy, regulatory |
| Date trained | UTC timestamp |
| License | If applicable |

#### Cost tracking

| Cost driver | Optimize via |
|---|---|
| Training (GPU hours) | Smaller models, mixed precision, distillation |
| Storage (data + models) | Lifecycle policies, model pruning |
| Inference (online traffic) | Quantization, batching, caching, model size |
| Feature store lookups | Caching, denormalization |
| Monitoring | Sampled metrics, batch aggregation |
| Engineering hours | Automation pays back fastest |

#### Continuous training (CT)

| Trigger | Detail |
|---|---|
| Scheduled | Daily / weekly retraining |
| Drift-based | PSI / KS exceeds threshold → retrain |
| Performance regression | Holdout metric drops → retrain |
| Manual | Engineer-initiated |
| New data tier | Big new batch → trigger |

```python
# Pseudo: drift-triggered retrain
if psi(reference, current_data) > 0.25 or live_metric < threshold:
    pipeline.run(branch="retrain")
```

#### MLOps maturity self-assessment

| Question | Score 0-3 |
|---|---|
| Reproducible training (re-run same model from same code/data)? | |
| Models versioned in registry? | |
| Features versioned and shared via store? | |
| Automated training pipeline? | |
| Production drift / performance monitoring? | |
| Automated rollback? | |
| Model lineage (which data → which model → which prediction)? | |
| Behavioral / invariance tests? | |
| Continuous training (scheduled or triggered)? | |
| Cost / fairness / privacy auditing? | |

> Total: **0–10 = Level 0**, **11–20 = Level 1**, **21–30 = Level 2**.

**Rule of thumb:** **MLOps = version + automate + monitor**. **Train-serve consistency** is the most-violated principle — use a **feature store** and **shared transformation library**. Deploy with **canary / shadow**, not direct cutover. Monitor for **data drift, concept drift, and per-segment performance regression**. **Reproducibility** = code version + data version + env + seed; if any are missing, it's not reproducible. The biggest ROI is automating retraining and rollback.
