### Satellite QKD — Free-Space Links from LEO and Beyond

**What it is:**
Quantum key distribution where one endpoint is a satellite in low Earth orbit (LEO, 400–600 km) or higher and the other is an optical ground station. Photons travel mostly through vacuum, with a few kilometres of atmosphere on entry/exit. Used as a long-distance complement to fibre QKD, which is limited by ~500 km practical reach (PLOB bound + detector noise). Demonstrated by China's Micius satellite (2016–2017) with intercontinental keys Beijing–Vienna via a trusted-satellite scheme.

**Why it helps:**
Fibre loss is exponential in length at ~0.2 dB/km. Free-space loss is dominated by geometric beam divergence (power ~ 1/r²) plus a short atmospheric absorption column. Over L = 1 000 km of vacuum + 10 km of atmosphere, total loss can be 30–40 dB — comparable to ~200 km of fibre but reaching globe-spanning distances.

**Link geometries:**
```
        LEO satellite  (moves across the sky in ~5–10 min per pass)
              │
              │   downlink: photon generated on satellite,
              │             detected on ground
              │   uplink:   photon from ground → satellite (harder, more turbulence)
              ▼
   ┌──────────────────────┐
   │  atmosphere  ~10 km  │   ← turbulence, absorption, background
   └──────────────────────┘
              │
        ┌───────────┐        (1–2 m aperture, adaptive optics,
        │  OGS      │         gimbal tracking, single-photon detectors)
        └───────────┘

 Modes:  GEO trusted-node • LEO trusted-node • entanglement distribution
         • MDI-QKD with satellite as untrusted relay (proposed)
```

**Loss budget sketch:**
```
Total loss (dB)  ≈  geometric + atmospheric + pointing + optics + detector

Geometric:        L_geo = 10 log₁₀ [(θ·r / D_rx)²]     (θ beam divergence, D_rx aperture)
Atmospheric:      ~3 dB zenith clear, ~10+ dB at low elevation
Pointing jitter:  1–5 dB with good ADCS + beacon tracking
Total typical:    30–45 dB for a 600 km LEO downlink
```
A 1 GHz source with 35 dB loss yields ~10^(5–6) sifted photons/s → ~kbit/s raw key after error correction and privacy amplification, per pass. Ten-minute pass → a few Mbit per pass per ground station.

**Protocols used/proposed:**
| Protocol | Satellite role | Key note |
|---|---|---|
| Decoy-state BB84 downlink | Source on sat; detectors on ground | Micius 2017 — kbit/s rates |
| Entanglement-based (BBM92/E91) | Sat makes pairs, splits to 2 ground stations | Micius 1200 km entanglement |
| MDI-QKD | Sat as untrusted measurement relay | Removes sat from trust model; harder alignment |
| Twin-field QKD | Sat as phase reference | Squares loss scaling; research |
| Quantum teleportation uplink | Ground → sat teleport | Demonstrates repeater primitives |

**Atmospheric challenges:**
- **Turbulence** (Fried parameter r₀) causes beam wander and scintillation — hurts pointing and couples loss into fades. Adaptive optics helps on ground-to-sat uplink.
- **Background light**: operating during daytime costs orders of magnitude in SNR; most missions fly night-side passes or use narrow spectral/temporal/spatial filtering.
- **Cloud cover** gives hard binary availability — network of ground stations needed for coverage.
- **Polarisation drift** through the Earth's magnetic field and moving optics — reference-frame-independent protocols simplify operations.

**Coverage and key rate:**
| Metric | LEO (Micius-class) | GEO |
|---|---|---|
| Orbit altitude | 400–1200 km | 35 786 km |
| Pass duration per ground station | 3–10 min | continuous |
| Loss (zenith) | 30–40 dB | ~65 dB |
| Key rate per pass | kbit/s–Mbit/s | tens of bit/s |
| Revisit interval | 24 h / sparse | always |
| Constellation for global cover | tens of sats | 3 GEOs |

**Satellite as trusted node:**
In all flown missions the satellite itself is trusted: it does QKD with station A, then with station B, then XORs the two keys. This is the same trust model as ground trusted-node backbones — but the "cable" now spans continents for free.

**Pitfalls:**
- **Daylight operation** needs ultra-narrow filtering; most current links are night only.
- **Acquisition & pointing** at single-photon rates demands beacon lasers, gimbals, and orbit prediction accuracy — the engineering bottleneck.
- **Doppler and timing**: nanosecond synchronisation across a moving 1000-km baseline; GPS plus local oscillators.
- **Regulatory**: lasers that reach orbit also illuminate aircraft — laser-safety coordination required.
- **Thinking it replaces fibre**: it complements fibre for intercontinental links; metro and national nets still want fibre + repeaters.

**Rule of thumb:** Satellite QKD turns globe-spanning distance into ~30–40 dB of mostly-geometric loss, trading fibre's exponential attenuation for once-per-day passes and atmospheric fade; current deployments are trusted-node LEO downlinks delivering kbit/s per pass — useful for key refresh between continents, not for bulk traffic.
