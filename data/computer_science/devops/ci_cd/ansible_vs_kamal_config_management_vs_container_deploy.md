### Ansible vs Kamal — Config Management vs Container Deploy

**Definition:** **Ansible** is general-purpose, agentless **configuration management** (any server, any app, push via SSH). **Kamal** is **container deployment** for app servers (Docker images, zero-downtime, Rails 8 default). Different layers — they often coexist: **Ansible to provision the host, Kamal to deploy the app**.

**Side-by-side:**

| Property | **Ansible** | **Kamal** |
|---|---|---|
| Primary purpose | Configuration management | Container deployment |
| Scope | Anything you can SSH into | Containerized apps |
| Abstraction | Tasks / roles | Docker containers |
| Config file | `playbook.yml` + inventory | `config/deploy.yml` |
| Deploy artifact | Whatever (binaries, files, OS pkgs) | Docker image |
| Reverse proxy | You install + manage | **Built-in (kamal-proxy)** |
| Zero-downtime | DIY | **Built-in** rolling deploy |
| State | Stateless (idempotent re-run) | Stateless (declarative) |
| Agent | Agentless (SSH) | Agentless (SSH + Docker daemon) |
| Learning curve | Medium (modules, YAML, Jinja) | **Low** (one config file) |
| Audience | Ops / SRE / general | App teams (Rails-first, language-agnostic) |
| Origin | Red Hat / IBM (2012) | 37signals (2023, ex-MRSK) |

**Pros / Cons:**

| | **Pros** | **Cons** |
|---|---|---|
| **Ansible** | Generic — provision OS, install pkgs, configure services, deploy anything; huge module library; idempotent; strong for fleet config | Verbose YAML; no container-native deploy; no zero-downtime out of the box; "drift" creeps in |
| **Kamal** | One file; zero-downtime built-in; Docker registry handoff; SSH-native; aliased commands (`kamal deploy`); good for "rent a VM, deploy app" | Containerized apps only; not for OS / fleet config; small ecosystem; not for K8s clusters |

**When to pick which:**

| Need | Pick |
|---|---|
| Provision fresh Linux servers (users, packages, firewall, kernel tuning) | **Ansible** |
| Configure many heterogeneous servers | **Ansible** |
| Deploy a Rails / containerized app to your own VMs | **Kamal** |
| Zero-downtime rolling deploy | **Kamal** |
| One server, one container, one weekend project | **Kamal** |
| Multi-server enterprise with mixed OS / services | **Ansible** |
| Replace Capistrano for containerized deploys | **Kamal** |
| Replace Heroku at lower cost | **Kamal** |
| Operate a K8s cluster | Neither — use `kubectl` / Helm / Argo CD |
| Combine: provision host + deploy app | **Ansible + Kamal** |

**Layer fit (they're complements, not rivals):**

```
   ┌──────────────────────────────────┐
   │ Bare VM (cloud / bare metal)      │
   ├──────────────────────────────────┤
   │ OS, Docker, users, firewall       │  ← Ansible (one-time + ongoing)
   ├──────────────────────────────────┤
   │ App container (Rails, Node, …)    │  ← Kamal (every release)
   └──────────────────────────────────┘
```

**Quick start:**

**Ansible — install nginx + start it:**

```yaml
# deploy.yml
- hosts: web
  become: true
  tasks:
    - apt: { name: nginx, state: present, update_cache: true }
    - service: { name: nginx, state: started, enabled: true }
```

```bash
ansible-playbook -i inventory.ini deploy.yml
```

**Kamal — deploy a Rails app:**

```yaml
# config/deploy.yml
service: myapp
image: ghcr.io/me/myapp
servers:
  web: [1.2.3.4, 5.6.7.8]
registry:
  username: me
  password: [KAMAL_REGISTRY_PASSWORD]
env:
  secret: [RAILS_MASTER_KEY, DATABASE_URL]
```

```bash
kamal setup     # one-time
kamal deploy    # build → push → rolling deploy
kamal rollback
kamal app logs
```

**Common combo (Ansible + Kamal):**

| Step | Tool |
|---|---|
| 1. Spin up VM | Terraform |
| 2. OS hardening, install Docker, create users, firewall, swap | **Ansible** |
| 3. Set up monitoring agent | Ansible |
| 4. Build + ship app container, run | **Kamal** |
| 5. Rolling deploys + health checks | Kamal |
| 6. Rotate certs / OS upgrades | Ansible |

**Where each loses out:**

| Anti-fit | Detail |
|---|---|
| **Ansible** for app deploys with downtime tolerance? | Works but no built-in zero-downtime |
| **Ansible** for many different cloud providers? | Use Terraform for infra; Ansible for config |
| **Kamal** for OS-level config | Out of scope |
| **Kamal** for K8s clusters | Wrong tool — use Helm |
| **Kamal** for FaaS / Serverless | Use vendor tooling |
| **Either** for git-driven GitOps with reconciliation | Argo CD / Flux fit better |

**Adjacent tools:**

| Tool | Detail |
|---|---|
| **Capistrano** | SSH-based deploy (pre-Docker era; Kamal's predecessor in Rails) |
| **Chef / Puppet** | Pull-based config management (alternative to Ansible) |
| **Salt** | Master-minion config management |
| **Docker Compose** | Single-host orchestration (Kamal's loose cousin) |
| **Helm + K8s** | Container orchestration at fleet scale |
| **Argo CD / Flux** | GitOps reconciliation |
| **Heroku / Render / Fly.io** | Managed PaaS (Kamal's "I want my own infra" alternative) |

**Decision matrix:**

| Workload | Pick |
|---|---|
| Rails app, own VMs, < 100 servers | **Kamal** |
| Multi-OS server fleet config | **Ansible** |
| Mixed: provision + deploy | **Both** |
| K8s-native team | Neither — use Helm / Argo |
| Single-server hobby project | **Kamal** (or just `docker compose`) |
| Regulated infra with strict change control | Ansible (audit + roles) |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Using Ansible for app-only deploy on a Docker host | Reinventing what Kamal does in one file |
| Using Kamal for OS-level config | Out of scope; mix in Ansible |
| Running Kamal commands without TLS / firewall on Docker daemon | Open Docker socket = root remote |
| Storing secrets in Kamal config (not env) | Leaks in git |
| Ansible playbooks not idempotent | Drift accumulates |
| Mixing both without clear ownership | Same file changed by both — confusion |

**Cross-references:**

- Ansible basics: [ansible_basics.md](../infrastructure_as_code/ansible_basics.md)
- Kamal (Rails deploy): [kamal_mrsk_*.md](../../ruby/rails/deployment/kamal_mrsk_formerly_docker_deploy.md)
- Capistrano (legacy): [capistrano_*.md](../../ruby/rails/deployment/capistrano_ssh_traditional.md)
- Immutable vs mutable infra: [immutable_vs_mutable_infra.md](../infrastructure_as_code/immutable_vs_mutable_infra.md)
- Deployment strategies: [deployment_strategies.md](deployment_strategies.md)
- Zero-downtime deploys: [zero_downtime_*.md](../../ruby/rails/deployment/zero_downtime_health_checks.md)

**Rule of thumb:** **Ansible for the host, Kamal for the app.** Use **Ansible** to provision and configure the OS layer (Docker, users, firewall, monitoring); use **Kamal** to deploy the containerized app on top with **zero-downtime** rolling releases. They're complements, not competitors. For K8s clusters, neither — reach for **Helm + Argo CD**.
