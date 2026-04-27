### SSRF (Server-Side Request Forgery)

**What SSRF is:**
- Attacker tricks the server into making HTTP requests to internal/unintended resources
- Server fetches a URL controlled by attacker → attacker targets internal services

**Attack example:**
```
# Application has "fetch URL" feature:
POST /api/fetch-preview
{ "url": "https://example.com/article" }  ← normal use

# Attacker sends:
{ "url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/" }
← Server fetches AWS metadata → returns IAM credentials!

# Or:
{ "url": "http://10.0.1.50:5432/" }  ← scan internal network
{ "url": "http://localhost:6379/" }   ← access internal Redis
{ "url": "file:///etc/passwd" }       ← read local files (if file:// supported)
```

**AWS metadata endpoint (most critical SSRF target):**
```
http://169.254.169.254/latest/meta-data/
  → instance-id, hostname, security groups
http://169.254.169.254/latest/meta-data/iam/security-credentials/<role-name>
  → AccessKeyId, SecretAccessKey, Token (full AWS access!)
```

**AWS mitigation: IMDSv2 (require token):**
```bash
# Enforce IMDSv2 on EC2 (blocks simple SSRF to metadata)
aws ec2 modify-instance-metadata-options \
  --instance-id i-abc123 \
  --http-tokens required \    # IMDSv2 requires PUT to get token first
  --http-endpoint enabled
```
IMDSv2 requires a PUT request with a TTL header to get a token first → simple GET-based SSRF can't exploit it.

**Prevention:**

**1. Allowlist URLs/domains (best):**
```ruby
ALLOWED_DOMAINS = ['example.com', 'api.partner.com'].freeze

def safe_to_fetch?(url)
  uri = URI.parse(url)
  ALLOWED_DOMAINS.include?(uri.host)
rescue URI::InvalidURIError
  false
end
```

**2. Block internal IPs:**
```ruby
require 'ipaddr'

BLOCKED_RANGES = [
  IPAddr.new('10.0.0.0/8'),
  IPAddr.new('172.16.0.0/12'),
  IPAddr.new('192.168.0.0/16'),
  IPAddr.new('169.254.0.0/16'),   # AWS metadata
  IPAddr.new('127.0.0.0/8'),       # localhost
  IPAddr.new('0.0.0.0/8'),
].freeze

def internal_ip?(host)
  ip = IPAddr.new(Resolv.getaddress(host))
  BLOCKED_RANGES.any? { |range| range.include?(ip) }
rescue
  true  # block on resolution failure
end
```

**3. Disable redirects:**
- Attacker: `url=https://evil.com` → evil.com redirects to `http://169.254.169.254/...`
- Solution: don't follow redirects, or re-validate after redirect

**4. Use a dedicated outbound proxy:**
- All outbound HTTP goes through a proxy
- Proxy blocks internal IPs and only allows approved domains
- Separates app network from internal network

**5. Network segmentation:**
- App servers can't reach metadata endpoint (firewall rule)
- App servers can't reach database directly (use IAM auth instead)

**Rule of thumb:** Allowlist domains (never blocklist — too many bypasses). Enforce IMDSv2 on all EC2 instances. Block RFC 1918 IPs + 169.254.x in any URL-fetching code. Don't follow redirects without re-validating. SSRF is how most cloud credential leaks happen.
