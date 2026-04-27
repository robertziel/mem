### System Design: Live Video Streaming (Ingest → Transcode → Package → CDN → Chat)

**Scope:** YouTube Live / Twitch — one-to-many live broadcast. Creator goes live → platform ingests, transcodes, packages, delivers. Live-to-VOD recording. Chat is separate.

**Live vs uploaded video — the core difference:**

| | Uploaded VOD | Live |
|---|---|---|
| Processing window | Async, after upload completes | Continuous, near real-time |
| Latency budget | Minutes acceptable | Seconds — every stage races wall-clock |
| Failure recovery | Re-process from source | Reconnect window, rendition restart, no rewind |

**End-to-end pipeline:**

```
Creator (OBS / mobile)
   │ RTMPS / SRT / WebRTC
   ▼
Ingest Edge ── Auth + Stream Session ── Live Buffer ── Transcoding Ladder
                                                            │ (multi-bitrate)
                                                            ▼
                                                       Packager (HLS / LL-HLS / DASH)
                                                            │
                                                            ▼
                                                         Origin ── CDN ── Viewer Player
                                                            │
                                                            ▼
                                                        Recorder ── VOD storage

Side channels: Chat (WebSocket) · Reactions / counters · QoE analytics
```

**Pipeline stages:**

| Stage | Job | Owns | Common tech |
|---|---|---|---|
| Creator encoder | Captures + encodes locally | Bitrate, keyframe interval | OBS, mobile SDK |
| Ingest edge | Terminate upload protocol, validate stream key, normalize timestamps | First hop, region selection | RTMPS / SRT / WebRTC, near creator POP |
| Stream session service | `stream_key → active session` mapping, status, dedupe publishers | Session lifecycle | Stateful service, Redis-backed |
| Live buffer / stream bus | Short rolling buffer, jitter smoothing | Internal media plumbing | In-cluster, **not** the viewer path |
| Transcoding ladder | Multi-rendition output (240p–1080p+), keyframe-aligned | Most expensive stage | GPU / ASIC, parallel workers |
| Packager / segmenter | Cut chunks, update manifest | Playback protocol shape | HLS / LL-HLS / DASH |
| Origin | Hold current live window + manifests | Source of truth for CDN | Object store / specialized origin |
| CDN edge | Fan-out to viewers, aggressive freshness on newest segments | Caching, geo-routing | Akamai, Cloudflare, Fastly, in-house edge |
| Viewer player | Adaptive bitrate, buffer mgmt, reconnect | Stay near live edge w/o stalling | hls.js / Shaka / native |
| Recorder | Persist while live | DVR + VOD generation | Object store + post-process |
| Chat / reactions | Real-time messaging — **separate** | Independent scaling, never coupled to media | WebSocket fan-out |

**Ingest vs playback protocol — they're usually different:**

| Direction | Common protocol | Why |
|---|---|---|
| Creator → ingest | RTMPS, SRT (lossy networks), WebRTC (interactive) | Low setup cost on encoder side |
| Ingest → viewer | LL-HLS, HLS, DASH | CDN-cacheable, scales to millions |

**Playback protocol comparison:**

| Protocol | Latency | Scales via CDN | Use when |
|---|---|---|---|
| HLS | 10–30 s | ✅ Universal | Default broadcast, large audiences |
| LL-HLS | 2–6 s | ✅ Good | Modern live with CDN — **the winning default** |
| DASH | 4–15 s | ✅ | Non-Apple ecosystems |
| WebRTC | < 1 s | ❌ Hard | Interactive (auctions, gaming, conferencing) — **not** mass broadcast |

**Latency tier — pick the cheapest tier that meets the use case:**

| Tier | Target | Approach | Cost |
|---|---|---|---|
| Standard live | 10–30 s | HLS, larger segments, conservative buffer | Cheapest |
| Low-latency | 2–6 s | LL-HLS, smaller chunks, partial-segment hints | Moderate |
| Ultra-low | < 1 s | WebRTC end-to-end OR LL-HLS aggressive | Expensive (per-viewer state) |

