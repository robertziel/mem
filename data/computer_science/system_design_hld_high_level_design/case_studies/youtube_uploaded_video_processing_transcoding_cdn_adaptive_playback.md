### System Design: YouTube-style Uploaded Video Processing & Delivery

**Scope:** non-live VOD pipeline — creator uploads a file, platform transcodes asynchronously, viewer plays adaptive segments from a CDN.

**Live vs uploaded — pick the right cheatsheet:** for live broadcast see [live_video_streaming_*](live_video_streaming_ingest_transcoding_ll_hls_webrtc_cdn_chat.md). This file is non-live only.

**Pipeline:**

```
Creator → Upload Service → Object Store (raw)
                ↓
            Workflow / Queue
                ↓
   ┌──── validate ──── extract metadata ──── thumbnails
   └──── transcode (multi-rendition, multi-codec) ──── segment + manifest
                                                            ↓
                                                       Origin Store
                                                            ↓
                                                          CDN ── Viewer Player (ABR)
```

**Stages:**

| Stage | Job | Owns | Key choice |
|---|---|---|---|
| Upload service | Issue resumable URL, record metadata, mark "uploaded, unprocessed" | Auth, quota, resumable session state | **Direct-to-storage upload** — app tier never proxies bytes |
| Object store (raw) | Durable canonical original | High durability, lifecycle policies | Cold tier after N days |
| Workflow / queue | Orchestrate async jobs (validate, thumbnail, transcode, policy) | Job graph, retries, idempotency | Per-priority queues; long-tail batch separately |
| Transcode workers | Decode source once → fan out renditions | The expensive stage | GPU/ASIC for popular content; CPU for tail |
| Packager | Cut chunks, build master manifest | Playback protocol shape | HLS or DASH, multi-codec where needed |
| Origin store | Hold processed renditions + manifests | Source of truth for CDN | Object store with byte-range support |
| CDN | Cache hot segments at edge | Viewer fan-out | Hot videos become edge-resident in seconds |
| Playback / manifest service | Resolve `video_id → playback URL`, signing | Geo, DRM, age gating | Short-lived signed URLs |
| Player | ABR — adaptive bitrate selection | Buffer health, throughput, device | hls.js / Shaka / native |

**Why direct-to-storage upload (not through app servers):**

| Win | Reason |
|---|---|
| Resumable across drops | Storage SDK handles partial uploads / multipart |
| App tier doesn't proxy GB-scale bytes | Storage scales independently of metadata APIs |
| Durability guaranteed before any work begins | Lose nothing if a worker crashes mid-pipeline |

**Multi-rendition output strategy — "low-quality first":**

| Rendition tier | Why it ships first |
|---|---|
| 144p / 240p / 360p | Encode finishes fastest → video is watchable immediately |
| 480p / 720p | Common middle tier — completes in seconds-to-minutes |
| 1080p / 4K / 60fps | Slower; arrives later; only for popular long-tail (cost) |

> **Watchability latency** = time from upload finish to first playable rendition. Optimize for *this*, not for full-quality completion.

**Storage layout (typical):**

| Bucket / prefix | Holds |
|---|---|
| `raw/<video_id>/source` | Original upload (canonical, never deleted) |
| `processed/<video_id>/<rendition>/seg_NNN.m4s` | Per-rendition video segments |
| `processed/<video_id>/audio/seg_NNN.m4s` | Per-language audio segments |
| `processed/<video_id>/master.m3u8` | Master manifest (lists renditions) |
| `processed/<video_id>/thumbs/{1..N}.jpg` | Sprite + key thumbnails |
| `analytics/...` | Watch events, QoE telemetry |

**Viewer playback path:**

| Step | What happens |
|---|---|
| 1 | Player calls watch API → metadata + signed manifest URL |
| 2 | Fetch master manifest from CDN (cache miss → origin) |
| 3 | Pick initial rendition (conservative based on connection hint) |
| 4 | Pull short segments (1–6 s) from nearest CDN edge |
| 5 | Measure throughput / buffer / dropped frames |
| 6 | Switch up/down within ladder; abandon stalling rendition |

**Core services:**

| Service | Reads / writes |
|---|---|
| Upload | New uploads → metadata DB |
| Metadata | Title, owner, privacy, publish state |
| Workflow | Job graph for each video |
| Transcode workers | Object store + workflow events |
| Thumbnail / preview | Frames → object store |
| Policy / safety | Holds publishing if violation |
| Playback / manifest | Signed URLs, geo, DRM |
| Analytics pipeline | View events, QoE, watch-time |

**Data stores:**

| Store | Use |
|---|---|
| Object store | Raw + processed media |
| Relational / wide-column DB | Video metadata, ownership, publish state |
| Cache (Redis / Memcached) | Hot watch-page data, manifest URL signing |
| Event pipeline (Kafka, Pub/Sub) | Watch events, QoE telemetry |
| Search index | Title/desc full-text search (Elasticsearch / Vespa) |

**Non-functional requirements:**

| NFR | Implication |
|---|---|
| Massive upload throughput | Direct-to-storage; resumable; chunked |
| Massive read throughput | CDN absorbs reads; origin not on hot path |
| Processing backlog must not affect playback | Separate fleets, separate queues, separate failure domains |
| Idempotent transcode jobs | Retries are safe; output keyed by `(video_id, rendition, params)` |
| Durability for raw uploads | Multi-AZ object store; never delete originals |
| Cost control | Cold tier for raw; precompute only popular renditions; CDN egress is the biggest line item |

**Common tradeoffs:**

| Knob | Cheap side | Premium side |
|---|---|---|
| Renditions to precompute | Popular ones now, others on demand | All renditions immediately |
| Original storage tier | Glacier / Coldline after N days | Hot tier forever |
| Processing priority | Long tail in batch | All immediate |
| Queue topology | Single global | Per-region (locality + isolation) |
| Codec coverage | H.264 only | H.264 + VP9 + AV1 (better quality / cost at egress) |

**What Kafka does *not* do:**

| Kafka good fit | Kafka bad fit |
|---|---|
| Watch / view events | Manifest fetches |
| Workflow state changes | Segment delivery |
| Notifications, recommendations | The viewer playback path |

Viewer pulls manifests + segments from **CDN/origin**, not from a queue.

**Failure modes:**

| Failure | Response |
|---|---|
| Transcode job crashes | Idempotent retry; partial outputs ignored on next run |
| Origin slow on cache miss | CDN serves stale-while-revalidate; pre-warm hot videos |
| Upload stalls mid-stream | Resumable upload session resumed by client |
| Bad codec on a device | Master manifest exposes alternatives; player falls back |
| Policy violation found post-publish | Playback service revokes signed URLs; CDN purge |

**Interview answer skeleton:** "Resumable upload directly to object store. Async workflow extracts metadata, generates thumbnails, and fans out transcode jobs across a rendition ladder (lowest first to minimize watchability latency). Packager produces HLS/DASH manifests. CDN absorbs viewer fan-out; origin only handles cache misses. Player runs ABR off the master manifest. Storage and metadata are decoupled — uploads scale separately from playback."

**Rule of thumb:** **direct-to-storage upload, async multi-rendition transcoding, CDN-fronted segment delivery.** Optimize for **time-to-first-playable rendition**, not full-quality completion. Keep upload, transcode, and playback in **separate failure domains** — a backlog in transcoding must not slow viewers. CDN egress is the largest cost line; codec choice and rendition strategy are how you control it.
