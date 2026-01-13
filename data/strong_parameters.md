### Strong parameters (short)

Rails uses strong parameters to **whitelist** allowed fields from user input.

```ruby
params.require(:user).permit(:email, :name)
```

**Why:** prevents mass-assignment vulnerabilities.

**Rule of thumb:** only permit fields users should be able to change.
