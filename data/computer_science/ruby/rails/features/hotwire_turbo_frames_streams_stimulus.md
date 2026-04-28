### Hotwire — Turbo (Drive / Frames / Streams) + Stimulus

**Definition:** Rails' answer to SPAs — keep HTML server-rendered, ship minimal JavaScript. **Turbo** intercepts navigation and updates DOM regions; **Stimulus** sprinkles JS controllers for genuinely interactive bits.

**The four pieces — what each does:**

| Piece | Job | Mechanism |
|---|---|---|
| **Turbo Drive** | Speed up full-page navigation | Intercepts links / forms; swaps `<body>` |
| **Turbo Frames** | Update one page region independently | `<turbo-frame>` tag; lazy-load and replace |
| **Turbo Streams** | Server-pushed multi-target updates | `<turbo-stream>` actions over HTTP / WebSocket / SSE |
| **Stimulus** | Sprinkle JS where the server can't render | Tiny controllers attached via `data-controller` |

**Turbo Drive — what it does:**

| Without Turbo Drive | With Turbo Drive |
|---|---|
| Click link → full page reload | Click link → fetch page, swap body |
| Re-parse all CSS / JS | Reuse loaded assets |
| ~500ms typical | ~50–100ms typical |
| Forms reload everything on submit | Forms submit via fetch; smooth |

```
<%# Opt out of Turbo Drive for one link %>
<%= link_to "Download", report_path, data: { turbo: false } %>
```

**Turbo Frames — independent regions:**

```erb
<%# Wrap a region. Turbo replaces ONLY this frame on navigation. %>
<turbo-frame id="comments">
  <%= render @comments %>
  <%= link_to "Load more", comments_path(page: 2) %>
</turbo-frame>

<%# Lazy-load a frame at first paint %>
<turbo-frame id="recommendations" src="/recommendations" loading="lazy">
  <p>Loading…</p>
</turbo-frame>
```

| Property | Detail |
|---|---|
| `<turbo-frame>` is a custom element | Browser-native (no JS framework) |
| Server returns full page; Turbo extracts the matching frame | Same template works for full + partial loads |
| `loading="lazy"` | Defer until in viewport |
| Multiple frames on a page | Update independently |
| `target="_top"` | Break out — full-page nav |

**Turbo Streams — the broadcast channel:**

```erb
<%# Form returns a Stream response %>
<%= form_with model: @comment, data: { turbo_stream: true } %>

<%# Server response: app/views/comments/create.turbo_stream.erb %>
<%= turbo_stream.append "comments", partial: "comment", locals: { comment: @comment } %>
<%= turbo_stream.replace "comment_count" do %>
  <span id="comment_count"><%= @post.comments.count %></span>
<% end %>
```

**Five `turbo-stream` actions:**

| Action | Effect |
|---|---|
| `append` | Add to end of target |
| `prepend` | Add to start of target |
| `replace` | Replace whole target |
| `update` | Replace contents (keeps wrapper) |
| `remove` | Delete the element |

**WebSocket / Action Cable broadcast:**

```ruby
class Post < ApplicationRecord
  has_many :comments
  broadcasts_to :all   # or :all_posts, etc.
end

class Comment < ApplicationRecord
  belongs_to :post
  broadcasts_to ->(c) { [c.post, "comments"] }
end
```

| Mechanism | Detail |
|---|---|
| Model lifecycle hook | `after_create_commit / after_update_commit` |
| Streams identifier | Built from model + scope |
| Wired via Action Cable | WebSocket-based; SSE fallback possible |
| Subscriber on the page | `<%= turbo_stream_from @post, "comments" %>` |

**Stimulus — minimal JS controllers:**

```javascript
// app/javascript/controllers/clipboard_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["source"]
  static values = { successMessage: { type: String, default: "Copied!" } }

  copy() {
    navigator.clipboard.writeText(this.sourceTarget.value)
    this.element.textContent = this.successMessageValue
  }
}
```

```erb
<div data-controller="clipboard"
     data-clipboard-success-message-value="Done!">
  <input data-clipboard-target="source" value="abc123">
  <button data-action="click->clipboard#copy">Copy</button>
</div>
```

**Stimulus building blocks:**

