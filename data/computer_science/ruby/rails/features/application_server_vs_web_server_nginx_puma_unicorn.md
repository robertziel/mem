### Application server vs web server (short)

**Web server** (Nginx, Apache):
- Terminates HTTP/TLS, serves static assets, reverse proxy.

**Application server** (Puma, Unicorn):
- Runs your Ruby app, executes code, returns dynamic responses.

**Rule of thumb:** web servers handle traffic; app servers run your app logic.
