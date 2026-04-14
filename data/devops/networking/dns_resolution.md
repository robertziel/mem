### DNS Resolution

**How DNS resolves a domain:**
1. Browser checks its cache
2. OS checks `/etc/hosts`, then local resolver cache
3. Query goes to recursive resolver (ISP or 8.8.8.8)
4. Resolver asks root nameserver -> TLD nameserver -> authoritative nameserver
5. Authoritative NS returns the IP
6. Resolver caches the result (respects TTL)

**Record types:**
- `A` - domain -> IPv4 address
- `AAAA` - domain -> IPv6 address
- `CNAME` - alias -> another domain (cannot coexist with other records at zone apex)
- `MX` - mail server for the domain
- `TXT` - arbitrary text (SPF, DKIM, domain verification)
- `NS` - nameserver delegation
- `SOA` - start of authority (zone metadata, serial, refresh)
- `SRV` - service discovery (host + port)
- `PTR` - reverse DNS (IP -> domain)

**TTL (Time To Live):**
- How long resolvers cache the record (in seconds)
- Low TTL (60s) = fast propagation, more queries
- High TTL (86400s) = fewer queries, slow changes
- Lower TTL before migrations, raise after stable

**Debugging:**
- `dig example.com` - query DNS (detailed)
- `dig +short example.com` - just the answer
- `dig @8.8.8.8 example.com` - query specific resolver
- `dig example.com ANY` - all record types
- `nslookup example.com` - simpler lookup
- `host example.com` - quick lookup

**Common interview scenarios:**
- Why CNAME at zone apex is problematic (conflicts with SOA/NS)
- Route53 ALIAS record solves the apex CNAME problem
- Split-horizon DNS: different answers for internal vs external queries

**Rule of thumb:** Use A records for apex domains, CNAME for subdomains, lower TTL before DNS changes, and always verify with `dig` against the authoritative nameserver.
