### Mandelbrot Set (Julia, fractal, complex iteration, escape-time algorithm)

**When:** rendering fractals, visualizing complex dynamics, demonstrating iterative numerical algorithms. The canonical example of "trivial recurrence → infinite complexity".

**Schema (the iteration):**

| Symbol | Definition |
|---|---|
| `c` | Complex number — the point being tested |
| `z₀` | Starting value — **0** for Mandelbrot |
| Recurrence | `z_{n+1} = z_n² + c` |
| In the set | `|z_n|` stays bounded for all `n` |
| Escapes | First `n` where `|z_n| > 2` — the escape iteration count |

> **Escape radius theorem:** if at any step `|z| > 2`, the sequence diverges to infinity. So `|z| > 2` is a *sufficient* escape test.

#### Basic escape-time algorithm

```python
def mandelbrot(c, max_iter=256):
    z = 0
    for n in range(max_iter):
        if z.real * z.real + z.imag * z.imag > 4:    # |z|² > 4 — avoid sqrt
            return n
        z = z * z + c
    return max_iter                                   # assumed in set
```

#### Render template (per-pixel)

```python
def render(width, height, max_iter=256):
    img = [[0] * width for _ in range(height)]
    for py in range(height):
        y = (py + 0.5) / height * 2 - 1               # map to [-1, 1]
        for px in range(width):
            x = (px + 0.5) / width * 3.5 - 2.5        # map to [-2.5, 1]
            img[py][px] = mandelbrot(complex(x, y), max_iter)
    return img
```

#### Optimizations (each independent)

| Technique | Effect |
|---|---|
| Compare `|z|² > 4` instead of `abs(z) > 2` | Skip the `sqrt` per iteration |
| Cardioid + period-2 bulb early-in test | Skips ~50% of pixels (largest interior) |
| Periodicity / cycle detection | Detect orbits → mark in set early |
| x-axis symmetry | Compute only upper half; mirror |
| NumPy / SIMD vectorization | 10–100× pure-Python |
| GPU shader (per-pixel kernel) | 1000×+ |
| Adaptive `max_iter` per zoom level | Avoid wasted iterations at low zoom |

**Cardioid + period-2 bulb interior test (closed-form):**

```python
def in_main_cardioid_or_bulb(c):
    x, y = c.real, c.imag
    if (x + 1) ** 2 + y * y < 1/16: return True       # period-2 bulb
    q = (x - 0.25) ** 2 + y * y                       # main cardioid
    return q * (q + (x - 0.25)) < 0.25 * y * y
```

#### Smooth (continuous) coloring

```python
import math
def smooth_iter(c, max_iter=256):
    z = 0
    for n in range(max_iter):
        if z.real * z.real + z.imag * z.imag > 256:   # larger bailout = smoother
            return n + 1 - math.log(math.log(abs(z))) / math.log(2)
        z = z * z + c
    return float(max_iter)
```

> The `log log` correction removes banding artifacts at the boundary, giving a continuous gradient instead of integer iteration counts.

#### Variants — same iteration framework, different rule

| Variant | Iteration | Twist |
|---|---|---|
| **Mandelbrot** | `z² + c`, `z₀ = 0` | Vary `c`, fix `z₀` |
| **Julia set** | `z² + c`, `z₀ = pixel` | **Fix `c`, vary `z₀`** — each `c` gives a different fractal |
| Multibrot | `zⁿ + c`, `n > 2` | Higher rotational symmetry |
| Burning Ship | `(|Re z| + i|Im z|)² + c` | Take absolute parts before squaring |
| Tricorn (Mandelbar) | `z̄² + c` | Conjugate before squaring — real-axis-symmetric |
| Newton fractal | Newton's method on `f(z) = 0` | Color by which root the iteration converges to |

#### Patterns map

| Goal | Approach |
|---|---|
| Render Mandelbrot | Per-pixel escape time |
| Render Julia | Same loop, swap roles of `c` and `z₀` |
| Smooth gradient coloring | `n + 1 - log(log\|z\|) / log(2)` with bailout = 256 |
| Deep zoom (>10⁻¹⁵) | Switch to **arbitrary-precision** (`mpmath`, `Decimal`) — `float64` runs out |
| Animate exponent / param | Vary one parameter frame-by-frame |
| Distance estimation | Iterate `z'_{n+1} = 2·z_n·z'_n + 1` alongside; `dist ≈ |z|·log|z| / |z'|` |
| Generate boundary curve | Marching squares on the escape-iteration field |

#### Mathematical facts (for color)

| Property | Detail |
|---|---|
| Connected | The Mandelbrot set is connected (Douady–Hubbard) |
| Boundary | Hausdorff dimension = 2 (locally fills 2D) |
| Period bulbs | Each disk-shaped bulb corresponds to a periodic orbit of a fixed period |
| Self-similar mini-copies | Tiny "mini-Mandelbrots" embedded at every scale along the boundary |
| Bailout vs precision | Larger bailout → smoother coloring; deeper zoom → more precision required |

#### Complexity

| Quantity | Cost |
|---|---|
| One pixel | O(max_iter) complex ops |
| Full image (W × H) | O(W · H · max_iter) |
| Deep zoom | Multiply per-iter cost by precision word count |

> Most CPU time goes to **boundary pixels**, which exhaust `max_iter` before settling. Interior optimizations skip those entirely.

#### Pitfalls

| Mistake | Fix |
|---|---|
| `abs(z) > 2` calls `sqrt` per iteration | Compare squared magnitudes |
| Pixel-corner mapping (off-by-half) | Use `(px + 0.5) / width` for pixel centers |
| `float` precision at deep zoom | Switch to `mpmath` / `Decimal` past ~10⁻¹⁵ |
| Forgetting periodicity check on interior pixels | Wastes `max_iter` iterations on guaranteed-in-set points |
| Same `max_iter` at all zoom levels | Scale `max_iter` with zoom; high zoom needs more |
| Confusing Mandelbrot with Julia | Mandelbrot: vary `c`. Julia: fix `c`, vary `z₀` |

**Rule of thumb:** **escape-time algorithm**: iterate `z² + c` until `|z|² > 4` or `max_iter`. Speed up with **squared magnitudes**, **cardioid / bulb skip**, **periodicity detection**, and **vectorization**. For deep zoom, switch to **arbitrary-precision floats**. Mandelbrot vs Julia: same loop, **swap which side is fixed**.