> **Latency vs reliability tradeoff:** smaller chunks → more manifest updates → more rebuffer risk. WebRTC bypasses CDN caching → harder to scale.

**Viewer startup sequence:**

| Step | Action |
|---|---|
| 1 | Player hits Watch API → playback URL + stream metadata |
| 2 | Fetch live manifest from CDN (cache-miss → origin) |
| 3 | Start a few segments **behind** the live edge (safety buffer) |
| 4 | Pull subsequent segments continuously |
| 5 | Measure throughput → adapt bitrate within ladder |
| 6 | Recover from gaps (refresh manifest, reset playhead if needed) |

**State per live stream:**

| Field | Purpose |
|---|---|
| `stream_id`, `creator_id` | Identity |
| `stream_key_hash` | Auth (hash, never raw) |
| `status` | `created` / `live` / `reconnecting` / `ended` |
| `ingest_region` | Where the active publisher is connected |
| `failover_target` | Pre-warmed backup region |
| `started_at`, `ended_at` | Lifecycle |
| `playback_url` | What viewers fetch |
| `dvr_enabled` | Time-shift allowed? |
| `recording_status` | VOD pipeline state |

**Bottlenecks (ranked):**

| Bottleneck | Mitigation |
|---|---|
| Real-time transcoding capacity | GPU/ASIC, autoscale by `(active_streams × ladder_height)` |
| Ingest bandwidth from creator | Edge POPs near creator; SRT for lossy uplinks |
| CDN freshness near live edge | LL-HLS partial segments; tight cache headers; pre-fetch hints |
| Packaging latency | Co-locate packager with transcoder; avoid network hops |
| Player rebuffer under jitter | Adaptive ladder; abandon-rendition logic; conservative target buffer |

**Failure modes:**

| Failure | Response |
|---|---|
| Encoder disconnects briefly | Keep session warm for reconnect window (10–30 s); resume same `stream_id` |
| Transcoder rendition crashes | Restart that worker; other renditions keep flowing |
| CDN edge serves stale manifest | Cache TTL must be ≤ segment duration; trigger purge on rendition change |
| A/V timestamp drift | Re-anchor on next keyframe; player reset if drift > threshold |
| Chat traffic spike | Independent service; doesn't affect media — that's the entire point of separation |

**Scaling patterns:**

| Pattern | Why |
|---|---|
| Partition ingest by stream key / region | Locality + sharding |
| Dedicated worker pools for premium / huge streams | Isolate noisy neighbors |
| Autoscale transcoders by `Σ(active streams × ladder size)` | Cost tracks workload, not viewer count |
| Multi-region ingest failover | Keep stream alive across regional outages |
| Tiered latency offerings | Match cost to product (creator picks tier) |

**What Kafka does *not* do:**

| Kafka good fit | Kafka bad fit |
|---|---|
| Analytics events, telemetry | The viewer media path |
| Stream state changes | Live segment delivery |
| Moderation, notifications, recs | Manifest distribution |

Viewers fetch manifests + segments from CDN/origin, never Kafka.

**Interview-answer skeleton:** "Creator ingests via RTMPS/SRT to a regional edge. Stream session service authenticates and tracks state. Live buffer feeds a GPU-based transcoding ladder producing 4–6 renditions. Packager cuts LL-HLS chunks, origin holds the live window, CDN fans out to viewers. Chat is a separate WebSocket service. Recorder persists in parallel for live-to-VOD. Latency tier (standard / low / ultra-low) drives chunk size and protocol choice."

**Rule of thumb:** **live streaming is a latency-budget problem.** The winning architecture is **`RTMPS/SRT ingest → real-time transcode ladder → LL-HLS package → CDN`**, not WebRTC end-to-end. **Separate media delivery from chat, control, and analytics** — coupling them couples failure modes. Pre-warm failover regions for ingest; absorb viewer fan-out at the CDN, never at origin.
