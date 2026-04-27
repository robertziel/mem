### Hotwire

Hotwire is the Rails approach of keeping HTML server-rendered while adding just enough client-side interactivity.

### Main pieces

- **Turbo Drive** -> replaces full page loads with faster navigation
- **Turbo Frames** -> update specific page sections independently
- **Turbo Streams** -> update multiple DOM targets from server responses, often over WebSockets or SSE
- **Stimulus** -> small JavaScript controllers for local page behavior

### Why people use it

- Less client-side state management than a full SPA
- Reuse server-rendered HTML
- Faster to build common CRUD and realtime UI

**Rule of thumb:** Default to server-rendered HTML with Turbo, then add Stimulus only for behavior that really needs JavaScript.
