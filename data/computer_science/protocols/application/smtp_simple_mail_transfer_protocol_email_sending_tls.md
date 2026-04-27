### SMTP (Simple Mail Transfer Protocol)

**What SMTP does:**
- Protocol for SENDING email between mail servers and from client to server
- Text-based, request-response protocol
- Default ports: 25 (server-to-server), 587 (client-to-server with STARTTLS), 465 (implicit TLS)

**How email delivery works:**
```
Sender → [MUA: Mail User Agent (Gmail, Outlook)]
           → SMTP → [MTA: Mail Transfer Agent (sender's mail server)]
             → SMTP → [MTA: recipient's mail server, found via DNS MX record]
               → [MDA: Mail Delivery Agent (stores in mailbox)]
                 → IMAP/POP3 → [Recipient's MUA]
```

**SMTP conversation:**
```
Client: EHLO mail.example.com
Server: 250-Hello
Client: MAIL FROM:<alice@example.com>
Server: 250 OK
Client: RCPT TO:<bob@recipient.com>
Server: 250 OK
Client: DATA
Server: 354 Start mail input
Client: Subject: Hello
Client: This is the message body.
Client: .
Server: 250 OK: queued
Client: QUIT
```

**Email authentication (prevent spoofing):**
| Protocol | Purpose | DNS Record |
|----------|---------|------------|
| **SPF** | Authorize which IPs can send for your domain | TXT record listing allowed IPs |
| **DKIM** | Sign emails with domain key, verify integrity | TXT record with public key |
| **DMARC** | Policy for handling SPF/DKIM failures | TXT record (reject/quarantine/none) |

```
SPF:   v=spf1 include:_spf.google.com include:amazonses.com -all
DKIM:  selector._domainkey.example.com → public key
DMARC: _dmarc.example.com → v=DMARC1; p=reject; rua=mailto:reports@example.com
```

**SMTP vs transactional email services:**
| Feature | Raw SMTP | SES/SendGrid/Mailgun |
|---------|----------|---------------------|
| Setup | Self-managed server | API/SDK |
| Deliverability | You manage reputation | Provider manages |
| Bounce handling | Manual | Built-in |
| Scaling | Complex | Automatic |
| Cost | Server cost | Per-email |

**Rule of thumb:** Use transactional email services (SES, SendGrid) instead of raw SMTP. Always set up SPF + DKIM + DMARC for your domain. Port 587 with STARTTLS for client submission. Monitor bounce rates to maintain sender reputation.
