### AWS ACM (Certificate Manager)

**What ACM does:**
- Free public SSL/TLS certificates for AWS services
- Automatic renewal (no manual cert management)
- Integrates with: ALB, CloudFront, API Gateway, Elastic Beanstalk

**Key limitation:** Cannot export ACM certificates (private key stays in AWS). For EC2 directly, use Let's Encrypt or bring your own cert.

**Request a certificate:**
```bash
aws acm request-certificate \
  --domain-name example.com \
  --subject-alternative-names "*.example.com" \
  --validation-method DNS

# Output: CertificateArn
```

**Validation methods:**
| Method | How | Best for |
|--------|-----|----------|
| DNS | Add CNAME record to your DNS | Automated, auto-renews (recommended) |
| Email | Respond to email sent to domain contacts | Legacy, manual |

**DNS validation (Route53):**
```
ACM provides:  _abc123.example.com → _xyz789.acm-validations.aws
Add this CNAME to Route53 → ACM validates ownership → cert issued

If using Route53: ACM can auto-create the DNS record for you (one click).
```

**Attach to ALB:**
```bash
# Via CLI
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:123:certificate/abc-123 \
  --default-actions Type=forward,TargetGroupArn=arn:...
```

```hcl
# Terraform
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = aws_acm_certificate.main.arn
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

**CloudFront requirement:** Certificate MUST be in **us-east-1** region (regardless of where your app runs).

**Wildcard certificates:**
- `*.example.com` covers: `api.example.com`, `www.example.com`, etc.
- Does NOT cover: `example.com` (bare domain) or `sub.api.example.com` (nested)
- Request both: `example.com` + `*.example.com` as SAN on same cert

**Auto-renewal:**
- ACM auto-renews before expiry (DNS-validated certs renew seamlessly)
- Email-validated certs require manual approval for renewal
- Monitor: `aws acm describe-certificate` → `RenewalStatus`

**ACM vs Let's Encrypt vs bring your own:**
| Feature | ACM | Let's Encrypt | Self-managed |
|---------|-----|---------------|-------------|
| Cost | Free | Free | CA-dependent |
| Works with | ALB, CloudFront, API GW | Any server (EC2, K8s) | Anything |
| Auto-renew | Yes (DNS validation) | Yes (certbot/cert-manager) | Manual |
| Export private key | No | Yes | Yes |
| Best for | AWS services | EC2 direct, Kubernetes | Compliance, EV certs |

**Rule of thumb:** ACM for anything behind ALB or CloudFront (free, auto-renewing, zero maintenance). DNS validation over email. Put CloudFront certs in us-east-1. Use Let's Encrypt (via cert-manager) for Kubernetes. Wildcard certs save management overhead.
