### Zeitwerk autoloading

Zeitwerk is Rails' code loader that maps file paths to constant names.

### Core idea

- `app/models/user.rb` -> `User`
- `app/controllers/admin/users_controller.rb` -> `Admin::UsersController`
- Development lazily loads constants on first use and reloads code between requests
- Production usually eager-loads everything at boot

### Why it matters

- File names and constant names must match.
- One file should define the constant Zeitwerk expects.
- Namespace directories should mirror Ruby namespaces.

**Rule of thumb:** Keep file paths and constant names aligned exactly, or Zeitwerk will fail to autoload cleanly.
