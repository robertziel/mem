### System Design: YouTube-Style Uploaded Video Processing and Delivery

**Scope:**
- Normal uploaded video (not live streaming)
- Path from creator upload to viewer playback
- High-level public architecture, not YouTube internal source code

**What happens end-to-end:**
```text
Creator Upload
  -> Upload Service
  -> Durable Object Store (original file)
  -> Processing Queue / Workflow
  -> Validation + metadata extraction + thumbnail jobs
  -> Transcode into multiple resolutions / codecs
  -> Segment video + generate manifests
  -> Origin Storage
  -> CDN Edge Cache
  -> Viewer Player fetches manifest + segments adaptively
```

**1. Upload path:**
- Client gets an upload session / resumable upload URL
- Video is uploaded directly to durable storage, not through app servers end-to-end
- Upload service records metadata: title, creator, duration, file type, privacy, upload status
- Large uploads use chunked/resumable upload

**Why direct-to-storage matters:**
- App tier avoids becoming a giant file proxy
- Uploads can resume after network interruption
- Storage scales independently from metadata APIs

**2. Immediately after upload:**
- Verify file integrity and parse container metadata
- Extract duration, resolution, frame rate, audio tracks
- Generate thumbnails and preview assets
- Enqueue async processing pipeline
- Mark video as uploaded but not fully processed

**3. Processing pipeline:**
- Decode source once, fan out transcode jobs
- Produce multiple renditions: e.g. 144p, 240p, 360p, 480p, 720p, 1080p, 4K
- Produce multiple codecs where needed for device/network compatibility
- Split outputs into small segments for adaptive playback
- Generate manifests that list available renditions and segment URLs

**Typical outputs:**
- Original upload preserved
- Transcoded renditions
- Audio-only streams
- Thumbnail set
- Playback manifests

**4. Why low quality often appears first:**
- Lower-resolution encodes finish faster
- Platform can make the video watchable earlier while HD/4K continues processing
- Higher resolutions and higher frame rates take longer to process

**5. Storage model:**
```text
Raw Upload Bucket / Store
  -> source video

Processed Origin Store
  -> /video_id/360p/segment_001
  -> /video_id/720p/segment_001
  -> /video_id/audio/segment_001
  -> /video_id/master_manifest
```

**6. Viewer playback path:**
```text
Viewer opens watch page
  -> metadata API returns title, duration, poster, playback info
  -> player fetches master manifest
  -> player picks initial bitrate
  -> player requests small segments from nearest CDN edge
  -> player switches up/down quality based on bandwidth, buffer, device
```

**7. CDN role:**
- Hot video segments cached close to users
- Origin hit only on cache miss or for long-tail content
- Viral videos rapidly become edge-cached
- This is what makes viewer delivery scale, not the origin alone

**8. Adaptive bitrate (ABR) logic:**
- Start quickly with a safe bitrate
- Measure throughput, dropped frames, and buffer health
- Step up quality if bandwidth is stable
- Step down before rebuffering

**What the viewer actually streams:**
- Small media segments, not one giant MP4 from start to finish
- Manifest + segments
- Often separate audio and video tracks on capable clients

**9. Core services in the architecture:**
- Upload service
- Metadata service
- Workflow / job orchestration service
- Transcoding worker fleet
- Thumbnail / preview service
- Rights / safety / policy checks
- Origin storage
- CDN
- Playback / manifest service
- Analytics pipeline

**10. Data stores:**
- Object store for raw uploads and processed media
- Metadata DB for video records, creator ownership, privacy, publish state
- Cache for hot metadata and watch-page data
- Analytics/event pipeline for views, watch time, QoE, buffering

**11. Important non-functional requirements:**
- Massive write throughput on uploads
- Massive read throughput on playback
- Processing backlog isolation from playback path
- Idempotent jobs (transcoding can be retried)
- Strong durability for raw uploads
- Cost control for storage + transcoding + CDN egress

**12. Common interview tradeoffs:**
- Store original forever vs archival tier
- Precompute all renditions vs only popular ones
- Single global queue vs per-region processing queues
- More renditions for QoE vs more storage/compute cost
- Push processing immediately vs batch lower-priority long-tail jobs

**What Kafka is and is not doing here:**
- Kafka can make sense for analytics/events/notifications/workflow events
- Kafka is not the actual viewer video delivery path
- Viewer playback is manifest + segment fetches via CDN/origin

**Publicly visible YouTube-specific clues:**
- YouTube says uploads are available in low quality first, with higher qualities arriving later
- YouTube says one uploaded format is later prepared for many devices and resolutions
- YouTube has described custom transcoding infrastructure to scale this processing efficiently

**Rule of thumb:** For YouTube-style VOD, the hard parts are upload durability, asynchronous transcoding at massive scale, and CDN-based segment delivery. The viewer is not streaming from a queue or event bus; the viewer is pulling adaptive media segments from edge caches.
