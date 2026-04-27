### ViT (Vision Transformer, 2020)

**Paper:** "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale" (Dosovitskiy et al., Google, 2020).

**Why it mattered:** Showed that pure transformers — no convolutions, no vision-specific inductive biases — can match or beat CNNs on image classification when trained on enough data. Opened the door to unified vision-language models (CLIP, DALL-E, multimodal LLMs).

**The core idea — treat an image as a sequence of patches:**
```
Input image: 224 × 224 × 3 RGB

Step 1: Split into patches (e.g., 16×16 each)
  → 14 × 14 = 196 patches
  → each patch is 16 × 16 × 3 = 768 values (flattened)

Step 2: Linear projection → patch embeddings (d=768)
  Each patch becomes a token, like a word in NLP

Step 3: Add [CLS] token and positional embeddings
  [CLS, patch_1, patch_2, ..., patch_196]  (197 tokens total)

Step 4: Standard Transformer encoder (L layers)
  Multi-head self-attention + MLP + residuals + LayerNorm

Step 5: Classification from [CLS] token
  Linear head on final [CLS] embedding → class logits
```

**Architecture:**
```
┌─────────────────────────────────────┐
│ Image (H × W × C)                    │
└────────────────┬────────────────────┘
                 │ split into P × P patches
                 ▼
┌─────────────────────────────────────┐
│ N patches, each P×P×C                │  N = HW/P²
└────────────────┬────────────────────┘
                 │ flatten + linear projection
                 ▼
┌─────────────────────────────────────┐
│ Patch embeddings (N × D)             │  D = 768 for ViT-Base
└────────────────┬────────────────────┘
                 │ prepend [CLS], add positional embeddings
                 ▼
┌─────────────────────────────────────┐
│ Token sequence ((N+1) × D)           │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ Transformer Encoder (L layers)       │
│  - Multi-head self-attention         │
│  - MLP (4× expansion, GELU)          │
│  - Pre-LayerNorm + residual          │
└────────────────┬────────────────────┘
                 │ take [CLS] final embedding
                 ▼
┌─────────────────────────────────────┐
│ MLP head → class logits              │
└─────────────────────────────────────┘
```

**Model sizes:**
| Model | Layers | Hidden dim | Heads | Params |
|---|---|---|---|---|
| ViT-Base (ViT-B/16) | 12 | 768 | 12 | 86M |
| ViT-Large (ViT-L/16) | 24 | 1024 | 16 | 307M |
| ViT-Huge (ViT-H/14) | 32 | 1280 | 16 | 632M |

Naming: "ViT-B/16" = Base size, 16×16 patches.

**Why CNNs had inductive biases ViT lacks:**
```
CNN built-in priors:
  - Translation equivariance (conv weights shared across spatial positions)
  - Locality (receptive field grows gradually)
  - Scale hierarchy (pooling)

ViT has NONE of these:
  - Every patch can attend to every other patch (global from layer 1)
  - No spatial locality bias
  - Positional info only from learned embeddings

→ ViT needs MORE data to learn these priors from scratch
```

**Data requirements — the key finding:**
```
Training set size      | CNN wins | ViT wins
─────────────────────────────────────────────
ImageNet-1k (1.3M)     | ✓        |
ImageNet-21k (14M)     | ~tied    | ~tied
JFT-300M (300M)        |          | ✓

ViT only beats CNNs with LOTS of data (or pretraining on huge datasets).
On small datasets, CNN's inductive biases help.
```

**Key training tricks:**
- Large-batch training (4096+ batch size)
- AdamW optimizer
- Learning rate warmup + cosine decay
- Strong data augmentation (RandAugment, Mixup, CutMix)
- Pre-train on JFT-300M (Google internal) or ImageNet-21k, fine-tune on target

**ViT variations that address data-hunger:**

| Model | Year | Innovation |
|---|---|---|
| **DeiT** | 2020 | Distillation from CNN teacher → ViT trains on just ImageNet-1k |
| **Swin Transformer** | 2021 | Hierarchical + windowed attention → CNN-like inductive bias back in |
| **MAE (Masked Autoencoder)** | 2021 | Self-supervised: mask 75% of patches, reconstruct → huge data efficiency gain |
| **DINOv2** | 2023 | Self-supervised ViT → state-of-the-art visual representations without labels |

**Impact:**
- CLIP (2021) uses ViT as image encoder → vision-language alignment
- DALL-E 2 / Stable Diffusion use ViT-based image encoders
- LLaVA, Flamingo, GPT-4V feed ViT embeddings to LLMs
- Modern "vision backbones" are increasingly ViT-based

**Rule of thumb:** Split image into fixed-size patches (16×16), flatten each into a token, add positional embeddings, feed to a standard transformer, classify from [CLS] token. ViT beats CNNs only with massive data — use ImageNet-1k + DeiT distillation for smaller budgets. ViT enabled unified vision-language models because images are now "just another token sequence." The 16×16 patch-as-word analogy is the entire insight.
