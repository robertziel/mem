### ActiveSupport: String Inflections

```ruby
# pluralize / singularize
"post".pluralize       # "posts"
"person".pluralize     # "people"
"octopus".pluralize    # "octopi"
"posts".singularize    # "post"

# classify (table name to class name)
"posts".classify       # "Post"
"line_items".classify  # "LineItem"

# tableize (class name to table name)
"LineItem".tableize    # "line_items"

# underscore / camelize
"MyModule::MyClass".underscore  # "my_module/my_class"
"first_name".camelize           # "FirstName"
"first_name".camelize(:lower)   # "firstName"

# titleize / humanize
"first_name".titleize    # "First Name"
"author_id".humanize     # "Author"

# constantize / safe_constantize
"User".constantize           # User (the class)
"NonExistent".safe_constantize  # nil (no error)

# parameterize (URL-safe slugs)
"Hello World & Goodbye".parameterize  # "hello-world-goodbye"

# truncate
"A very long string".truncate(10)  # "A very ..."
```

**Rule of thumb:** Rails uses inflections internally for convention-over-configuration (table names, class names, file paths). `classify` and `tableize` are how Rails maps between models and tables. `safe_constantize` for safely converting strings to classes (user input → class lookup).
