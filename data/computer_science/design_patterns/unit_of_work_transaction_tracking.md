### Unit of Work Pattern (Transaction Tracking)

Track all changes during a business transaction and commit them atomically.

```ruby
class UnitOfWork
  def initialize
    @new_objects = []
    @dirty_objects = []
    @deleted_objects = []
  end

  def register_new(obj) = @new_objects << obj
  def register_dirty(obj) = @dirty_objects << obj
  def register_deleted(obj) = @deleted_objects << obj

  def commit
    ActiveRecord::Base.transaction do
      @new_objects.each(&:save!)
      @dirty_objects.each(&:save!)
      @deleted_objects.each(&:destroy!)
    end
  end
end

uow = UnitOfWork.new
uow.register_new(new_order)
uow.register_dirty(updated_user)
uow.register_deleted(cancelled_item)
uow.commit  # all or nothing
```

**In Rails:** `ActiveRecord::Base.transaction` is essentially a simplified Unit of Work — it tracks changes within the block and commits/rolls back atomically.

**Rule of thumb:** Unit of Work coordinates multiple repository operations in a single transaction. In Rails, the `transaction` block handles this. Explicit Unit of Work is more common in Data Mapper ORMs (Hibernate, Ecto).
