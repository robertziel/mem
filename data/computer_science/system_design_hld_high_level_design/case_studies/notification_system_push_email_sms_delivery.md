### System Design: Notification System (Push, Email, SMS, In-App)

**Scope:** at-least-once delivery, multi-channel, user-preference aware, rate-limited, templated, observable.

**Architecture:**

```
Internal services / events
        ↓
Notification API (validate · auth · dedupe · check prefs · rate-limit)
        ↓
Template Service (render per channel + locale)
        ↓
Priority Queues (per channel + per priority)
        ↓
        ├─► Push Worker  ─► APNs / FCM / WebPush
        ├─► Email Worker ─► SES / SendGrid / Postmark
        ├─► SMS Worker   ─► Twilio / SNS / MessageBird
        └─► In-app Worker ─► WebSocket / DB inbox
        ↓
Status pipeline (delivered / bounced / opened / clicked) ─► Analytics
```

**Channels — what each is good at:**

| Channel | Latency | Cost | Reliability | Best for |
|---|---|---|---|---|
| **Push** (APNs / FCM) | Seconds | ~Free | Device-state dependent | Real-time alerts, app re-engagement |
| **Email** | Seconds–minutes | Cheap | High (with bounce mgmt) | Receipts, digests, account events |
| **SMS** | Seconds | Expensive ($/msg) | Very high | 2FA, urgent / high-stakes |
| **WhatsApp / iMessage** | Seconds | Variable per region | High | International, opt-in marketing |
| **In-app** | Real-time | Free | Only when app open | Inbox notifications, activity feeds |
| **Voice call** | Seconds | Expensive | High | Critical alerts, account-recovery fallback |

**Components:**

| Component | Job |
|---|---|
| **Notification API** | Single intake; auth, validate, idempotency, dedupe, rate limit, preference check |
| **Template Service** | Versioned templates with variable substitution, per-channel formatting, locale |
| **Preferences Store** | Per-user channel opt-in / quiet hours / frequency caps |
| **Priority Queues** | Channel × priority partitions (Kafka / SQS / RabbitMQ) |
| **Channel Workers** | Provider-specific dispatch + retry + status tracking |
| **Provider Adapters** | APNs/FCM/Twilio/SES — abstract retries, bounce parsing, idempotent send |
| **Status Pipeline** | Webhook receivers from providers → notification DB + analytics |
| **DLQ** | Terminal failures for triage |
| **Token / Address Hygiene** | Invalidate dead tokens, suppress bounces |

**Notification record (data model):**

| Column | Purpose |
|---|---|
| `id` (UUID) | Notification identity |
| `user_id` | Recipient |
| `type` | `order_update` / `promo` / `2fa` / ... — drives prefs + priority |
| `channel` | `push` / `email` / `sms` / `inapp` |
| `status` | `pending` / `enqueued` / `sent` / `delivered` / `bounced` / `failed` |
| `template_id` + `template_version` | Reproducible render |
| `payload` (JSONB) | Variables for the template |
| `idempotency_key` | Prevent duplicates from retries |
| `scheduled_at` | For deferred sends |
| `sent_at`, `delivered_at` | Provider event timestamps |
| `retry_count`, `last_error` | Operations + DLQ triage |
| `provider_message_id` | For correlating provider webhooks |

**User preferences shape:**

| Field | Example |
|---|---|
| Per-channel opt-in | `{push: true, email: true, sms: false}` |
| Per-type opt-in | `{order_update: all, promo: email_only, security: all_required}` |
| Quiet hours | `{start: "22:00", end: "08:00", tz: "Europe/Warsaw"}` |
| Frequency cap | `{max_per_day: 5, max_promo_per_week: 2}` |
| Hard / soft preferences | `security` is **transactional** — overrides quiet hours |

**Notification types — different rules per type:**

| Type | Override prefs? | Priority | Rate limit |
|---|---|---|---|
| **2FA / security** (transactional) | **Yes** — must deliver | High | None |
| **Account / order events** (transactional) | Yes | High | Loose |
| **Real-time alerts** (e.g. price drop) | No | Medium | Tight |
| **Engagement** (re-engagement, activity) | No | Low | Daily cap |
| **Promotional / marketing** | No | Low | Weekly cap, must respect opt-out laws |

> **CAN-SPAM / GDPR / CASL:** marketing requires explicit opt-in record + easy unsubscribe + retention policy.

**Reliability patterns:**

| Pattern | What it solves |
|---|---|
| **Idempotency key** on send | Caller retries don't duplicate the message |
| **At-least-once** queue + dedupe at provider | Pick at-least-once + idempotent provider send |
| **Per-provider circuit breaker** | One provider's outage doesn't drag the rest |
| **Per-provider rate limit (token bucket)** | Stay under provider quotas (APNs 1k/conn/s, SES sandbox limits, Twilio long-code throttle) |
| **DLQ after N retries** | Terminal failures triaged, not silently lost |
| **Channel fallback** | Push fails → email; SMS fails → voice call |
| **Bounce handling** | Hard bounce → mark address invalid; soft bounce → retry with backoff |
| **Token expiry / renewal** | APNs/FCM tokens rotate — webhook on `Unregistered` updates store |

**Priority queue layout:**