| Concept | Purpose |
|---|---|
| `data-controller="x"` | Attach controller to element |
| `data-action="event->x#method"` | Bind event |
| `data-x-target="name"` | Mark sub-element |
| `data-x-name-value="..."` | Typed value (string / number / bool / array / object) |
| Lifecycle | `connect()` / `disconnect()` / `*Connected()` |
| Per-element instance | One controller per element |

**Decision tree — pick the right piece:**

| Need | Pick |
|---|---|
| Full-page nav, just want it faster | **Turbo Drive** (default — already on) |
| Update one region (lazy load, "load more") | **Turbo Frame** |
| Multi-target update from a form / job | **Turbo Stream** |
| Real-time push to many users | **Turbo Stream over WebSocket** |
| Pure client-side behavior (modal, copy button, dropdown) | **Stimulus** |
| Heavy SPA-like UI (drag/drop canvas, complex state) | Reach for React or similar |

**Patterns the team uses every day:**

| Pattern | How |
|---|---|
| Inline edit a row | `<turbo-frame id="row_42">` + click "Edit" navigates frame to edit form |
| Modal | Frame `id="modal"`; nav targets it; close via JS controller |
| Live comments | Stream over Action Cable, `broadcasts_to` on Comment |
| Form errors | Frame the form; server re-renders errors into the frame |
| Infinite scroll | Frame at bottom with `src="/page/2"`, `loading="lazy"` |
| Optimistic UI | Stimulus controller appends the row; reconcile on stream response |

**When Hotwire fits — and when it doesn't:**

| Fits well | Stretch / fight it |
|---|---|
| CRUD apps | Real-time collaborative editing (Figma / Notion) |
| Dashboards with periodic updates | Heavy client-side state machines |
| Comments / activity feeds | Offline-first PWAs |
| Multi-step forms | Complex drag/drop interactions |
| Admin panels | 3D / canvas / WebGL apps |
| Server-rendered SaaS | Mobile-first React Native sharing UI code |

**Performance properties:**

| Property | Detail |
|---|---|
| **Smaller JS bundle** | Stimulus core is ~16 KB gzipped |
| **Server still renders** | Cache, ETag, fragment cache all work |
| **No client-side router** | URL is just URL |
| **No state hydration** | The DOM IS the state |
| **HTTP/2 friendly** | Many small fragments fine |
| **Turbo Frames preserve scroll position** | Better UX than SPA naive routes |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Forgetting `<turbo-frame>` id matches | Frame swap silently fails |
| Linking outside a frame without `target="_top"` | Nav stays inside the frame |
| Using JS that runs once on page load | Stimulus hooks fire on each connect; rethink lifecycle |
| Heavy use of `morphdom` instead of replace | DOM weirdness on edge cases |
| Broadcasting from inside transactions | Race vs `after_commit` — use commit hooks |
| Caching streams | Don't cache Turbo Stream responses |
| Form `data-turbo: false` for one quirk | Loses Drive benefits for that page |
| Mixing React + Hotwire ad hoc | Pick a primary; islands need clear boundary |

**Testing Hotwire:**

| Tool | Use |
|---|---|
| `Capybara` (system tests) | Full-stack; Hotwire works as expected |
| `assert_turbo_stream` | Rails 7+ assertion helper |
| `Capybara::TurboFrame` matchers | Inspect specific frames |
| `with_chrome_headless` | Default Capybara driver works |

**Cross-references:**

- Rails callbacks (broadcast hooks): [callbacks_*.md](../activerecord/callbacks_before_save_after_commit_lifecycle.md)
- Action Cable / WebSocket: [websocket_*.md](../../../system_design_hld_high_level_design/fundamentals/websocket_long_polling_sse_realtime.md)
- Caching strategies: [caching_strategies_*.md](../../../system_design_hld_high_level_design/patterns/caching_strategies_redis_memcached_invalidation.md)

**Rule of thumb:** **Default to Turbo Drive + server-rendered HTML.** Reach for **Turbo Frames** when one region needs to update independently, **Turbo Streams** when the server pushes multi-target changes (often over WebSocket), and **Stimulus** only when you need genuine client-side behavior. **The DOM is the state**; cache and ETag still work; bundle stays tiny. If your UI needs offline-first or rich client state, Hotwire isn't the right tool — pick a SPA framework.
