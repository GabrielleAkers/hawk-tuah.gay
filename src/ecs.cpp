#include "ecs.h"
#include "entityhandle.h"

namespace gay {
EntityHandle World::CreateEntity() {
    return EntityHandle{entity_manager->CreateEntity(), this};
}
} // namespace gay