### Design an Online Chess Platform (Chess.com / Lichess scale)

**Requirements:**
- 10M+ daily active users, 1M+ concurrent games
- Real-time move broadcasting (< 100ms perceived latency)
- Matchmaking by ELO rating (fair games)
- Game clock (bullet/blitz/rapid/classical time controls)
- Anti-cheat (detecting engine-assisted play at scale)
- Persistent game history, analysis, study, tournaments
- Multi-region deployment

**Architecture:**
```
┌──────────┐    ┌─────────────────┐    ┌──────────────┐
│  Client  │───>│ Gateway + Auth  │───>│ Matchmaking  │
│ (web/app)│    │ (per-region)    │    │ (ELO-sharded)│
└──────────┘    └────────┬────────┘    └──────┬───────┘
      ▲                  │                    │ game_id
      │ WebSocket        ▼                    ▼
      │          ┌─────────────────┐   ┌──────────────┐
      │          │ Game Server     │   │ Game Store   │
      │          │ (in-memory game │<──│ (PostgreSQL  │
      │          │  state)         │   │  archive)    │
      │          └────────┬────────┘   └──────────────┘
      │                   │                  │
      │           ┌───────▼────────┐    ┌────▼─────────┐
      │           │ Move Broadcast │    │ Anti-Cheat   │
      │           │ (Redis pub/sub │    │ Pipeline     │
      │           │  or NATS)      │    │ (async Kafka)│
      │           └────────────────┘    └──────────────┘
      │
      └── Real-time moves via persistent WebSocket
```

**1. Matchmaking at scale:**
```
Problem: find opponents within ±100 ELO in < 5 seconds.

Approach: Bucketed waitlist, ELO-indexed
  - Waitlist buckets: [0-800], [800-1000], [1000-1200], ... [2400+]
  - Sub-bucketed by time control (bullet/blitz/rapid/classical)
  - Redis sorted set per bucket: ZADD queue:blitz:1400 {rating} {user_id}

Matchmaker worker:
  - Polls each bucket every 500ms
  - Pairs adjacent players (ELO proximity)
  - Expands search window over time:
    - t=0s: ±50 ELO
    - t=5s: ±100 ELO
    - t=15s: ±200 ELO
    - t=30s: any opponent in time control

When matched:
  - Game ID assigned
  - Both clients notified via WebSocket
  - Routed to same Game Server (sticky routing by game_id hash)
```

**2. Game server — where live games live:**
```
In-memory state per active game:
  - Position (FEN or compact bitboard)
  - Move history (UCI list)
  - Clocks (ms remaining per side, last update timestamp)
  - Player metadata (color, rating, connection state)
  - Chat history (recent messages only)

Stickiness:
  - Game ID → consistent-hashed to Game Server
  - Both clients' WebSockets connect to the SAME server
  - If game server crashes: restore from last move in database + Redis

Why in-memory?
  - Moves happen every few seconds
  - Clock updates every 100ms on client, verified server-side
  - Full DB write per move = too slow
  - Only write to DB on game end (or every N moves for long games)

Scaling:
  - 100K games per Game Server (lightweight Go/Rust servers)
  - 10 Game Servers = 1M concurrent games
  - Sharding by game_id hash
```

**3. Real-time move delivery:**
```
Move flow:
  1. White plays e2-e4 → client sends MOVE { game_id, move, client_time }
  2. Game server validates:
     - Legal move? (server-side chess rules — never trust client)
     - Correct turn?
     - Clock has time?
  3. Update in-memory state; adjust clock (use server-authoritative time)
  4. Broadcast to opponent via WebSocket: { move, position, clocks }
  5. Also broadcast to spectators (if any) via Redis pub/sub fan-out
  6. Append to move log in Redis (backup) and queue DB write (async)

Latency budget:
  - Client → gateway: 30-50ms
  - Gateway → game server: 5-10ms (same region)
  - Validation + broadcast: 1-5ms
  - Server → opponent: 30-50ms
  - Total: ~100ms perceived

Clock sync:
  - Server is authoritative (clients display based on server's "clock at last move")
  - Clients extrapolate between moves
  - On reconnect: server sends authoritative clocks
```

**4. ELO rating updates:**
```
ELO adjustment after every game:
  new_rating = old_rating + K * (actual - expected)
  expected = 1 / (1 + 10^((opponent_rating - my_rating) / 400))
  K = 32 (beginners) to 10 (masters)

Implementation:
  - Async queue: game.ended → ratings.update Kafka topic
  - Rating service consumes, updates both players' ratings atomically
  - Cache ratings in Redis for fast matchmaking reads
  - DB is truth-of-record

Provisional ratings:
  - First 20 games: higher K, wider uncertainty
  - Glicko-2 (more accurate than ELO): tracks rating deviation + volatility
```

