### SQL Analytics — Funnel, Cohort, Retention, Sessionization, LTV, Churn (analytics patterns)

**When:** product / growth analytics — measure conversion through stages, retention by signup cohort, lifetime value, churn timing, session-based behavior. The standard SQL recipes that data analysts and DS use weekly. Most "metrics" questions reduce to one of these patterns.

**Schema (the analytics primitives):**

| Pattern | Question |
|---|---|
| **Funnel** | "What % of users complete each step in this flow?" |
| **Cohort retention** | "Of users who signed up in week N, how many are still active by week N+k?" |
| **Sessionization** | "Group events into sessions with X-minute gap" |
| **LTV / cumulative revenue** | "What's the running revenue per user over time?" |
| **Churn / time-to-event** | "How long until a user stops engaging?" |
| **Active-day cohort grid** | Date × cohort matrix of activity |
| **N-day retention** | DAU on day N for each signup cohort |

#### Funnel analysis

```sql
WITH stages AS (
    SELECT
        user_id,
        MAX(CASE WHEN event = 'view'        THEN 1 ELSE 0 END) AS viewed,
        MAX(CASE WHEN event = 'add_to_cart' THEN 1 ELSE 0 END) AS carted,
        MAX(CASE WHEN event = 'checkout'    THEN 1 ELSE 0 END) AS checked_out,
        MAX(CASE WHEN event = 'purchase'    THEN 1 ELSE 0 END) AS purchased
    FROM events
    GROUP BY user_id
)
SELECT
    SUM(viewed)        AS step_1_viewed,
    SUM(carted)        AS step_2_carted,
    SUM(checked_out)   AS step_3_checked_out,
    SUM(purchased)     AS step_4_purchased,
    SUM(carted)::float        / NULLIF(SUM(viewed), 0)        AS conversion_view_to_cart,
    SUM(checked_out)::float   / NULLIF(SUM(carted), 0)        AS conversion_cart_to_checkout,
    SUM(purchased)::float     / NULLIF(SUM(checked_out), 0)   AS conversion_checkout_to_purchase
FROM stages;
```

##### Time-bounded funnel (with order constraint)

```sql
-- User must do view → cart → checkout → purchase, in order, within 7 days
WITH ordered AS (
    SELECT
        user_id, ts, event,
        FIRST_VALUE(ts) OVER (PARTITION BY user_id ORDER BY ts) AS first_ts
    FROM events
    WHERE event IN ('view', 'add_to_cart', 'checkout', 'purchase')
      AND ts BETWEEN first_ts AND first_ts + INTERVAL '7' DAY
)
SELECT ...                                  -- aggregate as above
```

#### Cohort retention (the canonical view)

```sql
WITH first_seen AS (
    SELECT user_id, DATE_TRUNC('week', MIN(event_ts)) AS cohort_week
    FROM events GROUP BY user_id
),
activity AS (
    SELECT
        f.cohort_week,
        DATE_DIFF('week', f.cohort_week, e.event_ts) AS week_offset,
        COUNT(DISTINCT e.user_id) AS active_users
    FROM first_seen f JOIN events e USING (user_id)
    GROUP BY 1, 2
),
cohort_size AS (
    SELECT cohort_week, COUNT(*) AS size FROM first_seen GROUP BY 1
)
SELECT
    a.cohort_week,
    a.week_offset,
    a.active_users,
    s.size,
    a.active_users * 100.0 / s.size AS retention_pct
FROM activity a JOIN cohort_size s USING (cohort_week)
ORDER BY a.cohort_week, a.week_offset;
```

> Pivot the result with `cohort_week` as rows and `week_offset` as columns → classic **cohort triangle**.

#### N-day retention (Day-N specifically)

```sql
WITH cohorts AS (
    SELECT user_id, MIN(DATE(event_ts)) AS signup_date
    FROM events GROUP BY user_id
),
day_n AS (
    SELECT
        c.signup_date,
        COUNT(DISTINCT CASE WHEN DATE(e.event_ts) = c.signup_date + INTERVAL '1' DAY THEN c.user_id END) AS day_1,
        COUNT(DISTINCT CASE WHEN DATE(e.event_ts) = c.signup_date + INTERVAL '7' DAY THEN c.user_id END) AS day_7,
        COUNT(DISTINCT CASE WHEN DATE(e.event_ts) = c.signup_date + INTERVAL '30' DAY THEN c.user_id END) AS day_30,
        COUNT(DISTINCT c.user_id) AS day_0
    FROM cohorts c LEFT JOIN events e USING (user_id)
    GROUP BY c.signup_date
)
SELECT
    signup_date,
    day_0,
    day_1::float / day_0 AS d1_retention,
    day_7::float / day_0 AS d7_retention,
    day_30::float / day_0 AS d30_retention
FROM day_n;
```

