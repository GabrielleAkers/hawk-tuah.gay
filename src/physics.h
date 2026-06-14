#pragma once

#include <Jolt/Jolt.h>
#include <Jolt/Core/Factory.h>
#include <Jolt/Core/JobSystemThreadPool.h>
#include <Jolt/Core/TempAllocator.h>
#include <Jolt/Physics/Body/BodyActivationListener.h>
#include <Jolt/Physics/Body/BodyCreationSettings.h>
#include <Jolt/Physics/Collision/Shape/BoxShape.h>
#include <Jolt/Physics/Collision/Shape/SphereShape.h>
#include <Jolt/Physics/PhysicsSettings.h>
#include <Jolt/Physics/PhysicsSystem.h>
#include <Jolt/RegisterTypes.h>

JPH_SUPPRESS_WARNINGS

namespace gay {
namespace Layers {
static constexpr JPH::ObjectLayer NON_MOVING = 0;
static constexpr JPH::ObjectLayer MOVING = 1;
static constexpr JPH::ObjectLayer NUM_LAYERS = 2;
}; // namespace Layers

// Each broadphase layer results in a separate bounding volume tree in the broad
// phase. You at least want to have a layer for non-moving and moving objects to
// avoid having to update a tree full of static objects every frame. You can
// have a 1-on-1 mapping between object layers and broadphase layers (like in
// this case) but if you have many object layers you'll be creating many broad
// phase trees, which is not efficient. If you want to fine tune your broadphase
// layers define JPH_TRACK_BROADPHASE_STATS and look at the stats reported on
// the TTY.
namespace BroadPhaseLayers {
static constexpr JPH::BroadPhaseLayer NON_MOVING(0);
static constexpr JPH::BroadPhaseLayer MOVING(1);
static constexpr JPH::uint NUM_LAYERS(2);
}; // namespace BroadPhaseLayers

class ObjectLayerPairFilterImpl : public JPH::ObjectLayerPairFilter {
  public:
    virtual bool ShouldCollide(JPH::ObjectLayer inObject1,
                               JPH::ObjectLayer inObject2) const override;
};

// This defines a mapping between object and broadphase layers.
class BPLayerInterfaceImpl final : public JPH::BroadPhaseLayerInterface {
  public:
    BPLayerInterfaceImpl();

    virtual JPH::uint GetNumBroadPhaseLayers() const override;

    virtual JPH::BroadPhaseLayer
    GetBroadPhaseLayer(JPH::ObjectLayer inLayer) const override;

#if defined(JPH_EXTERNAL_PROFILE) || defined(JPH_PROFILE_ENABLED)
    virtual const char*
    GetBroadPhaseLayerName(JPH::BroadPhaseLayer inLayer) const override;
#endif // JPH_EXTERNAL_PROFILE || JPH_PROFILE_ENABLED

  private:
    JPH::BroadPhaseLayer mObjectToBroadPhase[Layers::NUM_LAYERS];
};

/// Class that determines if an object layer can collide with a broadphase layer
class ObjectVsBroadPhaseLayerFilterImpl
    : public JPH::ObjectVsBroadPhaseLayerFilter {
  public:
    virtual bool ShouldCollide(JPH::ObjectLayer inLayer1,
                               JPH::BroadPhaseLayer inLayer2) const override;
};

class BasicContactListener : public JPH::ContactListener {
  public:
    // See: ContactListener
    virtual JPH::ValidateResult OnContactValidate(
        const JPH::Body& inBody1, const JPH::Body& inBody2,
        JPH::RVec3Arg inBaseOffset,
        const JPH::CollideShapeResult& inCollisionResult) override;

    virtual void OnContactAdded(const JPH::Body& inBody1,
                                const JPH::Body& inBody2,
                                const JPH::ContactManifold& inManifold,
                                JPH::ContactSettings& ioSettings) override;

    virtual void OnContactPersisted(const JPH::Body& inBody1,
                                    const JPH::Body& inBody2,
                                    const JPH::ContactManifold& inManifold,
                                    JPH::ContactSettings& ioSettings) override;

    virtual void
    OnContactRemoved(const JPH::SubShapeIDPair& inSubShapePair) override;
};

class BasicActivationListener : public JPH::BodyActivationListener {
  public:
    virtual void OnBodyActivated(const JPH::BodyID& inBodyID,
                                 JPH::uint64 inBodyUserData) override;

    virtual void OnBodyDeactivated(const JPH::BodyID& inBodyID,
                                   JPH::uint64 inBodyUserData) override;
};

const float DELTA_TIME = 1.0f / 60.0f;

struct PhysicsConfig {
    PhysicsConfig(JPH::uint maxBodies, JPH::uint numBodyMutexes,
                  JPH::uint maxBodyPairs, JPH::uint maxContactConstraints,
                  size_t tempAllocSize)
        : cMaxBodies(maxBodies), cNumBodyMutexes(numBodyMutexes),
          cMaxBodyPairs(maxBodyPairs),
          cMaxContactConstraints(maxContactConstraints),
          cTempAllocSize(tempAllocSize) {}
    const JPH::uint cMaxBodies;
    const JPH::uint cNumBodyMutexes;
    const JPH::uint cMaxBodyPairs;
    const JPH::uint cMaxContactConstraints;
    const size_t cTempAllocSize;
};

const PhysicsConfig DEFAULT_PHYSICS_CONFIG =
    PhysicsConfig(1024, 0, 1024, 1024, 10 * 1024 * 1024);

class PhysicsManager {
  private:
    JPH::TempAllocatorImpl* temp_allocator = nullptr;
    JPH::JobSystemThreadPool* job_system = nullptr;

  public:
    JPH::PhysicsSystem* physics_system = nullptr;

    void InitPhysics(const PhysicsConfig config);
    void CleanupPhysics();
    void Update(const int collisionSteps);
    JPH::BodyInterface& GetBodyInterface();
};

} // namespace gay