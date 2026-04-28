### Ruby AST (Abstract Syntax Tree) — Parsing & Use Cases

**Definition:** an **AST** is the tree representation of a program's structure after parsing. Source text → tokens → AST → execution. The AST captures **meaning**, not whitespace / formatting.

**Pipeline (high level):**

| Stage | What it produces |
|---|---|
| **Source text** | Raw `.rb` file |
| **Lexer / tokenizer** | Stream of tokens (`IDENT`, `INT`, `OPERATOR`, …) |
| **Parser** | **AST** (tree structure) |
| **Compiler** (in YARV / RubyVM) | Bytecode |
| **VM** | Execution |

**Tiny example:**

```ruby
a = 1 + 2
```

| Conceptual AST |
|---|
| `assign` |
|   ├── variable `a` |
|   └── `plus` |
|       ├── `1` |
|       └── `2` |

**Why AST matters — tools that work on it:**

| Tool category | Examples | Why use AST? |
|---|---|---|
| **Linters** | RuboCop | Reason about structure, not regex on text |
| **Formatters** | RuboCop, syntax_tree, Rufo | Rewrite consistently regardless of input style |
| **Static analysis** | Brakeman, Sorbet, RBS | Find security bugs, type errors |
| **Refactoring tools** | RuboCop autocorrect, refactor.io | Safe transformations |
| **Code generators** | Rails generators, code mods | Output well-formed code |
| **Profilers / coverage** | Coverage gem, Simplecov branch | Map runtime to source positions |
| **REPL / debuggers** | irb, debug, pry | Show enclosing context |
| **Tracing** | TracePoint API | Hook into AST events |

**Ruby's built-in parsers:**

| Tool | Detail |
|---|---|
| `Ripper` (stdlib) | Built-in incremental parser (lex / sexp / S-expr / event API) |
| `RubyVM::AbstractSyntaxTree.parse(...)` (since 2.6) | Returns an `RubyVM::AbstractSyntaxTree::Node` |
| `parser` gem | Most-used external parser; multi-version support |
| `prism` (newer, Ruby 3.3+) | Replacement parser; supports earlier Ruby versions and modern features cleanly; default in Ruby 3.4 |
| `syntax_tree` | Pretty-printer / formatter built on `prism` / `ripper` |

**Quick parse comparison:**

| Tool | Output style | Use |
|---|---|---|
| `Ripper.sexp("a = 1 + 2")` | S-expression | Quick look |
| `Ripper.lex("...")` | Token list | Lex only |
| `RubyVM::AbstractSyntaxTree.parse("...")` | Native node tree | Built-in, no deps |
| `Parser::CurrentRuby.parse("...")` | Whitequark-style AST | Mainstream tool ecosystem |
| `Prism.parse("...")` | Modern node tree | Replacing `parser` for new tools |

**Common AST node types you'll see:**

| Node | Means |
|---|---|
| `class`, `module` | Definitions |
| `def`, `defs` | Method definition (regular / singleton) |
| `block` | `do…end` / `{…}` block |
| `if`, `unless`, `case` | Conditionals |
| `while`, `until`, `for` | Loops |
| `send` | Method call (most common node) |
| `lvar`, `ivar`, `cvar`, `gvar` | Local / instance / class / global variable |
| `const` | Constant reference |
| `lit` | Literal (number, symbol) |
| `str`, `dstr` | String, dynamic string |
| `sym`, `dsym` | Symbol, dynamic symbol |
| `array`, `hash` | Collection literals |
| `op_asgn` | `x += 1` and friends |
| `args`, `arg`, `kwarg`, `restarg`, `blockarg` | Method parameters |
| `lvasgn`, `ivasgn` | Assignment |

**RuboCop cop pattern (typical AST consumer):**

```ruby
class MyCop < RuboCop::Cop::Base
  MSG = "Don't use 'puts' in production code"

  def_node_matcher :uses_puts?, <<~PATTERN
    (send nil? :puts ...)
  PATTERN

  def on_send(node)
    add_offense(node, message: MSG) if uses_puts?(node)
  end
end
```

> Pattern matchers describe AST shapes — much safer than regex on source code.

**Source-rewriting tools:**

| Tool | Use |
|---|---|
| `parser` gem + `Parser::Source::TreeRewriter` | Apply AST-driven edits |
| `rubocop-ast` | RuboCop's AST helpers |
| `prism` rewriting | New-generation tooling |
| `synvert` | Higher-level codemod DSL |

**Ruby compilation pipeline reminder:**

| Stage | Notes |
|---|---|
| Lexer | `Ripper.lex` |
| Parser | `Ripper.sexp` / `RubyVM::AbstractSyntaxTree` / `prism` |
| Compiler | YARV bytecode (CRuby) |
| Optimizer | YJIT / MJIT / RJIT (since Ruby 3.x) |
| VM | Stack-based bytecode VM |

**TracePoint — runtime hooks rather than AST:**

| Use | Detail |
|---|---|
| Hook on `:line`, `:call`, `:return`, `:raise`, etc. | Profilers, coverage tools, debuggers |
| Different from AST | Runs at execution time; AST is parse time |

**`#method`, `#source_location`, `#parameters` — runtime introspection:**

| API | Returns |
|---|---|
| `Kernel#method(:name)` | A `Method` object |
| `method.source_location` | `[file, line]` |
| `method.parameters` | List of `[:req, :name]`, `[:opt, :name]`, etc. |
| `Module#instance_method(:name)` | `UnboundMethod` |
| `Method#to_proc` | Wrap as a Proc |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Mixing `Ripper`'s S-expressions with `parser` gem's AST | Different shapes; not interchangeable |
| Regex-driven "AST" rewriting | Breaks on edge cases (heredocs, comments, multi-line) |
| Parsing source that won't compile | All parsers raise; check first |
| Manual codegen ignoring formatting | Reformat with `prism`/`syntax_tree` after generation |
| Forgetting comments are not in the AST | Use parser-level comment tokens to keep them |

**Decision shortcuts:**

| Need | Tool |
|---|---|
| Quick ad-hoc inspection | `Ripper.sexp` |
| Production lint / formatter | `RuboCop` + `rubocop-ast` |
| Static analysis / refactoring | `parser` or `prism` |
| Type checking | `Sorbet` (uses its own parser) / `Steep` + `RBS` |
| Code modifications / refactor scripts | `Parser::Source::TreeRewriter`, `synvert`, `prism` rewriter |
| Pretty-print / format | `syntax_tree` |

**Cross-references:**

- TracePoint / runtime introspection: [process_management.md](../../devops/linux_fundamentals/process_management.md) (for OS-level perspective)
- Blocks / Procs / Lambdas: [blocks_lambda_proc.md](../core/blocks_lambda_proc.md)

**Rule of thumb:** **if a tool needs to understand what code *means* rather than what text *looks like*, work from the AST**, not regex. Use **`prism`** for new tooling, **`parser` gem** for compatibility with the existing RuboCop ecosystem, and **`Ripper` / `RubyVM::AbstractSyntaxTree`** when you don't want a dependency. Pattern-matching node shapes (`def_node_matcher`) is the right way to write static analysis — never regex on raw source.
