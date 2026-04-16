# Memo Potential Mistakes Review

Scope:

- Reviewed all 785 markdown memo files under `data/`.
- Reviewed 38,646 memo lines in total.
- Found no non-markdown files under `data/`.
- All memo basenames already match lowercase snake_case naming.
- This table lists potential factual mistakes, stale claims, risky examples, or statements that should be softened. It is not a style review.

## Potential Mistakes

| ID | Confidence | File | Potential issue | Suggested correction or check | Evidence |
|---|---|---|---|---|---|
| 1 | High | `data/web_security/owasp_top_10_2025_overview.md:12` | The OWASP Top 10 2025 category list is partly wrong. A06, A08, and A09 do not match the official 2025 list. | Use the official 2025 category names: A06 Insecure Design, A08 Software or Data Integrity Failures, and A09 Security Logging and Alerting Failures. | [S1] |
| 2 | High | `data/rails/activerecord/batch_find_each_cursor_based_iteration.md:28` | The memo says `find_each` cannot custom order and uses `OFFSET`. Modern Rails batch APIs support cursor and order options and are cursor based. | Update the caveat to mention `cursor:` and `order:` support, plus the need for stable unique cursor columns. | [S2] |
| 3 | High | `data/rails/features/action_cable_client_side_js_redis_adapter_turbo_streams.md:21` | The Action Cable JS example inserts `data.user` and `data.message` with `insertAdjacentHTML`, which is an XSS-prone pattern if payload data is user controlled. | Use `textContent`, DOM node construction, or server-rendered escaped Turbo Stream partials. | Local code review |
| 4 | Medium | `data/rails/features/action_cable_client_side_js_redis_adapter_turbo_streams.md:35` | The memo says Redis is required or should always be used in production for Action Cable. Rails now also has Solid Cable as a production-oriented database-backed option. | Rephrase Redis as a common production adapter, not a universal requirement. Mention Solid Cable where relevant. | [S3] |
| 5 | High | `data/rails/authentication/api_jwt_stateless_tokens.md:22` | The controller example decodes JWTs without explicit algorithm or verification options, despite the safer example earlier in the memo. | Specify the algorithm and required claims consistently, and handle missing or malformed Authorization headers. | [S4] |
| 6 | High | `data/api_design/webhook_verification_async.md:58` | `secure_compare` raises when strings differ in length. The example compares signatures without first checking equal byte length. | Compare digest byte lengths before `secure_compare`, or use a fixed-length digest comparison helper. | Rails API behavior |
| 7 | High | `data/database_engineering/postgresql/row_level_security_rls_multi_tenant.md:25` | The memo says RLS cannot be bypassed in SQL. PostgreSQL superusers, table owners, and roles with `BYPASSRLS` can bypass RLS unless ownership and `FORCE ROW LEVEL SECURITY` are handled carefully. | Add the owner, superuser, and `BYPASSRLS` caveats. | [S5] |
| 8 | Medium | `data/database_engineering/sql/materialized_views_refresh_concurrently.md:28` | The memo says concurrent refresh has "no lock." PostgreSQL still uses locking and only one refresh can run at a time; it mainly avoids blocking reads like a normal refresh. | Say it avoids blocking concurrent `SELECT`s, requires a suitable unique index, and is still serialized per materialized view. | [S6] |
| 9 | High | `data/database_engineering/postgresql/enum_type_fixed_values.md:16` | The memo says PostgreSQL enum values cannot be renamed. PostgreSQL supports `ALTER TYPE ... RENAME VALUE`. | Replace "cannot be renamed" with the actual limits: values can be added and renamed, but not easily removed or reordered. | [S7] |
| 10 | High | `data/database_engineering/sql/ddl_dml_dcl_tcl_command_categories.md:10` | The snippet mixes PostgreSQL-looking DDL with MySQL syntax: `RENAME TABLE old_name TO new_name`. | For PostgreSQL, use `ALTER TABLE old_name RENAME TO new_name`; for MySQL, label the syntax as MySQL. | [S8] |
| 11 | High | `data/database_engineering/sql/ddl_dml_dcl_tcl_command_categories.md:22` | The memo says `MERGE` is not standard PostgreSQL. PostgreSQL 15 and newer support `MERGE`. | Rephrase to: PostgreSQL 15+ supports `MERGE`; older apps often used `INSERT ... ON CONFLICT` for upserts. | [S9] |
| 12 | Medium | `data/database_engineering/mysql/vs_postgresql_differences_locking_replication_json_features.md:59` | The MySQL replication example uses `SHOW SLAVE STATUS`, which is deprecated terminology. | Prefer `SHOW REPLICA STATUS` for current MySQL versions. | [S10] |
| 13 | Medium | `data/database_engineering/mysql/vs_postgresql_differences_locking_replication_json_features.md:45` | "PostgreSQL ADD COLUMN with DEFAULT is instant" needs a caveat. Fast defaults apply to eligible non-volatile defaults; other cases may still rewrite or scan. | Add the non-volatile-default caveat and note constraints can still require validation work. | [S11] |
| 14 | Medium | `data/database_engineering/postgresql/full_text_search_tsvector_tsquery_gin.md:4` | The memo says PostgreSQL full-text search searches "by meaning." PostgreSQL FTS is lexical, token, dictionary, and stem based, not semantic search. | Say it searches normalized lexemes with ranking, dictionaries, stemming, and stop-word handling. | PostgreSQL FTS behavior |
| 15 | High | `data/ruby/core/struct_data_lightweight_classes.md:30` | The comparison says `Data.define` provides `to_a`. Ruby `Data` objects do not respond to `to_a`. | List `to_h`, `deconstruct`, `members`, and `with` for `Data`; reserve `to_a` for `Struct`. | Local Ruby check |
| 16 | High | `data/ruby/performance/memory_streaming_file_processing_activerecord_optimization.md:13` | The memo implies `Oj.load(file) { ... }` streams each top-level array item. A local check showed the block receives the whole parsed object for a JSON array. | Use `Oj.sc_parse`, `Oj::Saj`, NDJSON, `yajl-ruby`, or another real streaming parser for large JSON. | Local Oj check |
| 17 | High | `data/ruby/activesupport/string_inflections_pluralize_classify_underscore.md:37` | The memo says `safe_constantize` safely converts user input to classes. It only avoids raising on missing constants; it does not make user-controlled constant lookup safe. | Recommend an allowlist for user-selectable classes. | Rails API behavior |
| 18 | Medium | `data/design_patterns/unit_of_work_transaction_tracking.md:33` | The memo describes `ActiveRecord::Base.transaction` as a simplified Unit of Work that tracks changes. Active Record does not generally delay-flush tracked dirty objects like a Unit of Work ORM. | Say Rails transactions group already-issued SQL writes atomically; dirty tracking and transaction boundaries are separate concepts. | Rails behavior |
| 19 | High | `data/system_design/fundamentals/rate_limiter_token_bucket_sliding_window.md:51` | The Redis sorted-set limiter uses the timestamp as both score and member. Multiple requests in the same millisecond can overwrite each other and be undercounted. | Use a unique member such as `timestamp:uuid` and make prune/count/add/expire atomic with Lua or a carefully checked transaction. | Redis sorted-set semantics |
| 20 | High | `data/system_design/fundamentals/rate_limiter_redis_sorted_sets_sliding_window.md:7` | Same timestamp-member collision risk appears in the dedicated sliding-window limiter memo. | Use unique request IDs for members and perform the limiter decision atomically. | Redis sorted-set semantics |
| 21 | Medium | `data/system_design/fundamentals/distributed_cache_consistent_hashing_redis_cluster.md:48` | The memo mentions "Raft in Redis Sentinel." Redis Sentinel uses Sentinel quorum and majority agreement, not Raft. | Reword Sentinel failover mechanics and avoid implying Redis uses Raft. | [S12] |
| 22 | High | `data/data_engineering/kafka/architecture_topics_partitions_consumer_groups.md:26` | The memo says no-key Kafka messages are round-robin. Modern Kafka default partitioning for null keys uses sticky partitioning by default. | Update the no-key behavior and note batching/locality effects. | [S13] |
| 23 | Medium | `data/data_engineering/kafka/deep_dive_brokers_partitions_replication_offsets_consumer_groups.md:35` | The memo says the same key always goes to the same partition. That is true only while topic partition count and partitioner behavior stay stable. | Add a caveat that increasing partitions can remap keys for future records. | [S13] |
| 24 | High | `data/data_engineering/kafka/schema_registry_avro_protobuf_evolution.md:23` | The table says Avro schema is embedded. In Confluent Schema Registry Kafka messages, the wire format embeds a schema ID, not the full schema. | Distinguish Avro Object Container Files from Confluent Schema Registry message encoding. | [S14] |
| 25 | High | `data/data_engineering/kafka/exactly_once_semantics_transactions_idempotent_producer.md:8` | The table says exactly-once risk is "None." Kafka EOS does not eliminate all risks, especially external side effects. | Say EOS covers Kafka transactional read-process-write paths; external DB/API/payment effects still need idempotency, outbox, or transactional coordination. | Kafka behavior |
| 26 | Medium | `data/devops/cloud_aws/aws_ebs_elastic_block_store_volumes_gp3_io2_snapshots_encryption.md:13` | The io2 limits are outdated or incomplete for io2 Block Express on supported Nitro instances. | Update the io2 row or split io2 and io2 Block Express limits. | [S15] |
| 27 | Medium | `data/devops/cloud_aws/aws_kinesis_data_streams_firehose_realtime_streaming.md:7` | AWS service names are stale: Kinesis Data Firehose is now Amazon Data Firehose; Kinesis Data Analytics for Apache Flink is now Amazon Managed Service for Apache Flink. | Update service names while noting former names if useful for search. | [S16], [S17] |
| 28 | High | `data/devops/cloud_aws/aws_cognito_user_pools_identity_authentication_hosted_ui.md:58` | The "free up to 50K MAU" Cognito pricing note is outdated for current pricing tiers. | Update with current pricing tiers and date the statement, or avoid exact pricing in a memo. | [S18] |
| 29 | Medium | `data/devops/cloud_aws/aws_cloudtrail_audit_logging_api_calls_compliance.md:6` | "Enabled by default" and "always recording" can overstate CloudTrail. The default 90-day event history is for management events; data events and long-term storage require configuration. | Clarify default event history versus trails, event data stores, data events, and retention. | [S19] |
| 30 | Medium | `data/devops/kubernetes/k8s_ingress_http_routing_tls_nginx_certmanager.md:12` | The AWS ingress controller name is stale: AWS ALB Ingress Controller was renamed AWS Load Balancer Controller. | Use AWS Load Balancer Controller and optionally mention the former name. | [S20] |
| 31 | High | `data/system_design/case_studies/ride_sharing_uber_geospatial_matching.md:80` | The Redis command `GEORADIUS` is deprecated in Redis 6.2 and later. | Prefer `GEOSEARCH` or `GEOSEARCHSTORE`. | [S21] |
| 32 | Medium | `data/os_cs_fundamentals/io_models_blocking_epoll_event_loop_async.md:28` | Calling `epoll` simply O(1) is oversimplified. It avoids scanning all watched file descriptors, but work still scales with ready events and kernel bookkeeping. | Rephrase to "scales with active events rather than total watched file descriptors." | Linux epoll behavior |
| 33 | High | `data/os_cs_fundamentals/io_models_blocking_epoll_event_loop_async.md:63` | The memo calls `io_uring` kernel bypass. DPDK is kernel bypass; `io_uring` is an in-kernel asynchronous I/O interface. | Separate kernel bypass technologies from Linux async I/O interfaces. | Linux io_uring behavior |
| 34 | High | `data/system_design/case_studies/realtime_analytics_dashboard_kafka_flink_materialized_views.md:75` | Redis sorted-set range query complexity is listed as O(1). `ZRANGE` style top-N/range queries are not O(1). | Use Redis command complexity, usually O(log(N)+M) or command-specific equivalent. | Redis command behavior |
| 35 | Medium | `data/behavioral_leadership/company_culture/meta_facebook_behavioral_interview_move_fast_bold_values.md:3` | The Meta values appear to use an older public wording. Company values and interview rubrics change over time. | Refresh against Meta's current public values and date the memo. | [S22] |
| 36 | Medium | `data/behavioral_leadership/company_culture/netflix_behavioral_interview_freedom_responsibility_culture.md:3` | The Netflix value list appears incomplete or stale compared with the current public culture page. | Refresh against the official Netflix culture page and date the memo. | [S23] |
| 37 | Medium | `data/system_design/case_studies/visa_payment_card_network_visanet_authorization_clearing_settlement.md:188` | `RVAA` appears likely to be a typo or unsupported acronym; nearby payment-risk context usually uses VAA for Visa Advanced Authorization. | Verify with a source and likely replace `RVAA` with `VAA`. | Cross-memo consistency |
| 38 | High | `data/design_patterns/payment_network/idempotency_stan_rrn_exactly_once_payment.md:152` | "On failure, delete idempotency key" is dangerous if a side effect happened before the failure was observed. | Store idempotency state such as processing, succeeded, and failed; retry only when the transaction outcome is known safe. | Distributed systems behavior |
| 39 | Medium | `data/design_patterns/payment_network/split_payment_marketplace_escrow_multi_party_funds_flow_disbursement.md:207` | Claims that Stripe Connect or Adyen provide "escrow" are legally loaded and may be overbroad. | Use provider-specific terms such as split payments, separate charges and transfers, holds, payouts, or balances unless legal/product docs explicitly say escrow. | Provider/legal terminology risk |
| 40 | Low | `data/design_patterns/payment_network/base_ii_batch_clearing_reconciliation_settlement.md:3` | "Every day at 11 AM EST" and a single clearing window are over-specific and may not apply across regions, participants, or programs. | Soften to "scheduled clearing windows vary by network, region, and participant." | Domain variability |
| 41 | Medium | `data/design_patterns/payment_network/realtime_fraud_scoring_vaa_vda_deep_learning_risk_1ms.md:3` | Exact Visa fraud-prevention dollar amounts and 1 ms latency claims are date-sensitive and need citation. `VDA` should also be verified. | Add a dated Visa source or soften the numbers and acronyms. | Source/date needed |
| 42 | Medium | `data/rails/activerecord/connection_pool_pgbouncer_sidekiq_troubleshooting.md:46` | PgBouncer transaction-pooling caveats are phrased too absolutely. Session-level advisory locks and session state are unsafe; transaction-level advisory locks may be fine within one transaction. Recent PgBouncer versions also have more prepared-statement support than older Rails advice implies. | Add version and mode caveats for advisory locks and prepared statements. | PgBouncer behavior |
| 43 | Medium | `data/devops/security/container_security_image_scanning_trivy_rootless_pss.md:21` | The GitHub Actions example uses `aquasecurity/trivy-action@master`, which conflicts with supply-chain guidance to pin third-party actions. | Pin to a version tag or commit SHA. | CI supply-chain best practice |

