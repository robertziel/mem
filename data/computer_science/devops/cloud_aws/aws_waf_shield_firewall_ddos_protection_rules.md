### AWS WAF, Shield — Firewall, DDoS Protection

**Definition:** **AWS WAF** is a Layer 7 web application firewall (filters HTTP/HTTPS) — attaches to ALB / API Gateway / CloudFront / AppSync. **AWS Shield Standard** is free L3/L4 DDoS protection (auto-enabled). **Shield Advanced** ($3K/mo) adds L7 + DDoS Response Team (DRT) + cost protection. The standard architecture: **CloudFront → WAF → ALB → backend**.

**WAF — Web Application Firewall:**

| Property | Detail |
|---|---|
| **Layer** | L7 (HTTP/HTTPS) |
| **Attaches to** | ALB, API Gateway, CloudFront, AppSync, Cognito, Verified Access |
| **Action types** | Allow, Block, Count, CAPTCHA, Challenge |
| **Logging** | To S3, CloudWatch, Kinesis Firehose |
| **Pricing** | $5 / Web ACL / month + $1 per rule / month + $0.60 per million requests |

**WAF rule types:**

| Rule | Blocks | Example |
|---|---|---|
| **IP match** | Specific IPs / CIDRs | Block known bad actors |
| **Geo match** | Countries | Block traffic from certain regions |
| **Rate-based** | Requests / 5 min per IP | > 2,000 → block |
| **String match** | Patterns in headers / body / URI | Block SQL injection patterns |
| **Regex match** | Regex on request components | Block specific user agents |
| **Size match** | Body / header size | Block oversized payloads |
| **Managed rules** | Pre-built rulesets | OWASP Top 10, bots, known bad inputs |
| **Bot Control** | Bot signals | Allowlist good bots, block bad |

**Managed rule groups (ready-to-use):**

| Group | Detail |
|---|---|
| **AWSManagedRulesCommonRuleSet** | OWASP core, broad protection |
| **AWSManagedRulesSQLiRuleSet** | SQL injection patterns |
| **AWSManagedRulesXSSRuleSet** | Cross-site scripting |
| **AWSManagedRulesKnownBadInputsRuleSet** | Log4j (Log4Shell), known exploits |
| **AWSManagedRulesAdminProtectionRuleSet** | Block public admin URLs |
| **AWSManagedRulesAmazonIpReputationList** | Known malicious IPs |
| **AWSManagedRulesAnonymousIpList** | Tor / VPN / proxy |
| **AWSManagedRulesBotControlRuleSet** | Bot identification (paid extra) |
| **AWSManagedRulesACFP / ATP** | Account creation / takeover protection |
| **Marketplace rules** | F5, Fortinet, Imperva, Cyber Security Cloud |

**Web ACL example — typical production setup:**

```
Web ACL: production-waf
  Rule 1: AWS-AWSManagedRulesCommonRuleSet (block)        ← OWASP core
  Rule 2: AWS-AWSManagedRulesSQLiRuleSet (block)          ← SQL injection
  Rule 3: AWS-AWSManagedRulesKnownBadInputsRuleSet (block) ← Log4j etc.
  Rule 4: AWS-AWSManagedRulesAmazonIpReputationList (block) ← Known bad IPs
  Rule 5: Rate limit 2000 req / 5 min per IP (block)      ← Anti-bot
  Rule 6: Geo block [list of high-risk countries] (block) ← Optional
  Rule 7: Custom string match for API admin paths (block) ← App-specific
  Default: Allow                                            ← Allow rest
```

**Action types:**

| Action | Effect |
|---|---|
| **Allow** | Pass through |
| **Block** | Reject (403 typical) |
| **Count** | Log only (great for testing rules before enforcing) |
| **CAPTCHA** | Show CAPTCHA before allowing |
| **Challenge** | JavaScript challenge to verify browser |

**Rule evaluation order:**

| Property | Detail |
|---|---|
| Rules evaluated by **priority** | Lowest number first |
| First matching rule wins | Stop on match |
| Default action applies | If no rule matches |
| Override per request | Via Count action for testing |

**AWS Shield — DDoS protection:**

| Feature | **Shield Standard** | **Shield Advanced** |
|---|---|---|
| Cost | **Free** (auto-enabled) | $3,000 / month + per-resource fee |
| Protection layer | L3 / L4 (network) | L3 / L4 / L7 |
| Scope | All AWS resources | ALB, CloudFront, Route 53, EIP, GA |
| **DDoS Response Team (DRT)** | ❌ | ✅ 24/7 |
| **Cost protection** | ❌ | ✅ Refund for scaling costs during attack |
| WAF integration | Manual | ✅ Auto-mitigation via WAF |
| Real-time visibility | Limited | Full (CloudWatch metrics) |
| Use when | Always (free) | Mission-critical, compliance, high-value target |

**Shield Standard — what's auto-included:**

| Protection | Detail |
|---|---|
| SYN flood mitigation | At edge |
| UDP reflection mitigation | At edge |
| Common L3/L4 attack mitigation | Built into AWS network |
| No charge | Auto-enabled for all AWS customers |

**Shield Advanced — what you pay for:**

| Feature | Detail |
|---|---|
| L7 DDoS protection | Application-layer attacks |
| 24/7 access to DRT | AWS engineers help during attacks |
| Cost protection (DDoS scaling refund) | EC2, CloudFront, Route 53, ELB |
| Global threat dashboard | Visibility |
| Auto-mitigation via WAF | Set rules to auto-block during attack |
| Health-based detection | Per-resource baseline |

