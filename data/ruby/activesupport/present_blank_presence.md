### ActiveSupport: present? / blank? / presence

```ruby
# blank? — true for nil, false, "", " ", [], {}
nil.blank?       # true
"".blank?        # true
"  ".blank?      # true
[].blank?        # true
false.blank?     # true
0.blank?         # false (numbers are never blank)
"hello".blank?   # false

# present? — opposite of blank?
"hello".present? # true
nil.present?     # false

# presence — returns self if present?, otherwise nil
params[:name].presence || "Anonymous"
user.middle_name.presence   # nil if blank, value if present

# Before presence:
name = params[:name]
name = nil if name.blank?
# After:
name = params[:name].presence
```

**Rule of thumb:** Use `presence` instead of `present? ? value : nil`. `blank?` catches nil, false, empty string, whitespace, and empty collections. `0` and `0.0` are never blank.