## Structural Notes

| Check | Result |
|---|---|
| Markdown-only under `data/` | Passed |
| Lowercase snake_case basenames | Passed |
| Concise memo style | Mixed. Some very short memos are acceptable, but 125 files are 3 lines or shorter and may be worth expanding later. |
| Source freshness | Mixed. Cloud, Rails, OWASP, Redis, Kafka, and company-culture memos are the highest-priority refresh areas. |

## Sources Used

- [S1] OWASP Top 10 2025: https://owasp.org/Top10/2025/
- [S2] Rails ActiveRecord batches: https://api.rubyonrails.org/classes/ActiveRecord/Batches.html
- [S3] Solid Cable repository: https://github.com/rails/solid_cable
- [S4] ruby-jwt documentation: https://github.com/jwt/ruby-jwt
- [S5] PostgreSQL row security policies: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- [S6] PostgreSQL `REFRESH MATERIALIZED VIEW`: https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html
- [S7] PostgreSQL `ALTER TYPE`: https://www.postgresql.org/docs/current/sql-altertype.html
- [S8] PostgreSQL `ALTER TABLE`: https://www.postgresql.org/docs/current/sql-altertable.html
- [S9] PostgreSQL `MERGE`: https://www.postgresql.org/docs/current/sql-merge.html
- [S10] MySQL `SHOW REPLICA STATUS`: https://dev.mysql.com/doc/refman/8.4/en/show-replica-status.html
- [S11] PostgreSQL 11 fast default column behavior: https://www.postgresql.org/docs/11/ddl-alter.html
- [S12] Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- [S13] Kafka producer configuration: https://kafka.apache.org/documentation/#producerconfigs_partitioner.class
- [S14] Confluent Schema Registry serializers and wire format: https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/index.html
- [S15] AWS EBS volume types: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html
- [S16] Amazon Data Firehose: https://aws.amazon.com/firehose/
- [S17] Amazon Managed Service for Apache Flink: https://aws.amazon.com/managed-service-apache-flink/
- [S18] Amazon Cognito pricing: https://aws.amazon.com/cognito/pricing/
- [S19] AWS CloudTrail event history: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html
- [S20] AWS Load Balancer Controller: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/
- [S21] Redis `GEORADIUS`: https://redis.io/docs/latest/commands/georadius/
- [S22] Meta company information: https://about.meta.com/company-info/
- [S23] Netflix culture: https://jobs.netflix.com/culture
