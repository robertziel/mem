### Ruby AST Abstract Syntax Tree (short)

**AST** means **Abstract Syntax Tree**.

- Ruby reads source code as text.
- It tokenizes the text into meaningful pieces.
- It parses those tokens into a tree structure.
- That tree represents the code's structure and meaning, not the raw text itself.

### Tiny example

Ruby code:

```ruby
a = 1 + 2
```

Conceptually becomes:

```text
assign
├── variable: a
└── plus
    ├── 1
    └── 2
```

### Why it matters

- **Linters** use ASTs to reason about code structure.
- **Formatters** use ASTs to rewrite code consistently.
- **Static analysis** tools inspect ASTs to find patterns and mistakes.
- **Code transformation** tools use ASTs to refactor or generate code safely.

### Important distinction

- AST is one stage of Ruby's processing pipeline, not "all of Ruby."
- Humans write syntax; Ruby parses that syntax into an AST before executing it.
- AST is more abstract than raw source text and usually simpler than a full parse tree.

**Rule of thumb:** If a tool needs to understand what code means instead of what text looks like, it probably works from the AST.