#### Sessionization (gap-fill into sessions)

```sql
WITH events_with_lag AS (
    SELECT
        user_id, ts, event,
        LAG(ts) OVER (PARTITION BY user_id ORDER BY ts) AS prev_ts
    FROM events
),
session_starts AS (
    SELECT
        user_id, ts, event,
        CASE WHEN prev_ts IS NULL OR ts - prev_ts > INTERVAL '30' MINUTE
             THEN 1 ELSE 0 END AS is_new_session
    FROM events_with_lag
)
SELECT
    user_id, ts, event,
    SUM(is_new_session) OVER (PARTITION BY user_id ORDER BY ts) AS session_id
FROM session_starts;
```

> **30-minute gap** is the standard threshold (Google Analytics default).

##### Per-session metrics

```sql
WITH sessions AS (
    -- ... output of sessionization above
)
SELECT
    user_id, session_id,
    MIN(ts) AS session_start,
    MAX(ts) AS session_end,
    MAX(ts) - MIN(ts) AS session_duration,
    COUNT(*) AS event_count,
    COUNT(DISTINCT event) AS unique_events
FROM sessions
GROUP BY user_id, session_id;
```

#### LTV / cumulative revenue

```sql
WITH user_revenue AS (
    SELECT
        user_id, order_date, amount,
        SUM(amount) OVER (PARTITION BY user_id ORDER BY order_date
                          ROWS UNBOUNDED PRECEDING) AS cumulative_revenue,
        DATE_DIFF('day',
                  MIN(order_date) OVER (PARTITION BY user_id),
                  order_date) AS days_since_first_purchase
    FROM orders
)
SELECT
    days_since_first_purchase / 30 AS month_n,
    AVG(cumulative_revenue) AS avg_ltv_at_month_n
FROM user_revenue
GROUP BY 1
ORDER BY 1;
```

##### Cohort LTV (revenue per user by signup month)

```sql
WITH cohorts AS (
    SELECT user_id, DATE_TRUNC('month', MIN(order_date)) AS cohort_month
    FROM orders GROUP BY user_id
)
SELECT
    cohort_month,
    DATE_DIFF('month', cohort_month, order_date) AS months_since,
    SUM(amount) / COUNT(DISTINCT user_id) AS revenue_per_user
FROM orders JOIN cohorts USING (user_id)
GROUP BY 1, 2
ORDER BY 1, 2;
```

#### Churn (time-to-event)

```sql
-- "Days until last activity" for each user
WITH last_seen AS (
    SELECT user_id, MAX(event_ts) AS last_event_ts FROM events GROUP BY user_id
)
SELECT
    user_id,
    DATE_DIFF('day', last_event_ts, CURRENT_DATE) AS days_since_last_activity,
    CASE WHEN DATE_DIFF('day', last_event_ts, CURRENT_DATE) > 30
         THEN 1 ELSE 0 END AS churned_30d
FROM last_seen;
```

#### Active-day grid (date × cohort)

```sql
WITH calendar AS (
    SELECT generate_series(DATE '2024-01-01', DATE '2024-12-31', INTERVAL '1' DAY) AS day
),
daily_active AS (
    SELECT DATE(event_ts) AS day, user_id FROM events
    GROUP BY 1, 2
)
SELECT
    c.day,
    COUNT(DISTINCT da.user_id) AS dau,
    COUNT(DISTINCT CASE WHEN cohort.cohort_week = DATE_TRUNC('week', c.day) THEN da.user_id END) AS new_user_dau
FROM calendar c
LEFT JOIN daily_active da ON c.day = da.day
LEFT JOIN cohort USING (user_id)
GROUP BY c.day
ORDER BY c.day;
```

#### Power-user / engagement segmentation

