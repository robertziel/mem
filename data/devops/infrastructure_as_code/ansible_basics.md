### Ansible Basics

**What Ansible does:**
- Agentless configuration management (uses SSH)
- Idempotent: run the same playbook multiple times, same result
- Push-based: control machine pushes config to targets
- Also used for provisioning, app deployment, orchestration

**Key concepts:**
- **Inventory** - list of managed hosts
- **Playbook** - YAML file defining tasks to run on hosts
- **Role** - reusable collection of tasks, handlers, templates, vars
- **Module** - unit of work (apt, copy, service, template, docker_container)
- **Handler** - task triggered by notifications (e.g., restart nginx after config change)
- **Facts** - system info gathered from hosts (OS, IP, memory)

**Inventory:**
```ini
# inventory.ini
[web]
web1.example.com
web2.example.com

[db]
db1.example.com

[production:children]
web
db

[web:vars]
http_port=8080
```

**Playbook:**
```yaml
# deploy.yml
- hosts: web
  become: true        # run as root (sudo)
  vars:
    app_version: "1.2.0"
  tasks:
    - name: Install nginx
      apt:
        name: nginx
        state: present
        update_cache: true

    - name: Copy nginx config
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: restart nginx

    - name: Ensure nginx is running
      service:
        name: nginx
        state: started
        enabled: true

  handlers:
    - name: restart nginx
      service:
        name: nginx
        state: restarted
```

**Running:**
```bash
ansible-playbook -i inventory.ini deploy.yml
ansible-playbook deploy.yml --limit web1      # run on specific host
ansible-playbook deploy.yml --check           # dry run
ansible-playbook deploy.yml --diff            # show file changes
ansible-playbook deploy.yml --tags deploy     # run tagged tasks only
ansible all -i inventory.ini -m ping          # ad-hoc command
```

**Roles (reusable structure):**
```
roles/
  nginx/
    tasks/main.yml
    handlers/main.yml
    templates/nginx.conf.j2
    defaults/main.yml       # default variables
    vars/main.yml           # higher-priority variables
```

**Ansible vs Terraform:**
| Feature | Ansible | Terraform |
|---------|---------|-----------|
| Primary use | Configuration management | Infrastructure provisioning |
| Approach | Procedural (tasks in order) | Declarative (desired state) |
| State | Stateless | Stateful |
| Agent | Agentless (SSH) | Agentless (API) |
| Best for | Server config, app deploy | Cloud infrastructure |

**Rule of thumb:** Use Terraform to create infrastructure, Ansible to configure it. Ansible for mutable servers, but prefer immutable infrastructure (Docker/AMIs) when possible. Use roles for reusability.
