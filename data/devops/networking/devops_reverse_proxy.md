### Reverse Proxy (Nginx, HAProxy, Traefik)

**What a reverse proxy does:**
- Sits in front of backend servers
- TLS termination (offload HTTPS from app servers)
- Load balancing across backends
- Request routing (path-based, host-based)
- Caching, compression, rate limiting
- Hide backend topology from clients

**Forward proxy vs reverse proxy:**
- **Forward proxy** - client -> proxy -> internet (e.g., corporate proxy, VPN)
- **Reverse proxy** - internet -> proxy -> backend (e.g., Nginx in front of Puma)

**Nginx essentials:**
```nginx
upstream app {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
}

server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate /etc/ssl/cert.pem;
    ssl_certificate_key /etc/ssl/key.pem;

    location / {
        proxy_pass http://app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        root /var/www;
        expires 1y;
    }
}
```

**Key headers:**
- `X-Forwarded-For` - original client IP chain
- `X-Forwarded-Proto` - original protocol (http/https)
- `X-Real-IP` - client IP (set by proxy)
- `Host` - original Host header (for virtual hosting)

**Nginx vs HAProxy vs Traefik:**
| Feature | Nginx | HAProxy | Traefik |
|---------|-------|---------|---------|
| Strength | Web server + proxy | Pure LB, high perf | Cloud-native, auto-discovery |
| Config | Static files | Static files | Dynamic (K8s, Docker labels) |
| L4/L7 | Both | Both | L7 |
| TLS | Yes | Yes | Yes + auto Let's Encrypt |
| Best for | Traditional | High-perf TCP/HTTP | Kubernetes, Docker |

**Rule of thumb:** Use Nginx for traditional setups, Traefik for Kubernetes/Docker with auto-discovery. Always forward `X-Forwarded-For` and `X-Forwarded-Proto` headers.
