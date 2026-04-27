### CLIP — Contrastive Language-Image Pretraining (2021)

**Paper:** "Learning Transferable Visual Models From Natural Language Supervision" (Radford et al., OpenAI, 2021).

**Why it mattered:** Trained on 400M (image, caption) pairs from the web, CLIP learns a joint embedding space where images and their text descriptions are close. Enables zero-shot image classification (no labels needed), powers text-to-image models (DALL-E 2, Stable Diffusion), and started the multimodal foundation model era.

**The contrastive objective:**
```
Batch of N (image, text) pairs:
  I_1, I_2, ..., I_N  (images)
  T_1, T_2, ..., T_N  (matching captions)

Compute embeddings:
  image_emb_i = ImageEncoder(I_i)    (ViT or ResNet)
  text_emb_i  = TextEncoder(T_i)     (Transformer)

L2-normalize all embeddings.

Similarity matrix (N × N):
  S[i][j] = image_emb_i · text_emb_j * temperature

Loss: cross-entropy that pushes diagonal (matching pairs) up,
      off-diagonal (non-matching pairs) down:

  L = 0.5 * (CE(S, labels) + CE(S.T, labels))
  where labels = [0, 1, 2, ..., N-1]  (each image's correct text is at index i)
```

**Architecture:**
```
┌──────────────┐          ┌──────────────┐
│ Image        │          │ Text caption │
│ (224×224×3)  │          │ (tokenized)  │
└──────┬───────┘          └──────┬───────┘
       │                         │
       ▼                         ▼
┌──────────────┐          ┌──────────────┐
│ Image Encoder│          │ Text Encoder │
│ (ViT or RN50)│          │ (Transformer)│
└──────┬───────┘          └──────┬───────┘
       │                         │
       ▼                         ▼
   512-dim                   512-dim
   embedding                 embedding
       │                         │
       └─────────┬───────────────┘
                 ▼
    Dot product + softmax
    → pull matching pairs together
    → push non-matching apart
```

**Training data:**
- 400M (image, alt-text) pairs scraped from the web (WebImageText, not publicly released)
- No manual labels — supervision comes from naturally-occurring image captions
- Diverse captions teach fine-grained concepts CNNs trained on ImageNet miss

**Zero-shot classification — the killer app:**
```
Problem: classify images into N classes without training on them.

Approach:
  1. For each class name c in ["cat", "dog", "car", ...]:
     prompt = f"a photo of a {c}"
     text_emb[c] = TextEncoder(prompt)

  2. For test image I:
     image_emb = ImageEncoder(I)

  3. Prediction = argmax_c (image_emb · text_emb[c])

Works without ANY training examples of those classes!
CLIP matches ResNet-50 trained on ImageNet, without ever seeing ImageNet.
```

**Why zero-shot works:** The 400M web captions include nearly every concept. "A photo of a golden retriever" appears in training, so the text encoder learns that concept; the image encoder learns what such images look like; they align in the shared embedding space.

**Prompt engineering matters:**
```
Naive:          class_name         ("cat")
Template:       "a photo of a X"   ("a photo of a cat")
Prompt ensemble: average over multiple templates
  - "a photo of a X"
  - "a picture of a X"
  - "X in the scene"
  - "a close-up photo of a X"

Ensemble can improve zero-shot accuracy by 3-5% on ImageNet.
```

**Key use cases beyond classification:**

| Application | How CLIP is used |
|---|---|
| **DALL-E 2, Stable Diffusion** | Text encoder conditions image generation |
| **Image search** | Index images by CLIP embedding; query with text or image |
| **Content moderation** | Text describes forbidden content → flag similar images |
| **Image captioning** | Retrieve closest captions for an image |
| **Visual Q&A** | Score candidate answers against image |
| **OpenCLIP, SigLIP** | Open-source reproductions; SigLIP uses sigmoid loss (better) |

**Limitations:**
```
- Fine-grained distinctions (bird species, medical images) — data quality matters
- Counting objects ("3 apples" vs "5 apples") — poor
- Spatial reasoning ("left of", "above") — poor
- Text rendering in images — CLIP sees visual text as shapes, not language
- Biases from web data (gender, race stereotypes in captions)
```

**Follow-up work:**

| Model | Year | Change |
|---|---|---|
| **ALIGN** (Google) | 2021 | 1.8B noisier pairs — scale beats data cleaning |
| **CoCa** | 2022 | Add caption generation loss alongside contrastive |
| **SigLIP** | 2023 | Sigmoid pairwise loss instead of softmax — better scaling, no batch-size dependency |
| **EVA-CLIP** | 2023 | Scale to 5B params + masked image modeling pretraining |
| **DINOv2** | 2023 | Pure self-supervised image (no text) — rivals CLIP for some tasks |

**Relationship to other multimodal models:**
```
CLIP = image ↔ text embedding alignment (discriminative)
DALL-E 2 = CLIP text encoder + diffusion decoder (generative image)
LLaVA / GPT-4V = CLIP-style image encoder → LLM (generative text from image)

CLIP embeddings are the "glue" that connects vision and language in
nearly every modern multimodal system.
```

**Rule of thumb:** Train two encoders (image + text) with contrastive loss on (image, caption) pairs — pull matching pairs together, push non-matching apart. Gets you a joint embedding space where you can compare images and text directly. Zero-shot classification: embed class names as "a photo of a X", pick the closest match. Works because web captions cover nearly every concept. CLIP is the foundation of modern vision-language models — DALL-E, Stable Diffusion, and multimodal LLMs all use CLIP-style encoders.
