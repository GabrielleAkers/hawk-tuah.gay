#include "physicssystem.h"

extern gay::World* world;

namespace gay {
void PhysicsSystem::Init() {
    physics_manager = std::make_unique<PhysicsManager>();
    physics_manager->InitPhysics(DEFAULT_PHYSICS_CONFIG);

    auto& body_interface = physics_manager->GetBodyInterface();

    for (auto const& entity : entities) {
        auto& transform = world->GetComponent<Transform>(entity);
        auto& collider = world->GetComponent<Collider>(entity);
        auto& rigid_body = world->GetComponent<RigidBody>(entity);

        std::visit(
            [&](auto&& arg) {
                using T = std::decay_t<decltype(arg)>;
                if constexpr (std::is_same_v<T, BoxCollider>) {
                    rigid_body.id = body_interface.CreateAndAddBody(
                        JPH::BodyCreationSettings(
                            arg.shape.get(),
                            JPHVec3FromRaylib(transform.position),
                            JPHQuatFromRaylib(transform.rotation),
                            rigid_body.motion_type, rigid_body.layer),
                        rigid_body.activation_mode);
                } else if constexpr (std::is_same_v<T, SphereCollider>) {
                    rigid_body.id = body_interface.CreateAndAddBody(
                        JPH::BodyCreationSettings(
                            arg.shape.get(),
                            JPHVec3FromRaylib(transform.position),
                            JPHQuatFromRaylib(transform.rotation),
                            rigid_body.motion_type, rigid_body.layer),
                        rigid_body.activation_mode);
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

void PhysicsSystem::Render() {
    auto& body_interface = physics_manager->GetBodyInterface();

    for (auto const& entity : entities) {
        auto& rigid_body = world->GetComponent<RigidBody>(entity);
        auto& transform = world->GetComponent<Transform>(entity);
        auto& collider = world->GetComponent<Collider>(entity);

        std::visit(
            [&](auto&& arg) {
                using T = std::decay_t<decltype(arg)>;
                if constexpr (std::is_same_v<T, BoxCollider>) {
                    JPH::Vec3 extents = arg.shape->GetHalfExtent();
                    DrawCube(transform.position, extents.GetX(), extents.GetY(),
                             extents.GetZ(), raylib::Color::Red());
                } else if constexpr (std::is_same_v<T, SphereCollider>) {
                    DrawSphere(transform.position, arg.shape->GetRadius(),
                               raylib::Color::Blue());
                }
            },
            collider);
    }
}

void PhysicsSystem::Cleanup() { physics_manager->CleanupPhysics(); }
} // namespace gay