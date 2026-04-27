### Trusted-Node QKD Backbones — Operational Reality vs End-to-End Security

**What it is:**
All deployed continental QKD networks today (Beijing–Shanghai backbone, EuroQCI pilots, Tokyo QKD Network, SwissQuantum) are trusted-node networks. Point-to-point QKD segments generate symmetric keys between neighbouring nodes; long-distance keys are stitched together by XORing hop keys inside each intermediate node. Because the stitching is classical and happens in plaintext-adjacent form inside the node, every intermediate node must be trusted — a very different security model from the end-to-end guarantee QKD theoretically provides over a single fibre.

**Architecture:**
```
 Alice ═══QKD═══ N₁ ═══QKD═══ N₂ ═══QKD═══ N₃ ═══QKD═══ Bob
        k_A1         k_12         k_23         k_3B

Hop keys:    k_A1, k_12, k_23, k_3B   (each secret to its pair)

Stitch at every intermediate node:
  N₁:  c₁ = k_A1 ⊕ k_12                    → send c₁ to Bob via classical net
  N₂:  c₂ = k_12 ⊕ k_23                    → send c₂ to Bob
  N₃:  c₃ = k_23 ⊕ k_3B                    → send c₃ to Bob

Bob computes:  k_3B ⊕ c₃ ⊕ c₂ ⊕ c₁
           = k_3B ⊕ (k_23⊕k_3B) ⊕ (k_12⊕k_23) ⊕ (k_A1⊕k_12)
           = k_A1

Alice and Bob now share k_A1.    Each N_i has seen k_{i-1,i} and k_{i,i+1} in clear.
```
A compromised intermediate node trivially recovers the end-to-end key. This is the opposite of the point-to-point information-theoretic guarantee.

**Deployed examples:**
| Network | Length | Nodes | Year | Note |
|---|---|---|---|---|
| SECOQC (Vienna) | ~200 km | 6 | 2008 | First multi-node trial |
| Tokyo QKD Network | ~90 km metro | 6 | 2010 | Mixed vendors, key-management layer |
| Beijing–Shanghai | ~2 000 km | 32 | 2017 | Backbone; government/finance users |
| Micius link-up | 2 600+ km | BSB + satellite | 2018 | Trusted satellite as a node |
| EuroQCI | national | growing | 2023+ | EU-wide infrastructure rollout |

**What QKD actually delivers in these networks:**
- **Key exchange** only — not encryption. Generated keys feed a standard symmetric cipher (AES-256, OTP for short msgs).
- **Hop-by-hop information-theoretic security** per QKD link (assuming physical-layer assumptions hold).
- **Classical-like security end-to-end**: trust reduces to trust in the nodes, like any key-distribution PKI. No advantage over well-audited classical KDCs for the end-to-end threat model.

**Key management layer (what vendors actually ship):**
```
+------------------------+
|  Application (VPN, DB) | ← ETSI QKD 004/014 API pulls keys
+------------------------+
|  Key-management system | key buffer, reservation, rotation, routing
+------------------------+
|  QKD transceivers      | physical BB84 / CV-QKD / MDI-QKD links
+------------------------+
```

**Trust-reducing alternatives:**
| Option | What it changes | Cost |
|---|---|---|
| Quantum repeaters | No classical stitching — entanglement end-to-end | Not yet deployable |
| MDI-QKD with untrusted relay | Relay is a measurement device; no key exposure there | Still point-to-point; doesn't scale distance |
| Twin-field QKD | Square-root loss scaling | Research; ~500 km records |
| Satellite as a trusted node | Shorter total path, but satellite itself trusted | Political / jurisdictional concerns |
| Post-quantum hybrid | Combine QKD with lattice KEMs so trust breaks only if both fall | Realistic near-term |

**Pitfalls:**
- **Marketing vs reality**: "quantum-secure nationwide network" often means trusted-node, which is *not* quantum-end-to-end.
- **Node physical security** dominates the threat model — fences, TEMPEST, insider risk.
- **Authentication**: classical channels still need an initial shared secret or PQ-signature; QKD alone does not bootstrap identity.
- **Performance**: secret-key rate per link falls rapidly with fibre loss (bits/s at long distance); buffers sized accordingly.
- **Standards**: ETSI GS QKD 014 (API) and 015 (network integration) matter more for procurement than any physical protocol detail.

**Rule of thumb:** Every continental "quantum network" running today is a trusted-node backbone — QKD on each hop, XOR stitching at every intermediate box — which gives per-link quantum security and classical-style end-to-end trust; true end-to-end quantum security requires either MDI/twin-field tricks (short range) or working quantum repeaters (not yet).
