### Model Registry (versioning, staging / production, promotion, lifecycle, governance)

**When:** managing models in production — track versions, promote through stages, enable rollback, govern lineage. The **single source of truth** for "what model is currently serving traffic". Without a registry: "which version of which model is deployed?" becomes unanswerable.

**Schema:**

| Concept | Detail |
|---|---|
| **Model** | Named ML model (e.g., `churn_v2`) |
| **Version** | Specific iteration (e.g., `v3`) — immutable artifact |
| **Stage** | Lifecycle phase: `None`, `Staging`, `Production`, `Archived` |
| **Alias / tag** | `champion`, `challenger`, `latest_safe` — points to a version |
| **Metadata** | Metrics, hyperparameters, training run, data version |
| **Lineage** | Inputs (data, code, features, seeds) + downstream consumers |

> Registry separates the **artifact** (model files) from the **identity** (name + version + stage), enabling deployments to point at "production" without code changes when a new version is promoted.

#### Tools

| Registry | Pricing |
|---|---|
| **MLflow Model Registry** | Free / Databricks |
| **SageMaker Model Registry** | AWS |
| **Vertex AI Model Registry** | GCP |
| **Azure ML Model Registry** | Azure |
| **W&B Model Registry** | Paid |
| **Hugging Face Hub** | For shareable models |
| **BentoML model store** | OSS |
| **Custom (S3 + DB)** | Roll your own |

#### Lifecycle stages

| Stage | Purpose |
|---|---|
| **None** | Just registered; not promoted |
| **Staging** | Tested, candidate for production |
| **Production** | Currently serving |
| **Archived** | Historical; no traffic |

> Many teams use additional aliases: `canary`, `champion`, `challenger`, `shadow`.

#### MLflow registry workflow

```python
import mlflow

# 1. Register from a run
mlflow.register_model(
    model_uri=f"runs:/{run_id}/model",
    name="churn-classifier",
)

# 2. Promote
client = mlflow.MlflowClient()
client.transition_model_version_stage(
    name="churn-classifier", version=3, stage="Production",
    archive_existing_versions=True,         # auto-archive previous prod
)

# 3. Load by stage in production code
import mlflow.pyfunc
model = mlflow.pyfunc.load_model("models:/churn-classifier/Production")
preds = model.predict(input_df)

# 4. Use aliases (newer MLflow API)
client.set_registered_model_alias(name="churn-classifier", alias="champion", version=3)
model = mlflow.pyfunc.load_model("models:/churn-classifier@champion")
```

> **Aliases are the modern pattern**; stages are deprecated in newer MLflow versions.

#### Registry-driven deployment

```python
# Production service code
import mlflow.pyfunc

# Always loads whatever's currently tagged "champion"
model = mlflow.pyfunc.load_model("models:/churn-classifier@champion")
# Reload on schedule or via webhook
```

> The serving code **never hard-codes a version**. Version is set at the registry; promotion swaps it atomically.

#### What to register with each version

| Field | Why |
|---|---|
| Model artifact | The serialized model |
| Training run ID | Link back to experiment |
| Git SHA | Code reproducibility |
| Data version (DVC hash, snapshot ID) | Data reproducibility |
| Hyperparameters | Reproducible training |
| Per-segment metrics | Fairness audit |
| Inference signature (input schema) | Validate at serving |
| Sample input | Smoke test |
| Owner / contact | Accountability |
| Description / use case | Discovery |
| Approval / sign-off | Governance |

#### Promotion criteria (gate to production)

| Gate | Pass condition |
|---|---|
| Holdout metric ≥ baseline | Statistical significance |
| Per-segment metrics ≥ threshold | Fairness |
| Inference latency ≤ SLA | Performance |
| Memory / cost within budget | Operational |
| Behavioral / invariance tests pass | Robustness |
| No P0 issues from canary | Production validation |
| Model card complete | Governance |
| Manual approval (regulated industries) | Compliance |

> Encode gates as **automated CI checks**; promotion happens via PR / merge.

#### Promotion automation

```python
# Pseudo: CI step — gate promotion on holdout score + segment fairness
def promote_if_passes(model_version):
    metrics = evaluate(model_version, holdout_data)
    if metrics["auc"] < BASELINE_AUC: return "fail: auc"
    for segment, m in metrics["per_segment"].items():
        if m["auc"] < SEGMENT_AUC_THRESHOLD: return f"fail: {segment}"
    if metrics["latency_p95"] > SLA_MS: return "fail: latency"
    client.transition_model_version_stage(name=NAME, version=model_version, stage="Production")
    return "promoted"
```

