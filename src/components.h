
#pragma once

#include "physics.h"
#include "raylib-cpp.hpp"
#include "vector.h"

#include <Jolt/Jolt.h>
#include <Jolt/Physics/Collision/Shape/StaticCompoundShape.h>
#include <Jolt/Physics/Collision/Shape/ConvexHullShape.h>

#include <cassert>
#include <memory>
#include <variant>

namespace gay {
struct Transform {
    raylib::Vector3 position;
    raylib::Quaternion rotation;
};

struct SphereCollider {
    std::shared_ptr<JPH::SphereShape> shape;
};

struct BoxCollider {
    std::shared_ptr<JPH::BoxShape> shape;
};

struct MeshCollider {
    JPH::Ref<JPH::StaticCompoundShapeSettings> shape;
};

using Collider = std::variant<SphereCollider, BoxCollider, MeshCollider>;

Collider CreateMeshColliderFromModel(std::shared_ptr<raylib::Model> model,
                                     raylib::Vector3 position,
                                     raylib::Quaternion rotation);

struct RigidBody {
    JPH::BodyID id;
    JPH::EMotionType motion_type;
    JPH::ObjectLayer layer;
    JPH::EActivation activation_mode;

    JPH::Vec3 initial_linear_velocity;
    JPH::Vec3 initial_angular_velocity;

    float restitution;
};

struct ModelRenderer {
    std::shared_ptr<raylib::Model> model;
    raylib::Vector3 rotation_axis;
    float rotation_angle;
    raylib::Vector3 scale;
    raylib::Color tint;
};

} // namespace gay