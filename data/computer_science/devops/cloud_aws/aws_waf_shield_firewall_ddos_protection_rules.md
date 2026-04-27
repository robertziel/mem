### AWS WAF, Shield & DDoS Protection

**AWS WAF (Web Application Firewall):**
- Filters HTTP/HTTPS requests at the application layer (L7)
- Attaches to: ALB, API Gateway, CloudFront, AppSync
- Rules block/allow/count requests based on conditions

**WAF rule types:**
| Rule | Blocks | Example |
|------|--------|---------|
| IP match | Specific IPs/CIDRs | Block known bad actors |
| Geo match | Countries | Block traffic from certain regions |
| Rate-based | Too many requests from one IP | >2000 requests/5min → block |
| String match | Patterns in headers/body/URI | Block SQL injection patterns |
| Regex match | Regex in request components | Block specific user agents |
| Managed rules | Pre-built rulesets | OWASP Top 10, known bots |

**Managed rule groups (ready to use):**
- **AWS Managed Rules**: Core rule set (OWASP), SQL injection, XSS, known bad inputs
- **AWS IP Reputation**: known malicious IPs, anonymous proxies
- **AWS Bot Control**: block/manage bots, scrapers, crawlers
- **Marketplace**: F5, Fortinet, Imperva rules

**WAF Web ACL (access control list):**
```
Web ACL: "production-waf"
  Rule 1: AWS-AWSManagedRulesCommonRuleSet (block)     ← OWASP core
  Rule 2: AWS-AWSManagedRulesSQLiRuleSet (block)       ← SQL injection
  Rule 3: AWS-AWSManagedRulesKnownBadInputsRuleSet     ← Log4j, etc.
  Rule 4: Rate limit 2000 req/5min per IP (block)      ← Rate limiting
  Rule 5: Geo block [CN, RU] (block)                    ← Country block
  Default: Allow                                         ← Allow everything else
```

**WAF pricing:**
- $5/month per Web ACL
- $1/month per rule
- $0.60 per million requests inspected
- Managed rules: $1-$20/month per group

**AWS Shield:**
| Feature | Shield Standard | Shield Advanced |
|---------|----------------|-----------------|
| Cost | Free (auto-enabled) | $3,000/month |
| Protection | L3/L4 DDoS (network layer) | L3/L4/L7 DDoS + response team |
| Scope | All AWS resources | ALB, CloudFront, Route53, EIP |
| Response team | No | 24/7 AWS DDoS Response Team (DRT) |
| Cost protection | No | Refund for scaling costs during attack |
| Use when | Always (it's free) | Mission-critical, compliance |

**DDoS protection architecture:**
```
Internet → CloudFront (global edge, absorbs volumetric attacks)
              → AWS WAF (filters L7 attacks: SQLi, XSS, bad bots)
                  → ALB (distributes to backend)
                      → EC2/ECS (auto-scaling absorbs remaining load)

Shield Standard protects at every layer.
Shield Advanced adds DRT team + cost protection.
```

**Best practices:**
- Always put CloudFront in front (even for APIs) — absorbs DDoS at the edge
- Enable WAF with managed rules on CloudFront or ALB
- Rate-limit per IP (prevents credential stuffing, API abuse)
- Use Shield Standard (free, auto-enabled)
- Shield Advanced only for high-value targets requiring SLA guarantees

**Rule of thumb:** WAF for application-layer filtering (SQLi, XSS, bots, rate limiting). Shield Standard is free — you already have it. CloudFront + WAF is the most cost-effective DDoS defense. Start with AWS Managed Rules (OWASP core + SQLi + known bad inputs). Add rate-based rules for API protection.