**5. Anti-cheat — detecting engines at scale:**
```
The hard problem: people use Stockfish/Leela on their phone while playing.

Signal collection (client and server):
  - Mouse/tap patterns (time between moves, consistency)
  - Move centipawn-loss vs Stockfish evaluation (post-game)
  - Rating trajectory (smurfing, sandbagging)
  - Tab-switching / focus loss (browser events — not perfect)
  - Network patterns (reconnect timing, latency changes)

Pipeline:
  - Every game → Kafka topic games.completed
  - Anti-cheat workers analyze:
    - Compute engine-correlation score (how often did player match top engine move?)
    - Flag suspicious games for review
  - High-confidence cheat detection (3+ engine correlation in a week) → auto-ban
  - Lower-confidence → human review queue

Statistical baseline:
  - Player's rating ↔ expected engine correlation (grandmasters match Stockfish 60-70%)
  - Unexpected correlation spike = flag
  - ML classifier combines all signals

Catch rate: Chess.com catches ~1000+ cheaters/day via this pipeline
```

**6. Data model:**
```sql
-- Users + ratings
CREATE TABLE users (
  id            BIGINT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL
);

CREATE TABLE ratings (
  user_id       BIGINT NOT NULL,
  time_control  TEXT NOT NULL,    -- bullet/blitz/rapid/classical
  rating        INT NOT NULL,
  rd            INT,               -- Glicko rating deviation
  games_played  INT NOT NULL,
  PRIMARY KEY (user_id, time_control)
);

-- Games (partition by month for archival)
CREATE TABLE games (
  id            BIGINT PRIMARY KEY,
  white_user_id BIGINT NOT NULL,
  black_user_id BIGINT NOT NULL,
  white_rating  INT NOT NULL,
  black_rating  INT NOT NULL,
  time_control  TEXT NOT NULL,
  result        TEXT,             -- 1-0, 0-1, 1/2-1/2, null if ongoing
  pgn           TEXT NOT NULL,    -- full game notation
  moves_jsonb   JSONB NOT NULL,   -- structured move list for analysis
  started_at    TIMESTAMPTZ NOT NULL,
  ended_at      TIMESTAMPTZ,
  termination   TEXT              -- checkmate/timeout/resign/draw_agreed
) PARTITION BY RANGE (started_at);

-- Anti-cheat signals (append-only)
CREATE TABLE game_signals (
  game_id       BIGINT NOT NULL,
  user_id       BIGINT NOT NULL,
  signal_type   TEXT NOT NULL,
  value         DOUBLE PRECISION,
  created_at    TIMESTAMPTZ NOT NULL
);
```

**7. Spectator / streaming:**
```
Top games have 10K-100K spectators watching live.

Fan-out:
  - Spectators connect to per-game pub/sub channel
  - Game server publishes move → Redis pub/sub / NATS
  - Subscriber WebSocket gateways fan out to spectators
  - Delay: 30-second spectator delay prevents cheating assistance
    (spectators can't feed engine analysis back to player in time)
```

**8. Multi-region:**
```
Regional partitioning:
  - Users matched within their region (reduces latency)
  - Cross-region only for friend challenges or high ratings
  - Each region: full Game Server + matchmaking pool
  - Global: user database (multi-master or region-pinned), tournament registry

Failover:
  - Region loses gateway → connections re-establish to nearest healthy region
  - In-flight games migrate (restore from DB state + current move log)
```

**Capacity estimates:**
```
10M DAU × 3 games/day avg = 30M games/day
30M / 86400s ≈ 350 games/sec starting rate
Avg game duration: 5 min (blitz average)
Concurrent games: 350 × 300s = ~100K steady state, spikes to 1M

Moves per second:
  1M games × 1 move every 10s avg = 100K moves/sec globally
  Peak: 200K moves/sec

Storage:
  30M games/day × 2KB/game PGN = 60 GB/day raw
  Compressed: ~15 GB/day
  With 1-year retention: ~5 TB
```

**Rule of thumb:** Stickily route both players of a game to the same in-memory game server — DB writes are async. Bucket matchmaking by ELO and time control (Redis sorted sets). Validate every move server-side (never trust client). For anti-cheat, stream every completed game to a scoring pipeline (Stockfish engine-correlation analysis). Spectator delay (30s) prevents cheating feedback loops. Multi-region for latency, with graceful cross-region failover.
