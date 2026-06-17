#pragma once

#include "gaycyberspace.h"

namespace gay {
class PhysicsSystem : public gay::System {
  private:
    std::unique_ptr<gay::PhysicsManager> physics_manager;

  public:
    // set up the allocator and stuff
    void PreInit();
    // creates the colliders, rigidbodies, attaches ids to user data etc,
    void Init() override;
    void Update(float dt) override;

    JPH::BodyInterface& GetBodyInterface();

    void Cleanup();
};
} // namespace gay