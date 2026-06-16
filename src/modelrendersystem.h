#pragma once

#include "gaycyberspace.h"

namespace gay {
class ModelRenderSystem : public gay::System {
  public:
    void Render() override;

    void Cleanup();
};
} // namespace gay