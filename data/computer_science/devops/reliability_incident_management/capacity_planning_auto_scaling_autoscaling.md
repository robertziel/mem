### Capacity Planning and Auto-Scaling

**Capacity planning process:**
1. **Measure** - baseline current usage (CPU, memory, connections, request rate)
2. **Project** - estimate growth (traffic trends, business plans, events)
3. **Buffer** - add headroom (typically 30-50% above projected peak)
4. **Test** - load test to validate capacity (before you need it)
5. **Review** - revisit quarterly or before major launches

**Key metrics to track:**
- CPU utilization across fleet
- Memory usage and swap
- Network throughput and connection counts
- Disk I/O and storage utilization
- Request queue depth / pending requests
- Database connections (active vs max)
- Cache hit rate and eviction rate

**Load testing tools:**
- **k6** - modern, scriptable in JS, developer-friendly
- **Locust** - Python-based, distributed
- **Artillery** - YAML config, good for APIs
- **wrk** / **ab** - simple HTTP benchmarking
- **Gatling** - JVM-based, detailed reports

**k6 example:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // ramp up to 100 users
    { duration: '5m', target: 100 },   // stay at 100
    { duration: '2m', target: 500 },   // ramp up to 500
    { duration: '5m', target: 500 },   // stay at 500
    { duration: '2m', target: 0 },     // ramp down
  ],
};

export default function () {
  const res = http.get('https://api.example.com/products');
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
```

**Auto-scaling patterns:**

**Reactive (metric-based):**
- Scale when CPU > 70% for 5 minutes
- Scale when request count > threshold
- Cooldown period to prevent flapping

**Predictive (schedule-based):**
- Scale up before known traffic peaks (Black Friday, marketing email)
- Scale down overnight/weekends
- Combine with reactive for unexpected spikes

**Target tracking:**
- "Keep average CPU at 60%" - AWS adjusts instances automatically
- Simplest to configure, works well for most cases

**Step scaling:**
- 70% CPU -> add 1 instance
- 80% CPU -> add 3 instances
- 90% CPU -> add 5 instances
- More aggressive response to larger spikes

**Scale-in protection:**
- Longer cooldown for scale-in (10min) vs scale-out (3min)
- Scale out fast, scale in slow
- Protect instances doing long-running work

**Rule of thumb:** Load test before launch. Auto-scale reactively with target tracking (simplest). Add predictive scaling for known events. Scale out aggressively, scale in conservatively. Always have 30%+ headroom above normal peak.
