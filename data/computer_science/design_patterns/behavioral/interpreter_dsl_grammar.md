### Interpreter Pattern (DSL / Grammar)

Define a grammar and provide an interpreter to evaluate expressions.

```ruby
# Simple rule engine
class Expression
  def interpret(context) = raise NotImplementedError
end

class NumberExpression < Expression
  def initialize(number) = @number = number
  def interpret(_context) = @number
end

class AddExpression < Expression
  def initialize(left, right) = @left = left; @right = right
  def interpret(context) = @left.interpret(context) + @right.interpret(context)
end

class VariableExpression < Expression
  def initialize(name) = @name = name
  def interpret(context) = context[@name]
end

# Parse "x + 5"
expr = AddExpression.new(VariableExpression.new(:x), NumberExpression.new(5))
expr.interpret({ x: 10 })  # 15
expr.interpret({ x: 20 })  # 25
```

**Real-world examples:** SQL parsers, regular expressions, template engines, business rule engines, calculator apps.

**Rule of thumb:** Interpreter for simple languages/DSLs with a known grammar. For complex grammars, use a proper parser (ANTLR, Parslet, Treetop). Rarely implemented explicitly — most "interpreters" in practice are just `eval` or config parsers.
