#pragma once

#include "util.h"
#include <bitset>
#include <cstdint>
#include <memory>
#include <queue>
#include <cassert>
#include <set>
#include <unordered_map>
#include <array>

namespace gay {
using Entity = std::uint32_t;
const Entity MAX_ENTITIES = 5000;

using ComponentType = std::uint32_t;
const ComponentType MAX_COMPONENTS = 32;

using Signature = std::bitset<MAX_COMPONENTS>;

class EntityManager {
  private:
    std::queue<Entity> available_entities{};
    std::array<Signature, MAX_ENTITIES> signatures;
    uint32_t num_living_entities{};

  public:
    EntityManager() {
        for (Entity e = 0; e < MAX_ENTITIES; ++e) {
            available_entities.push(e);
        }
    }

    Entity CreateEntity() {
        assert(num_living_entities < MAX_ENTITIES &&
               "Reached entity limit, can't create more");

        Entity e = available_entities.front();
        available_entities.pop();
        ++num_living_entities;
        return e;
    }

    void DestroyEntity(Entity entity) {
        assert(entity < MAX_ENTITIES && "Entity out of range");

        signatures[entity].reset();
        available_entities.push(entity);
        --num_living_entities;
    }

    void SetSignature(Entity entity, Signature signature) {
        assert(entity < MAX_ENTITIES && "Entity out of range");

        signatures[entity] = signature;
    }

    Signature GetSignature(Entity entity) {
        assert(entity < MAX_ENTITIES && "Entity out of range");

        return signatures[entity];
    }
};

class IComponentArray {
  public:
    virtual ~IComponentArray() = default;
    virtual void EntityDestroyed(Entity entity) = 0;
};

template <typename T> class ComponentArray : public IComponentArray {
  private:
    std::array<T, MAX_ENTITIES> component_array;
    std::unordered_map<Entity, size_t> entity_to_index_map;
    std::unordered_map<size_t, Entity> index_to_entity_map;
    size_t size;

  public:
    void InsertData(Entity entity, T component) {
        assert(entity_to_index_map.find(entity) == entity_to_index_map.end() &&
               "Component added to same entity more than once.");

        size_t new_index = size;
        entity_to_index_map[entity] = new_index;
        index_to_entity_map[new_index] = entity;
        component_array[new_index] = component;
        ++size;
    }

    void RemoveData(Entity entity) {
        assert(entity_to_index_map.find(entity) != entity_to_index_map.end() &&
               "Removing non-existent component.");

        size_t removed_entity_idx = entity_to_index_map[entity];
        size_t last_element_idx = size - 1;
        component_array[removed_entity_idx] = component_array[last_element_idx];

        Entity last_element_entity = index_to_entity_map[last_element_idx];
        entity_to_index_map[last_element_entity] = removed_entity_idx;
        index_to_entity_map[removed_entity_idx] = last_element_entity;

        entity_to_index_map.erase(entity);
        index_to_entity_map.erase(last_element_idx);

        --size;
    }

    T& GetData(Entity entity) {
        assert(entity_to_index_map.find(entity) != entity_to_index_map.end() &&
               "Retrieving non-existent component.");

        return component_array[entity_to_index_map[entity]];
    }

    void EntityDestroyed(Entity entity) override {
        if (entity_to_index_map.find(entity) != entity_to_index_map.end()) {
            RemoveData(entity);
        }
    }
};

class ComponentManager {
  private:
    std::unordered_map<const char*, ComponentType> component_types_map{};
    std::unordered_map<const char*, std::shared_ptr<IComponentArray>>
        component_arrays_map{};
    ComponentType next_component_type{};
    template <typename T>
    std::shared_ptr<ComponentArray<T>> GetComponentArray() {
        const char* type_name = typeid(T).name();

        assert(component_types_map.find(type_name) !=
                   component_types_map.end() &&
               "Component not registered before use.");

        return std::static_pointer_cast<ComponentArray<T>>(
            component_arrays_map[type_name]);
    }

  public:
    template <typename T> void RegisterComponent() {
        const char* type_name = typeid(T).name();

        assert(component_types_map.find(type_name) ==
                   component_types_map.end() &&
               "Registering component type more than once.");

        component_types_map.insert({type_name, next_component_type});
        component_arrays_map.insert(
            {type_name, std::make_shared<ComponentArray<T>>()});
        ++next_component_type;
    }

    template <typename T> ComponentType GetComponentType() {
        const char* type_name = typeid(T).name();

        assert(component_types_map.find(type_name) !=
                   component_types_map.end() &&
               "Component not registered before use.");

        return component_types_map[type_name];
    }

    template <typename T> void AddComponent(Entity entity, T component) {
        GetComponentArray<T>()->InsertData(entity, component);
    }

    template <typename T> void RemoveComponent(Entity entity) {
        GetComponentArray<T>()->RemoveData(entity);
    }

    template <typename T> T& GetComponent(Entity entity) {
        return GetComponentArray<T>()->GetData(entity);
    }

    void EntityDestroyed(Entity entity) {
        for (auto const& pair : component_arrays_map) {
            auto const& component = pair.second;

            component->EntityDestroyed(entity);
        }
    }
};

class World;

class System {
  protected:
    std::set<Entity> entities;

