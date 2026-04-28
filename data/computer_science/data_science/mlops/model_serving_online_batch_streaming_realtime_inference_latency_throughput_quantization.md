### Model Serving (online / batch / streaming, real-time inference, latency, throughput, quantization)

**When:** moving a trained model from notebook to production traffic. **Latency, throughput, cost, and reliability** become first-class concerns. Choice of pattern (online / batch / streaming) determines the whole architecture.

**Schema:**

| Pattern | Latency | Use case |
|---|---|---|
| **Online (real-time)** | < 100 ms typical | Search, ranking, fraud, recommendations |
| **Batch** | Hours | Daily churn lists, recommendations refresh, scoring |
| **Streaming** | Seconds | Continuous prediction on event streams |
| **On-device / edge** | < 10 ms | Mobile / IoT / privacy-sensitive |
| **Async / queue-based** | Seconds–minutes | LLM generation, image processing |

#### Online inference architecture

```
[Client request]
     ↓
[Load balancer / API gateway]
     ↓
[Inference service]
   ├─ Pull features from feature store
   ├─ Pre-process (scaling, encoding)
   ├─ Predict (model)
   ├─ Post-process (calibration, business logic)
   └─ Log (request, features, prediction, model version)
     ↓
[Response to client]
```

#### Latency budget

| Component | Typical |
|---|---|
| Network | 5–20 ms |
| Feature lookup | 1–10 ms |
| Pre-processing | 1–5 ms |
| **Model inference** | 1–50 ms |
| Post-processing | 1–5 ms |
| Logging | 1 ms (async) |
| **Total p95** | **20–100 ms** |

> Profile **each stage**. Often the bottleneck is feature lookup or pre-processing, not the model itself.

#### Serving frameworks

| Framework | Strength |
|---|---|
| **TensorFlow Serving** | Mature; high throughput; gRPC + REST |
| **TorchServe** | PyTorch native |
| **NVIDIA Triton** | Multi-framework; GPU optimization; ensembles |
| **BentoML** | Python-first; multi-framework; Docker out of the box |
| **KFServing / KServe** | Kubernetes-native |
| **Seldon Core** | K8s + advanced patterns (canary, A/B, ensembles) |
| **Ray Serve** | Python-first; scalable |
| **MLflow Serving** | Tied to MLflow registry |
| **FastAPI + custom** | Roll-your-own; lots of flexibility |
| **AWS SageMaker / Vertex AI / Azure ML** | Managed cloud serving |

#### Model packaging

| Format | Frameworks |
|---|---|
| **ONNX** | Cross-framework; portable to TensorRT, OpenVINO |
| **TorchScript** | PyTorch deployment |
| **SavedModel** | TensorFlow |
| **TensorRT engine** | NVIDIA GPU; aggressive optimization |
| **CoreML** | Apple devices |
| **TFLite** | Mobile / edge |
| **GGUF / GGML** | Quantized LLMs (CPU-friendly) |

> Convert to **ONNX** for portability; **TensorRT** for max GPU performance; **TFLite / CoreML** for edge.

#### Optimization techniques (latency / cost)

| Technique | Effect |
|---|---|
| **Batching** | Group requests; amortize fixed overhead | Higher throughput, slightly higher latency |
| **Quantization** (FP32 → INT8 / FP16) | Smaller, faster | 2–4× speedup; small accuracy loss |
| **Knowledge distillation** | Train smaller student from larger teacher | Smaller model, similar accuracy |
| **Pruning** | Remove redundant weights | Sparse model; needs sparse-aware runtime |
| **Operator fusion** | Combine adjacent ops in graph | Lower memory bandwidth |
| **Caching** | Memoize predictions for repeat queries | Massive when traffic is skewed |
| **Hardware (GPU / TPU / inferentia)** | Specialized accelerators | 10–100× over CPU on appropriate models |
| **Mixed precision** | Mix FP16 / FP32 in graph | Faster matmul without full INT8 |
| **Dynamic batching** | Variable batch size per inference call | Adapts to load |
| **Compile (TVM, XLA, TensorRT)** | AOT optimization | Best with fixed input shapes |
| **Caching feature lookups** | In-memory hot keys | Sub-ms lookups |

#### Quantization (the cheapest big win)

| Type | What |
|---|---|
| **Post-training** (PTQ) | Convert trained model FP32 → INT8 without retraining |
| **Quantization-aware training** (QAT) | Simulate quantization during training; better accuracy |
| **Dynamic quantization** | Quantize weights, leave activations FP32 |
| **Static quantization** | Quantize both weights and activations; needs calibration data |
| **Mixed precision** | FP16 / BF16 for compute, FP32 for accumulation |

```python
# PyTorch dynamic quantization (one line for many models)
import torch.quantization
quantized = torch.quantization.quantize_dynamic(model, dtype=torch.qint8)
```

| Approach | Memory | Speedup | Accuracy loss |
|---|---|---|---|
| FP32 baseline | 100% | 1× | 0 |
| FP16 | 50% | 1.5–2× | tiny |
| INT8 (PTQ) | 25% | 2–4× | 0–2% |
| INT8 (QAT) | 25% | 2–4× | < 0.5% |
| INT4 (LLMs) | 12.5% | 3–5× | 1–3% |

#### Batch inference

```python
# Daily batch scoring
import pandas as pd

users = pd.read_parquet("s3://users/2024-12-15.parquet")     # 10M users
features = feature_store.get_batch_features(users["user_id"])
preds = model.predict(features)                               # vectorized
write_to_warehouse(preds)
```

| Use | Detail |
|---|---|
| Daily / weekly cohort scoring | Standard |
| Feature backfill | Re-compute over historical data |
| LLM evaluation | Batch over test set |
| Clustering / segmentation | Run on full user base |

