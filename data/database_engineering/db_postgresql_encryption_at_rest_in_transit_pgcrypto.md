### PostgreSQL Encryption (At Rest & In Transit)

**Encryption at rest:**
| Method | What | How |
|--------|------|-----|
| Disk encryption | Entire volume | AWS EBS encryption, LUKS |
| Column encryption | Specific columns | pgcrypto extension |

```sql
CREATE EXTENSION pgcrypto;

-- Encrypt
INSERT INTO users (ssn_encrypted)
VALUES (pgp_sym_encrypt('123-45-6789', 'encryption_key'));

-- Decrypt
SELECT pgp_sym_decrypt(ssn_encrypted, 'encryption_key') FROM users;
```

**Encryption in transit (SSL):**
```
# postgresql.conf
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'

# pg_hba.conf — require SSL
hostssl all all 0.0.0.0/0 md5
```

**Rule of thumb:** Disk encryption (EBS/LUKS) for at-rest (simplest, transparent). pgcrypto for column-level encryption of specific sensitive fields (SSN, credit card). Always require SSL for connections in production.
