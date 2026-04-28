### System Design: Video Streaming (YouTube / Netflix) — Transcoding & Delivery

**Scope:** general video streaming case study — upload, transcode, store, stream with adaptive bitrate. For deeper splits see:

- [youtube_uploaded_video_processing_*.md](youtube_uploaded_video_processing_transcoding_cdn_adaptive_playback.md) — VOD-specific deep dive
- [live_video_streaming_*.md](live_video_streaming_ingest_transcoding_ll_hls_webrtc_cdn_chat.md) — live broadcast specifics

**Two product modes — different latency budgets:**

| Mode | Window | Examples | Storage |
|---|---|---|---|
| **VOD** (Video on Demand) | Async after upload | YouTube, Netflix, Vimeo | All renditions + raw original |
| **Live** | Continuous, near real-time | Twitch, YouTube Live, sports | Live window only; recording → VOD |

**Pipeline:**

```
Creator / publisher
        ↓ resumable upload (or RTMPS for live)
   Upload Service (auth + metadata + idempotency key)
        ↓
   Object Store (S3 / GCS / Azure Blob) — raw original
        ↓
   Transcoding Pipeline (async, DAG)
        ↓
   Per-rendition outputs (240p / 360p / 480p / 720p / 1080p / 4K, multiple codecs)
        ↓
   Packaging (HLS / LL-HLS / DASH)
        ↓
   Origin Storage
        ↓
   CDN Edge ─► Viewer Player (ABR adaptive bitrate)
```

**Components:**

| Component | Job |
|---|---|
| Upload Service | Auth, metadata, resumable upload sessions |
| Object Store | Durable raw + processed media |
| Transcoding Pipeline | Decode source once, fan out renditions in parallel |
| Packager | Cut chunks (2–10 s), build manifests |
| Origin Storage | Source-of-truth for CDN |
| CDN | Fan-out to viewers; absorb 99%+ of traffic |
| Player | ABR — selects rendition based on throughput / buffer |
| Metadata Service | Title / description / tags / privacy / view count |
| Recommendation | ML pipeline using watch events |
| Analytics | Watch events, QoE telemetry |
| Rights / DRM | Premium content protection (Widevine, FairPlay, PlayReady) |

**Upload — direct-to-storage pattern:**

| Property | Why |
|---|---|
| **Pre-signed URL** to object store | App tier doesn't proxy GB of bytes |
| **Multipart / resumable** upload | Survives network drops |
| **Atomic on completion** | Upload finalize → trigger pipeline |
| Metadata recorded **before** processing completes | Video shows as "uploaded, processing" |

**Transcoding — the expensive part:**

| Concern | Detail |
|---|---|
| Decode source once, encode many | Avoid redundant decode passes |
| Parallel renditions | One worker per `(rendition, codec)` |
| Hardware (GPU / ASIC) | Per-rendition cost dominated by encode |
| Codec coverage | H.264 baseline; AV1 / VP9 / H.265 for premium quality + bandwidth |
| Per-title encoding (Netflix) | Different bitrate ladders per content (animation vs sports) |
| Two-pass encoding | Better quality at same bitrate; slower |
| Chunked / distributed encoding | Split source by time, encode chunks in parallel, stitch |
| Async via queue | Workers pull from SQS / Kafka / Pub/Sub; idempotent on retry |

**Lowest-rendition-first strategy — minimize "watchability latency":**

| Order | Why |
|---|---|
| 240p / 360p first (fastest encode) | Video becomes watchable in ~minutes |
| 480p / 720p next | Standard quality follows |
| 1080p / 4K / 60fps last | Premium tier; expensive; for popular content |

> Optimize for **time-to-first-playable rendition**, not full-quality completion.

**Adaptive Bitrate Streaming (ABR) — what the player does:**

| Step | Detail |
|---|---|
| 1 | Player fetches **master manifest** (lists renditions + bitrates) |
| 2 | Picks initial bitrate (conservative or hint-based) |
| 3 | Pulls 2–10 s segments from CDN |
| 4 | Measures throughput, buffer, dropped frames |
| 5 | Switches up/down within ladder; abandons stalling rendition |

**Master manifest example (HLS):**

```
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,CODECS="avc1.42c01e,mp4a.40.2"
360p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720,CODECS="avc1.4d401f,mp4a.40.2"
720p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
1080p/playlist.m3u8
```

**Streaming protocol comparison:**

| Protocol | Latency | CDN-friendly | Use |
|---|---|---|---|
| **HLS** | 10–30 s | ✅ Universal | Default broadcast / VOD |
| **LL-HLS** | 2–6 s | ✅ Good | Modern live |
| **DASH** | 4–15 s | ✅ | Non-Apple ecosystems |
| **WebRTC** | < 1 s | ❌ Hard | Interactive, not mass broadcast |

**Storage layout (typical):**

| Bucket / prefix | Holds |
|---|---|
| `raw/<video_id>/source.mp4` | Original upload (canonical) |
| `processed/<video_id>/<rendition>/seg_NNN.m4s` | Per-rendition video segments |
| `processed/<video_id>/audio/seg_NNN.m4s` | Audio segments (per language / track) |
| `processed/<video_id>/master.m3u8` | Master manifest |
| `processed/<video_id>/<rendition>/playlist.m3u8` | Per-rendition manifest |
| `processed/<video_id>/thumbs/sprite.jpg` | Scrubbing thumbnails |
| `processed/<video_id>/captions/<lang>.vtt` | Subtitles |

**CDN role — absorbs viewer fan-out:**