```sql
WITH user_activity AS (
    SELECT
        user_id,
        COUNT(DISTINCT DATE(event_ts)) AS active_days,
        COUNT(*) AS total_events
    FROM events
    WHERE event_ts > CURRENT_DATE - INTERVAL '28' DAY
    GROUP BY user_id
)
SELECT
    CASE
        WHEN active_days >= 25 THEN 'power'
        WHEN active_days >= 15 THEN 'core'
        WHEN active_days >= 5  THEN 'casual'
        ELSE 'lapsed'
    END AS segment,
    COUNT(*) AS users,
    AVG(total_events) AS avg_events
FROM user_activity
GROUP BY 1;
```

#### MAU / WAU / DAU stickiness

```sql
WITH dau AS (
    SELECT DATE(event_ts) AS day, COUNT(DISTINCT user_id) AS dau
    FROM events GROUP BY 1
),
mau AS (
    SELECT
        day,
        COUNT(DISTINCT user_id) FILTER (
            WHERE event_ts > day - INTERVAL '30' DAY) AS mau
    FROM events GROUP BY 1
)
SELECT
    d.day, d.dau, m.mau,
    d.dau::float / NULLIF(m.mau, 0) AS stickiness         -- DAU/MAU ratio
FROM dau d JOIN mau m USING (day);
```

> **DAU/MAU > 0.5** is heavy product (Facebook, WhatsApp); **0.2–0.5** is normal; **< 0.1** is occasional-use.

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Cohort retention with users who joined this week (no follow-up) | Right-censor; only show cohorts with full follow-up |
| Funnel with no order constraint | Use timestamps to ensure step order |
| Sessionization with implicit timezone | Standardize to UTC |
| Counting distinct user IDs per session | Use `(user_id, session_id)` as composite key |
| LTV without subtracting refunds / cost | Adjust for net revenue |
| Day-N retention without `DATE_DIFF` | Off-by-one days |
| Active-day numerator = denominator from different cohorts | Carefully define active = `cohort.user_id IN active.user_id` |
| Mixing UTC with local time | One timezone throughout pipeline |
| Inconsistent cohort definitions across reports | Document precisely |

#### Performance tips

| Tip | Detail |
|---|---|
| Pre-aggregate at appropriate grain | Daily, not event-level, for cohort grids |
| Materialize cohort tables | Reused often |
| Index `user_id`, `event_ts` | Funnel + retention queries scan these |
| Use `DATE_TRUNC` not `EXTRACT` for grouping | Often better optimizer plan |
| Partition fact tables by date | Pruning |

#### Cohort grid Python equivalent

```python
import pandas as pd

events["cohort"] = events.groupby("user_id")["ts"].transform("min").dt.to_period("W")
events["week_offset"] = (events["ts"].dt.to_period("W") - events["cohort"]).apply(lambda x: x.n)
cohort = events.groupby(["cohort", "week_offset"])["user_id"].nunique().unstack(fill_value=0)
retention = cohort.divide(cohort.iloc[:, 0], axis=0)
```

#### Decision

```
What's the question?
├─ Conversion through ordered steps?       → Funnel
├─ How long do users stay?                  → Cohort retention
├─ Group bursts of activity?                → Sessionization
├─ Per-user revenue trajectory?             → Cumulative LTV
├─ When do users disappear?                 → Time-to-event / churn
├─ Daily / weekly engagement?               → DAU/MAU + stickiness
└─ Top users by criterion?                   → Window function (ROW_NUMBER OVER ...)
```

#### Tools

| Tool | Strength |
|---|---|
| **dbt** | Materialize cohort / retention tables as models |
| **Looker / Mode / Hex** | Cohort + funnel views |
| **Amplitude / Mixpanel / Heap** | Pre-built funnel + retention |
| **DuckDB / Polars** | Fast local analytics |
| **Snowflake / BigQuery / Redshift** | Warehouse SQL with QUALIFY |

**Rule of thumb:** **most product analytics reduce to funnel, cohort, sessionization, LTV, or churn**. Use **window functions** as the underlying primitive (`LAG`, `ROW_NUMBER`, `SUM OVER`). **Sessionize with 30-min gap** unless domain says otherwise. **Right-censor cohorts** that haven't completed follow-up. **Standardize time zones** early. Materialize **cohort + funnel** tables in dbt — analysts query them, never recompute.
