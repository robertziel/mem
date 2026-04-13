### IMAP & POP3 (Email Retrieval Protocols)

**SMTP sends, IMAP/POP3 receive:**
```
Sending:    Your app → SMTP → Recipient's mail server
Receiving:  Mail server → IMAP or POP3 → Your email client
```

**IMAP (Internet Message Access Protocol):**
- Port 143 (plaintext), Port 993 (IMAPS — over TLS)
- Emails stay on server (synced across devices)
- Support for folders, search, flags (read/unread/starred)
- Partial fetch (download headers first, body on demand)

**POP3 (Post Office Protocol v3):**
- Port 110 (plaintext), Port 995 (POP3S — over TLS)
- Downloads emails to client, typically deletes from server
- Simple: no folders, no sync, no server-side search
- Offline access (all mail on your device)

**IMAP vs POP3:**
| Feature | IMAP | POP3 |
|---------|------|------|
| Storage | Server (synced) | Client (downloaded) |
| Multi-device | Yes (all devices see same state) | No (each device has its own copy) |
| Folders | Yes (server-side) | No |
| Search | Server-side | Client-side only |
| Offline | Partial (cache) | Full (all downloaded) |
| Bandwidth | Higher (sync overhead) | Lower (download once) |
| Modern use | Standard for most email | Rare (legacy) |

**IMAP is the standard.** POP3 is only used for legacy systems or when server storage is limited.

**For developers (building email features):**
```ruby
# Ruby — reading email via IMAP
require 'net/imap'

imap = Net::IMAP.new('imap.gmail.com', port: 993, ssl: true)
imap.login('user@gmail.com', 'app_password')
imap.select('INBOX')

# Search for unread messages
message_ids = imap.search(['UNSEEN'])

# Fetch message
message_ids.each do |id|
  envelope = imap.fetch(id, 'ENVELOPE').first.attr['ENVELOPE']
  puts "From: #{envelope.from.first.mailbox}@#{envelope.from.first.host}"
  puts "Subject: #{envelope.subject}"
end

imap.logout
```

**Modern email integration:**
- Gmail API / Microsoft Graph API preferred over raw IMAP (OAuth, richer features)
- Use IMAP for: legacy integrations, self-hosted mail servers
- Use API for: modern apps (better auth, webhooks, metadata)

**Rule of thumb:** IMAP for multi-device email access (standard). POP3 only for legacy systems. For new applications, prefer Gmail/Microsoft APIs over raw IMAP. Always use TLS (ports 993/995).
