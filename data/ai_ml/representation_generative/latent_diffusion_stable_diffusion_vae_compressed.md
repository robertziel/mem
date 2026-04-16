### Latent Diffusion — The Stable Diffusion Foundation (2021)

**Paper:** "High-Resolution Image Synthesis with Latent Diffusion Models" (Rombach et al., 2021). Became Stable Diffusion when released open-source in 2022.

**Why it mattered:** DDPM (pixel-space diffusion) is expensive — denoising a 512×512 image means processing 786,432 values per step × 1000 steps. Latent Diffusion compresses images to a 64×64 latent first, then does diffusion there — 64× fewer values, making high-resolution generation actually affordable on consumer GPUs.

**The two-stage pipeline:**
```
Stage 1: Train a VAE (autoencoder) to compress pixels ↔ latents
  Image (512×512×3 = 786K dims)
         │ Encoder
         ▼
  Latent (64×64×4 = 16K dims)    ← 48× compression
         │ Decoder
         ▼
  Image (512×512×3)

Train VAE with reconstruction loss + perceptual loss + adversarial loss.
VAE is frozen after pretraining; used only as encoder/decoder.

Stage 2: Train a diffusion U-Net in LATENT space
  z_0 (clean latent) ← Encoder(image)
  Forward: z_0 → z_1 → ... → z_T (noise)
  Reverse: learn U-Net to predict noise in latent space

Sampling: denoise in latent space (fast, small tensors),
          then decode back to pixels via VAE decoder.
```

**Why it works — two key insights:**

**1. Perceptual compression is lossless-ish:**
```
The VAE learns to discard imperceptible high-frequency details
while preserving semantic content.

Human vision can't tell the difference between:
  - Original 512×512 image
  - Compressed 64×64 latent → decoded back to 512×512

But the 64×64 latent is 48× cheaper to process.
All the "interesting" generation happens in latent space.
```

**2. Text conditioning via cross-attention:**
```
Original DDPM: unconditional or class-conditional generation
Latent Diffusion: text-conditional via cross-attention

Text prompt → CLIP text encoder → text embeddings
U-Net has cross-attention layers where latent features attend to text:

  attn_out = softmax(Q_latent · K_text / √d) · V_text

This injects text conditioning at every denoising step.
```

**Architecture:**
```
Text prompt ("a red bird in a tree")
       │
       ▼
CLIP text encoder → text embeddings (77 × 768)
       │
       │
Random noise z_T
       │
       ▼
┌──────────────────────────────────────────────┐
│ U-Net Denoiser (with cross-attention)         │
│   Encoder: ResBlock → CrossAttn(text) →       │
│            SelfAttn → Downsample              │
│                   │                            │
│                   ▼                            │
│   Bottleneck: CrossAttn + SelfAttn            │
│                   │                            │
│                   ▼                            │
│   Decoder: Upsample → SelfAttn →              │
│            CrossAttn(text) → ResBlock          │
└──────────────────────────────────────────────┘
       │  (repeat 20-50 denoising steps)
       ▼
Clean latent z_0 (64 × 64 × 4)
       │
       ▼
VAE Decoder → Image (512 × 512 × 3)
```

**Stable Diffusion — open-source release (2022):**
```
Released under a permissive license by Stability AI:
  - Weights publicly available (huggingface.co/runwayml/stable-diffusion-v1-5)
  - Can run on a single consumer GPU (8GB VRAM)
  - Spawned the entire open-source image generation ecosystem

Model size: 860M params (SD 1.5) vs DALL-E 2's billions
  → democratized generative AI
  → LoRA fine-tuning, ControlNet, inpainting, all built on top
```

**Typical sampling:**
```
Steps: 20-50 (not 1000 like raw DDPM)
Guidance scale: 7-12 (classifier-free guidance strength)
Sampler: DPM++, Euler-a, DDIM, or modern ones

On a consumer GPU (e.g., RTX 3090):
  512×512 image: ~2-5 seconds per image
  Batch of 4: 5-10 seconds
```

**Control beyond text prompts:**

| Technique | What it does |
|---|---|
| **Img2Img** | Start from partial noise on an input image → generate variations |
| **Inpainting** | Mask part of image, regenerate only masked region |
| **ControlNet** | Condition on edge maps, depth maps, poses — fine spatial control |
| **LoRA** | Lightweight fine-tuning (~10MB) to learn new styles/subjects |
| **Textual Inversion** | Learn a new token embedding for a specific concept/person |
| **IP-Adapter** | Use an image as a prompt (image-to-image conditioning) |

**Evolution of Latent Diffusion models:**

| Model | Year | Change |
|---|---|---|
| **SD 1.x** (2022) | 2022 | Original 860M, 512×512 |
| **SD 2.x** | 2022 | Better aesthetics, 768×768 |
| **SDXL** | 2023 | 3.5B params, two-stage (base + refiner), 1024×1024 |
| **SD3** | 2024 | Multimodal DiT (Diffusion Transformer) architecture |
| **FLUX** | 2024 | Black Forest Labs, state-of-the-art quality, 12B params |

**Video extension — the same principle:**
```
Latent video diffusion:
  1. Encode each video frame to a latent
  2. Add temporal attention to U-Net (frames attend to adjacent frames)
  3. Denoise sequence of latents together
  4. Decode each latent back to a frame

Sora (OpenAI), Runway Gen-3, Stable Video Diffusion all use this.
```

**Cost comparison: pixel vs latent diffusion:**
```
Task: 512×512 image, 50 steps

Pixel diffusion (DDPM on raw pixels):
  50 × U-Net forward passes on 512×512×3 tensors
  ~30 seconds on RTX 3090
  ~24GB VRAM

Latent diffusion (SD):
  50 × U-Net forward passes on 64×64×4 tensors
  + 1 VAE encode (if img2img) + 1 VAE decode
  ~2-3 seconds on RTX 3090
  ~6-8GB VRAM

~10-15× faster, 3-4× less memory.
```

**Rule of thumb:** Don't do diffusion in pixel space — it's wasteful. Train a VAE to compress images 48× (512×512 → 64×64 latents), then do diffusion in latent space, decode back to pixels. Add text conditioning via cross-attention from CLIP embeddings. This is Stable Diffusion's recipe and the foundation of nearly every modern image/video generator. The VAE handles "perceptual details," the diffusion U-Net handles "semantic composition," CLIP handles "text alignment" — separation of concerns at its best.
