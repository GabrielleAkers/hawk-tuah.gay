#include "physicssystem.h"

extern gay::World* world;

namespace gay {
void PhysicsSystem::PreInit() {
    physics_manager = std::make_unique<PhysicsManager>();
    physics_manager->InitPhysics(DEFAULT_PHYSICS_CONFIG);
}

void PhysicsSystem::Init() {
    auto& body_interface = physics_manager->GetBodyInterface();

    for (auto const& entity : entities) {
        auto& transform = world->GetComponent<Transform>(entity);
        auto& collider = world->GetComponent<Collider>(entity);
        auto& rigid_body = world->GetComponent<RigidBody>(entity);

        std::visit(
            [&](auto&& arg) {
                using T = std::decay_t<decltype(arg)>;
                if constexpr (std::is_same_v<T, BoxCollider>) {
                    JPH::BodyCreationSettings settings(
                        arg.shape.get(), JPHVec3FromRaylib(transform.position),
                        JPHQuatFromRaylib(transform.rotation),
                        rigid_body.motion_type, rigid_body.layer);
                    settings.mUserData = entity;
                    rigid_body.id = body_interface.CreateAndAddBody(
                        settings, rigid_body.activation_mode);
                } else if constexpr (std::is_same_v<T, SphereCollider>) {
                    JPH::BodyCreationSettings settings(
                        arg.shape.get(), JPHVec3FromRaylib(transform.position),
                        JPHQuatFromRaylib(transform.rotation),
                        rigid_body.motion_type, rigid_body.layer);
                    settings.mUserData = entity;
                    rigid_body.id = body_interface.CreateAndAddBody(
                        settings, rigid_body.activation_mode);
                } else if constexpr (std::is_same_v<T, MeshCollider>) {
                    JPH::BodyCreationSettings settings(
                        arg.shape, JPHVec3FromRaylib(transform.position),
                        JPHQuatFromRaylib(transform.rotation),
                        rigid_body.motion_type, rigid_body.layer);
                    settings.mUserData = entity;
                    rigid_body.id = body_interface.CreateAndAddBody(
                        settings, rigid_body.activation_mode);
                }
            },
            collider);

        body_interface.SetLinearAndAngularVelocity(
            rigid_body.id, rigid_body.initial_linear_velocity,
            rigid_body.initial_angular_velocity);
        body_interface.SetRestitution(rigid_body.id, rigid_body.restitution);
    }

    physics_manager->OptimizeBroadPhase();
}

void PhysicsSystem::Update(float dt) {
    JPH::BodyInterface& body_interface = physics_manager->GetBodyInterface();
    for (auto const& entity : entities) {
        auto& rigid_body = world->GetComponent<RigidBody>(entity);
        if (rigid_body.layer != Layers::MOVING)
            continue;
        auto& transform = world->GetComponent<Transform>(entity);

        auto pos = body_interface.GetCenterOfMassPosition(rigid_body.id);
        transform.position.SetX(pos.GetX());
        transform.position.SetY(pos.GetY());
        transform.position.SetZ(pos.GetZ());

        auto rot = body_interface.GetRotation(rigid_body.id);
        transform.rotation.SetW(rot.GetW());
        transform.rotation.SetX(rot.GetX());
        transform.rotation.SetY(rot.GetY());
        transform.rotation.SetZ(rot.GetZ());
    }

    const int collision_steps = 1;

    physics_manager->Update(DELTA_TIME, collision_steps);
}

void PhysicsSystem::Cleanup() { physics_manager->CleanupPhysics(); }

JPH::BodyInterface& PhysicsSystem::GetBodyInterface() {
    return physics_manager->GetBodyInterface();
}
} // namespace gay