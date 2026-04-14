### Broken Access Control & IDOR

**OWASP #1 vulnerability** — more common than SQL injection or XSS.

**IDOR (Insecure Direct Object Reference):**
```
# User 123 views their orders:
GET /api/users/123/orders   → 200 OK (their orders)

# User 123 changes the ID:
GET /api/users/456/orders   → 200 OK (someone else's orders!)

# Same with any resource:
GET /api/invoices/789       → sees another company's invoice
DELETE /api/comments/321    → deletes another user's comment
```

**Prevention — scope to current user:**
```ruby
# BAD: trusts the URL parameter
def show
  @order = Order.find(params[:id])  # any user can access any order
end

# GOOD: scope to current user
def show
  @order = current_user.orders.find(params[:id])  # only their orders
  # Raises RecordNotFound if not theirs
end

# GOOD: explicit authorization
def show
  @order = Order.find(params[:id])
  authorize @order  # Pundit raises if not allowed
end
```

**Common access control failures:**
| Failure | Example | Fix |
|---------|---------|-----|
| Missing auth check | Endpoint has no `before_action :authenticate` | Add auth to every controller |
| Missing authz check | Any logged-in user accesses admin endpoints | Check roles/permissions |
| IDOR | Change ID in URL to access other users' data | Scope queries to current_user |
| Privilege escalation | User changes role in request body to "admin" | Whitelist params (strong params) |
| Force browsing | Access `/admin/dashboard` directly (no UI link needed) | Server-side auth on every route |
| Metadata manipulation | Tamper JWT claims or hidden form fields | Validate server-side, not client |

**Access control patterns:**
| Pattern | How | Best for |
|---------|-----|----------|
| **RBAC** (Role-Based) | User → Role → Permissions | Most web apps (admin, editor, viewer) |
| **ABAC** (Attribute-Based) | Policy evaluates user + resource + context | Fine-grained (department, time, location) |
| **ACL** (Access Control List) | Explicit per-resource permission list | File systems, shared documents |
| **ReBAC** (Relationship-Based) | Permissions based on entity relationships | Social networks (friends can see posts) |

**Implementation in Rails:**
```ruby
# Pundit policy (RBAC + ownership)
class OrderPolicy < ApplicationPolicy
  def show?
    user.admin? || record.user == user
  end

  def update?
    user.admin? || (record.user == user && record.pending?)
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      if user.admin?
        scope.all
      else
        scope.where(user: user)
      end
    end
  end
end
```

**Access control checklist:**
- [ ] Every endpoint has authentication (`before_action :authenticate`)
- [ ] Every endpoint has authorization (Pundit `authorize` or scope)
- [ ] Queries scoped to current user (never trust URL params for ownership)
- [ ] Strong parameters prevent role/permission manipulation
- [ ] Admin endpoints in separate namespace with role check
- [ ] Use UUIDs instead of sequential IDs (harder to enumerate)
- [ ] Log authorization failures (detect attacks)
- [ ] Deny by default, explicitly allow

**Rule of thumb:** Broken access control is the #1 web vulnerability because it's easy to miss — every endpoint needs both authentication AND authorization. Scope queries to current_user. Use Pundit policies. Test authorization in request specs. If a user can change an ID in the URL and see someone else's data, you have an IDOR.
