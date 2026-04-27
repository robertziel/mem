### Real-Time Decoders — MWPM, Union-Find, Neural Nets

**What it is:** The classical algorithms that consume syndrome histories from a QEC code and emit Pauli corrections (or logical-observable predictions) in real time. For a surface code at distance `d`, the decoder sees `~d² · d` detector bits per patch per `d`-round window and must output corrections before the next window ends — typically within microseconds on superconducting hardware.

**Problem statement:** Given the detector-event graph (nodes = detectors that fired, edges = physical error probabilities), find the most likely set of errors consistent with the syndrome. This is the *maximum-likelihood decoding* problem. For topological codes it reduces to graph matching.

**Decoders — the main options:**

| Decoder | Complexity | Latency (d=11) | Accuracy | Hardware |
|---|---|---|---|---|
| Minimum-Weight Perfect Matching (PyMatching v2) | `O(n^{1.5})` avg | ~ms on CPU | Near-optimal | CPU / streaming |
| Union-Find (Delfosse–Nickerson) | `O(n α(n))` | ~10 μs | ~2× worse `p_L` | FPGA-friendly |
| Neural-net (AlphaQubit, DeepMind 2024) | `O(n)` inference | μs on TPU | **Best on real data** | GPU / TPU |
| Belief Propagation + OSD (for QLDPC) | `O(n d_max)` | variable | Tunable | CPU |
| Tensor-network decoders | exponential in patch | slow | Near-ML | Research |

**MWPM — Minimum-Weight Perfect Matching:**
- Model the syndrome graph: nodes = fired detectors + virtual boundary nodes. Edge weight = `-log(p_edge)` where `p_edge` is the probability of the error that would flip those two detectors.
- Find a perfect matching minimizing total weight → Edmonds' blossom algorithm, `O(n³)` classical.
- Modern implementations: PyMatching v2 uses sparse blossom / Fowler streaming → near-linear practical runtime.
- Near-optimal for *independent X/Z* error models on the surface code. Loses optimality for correlated X-Z (Y errors) unless decomposed carefully.

**Union-Find decoder:**
- Grow "clusters" of detectors greedily, merging neighbors when cluster parity flips.
- Once every cluster has even parity, pick any spanning tree inside each cluster → correction.
- Much faster than MWPM (`~10×`), loses ~15–30% threshold margin.
- Ideal fit for FPGA implementations on dedicated control hardware.

**Neural-net decoders:**
- Train a transformer (AlphaQubit) or CNN on simulated + real hardware syndrome data.
- Learns the true correlated noise model — beats MWPM significantly on real Google Willow data because MWPM assumes independent errors.
- Drawback: black box, needs retraining when hardware drifts, large memory footprint.

**Code — PyMatching example:**
```python
import stim, pymatching, numpy as np

circuit = stim.Circuit.generated("surface_code:rotated_memory_z",
                                 distance=7, rounds=7,
                                 after_clifford_depolarization=0.001)
dem = circuit.detector_error_model(decompose_errors=True)
matcher = pymatching.Matching.from_detector_error_model(dem)

sampler = circuit.compile_detector_sampler()
shots = sampler.sample(10_000, append_observables=True)
dets, obs = shots[:, :-1], shots[:, -1]
predictions = matcher.decode_batch(dets)       # ~100k shots/s on a laptop
print("logical error rate:", float((predictions.flatten() != obs).mean()))
```

**Latency vs accuracy — the core trade-off:**

Decoders sit on the critical FT path. If decoder takes longer than `d × (round time)`, either you stall the quantum processor (wasting coherence) or you back off to a faster, less-accurate decoder (paying in logical error rate). The "decoder budget" is a scarce resource.

| Hardware | Round time | Decoder budget |
|---|---|---|
| Superconducting (SC) | ~1 μs | ~10 μs |
| Neutral atoms | ~ms | ~10 ms |
| Trapped ions | ~ms | ~10 ms |
| Photonic | <ns | <ns — fundamentally different story |

**Pitfalls:**
- Correlated X-Z errors (Y errors) break naïve matching decoders. Decompose into X and Z graphs with shared edges, or use correlated-matching variants.
- Neural decoders overfit to simulator — performance can degrade on real devices if drift isn't retrained.
- Offline / batch decoding tells you nothing about real-time viability; always report streaming latency.

**Rule of thumb:** MWPM is accurate but slow; union-find is fast but ~2× worse `p_L`; neural nets win on real noisy hardware but demand dedicated silicon. For the current generation of superconducting FT demos, streaming sparse-blossom MWPM on FPGAs is the workhorse.
