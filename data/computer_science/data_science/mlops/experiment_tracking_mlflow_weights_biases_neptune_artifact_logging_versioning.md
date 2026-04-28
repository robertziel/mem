### Experiment Tracking (MLflow, Weights & Biases, Neptune — artifact logging, versioning)

**When:** every ML training run. Without tracking, you can't reproduce, compare, or debug runs. Tracking is **the cheapest MLOps win** — log everything from day 1.

**Schema (what to log):**

| Category | Examples |
|---|---|
| **Parameters** | Hyperparameters, model class, dataset version |
| **Metrics** | Train / val / test loss + per-epoch metrics |
| **Artifacts** | Model file, plots, feature importance, sample predictions |
| **Code version** | Git SHA |
| **Data version** | DVC hash, dataset URI |
| **Environment** | Python version, package versions, CUDA |
| **System** | GPU hours, memory, wall-clock time |
| **Tags** | Team, project, experiment type |

> **Log everything**. Storage is cheap; rerunning experiments to recover state is expensive.

#### Tools comparison

| Tool | Strength | Pricing |
|---|---|---|
| **MLflow** | Open-source, self-hosted, Apache 2.0 | Free; managed via Databricks |
| **Weights & Biases** | Best UI, collaboration, sweeps | Free for individuals; paid teams |
| **Neptune** | Lightweight, fast, customizable dashboards | Paid SaaS |
| **Comet** | Multi-framework support | Free tier; paid teams |
| **TensorBoard** | TensorFlow / PyTorch native | Free |
| **Aim** | Open-source, Python-first | Free |
| **DVC + DVCLive** | Combined data + experiment versioning | Free |
| **SageMaker Experiments** | AWS native | Paid |
| **Vertex AI Experiments** | GCP native | Paid |

> **Self-host MLflow** for cost; **Weights & Biases** for the best UI / collaboration.

#### MLflow basics

```python
import mlflow

mlflow.set_experiment("churn-prediction")
with mlflow.start_run(run_name="xgb-baseline") as run:
    mlflow.log_params({"n_estimators": 200, "max_depth": 5, "lr": 0.1})
    mlflow.log_metrics({"auc": 0.82, "logloss": 0.43})
    mlflow.xgboost.log_model(model, artifact_path="model")
    mlflow.log_artifact("feature_importance.png")
    mlflow.set_tags({"team": "growth", "data_version": "v3"})
    mlflow.log_input(dataset, context="training")     # MLflow 2.0+

# Auto-logging (one line)
mlflow.autolog()        # auto-logs scikit-learn, XGBoost, PyTorch, etc.

# Per-epoch metrics
for epoch in range(num_epochs):
    train_loss = train_one_epoch(...)
    val_loss = validate(...)
    mlflow.log_metrics({"train_loss": train_loss, "val_loss": val_loss}, step=epoch)
```

#### Weights & Biases basics

```python
import wandb

wandb.init(project="churn", config={"n_estimators": 200, "max_depth": 5})

# Log per-epoch
for epoch in range(num_epochs):
    wandb.log({"train_loss": train_loss, "val_loss": val_loss, "epoch": epoch})

# Log artifacts (model, plots)
wandb.save("model.pkl")
wandb.log({"confusion_matrix": wandb.plot.confusion_matrix(...)})

# Sweep (hyperparameter search)
sweep_config = {"method": "bayes", "parameters": {...}}
sweep_id = wandb.sweep(sweep_config, project="churn")
wandb.agent(sweep_id, function=train, count=20)
```

#### What to track for every run

| Item | Why |
|---|---|
| **Git commit SHA** | Reproduce code state |
| **Data version / hash** | Reproduce data state |
| **All hyperparameters** | Including defaults |
| **Train + val + test metrics** | Avoid post-hoc cherry-picking |
| **Per-segment metrics** | Fairness / bug surface |
| **Confusion matrix / ROC** | Classification |
| **Predicted vs actual scatter** | Regression |
| **Feature importance** | Model debugging |
| **Sample predictions** (10 inputs + outputs) | Sanity check |
| **Environment** (`pip freeze`, CUDA) | Reproducibility |
| **System metrics** (GPU memory, time) | Cost / efficiency |

#### Hyperparameter sweeps

| Method | When |
|---|---|
| **Grid search** | Few params, well-understood ranges |
| **Random search** | Default — easier than grid for high-d |
| **Bayesian (Optuna, Hyperopt, W&B Bayes)** | Expensive evaluations |
| **Hyperband / ASHA** | Aggressive early-stopping for many configs |
| **PBT** (population-based training) | Schedule + structure tuning together |

```python
import optuna

def objective(trial):
    params = {
        "n_estimators": trial.suggest_int("n_estimators", 50, 500),
        "max_depth": trial.suggest_int("max_depth", 3, 12),
        "lr": trial.suggest_float("lr", 1e-3, 1e-1, log=True),
    }
    model = train_with_params(params)
    return cross_val_score(model, X, y, cv=5).mean()

study = optuna.create_study(direction="maximize")
study.optimize(objective, n_trials=100)
print(study.best_params)
```

#### Comparing runs