#### Streaming inference

```
[Kafka topic] → [Consumer (Flink / Spark Streaming / custom)]
                       ↓
            [Feature lookup + predict]
                       ↓
              [Output topic / sink]
```

| Use | Detail |
|---|---|
| Real-time fraud | Score each transaction |
| Real-time personalization | React to user click stream |
| Anomaly detection | Per-event scoring |
| IoT telemetry | Continuous classification |

#### Model serving stack patterns

| Pattern | Detail |
|---|---|
| **Sidecar** | Model in same pod as application |
| **Centralized service** | One inference service per model, multiple consumers |
| **Mesh** | Models talk to each other (cascades, ensembles) |
| **Edge** | Model deployed on device |

#### Scaling

| Strategy | Detail |
|---|---|
| **Horizontal** | More replicas behind a load balancer |
| **Vertical** | Bigger machines (GPU / RAM) |
| **Auto-scaling** | Based on QPS / CPU / queue depth |
| **Caching** | Skip model entirely on repeat queries |
| **Sharding** | Different models per shard / region |

#### Cold start

| Issue | Fix |
|---|---|
| First request after pod start is slow | Pre-warm with synthetic requests |
| GPU memory loading | Keep models warm; use GPU memory wisely |
| LLMs / huge models | Pre-load to GPU; share across requests |

#### Observability for serving

| Metric | What |
|---|---|
| QPS | Requests per second |
| p50 / p95 / p99 latency | Distribution of response times |
| Error rate | 4xx / 5xx |
| Throttle / queue depth | Saturation indicator |
| GPU utilization | If applicable |
| Memory usage | Pod-level |
| Cache hit rate | If caching |
| Per-model version traffic split | Canary status |

> Standard infra observability (Prometheus + Grafana, Datadog) applies; **add per-model labels** to all metrics.

#### Deployment patterns (recap from MLOps memo)

| Pattern | Description |
|---|---|
| **Shadow** | Both run; new only logged |
| **Canary** | Gradually ramp new version |
| **Blue-green** | Atomic switch |
| **A/B test** | Random users get new |
| **Multi-armed bandit** | Adaptive allocation |

#### LLM-specific serving

| Concern | Approach |
|---|---|
| Token-level streaming | Server-sent events or websocket |
| KV cache | Reuse across decoding steps |
| Speculative decoding | Smaller model proposes; bigger verifies |
| Continuous batching | Pack multiple requests into one forward pass |
| Quantization (4-bit, 8-bit) | INT8 / INT4 for inference |
| vLLM / TGI / SGLang | Specialized LLM-serving runtimes |
| Token caching | Reuse prefix computation across same-prompt requests |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Loading model per request | Load once at startup |
| Sync / blocking inference | Use async; thread pools |
| No batching | Underutilizes GPU |
| Float64 in production | FP32 / FP16 / INT8 — much faster |
| Too-large batch (latency tail) | Tune batch size by p95 latency |
| One pod handling all models | Resource contention; isolate |
| Untyped predictions | Validate inputs / outputs |
| Logging in synchronous path | Async / queue-based logging |
| No timeout on slow inference | Cap inference; return error |
| Sharing model object across threads | Some frameworks not thread-safe |
| GPU oversubscription | Schedule by GPU memory, not CPU |
| Same model file for all environments | Version-pin per env |

#### Cost optimization

| Technique | Saves |
|---|---|
| Quantize | 2–4× compute |
| Distill | 5–10× compute |
| Cache hot predictions | 50%+ of compute on skewed traffic |
| Use CPU for small models | 5–10× cheaper than GPU |
| Right-size GPUs | T4 / A10 vs A100 by model size |
| Spot / preemptible instances | 50–70% off |
| Auto-scale down off-peak | Linear with traffic |
| Batch instead of online when possible | 10× cheaper per prediction |
| Combine multiple models per pod | Share GPU memory |

#### Decision tree

```
Required latency?
├─ < 100 ms  → Online (FastAPI / Triton / Seldon / KFServing)
│   ├─ Tabular model        → CPU-only fine
│   └─ Deep learning        → GPU + batching + quantization
├─ < 10 s    → Async / queue-based (Ray Serve, LLM serving)
├─ < 1 hour  → Streaming (Flink / Kafka Streams)
└─ Daily     → Batch (Spark / Airflow / dbt)

Edge / privacy needed?
└─ Yes → On-device (TFLite, CoreML, ONNX Runtime Mobile)
```

#### Smoke / load testing

| Test | What |
|---|---|
| Smoke | Single prediction returns expected shape / valid value |
| Load | Sustained QPS; measure p50/p95/p99 |
| Soak | Long-running; memory leaks |
| Stress | Find breaking point |
| Adversarial | Malformed inputs, injection |

```python
# Quick load test with locust or k6
# locust -f load_test.py --users 100 --spawn-rate 10
```

#### Reliability essentials

| Concern | Mitigation |
|---|---|
| Model crash | Health checks; auto-restart |
| GPU OOM | Right-size; circuit-breaker |
| Slow request | Timeout + fallback (cached, default) |
| Bad version | Canary + rollback |
| Spike traffic | Auto-scale + queue |
| Dependency failure (feature store down) | Circuit-breaker + fallback features |

**Rule of thumb:** **online vs batch is the first decision**. Online needs < 100 ms p95 with feature lookups + inference + logging. Use **batching** + **quantization** + **caching** to hit cost / latency targets. **ONNX / TensorRT** for portable / GPU-optimized; **TorchServe / Triton** for production stacks. **Always log predictions** with model version. Test latency under load before deploying — single-request benchmarks lie about p95.
