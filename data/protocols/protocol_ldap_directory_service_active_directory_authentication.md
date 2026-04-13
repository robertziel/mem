### LDAP (Lightweight Directory Access Protocol)

**What LDAP does:**
- Query and manage directory services (centralized user/group databases)
- Most common implementation: Microsoft Active Directory
- Used for: user authentication, authorization, org structure, email address lookup
- Port 389 (plaintext), Port 636 (LDAPS — LDAP over TLS)

**Directory structure (tree):**
```
dc=example,dc=com                          (domain)
  └── ou=People                             (organizational unit)
  │     ├── cn=Alice Smith                  (common name / user)
  │     │     uid=alice
  │     │     mail=alice@example.com
  │     │     memberOf=cn=Engineering,ou=Groups
  │     └── cn=Bob Jones
  └── ou=Groups
        ├── cn=Engineering
        └── cn=Administrators
```

**LDAP operations:**
| Operation | Purpose | Example |
|-----------|---------|---------|
| Bind | Authenticate to the directory | Login with DN + password |
| Search | Query for entries | Find all users in Engineering |
| Add | Create new entry | Add a new user |
| Modify | Update entry attributes | Change email address |
| Delete | Remove entry | Delete a user |

**Search query (filter syntax):**
```
# Find user by username
(&(objectClass=person)(uid=alice))

# Find all members of Engineering group
(&(objectClass=group)(cn=Engineering))

# Find all active users with email
(&(objectClass=person)(mail=*)(!(accountDisabled=TRUE)))
```

**LDAP authentication flow (web app):**
```
1. User enters username + password in web app
2. App connects to LDAP server (bind with service account)
3. App searches for user: (&(uid=alice)(objectClass=person))
4. App attempts bind with user's DN + password
5. Bind succeeds → user authenticated
6. App reads user's groups (memberOf) for authorization
```

**LDAP vs modern alternatives:**
| Feature | LDAP/AD | OAuth 2.0 / OIDC | SAML |
|---------|---------|-------------------|------|
| Protocol | LDAP (binary) | HTTP/JSON | HTTP/XML |
| Primary use | Internal auth + directory | Web/API auth | Enterprise SSO |
| Token-based | No | Yes (JWT) | Yes (XML assertions) |
| Modern apps | Legacy integration | Standard for new apps | Enterprise federation |

**Active Directory specifics:**
- Microsoft's LDAP implementation + Kerberos + DNS + Group Policy
- Domain Controllers replicate the directory
- Group Policy: push configs, security policies to domain-joined machines
- Kerberos: ticket-based auth (SSO within the domain)

**Rule of thumb:** LDAP for internal user directories and authentication (especially in enterprises with Active Directory). For new web applications, prefer OAuth 2.0 / OIDC. LDAP is still very relevant for corporate environments, VPN auth, and internal tool access.
