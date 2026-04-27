### Monitoring Stack

A practical production monitoring stack usually has three parts:

- **APM** -> Datadog, New Relic, or AppSignal for request times, throughput, and slow queries
- **Error tracking** -> Sentry, Honeybadger, or Bugsnag for exceptions and alerting
- **Logging** -> log to stdout and centralize with ELK/OpenSearch or CloudWatch

### Rails specifics

- Use `config.filter_parameters` to avoid logging passwords, tokens, and other sensitive values.
- Prefer structured logs when possible so searching and alerting is easier.
- Logging to stdout fits 12-factor style deployment and works well with container platforms.

### Rule of thumb

Use APM for performance, an error tracker for exceptions, and centralized stdout logs for debugging and audits.
