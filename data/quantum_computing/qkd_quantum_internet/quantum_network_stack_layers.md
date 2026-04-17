### Quantum Network Stack — Layered Architecture Analogous to TCP/IP

**What it is:**
A proposed layered abstraction for a future quantum internet, first articulated by Wehner, Elkouss, Hanson (2018) and refined by Dahlberg et al. (2019 SIGCOMM). Each layer offers a service to the one above and hides the physics below, mirroring how TCP/IP decouples applications from radio PHY. The central shared object of a quantum network is not the *packet* but the *Bell pair*: everything above the physical layer is really about creating, routing, and consuming entanglement.

**Stack at a glance:**
```
+-----------------------------------+----------------------------------+
|  Application layer                |  QKD apps, distributed QC,       |
|                                   |  clock sync, blind computation    |
+-----------------------------------+----------------------------------+
|  Transport layer (qubit)          |  Reliable qubit delivery via     |
|                                   |  teleportation; flow control;    |
|                                   |  sequencing of entangled units   |
+-----------------------------------+----------------------------------+
|  Network layer                    |  Long-distance entanglement:     |
|                                   |  routing, swapping, scheduling    |
|                                   |  across repeater chains          |
+-----------------------------------+----------------------------------+
|  Link layer                       |  Robust elementary Bell pairs    |
|                                   |  on one physical hop:             |
|                                   |  heralded generation + retry     |
+-----------------------------------+----------------------------------+
|  Physical layer                   |  Photon transfer, memory ops,    |
|                                   |  optical detection, sync          |
+-----------------------------------+----------------------------------+
```

**Services each layer provides (up) and requires (down):**
| Layer | Output service | Input requirement |
|---|---|---|
| Physical | Attempts at photon transfer, memory write/read | Clocks, calibrated hardware |
| Link | On-demand Bell pair between adjacent nodes (with fidelity metadata) | Physical: many attempts/s |
| Network | Bell pair between any two nodes in the network | Link: elementary pairs + swaps |
| Transport | Reliable, in-order *qubit* delivery (via teleportation of payload) | Network: pairs + classical channel |
| Application | User-level primitives (secret key, anonymous message, circuit) | Transport: qubits on demand |

**Link layer — the crucial one in early networks:**
A typical link-layer request is "give me k Bell pairs of fidelity ≥ F within time T." The layer returns success/fail and metadata (which memory slot, what Bell state, age, measured fidelity). Provides abstraction over probabilistic, heralded elementary-pair generation. Analogous to Ethernet / 802.11: many retries invisible to layers above.

**Network layer — entanglement routing:**
```
  A ─── R₁ ─── R₂ ─── R₃ ─── B          physical topology

  A ========(end-to-end Bell pair)======= B
            realised by: link(A,R₁)
                       + link(R₁,R₂)
                       + link(R₂,R₃)
                       + link(R₃,B)
                       + swap @R₁, R₂, R₃
```
Routing chooses a path; scheduling coordinates when links attempt; swapping is executed at intermediate nodes. Analogous to IP routing — but the "datagram" is a Bell pair that must live until all swaps complete, and decoherence replaces TTL.

**Transport layer — qubit delivery:**
Given an end-to-end Bell pair (from the network layer) and a classical channel, teleport the payload qubit; sequence and acknowledge like TCP. Distillation may sit here or in the network layer. Offers services like "deliver this n-qubit block with fidelity ≥ F_target" with retransmission = redo-the-teleportation.

**Analogy summary:**
| Quantum | Classical | Similar because | Different because |
|---|---|---|---|
| Physical | PHY | raw medium | no-cloning; probabilistic |
| Link | MAC/Ethernet | per-hop reliability | resource is entanglement, not bits |
| Network | IP | routing, best-effort delivery | stateful — pairs age, decohere |
| Transport | TCP | reliable, ordered | reliability via teleportation + distillation, not retransmit |
| Application | HTTP/DNS/etc. | user services | new primitives (blind QC, anonymous transmission, clock sync) |

**What changes vs TCP/IP (deeper than the analogy):**
- **State everywhere**: each intermediate node holds a live qubit in a memory; cannot drop and retry without regenerating.
- **Time-critical**: decoherence clocks are running — scheduling is the scarce resource, not bandwidth.
- **Multiplicative success**: probabilistic success at every layer; end-to-end rate is the product. Link layer must offer statistics, not just success/fail.
- **Classical companion channel** carries heralding, syndrome, and teleportation bits — it is mandatory, not optional.
- **No cloning → no caching**: caches and CDNs have no quantum analogue; precomputation is limited to pre-sharing entanglement.

**Pitfalls:**
- **Layer violations are tempting**: distillation crosses link↔network; clock sync crosses physical↔transport. Resist unless justified.
- **Fidelity is the new latency**: exposing only success/fail at the link layer hides the single most important metric.
- **Routing metrics** differ from IP: want to minimise expected time-to-distribute a pair of sufficient fidelity, not hop count.
- **Stage of network maturity** determines which layers exist: current trusted-node nets basically stop at a link layer + centralised key-management app.

**Rule of thumb:** The quantum-internet stack is TCP/IP with Bell pairs instead of packets — physical attempts feed a link layer that produces elementary pairs, the network layer routes and swaps them into end-to-end pairs, and the transport layer teleports payload qubits over those pairs; decoherence plays the role of TTL and fidelity replaces latency as the first-class metric.