| Property | Detail |
|---|---|
| Cache hot segments at edge | Most viewers hit a cache, never the origin |
| Origin shield (mid-tier) | Absorbs cache misses across many edges |
| Pre-warm trending content | Anticipate viral spikes |
| Per-region edge selection | Players hit nearest POP |
| Authentication / signing | Premium content via signed URLs / tokens |
| Tiered cache TTL | Long for VOD, short for live |

**DRM / premium content:**

| System | Used for |
|---|---|
| **Widevine** (Google) | Chrome, Android, Chromecast |
| **FairPlay** (Apple) | Safari, iOS, tvOS |
| **PlayReady** (Microsoft) | Edge, Xbox, smart TVs |
| **CENC** (Common Encryption) | One encrypted asset, multiple DRM systems |
| **License server** | Issues per-session decryption keys |

**Rate-adaptation algorithms (player-side):**

| Algo | Idea |
|---|---|
| **Throughput-based** | Pick rendition matching recent download speed |
| **Buffer-based** (BBA) | Fill buffer first; quality second |
| **MPC** (Model Predictive Control) | Optimize over future window |
| **Pensieve** (ML-driven) | Learned policy from real-world playback data |

**QoE metrics — what to measure:**

| Metric | Why |
|---|---|
| **Startup time** | Click-to-first-frame |
| **Rebuffer ratio** | Time spent buffering / total play time |
| **Average bitrate** | Quality delivered |
| **Bitrate switches** | Frequent up/down = jarring |
| **Failed plays** | Users who never see a frame |
| **Watch time / completion** | Engagement |

**Recommendations + analytics — separate pipeline:**

| Topic | Detail |
|---|---|
| Watch events streamed via Kafka | Raw signals to warehouse + ML feature store |
| Per-user watch history | Drives personalization |
| Embeddings for content + users | Two-tower retrieval, then ranking |
| A/B test infrastructure | Most user-facing knobs are experiments |

**Failure modes:**

| Failure | Recovery |
|---|---|
| Transcode worker crashes | Idempotent retry; partial output ignored |
| Origin slow on cache miss | CDN serves stale-while-revalidate; pre-warm hot videos |
| Player loses connection | Reconnect; resume from last segment |
| Bad codec on a device | Master manifest exposes alternatives; player falls back |
| Live stream encoder disconnects briefly | Keep session warm for reconnect window |
| Geo / DRM mismatch | Player surfaces error; fallback to lower-DRM rendition if allowed |

**Scaling levers:**

| Pressure | Lever |
|---|---|
| Upload throughput | Direct-to-S3 + multipart |
| Transcode capacity | Spot / preemptible workers; chunked encoding |
| Read traffic | CDN absorbs 99%+; origin only on miss |
| Metadata reads | Read replicas + Redis cache for popular videos |
| Recommendation latency | Pre-computed top-K per user; rerank per request |
| Storage cost | Cold tier for raw; precompute renditions only for popular |

**Cost knobs:**

| Lever | Effect |
|---|---|
| Storage tier (hot vs cold) | Move raw + low-traffic content to cheaper storage |
| Codec coverage | AV1 / VP9 ↓ egress vs H.264 ↑ encoding cost |
| Per-title encoding (Netflix-style) | Optimal ladder per content type |
| Selective rendition production | Don't pre-make 4K for low-engagement content |
| CDN egress | Largest line item — codec efficiency drives this |

**Common interview tradeoffs:**

| Question | Tradeoff |
|---|---|
| Pre-render all renditions vs popular only | Storage cost vs first-watch latency for tail |
| Single vs multi-codec | More codecs = better device coverage + bandwidth, but more storage + transcode |
| Long segments (10 s) vs short (2 s) | Longer = better cache hit rate; shorter = lower latency, faster ABR switch |
| One global region vs per-region | Locality vs operational complexity |
| In-house transcoding vs MediaConvert / Mux | Build vs buy |

**Cross-references in this corpus:**

| Topic | File |
|---|---|
| Live ingest + LL-HLS specifics | [live_video_streaming_*.md](live_video_streaming_ingest_transcoding_ll_hls_webrtc_cdn_chat.md) |
| YouTube uploaded-video deep dive | [youtube_uploaded_video_processing_*.md](youtube_uploaded_video_processing_transcoding_cdn_adaptive_playback.md) |
| CDN basics | [aws_cloudfront_*.md](../../devops/cloud_aws/aws_cloudfront_cdn_origin_behaviors_cache_invalidation.md) |
| Proximity / geo-CDN routing | [proximity_service_*.md](proximity_service_yelp_google_maps_geohash.md) |

**Pitfalls:**

| Pitfall | Effect |
|---|---|
| Transform-then-load (no raw kept) | Can't re-derive after a logic bug |
| Synchronous transcode in upload path | Upload latency tied to encode time |
| One giant codec / rendition | Bad device coverage; bandwidth waste |
| Origin on the hot path | Saturates under traffic spikes |
| Forgot DRM until launch | Painful retrofit |
| No QoE metrics in production | Can't tell if changes helped |

**Rule of thumb:** **direct-to-storage upload, async multi-rendition transcoding, CDN-fronted segment delivery.** Optimize for **time-to-first-playable rendition**, not full-quality completion. **HLS / LL-HLS / DASH** for the wire; **WebRTC only for interactive low-latency**. The hard parts are **transcoding cost** and **CDN egress** — codec choice and per-title encoding move these the most. Always preserve raw; transforms are reproducible from it.
