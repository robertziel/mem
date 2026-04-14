### LLD: Chess Game (Inheritance & Polymorphism)

**Requirements:**
- Two players, standard 8x8 board
- Six piece types with different movement rules
- Validate moves, check, checkmate, stalemate detection
- Turn-based gameplay

**Core entities:**
- Game, Board, Cell, Piece (abstract), Player, Move

**Class hierarchy (inheritance + polymorphism):**
```ruby
class Piece
  attr_reader :color, :position

  def initialize(color, position)
    @color = color
    @position = position
    @moved = false
  end

  def valid_moves(board)
    raise NotImplementedError
  end

  def can_move_to?(board, target)
    valid_moves(board).include?(target)
  end

  def move_to(position)
    @position = position
    @moved = true
  end
end

class King < Piece
  def valid_moves(board)
    directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
    directions
      .map { |dr, dc| [@position[0]+dr, @position[1]+dc] }
      .select { |pos| board.in_bounds?(pos) && !board.occupied_by_ally?(pos, color) }
    # + castling logic if !@moved
  end
end

class Rook < Piece
  def valid_moves(board)
    straight_moves(board, [[0,1],[0,-1],[1,0],[-1,0]])
  end
end

class Bishop < Piece
  def valid_moves(board)
    straight_moves(board, [[1,1],[1,-1],[-1,1],[-1,-1]])
  end
end

class Queen < Piece
  def valid_moves(board)
    straight_moves(board, [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]])
  end
end

class Knight < Piece
  def valid_moves(board)
    jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
    jumps
      .map { |dr, dc| [@position[0]+dr, @position[1]+dc] }
      .select { |pos| board.in_bounds?(pos) && !board.occupied_by_ally?(pos, color) }
  end
end

class Pawn < Piece
  def valid_moves(board)
    moves = []
    dir = color == :white ? -1 : 1
    # Forward one
    fwd = [@position[0]+dir, @position[1]]
    moves << fwd if board.empty?(fwd)
    # Forward two (first move)
    fwd2 = [@position[0]+2*dir, @position[1]]
    moves << fwd2 if !@moved && board.empty?(fwd) && board.empty?(fwd2)
    # Diagonal capture
    [[-1,1],[1,1]].each do |dc, _|
      diag = [@position[0]+dir, @position[1]+dc]
      moves << diag if board.occupied_by_enemy?(diag, color)
    end
    moves
    # + en passant, promotion logic
  end
end
```

**Board and Game:**
```ruby
class Board
  def initialize
    @grid = Array.new(8) { Array.new(8) }
    setup_pieces
  end

  def piece_at(pos)       = @grid[pos[0]][pos[1]]
  def empty?(pos)         = in_bounds?(pos) && piece_at(pos).nil?
  def in_bounds?(pos)     = pos.all? { |c| c.between?(0, 7) }
  def occupied_by_ally?(pos, color)  = in_bounds?(pos) && piece_at(pos)&.color == color
  def occupied_by_enemy?(pos, color) = in_bounds?(pos) && piece_at(pos)&.color != color && !empty?(pos)

  def move(from, to)
    piece = piece_at(from)
    captured = piece_at(to)
    @grid[to[0]][to[1]] = piece
    @grid[from[0]][from[1]] = nil
    piece.move_to(to)
    captured
  end
end

class Game
  def initialize
    @board = Board.new
    @current_turn = :white
    @status = :active  # :active, :check, :checkmate, :stalemate
  end

  def make_move(from, to)
    piece = @board.piece_at(from)
    raise "Not your turn" unless piece&.color == @current_turn
    raise "Invalid move" unless piece.can_move_to?(@board, to)
    raise "Move leaves king in check" if leaves_king_in_check?(from, to)

    @board.move(from, to)
    @current_turn = @current_turn == :white ? :black : :white
    update_status
  end
end
```

**Polymorphism in action:**
- `piece.valid_moves(board)` — same interface, different behavior per piece type
- Board doesn't need to know which piece type — just calls `valid_moves`
- Adding a new piece type (fairy chess) = add one class, no changes to Board or Game

**Rule of thumb:** Chess is the classic inheritance + polymorphism example. Each piece overrides `valid_moves`. Board is piece-agnostic. Focus on the movement logic and check detection, not the full game engine. Discuss special moves (castling, en passant, promotion) as extensions.