| Queue | Latency target | Workers |
|---|---|---|
| `notif.push.high` (security/2FA) | < 5 s | Higher concurrency, no rate-limit |
| `notif.push.normal` | < 1 min | Normal concurrency |
| `notif.email.transactional` | < 1 min | Higher concurrency |
| `notif.email.marketing` | < 1 hr | Batched |
| `notif.sms.transactional` | < 30 s | Provider rate-limited |

> **Separate queues** so a marketing blast can't slow down 2FA codes. Independent scaling, independent failure domains.

**Templates:**

| Concern | Approach |
|---|---|
| Variable substitution | Mustache / Handlebars / Liquid |
| Channel formatting | HTML + plain-text fallback for email; truncated UTF-8 for SMS; structured payload for push |
| Localization | Per-locale template variants; user's preferred language from prefs |
| A/B testing | Version templates; route by hash of `(user_id, experiment)` |
| Compliance | Required footer (unsubscribe, physical address) for marketing emails |

**Provider adapter responsibilities:**

| Concern | Detail |
|---|---|
| Auth | Long-lived token (APNs JWT, FCM service account, Twilio API key) |
| Idempotent send | Pass `idempotency_key` if provider supports; else dedupe before send |
| Retries | Provider-specific transient errors only (5xx, 429, network) |
| Webhooks | Parse delivered / bounced / clicked / opened events into status pipeline |
| Rate limit | Honor provider's headers / docs |
| Cost & quota tracking | Per-provider counter for budgeting |

**Push specifics (APNs / FCM):**

| Topic | Detail |
|---|---|
| Token lifecycle | Token issued at install; rotates; can be invalidated |
| Silent push | `content-available: 1` — wakes app, no UI |
| Priority | APNs `5` (best effort) vs `10` (immediate) |
| Collapse key (FCM) / `apns-collapse-id` | Replace older notif of same kind so user doesn't see 30 of them |
| TTL | After this, provider drops if undelivered |
| Dead tokens | Provider returns `Unregistered` / `BadDeviceToken` — remove from store |

**Email deliverability:**

| Knob | Why |
|---|---|
| **SPF** record | Authorize sending IPs |
| **DKIM** signing | Cryptographically prove origin |
| **DMARC** policy | Tell receivers what to do on auth failure |
| Dedicated IP + warm-up | Reputation; cold IPs get throttled / blocked |
| Bounce handling pipeline | Remove hard-bounced addresses immediately |
| Suppression list | Never send to: bounced, complained, unsubscribed, manual block |
| Open / click tracking | Pixel + redirect; respect privacy settings (Apple MPP affects open rates) |

**SMS specifics:**

| Concern | Detail |
|---|---|
| Sender type | Long code / short code / alphanumeric / toll-free — varies by country |
| US 10DLC registration | Required since 2023 — register brand + campaign or get filtered |
| Per-country rules | Some require local sender; Germany/India have strict opt-in laws |
| Cost | Significant per-message; rate limits at carrier |
| Encoding | GSM-7 (160 chars) vs UCS-2 (70 chars) — emoji forces concatenation |
| Two-way / shortcode-keywords | STOP / HELP must be supported (compliance) |

**Scheduling & quiet hours:**

| Feature | Implementation |
|---|---|
| Send-at scheduling | Persist `scheduled_at`; scheduler enqueues at the right time |
| Quiet hours | Skip / defer non-urgent notifs during user's local quiet window |
| Time-zone-aware delivery | Convert quiet window to UTC at send time |
| Optimal-time models | ML model picks the per-user best send time (engagement) |

**Observability — what to dashboard:**

| Metric | Alert when |
|---|---|
| Per-channel send rate | Sudden drop (provider outage, queue stuck) |
| Per-channel delivery latency p95 | Above SLO |
| Per-channel bounce rate | Spike → bad list / sender reputation |
| Provider error rate | Sustained > X% → flip to fallback or pause campaign |
| DLQ depth | Growing → investigation queue |
| Suppression list growth | Health of acquisition funnel |
| Per-template performance | Render error rate, click rate, complaint rate |

**Pitfalls:**

| Pitfall | Effect |
|---|---|
| Calling the API synchronously from a request | Notification slowness ties up user-facing latency |
| One queue for all channels | Marketing flood blocks 2FA delivery |
| No idempotency key | Retries duplicate messages — annoyed users + cost |
| Treating bounces as transient retryable | Permanent damage to sender reputation |
| Forgetting unsubscribe link / footer | Legal violation (CAN-SPAM, GDPR) |
| No per-provider circuit breaker | Twilio outage takes down all SMS |
| Storing dead tokens forever | Wasted sends; some providers throttle senders with high "unregistered" rates |
| No template versioning | Can't roll back a bad template; A/B impossible |
| Logging full payload (PII) | Privacy / compliance issue |

**Rule of thumb:** **separate queues per channel × priority** — a 2FA SMS must never wait behind a marketing blast. **Idempotency keys end-to-end**, **at-least-once with dedupe** at the provider. **User preferences first, transactional types override** (security beats quiet hours). **Per-provider circuit breaker + DLQ** keeps a single outage from cascading. **Honor bounces and suppress** to protect deliverability — sender reputation is hard to earn, easy to lose.
