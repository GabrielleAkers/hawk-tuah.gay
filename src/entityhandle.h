#pragma once

#include "ecs.h"

namespace gay {
struct EntityHandle {
    Entity entity;
    World* world;

    void Destroy() { world->DestroyEntity(entity); }

    template <typename T> void AddComponent(T component) {
        world->AddComponent(entity, component);
    }

    template <typename T> void RemoveComponent() {
        world->RemoveComponent<T>(entity);
    }

    template <typename T> T& GetComponent() {
        return world->GetComponent<T>(entity);
    }

    template <typename TMaybeVariant, typename T> T& GetComponent() {
        return world->GetComponent<TMaybeVariant, T>(entity);
    }
};
} // namespace gay