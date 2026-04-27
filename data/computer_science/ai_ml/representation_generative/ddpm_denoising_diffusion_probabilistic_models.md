### DDPM — Denoising Diffusion Probabilistic Models (2020)

**Paper:** "Denoising Diffusion Probabilistic Models" (Ho, Jain, Abbeel, 2020).

**Why it mattered:** Made diffusion models competitive with GANs for image generation, with stable training and diverse outputs. Foundation of DALL-E 2, Stable Diffusion, Midjourney, and essentially all modern image/video generation.

**The core idea — learn to reverse noise:**
```
Forward process (fixed, adds noise):
  x_0 → x_1 → x_2 → ... → x_T (pure Gaussian noise)
  Each step adds a small amount of Gaussian noise.

Reverse process (learned, removes noise):
  x_T → x_{T-1} → ... → x_1 → x_0 (clean image)
  A neural network learns to predict the noise at each step.

Training: take clean image x_0, add noise to get x_t at random timestep t,
train network to predict the noise ε that was added.

Sampling: start with pure noise x_T, iteratively denoise using the trained
network. After T steps, get a clean image from the learned distribution.
```

**The math (simplified):**
```
Forward: x_t = √(α_t) · x_0 + √(1 - α_t) · ε     where ε ~ N(0, I)

  α_t is a "noise schedule" — controls how much noise is added at each step.
  α_1 ≈ 1 (almost no noise), α_T ≈ 0 (pure noise).

Training loss (simplified):
  L = E_{t, x_0, ε} [ || ε - ε_θ(x_t, t) ||² ]

  ε_θ is the neural network (usually a U-Net with time embedding).
  It takes noisy image x_t and timestep t, predicts the noise ε.

Reverse (sampling):
  x_{t-1} = (1/√α_t) · (x_t - (β_t / √(1-α_t)) · ε_θ(x_t, t)) + σ_t · z
  where z ~ N(0, I)
```

**Architecture: U-Net + time embedding:**
```
Input: x_t (noisy image) + timestep t
  │
  ▼
Time embedding: t → sinusoidal encoding → MLP → time embedding vector
  │
  ▼
U-Net:
  ┌──────────────────────────────────────┐
  │ Encoder (downsample):                 │
  │   Conv → ResBlock (with time emb) →   │
  │   AttnBlock → Downsample              │
  │         │                              │
  │         ▼                              │
  │   Bottleneck (attention + ResBlock)   │
  │         │                              │
  │         ▼                              │
  │ Decoder (upsample):                    │
  │   Upsample → ResBlock (skip conn) →    │
  │   AttnBlock                           │
  └──────────────────────────────────────┘
  │
  ▼
Output: predicted noise ε (same shape as input)
```

**Noise schedule (linear, cosine, etc.):**
```
Linear (original DDPM): β_t = linear from 1e-4 to 0.02 over 1000 steps
Cosine (improved DDPM): smoother, better image quality

T (number of steps):
  Training: usually 1000 steps
  Sampling: full 1000 steps → slow (minutes per image)

This slowness is DDPM's big weakness.
```

**DDPM vs GANs — the trade-off:**

| Aspect | GAN | DDPM |
|---|---|---|
| Training stability | Hard (mode collapse, hyperparameter sensitive) | Stable, standard MSE loss |
| Sample quality | Sharp, can be SOTA | Competitive with GANs (2020), then surpassed |
| Mode coverage | Often misses modes | Covers full distribution |
| Sampling speed | Fast (1 forward pass) | Slow (1000 forward passes) |
| Likelihood | Not well-defined | Proper probabilistic model, computable |

**Speeding up sampling (post-DDPM):**

| Method | Year | Steps needed |
|---|---|---|
| **DDIM** (Deterministic DDPM) | 2020 | 50-100 |
| **Progressive distillation** | 2022 | 8-16 |
| **Consistency Models** | 2023 | 1-4 (near single-step) |
| **Latent Diffusion** | 2021 | Same 50-1000 but in compressed latent space (much cheaper) |
| **Flow Matching / Rectified Flow** | 2023 | 1-few steps |

**Classifier-free guidance (CFG) — the quality trick:**
```
Train model both with and without conditioning (e.g., text prompt).
Randomly drop conditioning during training (~10-20% of batches).

At inference, combine predictions:
  ε_final = ε_uncond + w · (ε_cond - ε_uncond)
  where w > 1 is the "guidance scale"

Effect: amplifies the conditional signal → sharper adherence to prompt
Trade-off: higher w = more faithful to prompt, but less diversity

CFG scale of 7-15 is typical in Stable Diffusion.
```

**Impact and successors:**
```
DDPM (2020) → Improved DDPM (2021) → Classifier-Free Guidance
  → Latent Diffusion (2021) → Stable Diffusion (open, released 2022)
  → DALL-E 2 (2022, OpenAI) → Imagen (2022, Google)
  → Midjourney, SDXL, FLUX, video diffusion models

All modern generative image models descend from DDPM's noise-prediction
formulation + classifier-free guidance.
```

**Relationship to score-based models:**
```
Diffusion models and score-based models (Song & Ermon) converged:
  - Score matching: learn ∇_x log p(x) — the "score" function
  - DDPM: learn to predict noise ε
  - These are mathematically equivalent (up to a scaling factor)

Modern formulation: SDE (Stochastic Differential Equations) unifies them.
The reverse-time SDE is the denoising process.
```

**Rule of thumb:** Train a U-Net to predict the noise added to a clean image at a random timestep. At generation time, start from pure Gaussian noise and iteratively denoise over 1000 steps. Classifier-free guidance makes the model follow prompts strongly (scale ~7-15). DDPM traded sampling speed for training stability + mode coverage (opposite of GANs). Slow sampling was DDPM's weakness → Latent Diffusion (pixel → latent space) + distilled samplers (DDIM, consistency models) made it fast enough for production. Every modern image generator descends from this noise-prediction formulation.