#### Rollback

```python
# Find prior production version
versions = client.search_model_versions(f"name='{NAME}'")
prior_prod = [v for v in versions if "Production" in v.tags.get("history", "")]

# Promote it back
client.transition_model_version_stage(name=NAME, version=prior_prod[-1].version, stage="Production")
```

> Practice rollback on a non-critical model **monthly** — first time you do it shouldn't be during a real incident.

#### Model lineage

For each prediction:

| Trace back to | How |
|---|---|
| Model version | Logged on each prediction |
| Training run | Registry → run ID |
| Training data | Run → data version |
| Feature pipeline | Feature store version |
| Code | Run → Git SHA |
| Approver | Registry → metadata |

```python
# Log on prediction
prediction_log = {
    "user_id": user_id,
    "prediction": pred,
    "model_name": "churn-classifier",
    "model_version": "3",
    "alias": "champion",
    "feature_pipeline_version": "2024-12-01",
    "ts": datetime.utcnow(),
}
```

#### Model card (governance artifact)

| Section | Content |
|---|---|
| Model details | Name, version, owner, type |
| Intended use | Where deployed; populations served |
| Training data | Source, size, time period, demographics |
| Evaluation data | Held-out vs production |
| Metrics | Overall + per-segment (gender, region, age) |
| Limitations | Known failure modes; under-represented groups |
| Ethical considerations | Privacy, fairness, regulatory implications |
| Caveats | What this model can't do |

> Auto-generate from registry metadata; require for production promotion.

#### Multi-model patterns

| Pattern | Use |
|---|---|
| **Single registry, single stage** | Standard production |
| **Champion / challenger** | Always-on shadow comparison |
| **Per-segment models** | Different model per region / language |
| **Ensemble** | Multiple models combined; register the ensemble |
| **Cascade** | Cheap model first; expensive only on uncertain |
| **Routing** | Different models for different user types |

#### Versioning conventions

| Scheme | Detail |
|---|---|
| **Auto-incremented integer** | MLflow default (1, 2, 3, …) |
| **Semantic** | `major.minor.patch` (e.g., 2.1.0); useful when behavior changes are scoped |
| **Date-based** | `2024-12-01-v1` |
| **Hash-based** | Git SHA suffix |

#### Registry security & access

| Concern | Mitigation |
|---|---|
| Who can promote to production? | RBAC; registry permissions |
| Approval workflow | PR-based promotion |
| Audit log | Track every stage transition |
| Model artifact integrity | Sign artifacts; verify on load |
| Sensitive training data | Don't store raw data in registry; reference by ID |

#### Registry vs feature store

| Registry | Feature store |
|---|---|
| Stores **models** | Stores **features** |
| Versioning of trained artifacts | Versioning of feature definitions + values |
| Used at deploy time | Used at training and serving time |
| Both should integrate | Cross-reference: model knows its features' versions |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Hard-coding model file path in production | Load via registry alias |
| No promotion process | Define gates + automation |
| Only one stage (everything → production) | Use staging + canary |
| Deleting old versions | Archive instead — needed for audits, rollback, debugging |
| Production model with no metadata | Required: training run, metrics, owner |
| Registry as a glorified file store | Use lifecycle stages + lineage |
| No automated rollback | Wire one-click rollback |
| Manual promotions outside CI | Automate; auditable |
| Registry tightly coupled to one cloud | Use MLflow OSS for portability |

#### Decision: build vs buy

| Need | Choice |
|---|---|
| < 10 models, small team | MLflow OSS |
| Cloud-native infra (AWS / GCP / Azure) | Native registry |
| Cross-cloud, vendor-neutral | MLflow + S3 |
| LLM / huggable models | Hugging Face Hub |
| Want strong UI / experiment ties | W&B |
| Strict compliance / on-prem | Roll your own with audit logging |

#### Workflow checklist

| Step | Pre-promotion | Post-promotion |
|---|---|---|
| Register model + metadata | ✓ | — |
| Run gating tests | ✓ | — |
| Document model card | ✓ | — |
| Manual review (if regulated) | ✓ | — |
| Canary deploy | — | ✓ |
| Monitor drift / metrics | — | ✓ |
| Auto-rollback if metric breach | — | ✓ |

**Rule of thumb:** **registry is the source of truth for production models**. Production code loads by **alias / stage**, not version number — promotion swaps versions atomically without redeploy. Store **lineage** (training run, data version, code SHA) with each version. Automate **promotion gates** (metric thresholds, fairness, latency). Practice **rollback** before you need it. Don't delete archived versions — needed for audit, debugging, rollback.
