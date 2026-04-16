### AlexNet — The CNN Breakthrough (2012)

**Paper:** "ImageNet Classification with Deep Convolutional Neural Networks" (Krizhevsky, Sutskever, Hinton, 2012).

**Why it mattered:** Won ImageNet 2012 with top-5 error 15.3% vs 26.2% for runner-up (a 10+ percentage point margin — unprecedented). Reignited deep learning after decades of winter. Every modern vision model traces back to this paper.

**The architecture (8 layers):**
```
Input: 224 × 224 × 3 RGB image
  │
  ▼
Conv1: 96 filters, 11×11, stride 4 → 55×55×96
  ReLU + Local Response Normalization + Max Pool (3×3, stride 2)
  │
  ▼
Conv2: 256 filters, 5×5, pad 2 → 27×27×256
  ReLU + LRN + Max Pool
  │
  ▼
Conv3: 384 filters, 3×3, pad 1 → 13×13×384
  ReLU
  │
  ▼
Conv4: 384 filters, 3×3, pad 1 → 13×13×384
  ReLU
  │
  ▼
Conv5: 256 filters, 3×3, pad 1 → 13×13×256
  ReLU + Max Pool
  │
  ▼
FC6: 4096 units + ReLU + Dropout(0.5)
  │
  ▼
FC7: 4096 units + ReLU + Dropout(0.5)
  │
  ▼
FC8: 1000 units + Softmax → ImageNet class probabilities

Total params: ~60M (most in FC6/FC7)
```

**Five key innovations (most still used today):**

**1. ReLU instead of sigmoid/tanh:**
```
ReLU(x) = max(0, x)

Advantages:
  + No vanishing gradient for x > 0 (gradient = 1)
  + 6× faster training convergence than tanh
  + Sparse activations (many neurons output 0)

Before AlexNet: tanh/sigmoid standard, training was slow
After: ReLU became default for all neural networks
```

**2. GPU training (2 GPUs, 5-6 days):**
```
2012: GPUs (NVIDIA GTX 580, 3GB each) barely had enough memory
  → Model split across 2 GPUs (model parallelism)
  → Conv layers talk only every few layers (sparse connections)
  → Trained on ImageNet (1.2M images, 1000 classes) in 5-6 days

This proved deep learning scales with GPU compute, launching
the GPU arms race that continues today.
```

**3. Dropout (0.5 in FC layers):**
```
During training: randomly zero out 50% of FC layer activations
During test: use all activations, scaled by 0.5

Effect: prevents co-adaptation of neurons, reduces overfitting
  60M parameters on 1.2M images → severe overfitting risk
  Dropout was the key regularizer that made it work
```

**4. Data augmentation:**
```
Image translations: random 224×224 crops from 256×256 image
Horizontal reflections: flip left-right
PCA color augmentation: add multiples of principal components to RGB

Effectively multiplied training data by 2048× (without extra labels)
```

**5. Overlapping pooling:**
```
Pool size 3×3, stride 2 → windows overlap
(Previous: non-overlapping pools where stride = size)

Reduced top-5 error by ~0.4%, harder to overfit
```

**Local Response Normalization (LRN) — the one innovation that didn't stick:**
```
Normalize activations across adjacent channels at each spatial position.
Biologically-inspired "lateral inhibition."

Later replaced by:
  - Batch Normalization (Ioffe & Szegedy, 2015)
  - Layer Normalization (transformers)
LRN is mostly historical now.
```

**Impact timeline:**
```
2012: AlexNet wins ImageNet (15.3% top-5 error)
2013: ZFNet (improved AlexNet) wins (14.8%)
2014: VGGNet (simpler, deeper, all 3×3 convs) + GoogLeNet (Inception)
2015: ResNet (152 layers, residual connections) — 3.57% error, surpasses human
2017-2020: EfficientNet, scaling laws for CNNs
2020+: ViT starts replacing CNNs for very large datasets

Every step built on AlexNet's foundations: convolution + ReLU + dropout +
GPU training + data augmentation.
```

**What we'd change today:**

| AlexNet (2012) | Modern (2020+) |
|---|---|
| LRN | BatchNorm / LayerNorm |
| 11×11 large kernels | Stacked 3×3 small kernels (VGG style) |
| Dropout in FC | Smaller FC or global avg pool (ResNet) |
| 2-GPU model parallelism | Data parallelism on many GPUs |
| Manual split across GPUs | Standard frameworks (PyTorch DDP) |
| SGD with momentum | AdamW, learning rate warmup + cosine |

**Rule of thumb:** AlexNet's recipe — convolutional layers + ReLU + dropout + data augmentation + GPU training — defined modern deep learning. Five innovations (ReLU, GPU, dropout, augmentation, overlapping pools) all became standard; only LRN was discarded. The 10+ point ImageNet margin ended the "AI winter" and kicked off the deep learning revolution. Every CNN and even ViT trace their lineage back to this 8-layer network.
