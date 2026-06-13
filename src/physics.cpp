#include "physics.h"

#include <cstdarg>
#include <iostream>
#include <thread>

using namespace JPH::literals;

namespace gay {
// Callback for traces, connect this to your own trace function if you have one
static void TraceImpl(const char* inFMT, ...) {
    // Format the message
    va_list list;
    va_start(list, inFMT);
    char buffer[1024];
    vsnprintf(buffer, sizeof(buffer), inFMT, list);
    va_end(list);

    // Print to the TTY
    std::cout << buffer << std::endl;
}

#ifdef JPH_ENABLE_ASSERTS

// Callback for asserts, connect this to your own assert handler if you have one
static bool AssertFailedImpl(const char* inExpression, const char* inMessage,
                             const char* inFile, JPH::uint inLine) {
    // Print to the TTY
    std::cout << inFile << ":" << inLine << ": (" << inExpression << ") "
              << (inMessage != nullptr ? inMessage : "") << std::endl;

    // Breakpoint
    return true;
};

#endif // JPH_ENABLE_ASSERTS

bool ObjectLayerPairFilterImpl::ShouldCollide(
    JPH::ObjectLayer inObject1, JPH::ObjectLayer inObject2) const {
    switch (inObject1) {
    case Layers::NON_MOVING:
        return inObject2 ==
               Layers::MOVING; // Non moving only collides with moving
    case Layers::MOVING:
        return true; // Moving collides with everything
    default:
        JPH_ASSERT(false);
        return false;
    }
}

BPLayerInterfaceImpl::BPLayerInterfaceImpl() {
    // Create a mapping table from object to broad phase layer
    mObjectToBroadPhase[Layers::NON_MOVING] = BroadPhaseLayers::NON_MOVING;
    mObjectToBroadPhase[Layers::MOVING] = BroadPhaseLayers::MOVING;
}

JPH::uint BPLayerInterfaceImpl::GetNumBroadPhaseLayers() const {
    return BroadPhaseLayers::NUM_LAYERS;
}

JPH::BroadPhaseLayer
BPLayerInterfaceImpl::GetBroadPhaseLayer(JPH::ObjectLayer inLayer) const {
    JPH_ASSERT(inLayer < Layers::NUM_LAYERS);
    return mObjectToBroadPhase[inLayer];
}

#if defined(JPH_EXTERNAL_PROFILE) || defined(JPH_PROFILE_ENABLED)
const char* BPLayerInterfaceImpl::GetBroadPhaseLayerName(
    JPH::BroadPhaseLayer inLayer) const {
    switch ((JPH::BroadPhaseLayer::Type)inLayer) {
    case (JPH::BroadPhaseLayer::Type)BroadPhaseLayers::NON_MOVING:
        return "NON_MOVING";
    case (JPH::BroadPhaseLayer::Type)BroadPhaseLayers::MOVING:
        return "MOVING";
    default:
        JPH_ASSERT(false);
        return "INVALID";
    }
}
#endif // JPH_EXTERNAL_PROFILE || JPH_PROFILE_ENABLED

bool ObjectVsBroadPhaseLayerFilterImpl::ShouldCollide(
    JPH::ObjectLayer inLayer1, JPH::BroadPhaseLayer inLayer2) const {
    switch (inLayer1) {
    case Layers::NON_MOVING:
        return inLayer2 == BroadPhaseLayers::MOVING;
    case Layers::MOVING:
        return true;
    default:
        JPH_ASSERT(false);
        return false;
    }
}

JPH::ValidateResult BasicContactListener::OnContactValidate(
    const JPH::Body& inBody1, const JPH::Body& inBody2,
    JPH::RVec3Arg inBaseOffset,
    const JPH::CollideShapeResult& inCollisionResult) {
    // Allows you to ignore a contact before it is created (using layers to
    // not make objects collide is cheaper!)
    return JPH::ValidateResult::AcceptAllContactsForThisBodyPair;
}

void BasicContactListener::OnContactAdded(
    const JPH::Body& inBody1, const JPH::Body& inBody2,
    const JPH::ContactManifold& inManifold, JPH::ContactSettings& ioSettings) {}

void BasicContactListener::OnContactPersisted(
    const JPH::Body& inBody1, const JPH::Body& inBody2,
    const JPH::ContactManifold& inManifold, JPH::ContactSettings& ioSettings) {}

void BasicContactListener::OnContactRemoved(
    const JPH::SubShapeIDPair& inSubShapePair) {}

void BasicActivationListener::OnBodyActivated(const JPH::BodyID& inBodyID,
                                              JPH::uint64 inBodyUserData) {}

void BasicActivationListener::OnBodyDeactivated(const JPH::BodyID& inBodyID,
                                                JPH::uint64 inBodyUserData) {
    printf("body deactivated\n");
}

void PhysicsHandler::InitPhysics(const PhysicsConfig config) {
    JPH::RegisterDefaultAllocator();

    JPH::Trace = TraceImpl;
    JPH_IF_ENABLE_ASSERTS(JPH::AssertFailed = AssertFailedImpl;)

    JPH::Factory::sInstance = new JPH::Factory();

    JPH::RegisterTypes();

    temp_allocator = new JPH::TempAllocatorImpl(config.cTempAllocSize);
    job_system = new JPH::JobSystemThreadPool(
        JPH::cMaxPhysicsJobs, JPH::cMaxPhysicsBarriers,
        std::thread::hardware_concurrency() - 1);

    BPLayerInterfaceImpl* broad_phase_layer_interface =
        new BPLayerInterfaceImpl();

    ObjectVsBroadPhaseLayerFilterImpl* object_vs_broadphase_layer_filter =
        new ObjectVsBroadPhaseLayerFilterImpl();

    ObjectLayerPairFilterImpl* object_vs_object_layer_filter =
        new ObjectLayerPairFilterImpl();

    physics_system = new JPH::PhysicsSystem();
    physics_system->Init(
        config.cMaxBodies, config.cNumBodyMutexes, config.cMaxBodyPairs,
        config.cMaxContactConstraints, *broad_phase_layer_interface,
        *object_vs_broadphase_layer_filter, *object_vs_object_layer_filter);

    BasicActivationListener* body_activation_listener =
        new BasicActivationListener();
    physics_system->SetBodyActivationListener(body_activation_listener);

    BasicContactListener* contact_listener = new BasicContactListener();
    physics_system->SetContactListener(contact_listener);
}

void PhysicsHandler::CleanupPhysics() {
    JPH::BodyInterface& body_interface = physics_system->GetBodyInterface();

    JPH::BodyIDVector bodies;
    physics_system->GetBodies(bodies);
    for (JPH::BodyID b : bodies) {
        body_interface.RemoveBody(b);
        body_interface.DestroyBody(b);
    }

    // Unregisters all types with the factory and cleans up the default material
    JPH::UnregisterTypes();

    // Destroy the factory
    delete JPH::Factory::sInstance;
    JPH::Factory::sInstance = nullptr;

    printf("physics cleaned up\n");
}

void PhysicsHandler::Update(const int collisionSteps) {
    physics_system->Update(DELTA_TIME, collisionSteps, temp_allocator,
                           job_system);
}
} // namespace gay