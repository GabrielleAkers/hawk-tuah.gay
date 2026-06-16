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

    // used to fetch type T from a component you know is stored as a variant,
    // e.g. Collider=variant<BoxCollider, SphereCollider, ...> -> SphereCollider
    // my_sphere_collder = my_entity.GetComponent<Collider,
    // SphereCollider>();
    template <typename TMaybeVariant, typename T> T& GetComponent() {
        return world->GetComponent<TMaybeVariant, T>(entity);
    }
};
} // namespace gay