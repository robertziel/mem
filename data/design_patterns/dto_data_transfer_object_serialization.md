### DTO (Data Transfer Object)

Carry data between processes/layers without behavior — just data.

```ruby
# DTO: plain data structure for API response
UserDTO = Struct.new(:id, :name, :email, :role, keyword_init: true)

class UsersController < ApplicationController
  def show
    user = User.find(params[:id])
    dto = UserDTO.new(
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: user.role.name
    )
    render json: dto.to_h
  end
end
```

**Why DTOs matter:**
- Decouple internal model from external representation
- Don't expose internal fields (password_digest, internal IDs)
- Shape data for specific consumers (mobile gets less data than web)
- Reduce over-fetching (don't send all 50 columns)

**In Rails:** Serializers (Blueprinter, Alba) act as DTOs — they define what data crosses the API boundary.

**Rule of thumb:** DTO to control what data crosses boundaries (API responses, service-to-service calls). In Rails, serializers serve this purpose. The internal model should not dictate the API shape.
