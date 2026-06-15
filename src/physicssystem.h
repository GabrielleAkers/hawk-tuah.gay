#pragma once

#include "gaycyberspace.h"

namespace gay {
class PhysicsSystem : public gay::System {
  private:
    std::unique_ptr<gay::PhysicsManager> physics_manager;

  public:
    void Init() override;
    void Update(float dt) override;
    void Render() override;

    void Cleanup();
};
} // namespace gay