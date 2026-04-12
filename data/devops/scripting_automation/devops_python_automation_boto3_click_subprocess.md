### Python for DevOps Automation

**Common libraries:**
- `boto3` - AWS SDK
- `requests` / `httpx` - HTTP calls
- `subprocess` - run shell commands
- `paramiko` - SSH connections
- `pyyaml` - YAML parsing
- `click` / `argparse` - CLI tools
- `jinja2` - templating

**boto3 (AWS):**
```python
import boto3

# EC2
ec2 = boto3.client('ec2')
instances = ec2.describe_instances(
    Filters=[{'Name': 'tag:Environment', 'Values': ['production']}]
)

# S3
s3 = boto3.client('s3')
s3.upload_file('backup.tar.gz', 'my-bucket', 'backups/backup.tar.gz')

# Secrets Manager
sm = boto3.client('secretsmanager')
secret = sm.get_secret_value(SecretId='prod/db-password')
password = secret['SecretString']

# SSM Parameter Store
ssm = boto3.client('ssm')
param = ssm.get_parameter(Name='/prod/api-key', WithDecryption=True)
```

**Running shell commands:**
```python
import subprocess

result = subprocess.run(
    ['kubectl', 'get', 'pods', '-o', 'json'],
    capture_output=True, text=True, check=True
)
pods = json.loads(result.stdout)
```

**HTTP health checker:**
```python
import requests
from concurrent.futures import ThreadPoolExecutor

services = [
    'https://api.example.com/health',
    'https://web.example.com/health',
    'https://auth.example.com/health',
]

def check(url):
    try:
        r = requests.get(url, timeout=5)
        return url, r.status_code == 200
    except requests.RequestException:
        return url, False

with ThreadPoolExecutor(max_workers=10) as pool:
    results = pool.map(check, services)
    for url, healthy in results:
        status = "OK" if healthy else "FAIL"
        print(f"{status}: {url}")
```

**CLI tool with Click:**
```python
import click

@click.command()
@click.option('--env', type=click.Choice(['dev', 'staging', 'prod']), required=True)
@click.option('--version', default='latest')
@click.option('--dry-run', is_flag=True)
def deploy(env, version, dry_run):
    """Deploy application to target environment."""
    click.echo(f"Deploying {version} to {env}")
    if dry_run:
        click.echo("Dry run - no changes made")
        return
    # actual deployment logic

if __name__ == '__main__':
    deploy()
```

**Makefile as task runner:**
```makefile
.PHONY: build test deploy

build:
	docker build -t myapp:$(shell git rev-parse --short HEAD) .

test:
	docker compose run --rm web pytest

deploy: build
	./scripts/deploy.sh $(ENV)

lint:
	ruff check .
	mypy .
```

**Rule of thumb:** Use Python for complex automation (API interactions, data processing). Use Bash for simple glue. Use `click` for CLI tools. Use `boto3` for AWS scripting. Always use virtual environments.
