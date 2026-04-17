### Photonic Quantum Computing — MBQC with Fusion Gates

**What it is:**
A quantum-computing approach that uses single photons as qubits and performs computation by *measurement* on a large entangled "cluster state" rather than by unitary gates on a fixed register. Linear-optical Bell-state measurements ("fusion gates") stitch small resource states into a larger cluster offline; the computation proceeds by an adaptive sequence of single-photon measurements on that cluster.

**Physics:**
- Qubit encodings: polarization, dual-rail (which-path), time-bin, or GKP (continuous-variable bosonic codes).
- Linear-optical gates: beam splitters, phase shifters, and photon detectors. Two-qubit unitaries between arbitrary photons are *not* deterministic — KLM (Knill–Laflamme–Milburn) shows they can be made asymptotically deterministic via teleportation, at high resource cost.
- Fusion gates (Browne–Rudolph): partial Bell measurements that either fuse two small cluster states into a bigger one (success) or discard a qubit and need retry (failure). Type-I and Type-II fusions have different success-vs-damage trade-offs.
- MBQC: logical gates are implemented by the *basis* of single-qubit measurements on a suitable cluster state. Feed-forward applies Pauli corrections based on earlier outcomes.

**Resource flow (schematic):**
```
  deterministic sources  →  small GHZ / tree states
              ↓
       probabilistic fusion   (retry on failure)
              ↓
         large cluster state
              ↓
       adaptive single-photon measurements
              ↓
                 logical output
```

**Typical numbers / loss budget:**
| Quantity | Target |
|---|---|
| Single-photon source purity | >99% |
| Indistinguishability (HOM visibility) | >98% |
| Waveguide loss | <0.1 dB/cm |
| Detector efficiency | >95% (SNSPD) |
| Fusion success probability | 50% (boosted: 75%) |
| Loss tolerance per photon | ~2–10% (code-dependent) |
| Operating temperature | Room T (detectors ~1–4 K) |

**Why photonic / MBQC:**
- Photons do not decohere in flight — T2 is effectively limited by loss, not dephasing.
- Network-friendly: same platform as quantum-communication links.
- Dominant hardware (waveguides, lasers, SNSPDs) comes from mature integrated-photonics and telecom foundries.

**Strengths:**
- No dilution fridge for the computation itself (detectors sit at ~1–4 K, but optics run at room T).
- Loss, not decoherence, is the figure of merit → concatenation with loss-tolerant codes (e.g., parity encodings, GKP) maps well.
- Naturally distributed — connect modules with optical fiber.
- Room-temperature operation of sources and passive optics.

**Weaknesses:**
- Loss dominates everything: per-photon loss directly eats into logical fidelity and scales multiplicatively through the cluster.
- Probabilistic fusion means huge resource overhead (many retries → need photon multiplexing).
- Deterministic single-photon sources are hard (quantum dots, SPDC + heralding, trapped ions as sources).
- No native deterministic 2Q gate between arbitrary photons.
- Synchronization of many photons in time and mode is a systems problem.

**KLM vs fusion-based MBQC:**
| | KLM (teleportation) | Fusion-based MBQC |
|---|---|---|
| Resource primitive | Ancilla Bell pairs + teleport | Small cluster / GHZ states |
| Gate non-determinism | Repeated teleportation | Repeated fusion |
| Resource overhead | Very large (polynomial but huge) | Lower with boosted fusion |
| Feed-forward needed | Yes | Yes (measurement-based) |

**When to use:**
- Applications needing networked / distributed quantum processing.
- Room-temperature deployments (sensors, QKD front-ends, modular scale-up).
- Systems where loss-tolerant codes are naturally matched (bosonic/GKP).

**Rule of thumb:** Photonic MBQC fights loss instead of decoherence and trades deterministic 2Q gates for cheap entanglement and room-temperature operation; if your end-to-end photon loss isn't engineered down to a few percent, the architecture doesn't close.