| What to compare | How |
|---|---|
| Multiple runs side-by-side | Tracker UI / `mlflow ui` |
| Parallel coordinate plot | Visual sweep results |
| Metric vs hyperparameter | Sweep dashboards |
| Pareto frontier (multi-objective) | Optuna Pareto plot |
| Learning curves overlaid | Compare convergence |
| Confusion matrices side-by-side | Failure-mode comparison |

#### Tagging conventions

```python
mlflow.set_tags({
    "owner": "robertz",
    "team": "growth-ml",
    "project": "churn",
    "data_version": "v4-2024-12-01",
    "is_production_candidate": "true",
})
```

> Use **structured tags** for filtering (team, project, data version) and **free-form notes** for descriptions.

#### Reproducibility checklist

| Element | Tracked? |
|---|---|
| Random seeds (NumPy, Python, framework) | ✓ |
| CUDA deterministic mode | ✓ |
| Package versions | ✓ |
| Data hash / DVC version | ✓ |
| Git SHA | ✓ |
| Hardware (GPU type, memory) | ✓ |
| OS + driver versions | Optional |

```python
import random, numpy as np, torch

SEED = 42
random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)
torch.cuda.manual_seed_all(SEED)
torch.backends.cudnn.deterministic = True
```

> **Different runs with the same seed should produce the same result.** Verify before claiming reproducibility.

#### Auto-logging

| Tool | Frameworks |
|---|---|
| **MLflow autolog** | scikit-learn, XGBoost, LightGBM, PyTorch, Keras, fastai, statsmodels |
| **W&B autolog** | Same set + Hugging Face Transformers |
| **Comet auto** | Same |

```python
mlflow.sklearn.autolog()
# Then any sklearn fit() automatically logs params, metrics, model
```

> Auto-logging is the **lowest-effort** way to get tracking. Always start here, then add custom metrics on top.

#### Run organization

| Concept | Detail |
|---|---|
| **Experiment** | A project / question (e.g., "churn-prediction") |
| **Run** | One execution within an experiment |
| **Parent / child runs** | Hyperparameter sweeps; outer run with N inner runs |
| **Tags** | Categorical labels for filtering |
| **Notes / descriptions** | Free-text |

#### Data lineage

| Detail | Tool |
|---|---|
| Which dataset version trained which model? | MLflow `log_input`, DVC, or Feast metadata |
| Which model produced which prediction? | Log model_id with each prediction |
| Which feature pipeline ran? | Tag with feature pipeline version |
| Audit trail end-to-end | OpenLineage / DataHub / Marquez |

#### Cost tracking

```python
import mlflow, time, GPUtil

start = time.time()
gpu_start_memory = GPUtil.getGPUs()[0].memoryUsed

# ... train ...

mlflow.log_metric("training_time_s", time.time() - start)
mlflow.log_metric("gpu_memory_mb", GPUtil.getGPUs()[0].memoryUsed - gpu_start_memory)
mlflow.log_metric("dollar_cost_estimate", time.time() - start * gpu_cost_per_second)
```

> Track **wall-clock time**, **GPU memory**, **estimated $$**. Helps justify infrastructure decisions.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Forgetting to log hyperparameters | Auto-logging |
| Logging only final metric, not per-epoch | Log per-step for learning curves |
| Not tagging runs | Filtering becomes painful |
| Multiple users, same experiment | Use tags / namespacing |
| Data version not logged | Reproduction impossible |
| Mixing dev / prod runs | Separate experiments per env |
| Ignoring failed runs | Often most informative — log them too |
| Not logging environment | "Works on my laptop" — capture `pip freeze` |
| Storing 100s of GBs of artifacts | Apply retention policies; sample artifacts |
| MLflow on local file system in prod | Use proper backend (DB + S3 / GCS) |

#### Production MLflow setup

```yaml
# Tracking server backed by Postgres + S3 artifact store
mlflow server \
  --backend-store-uri postgresql://user:pass@host/db \
  --default-artifact-root s3://my-mlflow-bucket \
  --host 0.0.0.0 --port 5000
```

#### Workflow integration

| Tool | Connector |
|---|---|
| **Airflow** | `MLflowOperator` to run / log from DAGs |
| **Kubeflow** | Native pipeline → MLflow integration |
| **GitHub Actions** | Run on PR; log to shared MLflow |
| **DVC** | `dvc exp` ties data versions to runs |
| **SageMaker** | Native experiments + tracking |

#### Tracking servers vs local-file mode

| Mode | When |
|---|---|
| Local file (`./mlruns/`) | Solo dev, exploration |
| Remote server (Postgres + S3) | Team / production |
| SaaS (W&B / Neptune / Comet) | No server to operate |

#### Comparing tools — quick decision

```
Need open-source, self-hosted?           → MLflow
Best UI + collaboration features?         → Weights & Biases
Fastest dashboards, lightweight?          → Neptune
TensorFlow / PyTorch only, simple?        → TensorBoard
Combined data + experiment versioning?    → DVC + DVCLive
Already on AWS?                           → SageMaker Experiments
Already on GCP?                           → Vertex AI Experiments
```

**Rule of thumb:** **track every run, from day 1**. Log **params, metrics, artifacts, code SHA, data version, env**. Use **auto-logging** as default + custom metrics on top. Reproduce by **(code, data, env, seed)**. **MLflow** for self-hosted; **W&B** for collaboration. The biggest mistake is **not tracking** — even bad tracking beats none.