**DDoS protection architecture (defense in depth):**

```
   Internet
     │
     ▼
   ┌─────────────────────┐
   │ CloudFront           │  ← Global edge, absorbs volumetric attacks
   │ Shield Standard      │
   └────────┬────────────┘
            ▼
   ┌─────────────────────┐
   │ AWS WAF              │  ← L7 filters: SQLi, XSS, bots, rate limit
   └────────┬────────────┘
            ▼
   ┌─────────────────────┐
   │ ALB                  │  ← Distributes to backends
   └────────┬────────────┘
            ▼
   ┌─────────────────────┐
   │ Auto Scaling Group   │  ← Absorbs remaining load
   └─────────────────────┘
```

**Best practices — defense in depth:**

| Layer | Practice |
|---|---|
| **Edge** | Always put CloudFront in front (even for APIs) |
| **WAF** | Enable managed rules (Common + SQLi + KnownBadInputs + IP Reputation) |
| **Rate limiting** | Per-IP with 1,000–5,000 / 5 min default |
| **Bot Control** | If bots are a concern (paid extra) |
| **Geo blocking** | If your users are bounded geographically |
| **Shield Standard** | Free; you already have it |
| **Shield Advanced** | Only for high-value targets, SLA / compliance reasons |
| **Auto-scaling** | Absorb attack capacity |
| **CAPTCHA / Challenge** | For suspicious traffic |
| **Logging + alarms** | Monitor block rate, attack patterns |

**Custom rule examples:**

```
# Block requests with SQL keywords in query string (in addition to managed rule)
Rule: block-sql-keywords
  Priority: 50
  Statement: Match all of:
    - URI Path: contains "select" OR "union" OR "--"
  Action: Block

# Rate limit login endpoint stricter
Rule: login-rate-limit
  Priority: 60
  Statement: Match all of:
    - URI Path: equals "/api/login"
    - Rate: 100 req / 5 min per IP
  Action: Block

# Block bots without User-Agent
Rule: block-empty-ua
  Priority: 70
  Statement: User-Agent is empty
  Action: Block
```

**Logging and monitoring:**

| Output | Use |
|---|---|
| WAF logs to S3 | Long-term analysis |
| CloudWatch Logs | Real-time queries |
| Kinesis Firehose | Stream to SIEM |
| CloudWatch Metrics | Block / allow / count rates |
| Alarm on spike | Detect attacks |
| Athena / Glue | Query S3 logs with SQL |

**Common patterns:**

| Pattern | Use |
|---|---|
| **CloudFront + WAF** | Most cost-effective baseline |
| **ALB + WAF** | If no CDN |
| **API Gateway + WAF** | API-only deployments |
| **Multi-region with Route 53 health checks** | Survive regional attacks |
| **Geo restrict + IP allowlist** | Internal / B2B services |
| **WAF in Count mode first** | Tune rules before blocking |

**Cost levers:**

| Lever | Detail |
|---|---|
| Use managed rules instead of custom | Cheaper than dev time |
| Count mode during tuning | No false-block damage |
| Logs to S3 (not CloudWatch) | Cheaper |
| Selective Bot Control | Only on bot-prone endpoints |
| Skip Shield Advanced unless needed | Big monthly fee |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| WAF without rate limit | Open to credential stuffing / scraping |
| Geo block without exception list | Blocks legitimate global users |
| Aggressive managed rules without tuning | False positives in production |
| No logging | Can't analyze attacks |
| WAF only on ALB, not CloudFront | Volumetric attacks hit your origin |
| Shield Advanced without SLA need | Wasted $3K/month |
| Custom rules instead of managed | Reinventing the wheel |
| Forgetting to attach Web ACL | WAF deployed but not used |
| Rate limit too high | Doesn't stop attacks |

**Decision matrix:**

| Need | Pick |
|---|---|
| Default protection | CloudFront + WAF managed rules |
| API protection | API Gateway + WAF + rate limit |
| Compliance / mission-critical | + Shield Advanced |
| Bot-heavy site | + WAF Bot Control |
| Internal app | Geo + IP allowlist |
| High-value target | All of the above + DRT engagement plan |

**Cross-references:**

- VPC + SG: [vpc_subnets_*.md](../networking/vpc_subnets_security_groups.md)
- CloudFront / CDN: [cloudfront_*.md](cloudfront_cdn_origins_distributions_invalidation.md)
- Authentication attacks: [authentication_attacks_*.md](../../web_security/authentication_attacks_brute_force_session.md)
- Rate limiting: [rate_limiter_*.md](../../system_design_hld_high_level_design/fundamentals/rate_limiter_redis_sorted_sets_sliding_window.md)
- OWASP Top 10: [owasp_*.md](../../web_security/owasp_top_10_2025_overview.md)

**Rule of thumb:** **CloudFront + WAF** is the most cost-effective DDoS + L7 defense. Start with **AWS Managed Rules** (Common + SQLi + KnownBadInputs + IpReputation) plus a **rate-based rule** (~2,000/5min/IP). **Shield Standard is free** — you already have it. **Shield Advanced** ($3K/mo) is for **mission-critical / high-value** targets where the DRT and cost protection matter. **Test new rules in Count mode** before flipping to Block.
