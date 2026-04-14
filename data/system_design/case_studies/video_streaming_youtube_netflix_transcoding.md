### System Design: Video Streaming (YouTube/Netflix)

**Requirements:**
- Upload, transcode, store, and stream video
- Adaptive bitrate streaming (quality adjusts to network)
- Support millions of concurrent viewers
- Low startup latency, minimal buffering

**High-level design:**
```
Upload -> [Upload Service] -> [Object Store (S3)]
                                    |
                              [Transcoding Pipeline (async)]
                                    |
                              [Multiple resolutions: 240p, 480p, 720p, 1080p, 4K]
                                    |
                              [CDN Edge Servers]
                                    |
                              [Client Player (adaptive bitrate)]
```

**Key components:**

**1. Upload flow:**
- Client uploads to a pre-signed S3 URL (bypasses app server)
- Upload service validates metadata, triggers transcoding job
- Large files: multipart upload with resume capability

**2. Transcoding (most compute-intensive):**
- Convert original video into multiple resolutions and codecs
- Segment into small chunks (2-10 seconds) for adaptive streaming
- Output: HLS (.m3u8 + .ts chunks) or DASH (.mpd + segments)
- Async via job queue (SQS/Kafka -> worker fleet)
- DAG pipeline: split → transcode per resolution → generate manifest → notify complete

**3. Adaptive Bitrate Streaming (ABR):**
```
Master manifest (.m3u8):
  #EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
  360p/playlist.m3u8
  #EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
  720p/playlist.m3u8
  #EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
  1080p/playlist.m3u8

Client dynamically switches quality based on available bandwidth.
```

**4. Storage:**
- Raw uploads: S3 (one copy)
- Transcoded segments: S3 (multiple resolutions × codecs)
- Metadata: database (title, description, tags, view count)
- Thumbnails: S3 + CDN

**5. CDN and delivery:**
- Cache popular video segments at edge locations
- Long tail: origin fetch from S3
- Pre-warm CDN for trending/viral videos

**Scaling considerations:**
- Transcoding: horizontally scale workers (spot instances for cost)
- Storage: S3 scales infinitely, use lifecycle policies for old content
- Serving: CDN handles the read traffic, origin just for cold cache
- Metadata: read replicas, cache popular video metadata in Redis

**Estimation (YouTube-scale):**
- 500 hours of video uploaded per minute
- Each video transcoded into 5 resolutions = 2,500 hours/min of transcoding
- Average video 10 min, 1080p ≈ 500 MB → 50 MB per minute of video per resolution
- Storage: petabytes per day

**Rule of thumb:** Upload to S3 directly (pre-signed URLs). Async transcode into HLS/DASH segments. CDN for delivery (99%+ of traffic). ABR lets the client adapt quality. The hard part is the transcoding pipeline, not the streaming.