  public:
    virtual void Init() {}
    virtual void Update(float dt) {}
    virtual void Render() {}

    void RegisterEntity(Entity entity) { entities.insert(entity); }
    void DeRegisterEntity(Entity entity) { entities.erase(entity); }
};

class SystemManager {
  private:
    std::unordered_map<const char*, Signature> system_type_to_signature_map{};
    std::unordered_map<const char*, std::shared_ptr<System>>
        system_type_to_system_map{};

  public:
    template <typename T> std::shared_ptr<T> RegisterSystem() {
        const char* type_name = typeid(T).name();

        assert(system_type_to_system_map.find(type_name) ==
                   system_type_to_system_map.end() &&
               "Registering system more than once.");

        auto system = std::make_shared<T>();
        system_type_to_system_map.insert({type_name, system});
        return system;
    }

    template <typename T> void SetSignature(Signature signature) {
        const char* type_name = typeid(T).name();

        assert(system_type_to_system_map.find(type_name) !=
                   system_type_to_system_map.end() &&
               "System used before registered.");

        system_type_to_signature_map.insert({type_name, signature});
    }

    void EntityDestroyed(Entity entity) {
        for (auto const& pair : system_type_to_system_map) {
            auto const& system = pair.second;

            system->DeRegisterEntity(entity);
        }
    }

    void EntitySignatureChanged(Entity entity, Signature entity_signature) {
        for (auto const& pair : system_type_to_system_map) {
            auto const& type = pair.first;
            auto const& system = pair.second;
            auto const& system_signature = system_type_to_signature_map[type];

            if ((entity_signature & system_signature) == system_signature) {
                system->RegisterEntity(entity);
            } else {
                system->DeRegisterEntity(entity);
            }
        }
    }

    template <typename T> std::shared_ptr<T> GetSystem() {
        const char* type_name = typeid(T).name();

        assert(system_type_to_system_map.find(type_name) !=
                   system_type_to_system_map.end() &&
               "System doesn't exist.");

        return std::static_pointer_cast<T>(
            system_type_to_system_map.at(type_name));
    }
};

struct EntityHandle;

class World {
  private:
    std::unique_ptr<ComponentManager> component_manager;
    std::unique_ptr<EntityManager> entity_manager;
    std::unique_ptr<SystemManager> system_manager;

  public:
    void Init() {
        component_manager = std::make_unique<ComponentManager>();
        entity_manager = std::make_unique<EntityManager>();
        system_manager = std::make_unique<SystemManager>();
    }

    EntityHandle CreateEntity();

    void DestroyEntity(Entity entity) {
        entity_manager->DestroyEntity(entity);
        component_manager->EntityDestroyed(entity);
        system_manager->EntityDestroyed(entity);
    }

    template <typename T> void RegisterComponent() {
        component_manager->RegisterComponent<T>();
    }

    template <typename T> void AddComponent(Entity entity, T component) {
        component_manager->AddComponent<T>(entity, component);

        auto signature = entity_manager->GetSignature(entity);
        signature.set(component_manager->GetComponentType<T>(), true);
        entity_manager->SetSignature(entity, signature);

        system_manager->EntitySignatureChanged(entity, signature);
    }

    template <typename T> void RemoveComponent(Entity entity) {
        component_manager->RemoveComponent<T>(entity);

        auto signature = entity_manager->GetSignature(entity);
        signature.set(component_manager->GetComponentType<T>(), false);
        entity_manager->SetSignature(entity, signature);

        system_manager->EntitySignatureChanged(entity, signature);
    }

    template <typename T> T& GetComponent(Entity entity) {
        return component_manager->GetComponent<T>(entity);
    }

    // used to fetch type T from a component you know is stored as a variant,
    // e.g. Collider=variant<BoxCollider, SphereCollider, ...> -> SphereCollider
    // my_sphere_collder = world.GetComponent<Collider,
    // SphereCollider>(my_entity);
    template <typename TMaybeVariant, typename T>
    T& GetComponent(Entity entity) {
        assert(is_variant_v<TMaybeVariant> && "Not variant type");
        TMaybeVariant& comp =
            component_manager->GetComponent<TMaybeVariant>(entity);
        assert(std::holds_alternative<T>(comp) && "Component isnt type");
        return std::get<T>(comp);
    }

    template <typename T> ComponentType GetComponentType() {
        return component_manager->GetComponentType<T>();
    }

    template <typename T> std::shared_ptr<T> RegisterSystem() {
        return system_manager->RegisterSystem<T>();
    }

    template <typename T> void SetSystemSignature(Signature signature) {
        system_manager->SetSignature<T>(signature);
    }

    template <typename TSystem, typename... TComponents>
    void SetSystemSignature() {
        Signature signature;
        ([&] { signature.set(GetComponentType<TComponents>()); }(), ...);
        SetSystemSignature<TSystem>(signature);
    }

    template <typename T> std::shared_ptr<T> GetSystem() {
        return system_manager->GetSystem<T>();
    }
};
} // namespace gay