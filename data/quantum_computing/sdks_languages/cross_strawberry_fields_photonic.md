### Xanadu Strawberry Fields — Photonic CV Quantum Computing

**What it is:**
Strawberry Fields is Xanadu's Python SDK for **continuous-variable (CV) photonic** quantum computing. Unlike the qubit-gate model everyone else uses, CV machines manipulate **qumodes** — harmonic oscillators described by their quadratures `x` and `p` — and operations are things like squeezing, displacement, and beamsplitters. Strawberry Fields provides both a Python eDSL and a standalone domain language, **Blackbird**, for writing these programs, plus Gaussian and Fock-basis simulation backends and a hardware path to Xanadu's Borealis / X-series photonic chips.

**Core objects:**

| Object | Role |
|---|---|
| `sf.Program(n_modes)` | Qumode circuit (context-manager based) |
| `sf.Engine("gaussian" \| "fock" \| "bosonic" \| "tf")` | Execution engine |
| Blackbird (`.xbb`) | Textual photonic program format |
| `sf.ops.*` | Gates: `S`, `D`, `BS`, `R`, `Xgate`, `Sgate`, `Dgate`, `MeasureFock`, `MeasureHomodyne` |
| `sf.RemoteEngine("X8")` | Xanadu cloud hardware endpoint |

**Example — two-mode squeezed vacuum + homodyne:**
```python
import strawberryfields as sf
from strawberryfields.ops import Sgate, BSgate, MeasureHomodyne

prog = sf.Program(2)
with prog.context as q:
    Sgate(0.5) | q[0]
    Sgate(-0.5) | q[1]
    BSgate(0.7854, 0.0) | (q[0], q[1])      # 50:50 beamsplitter
    MeasureHomodyne(0.0) | q[0]
    MeasureHomodyne(0.0) | q[1]

eng = sf.Engine("gaussian")
result = eng.run(prog, shots=1000)
print(result.samples.shape)                  # (1000, 2) real values
```

**Backends and their regimes:**

| Backend | State rep | Handles | Scale |
|---|---|---|---|
| `gaussian` | Covariance matrix + means | Gaussian states & operations only | Thousands of modes |
| `fock` | Truncated Fock basis (`cutoff_dim`) | Arbitrary non-Gaussian (Kerr, cubic phase) | ~10 modes, cutoff ≤ 12 |
| `bosonic` | Mixture of Gaussians | Non-Gaussian via superpositions | ~10–50 modes |
| `tf` | Fock + TensorFlow autograd | Differentiable Fock simulation | Same as fock, slower |

Gaussian is exponentially cheaper but cannot represent Fock-cat or GKP states directly — you need `bosonic` or `fock` for anything past squeezing and linear optics.

**Blackbird — the photonic IR:**
```
name two_mode_squeezed
version 1.0
target gaussian

Sgate(0.5, 0.0) | 0
Sgate(-0.5, 0.0) | 1
BSgate(0.7854, 0.0) | [0, 1]
MeasureHomodyne(0.0) | 0
MeasureHomodyne(0.0) | 1
```
Load with `sf.load("file.xbb")`; dump with `sf.io.to_blackbird(prog)`. Blackbird is what Xanadu's hardware accepts.

**Hardware path:**
```python
eng = sf.RemoteEngine("X8")                 # or Borealis GBS chip
result = eng.run(prog, shots=100000)
```
Current Xanadu photonic chips are **Gaussian Boson Sampling** machines — they sample from photon-number distributions of large interferometers. The native SDK for them is Strawberry Fields + Blackbird.

**When to use:**
- Any CV photonic experiment: squeezing, displacement, cluster states for measurement-based CV QC, GBS sampling, photonic QML.
- Hardware access to Xanadu chips — there is no other first-class Python path.
- Research on GKP / bosonic error-correcting codes, where `bosonic` backend's Gaussian-mixture representation is purpose-built.

**CV vs qubit mental-model table:**

| Qubit-model concept | CV-photonic analog |
|---|---|
| Qubit | Qumode (harmonic oscillator) |
| Pauli-X rotation | `Xgate(s)` — displacement in position |
| Hadamard | `Rgate(π/2)` — phase-space rotation |
| Entangling gate | `BSgate` (beamsplitter), `S2gate` (two-mode squeezer) |
| Computational-basis measurement | `MeasureFock` |
| Hardware-efficient primitive | Squeezing + interferometer |

**Pitfalls:**
- Running non-Gaussian ops (Kerr, cubic phase) on the `gaussian` backend silently ignores them or raises, depending on the op — always check `eng.run_options`.
- Fock cutoff too low → states lose norm without warning; bump `cutoff_dim` until the trace converges.
- Blackbird `target <backend>` is enforced — a file targeting `fock` won't execute on `gaussian`.
- Measurement samples from `MeasureHomodyne` are *real numbers*, not bits — downstream post-processing must treat them as continuous.

**Rule of thumb:** Pick Strawberry Fields whenever the problem is inherently photonic — GBS, CV cluster states, bosonic codes — and stay on the `gaussian` backend until you truly need non-Gaussian resources; never try to squeeze a qubit-gate workflow into it.
