#include "modelrendersystem.h"

extern gay::World* world;

namespace gay {
void ModelRenderSystem::Render() {
    for (auto const& entity : entities) {
        auto& model = world->GetComponent<ModelRenderer>(entity);
        auto& transform = world->GetComponent<Transform>(entity);

        transform.rotation.ToAxisAngle(&model.rotation_axis,
                                       &model.rotation_angle);
        DrawModelEx(*model.model, transform.position, model.rotation_axis,
                    model.rotation_angle, model.scale, model.tint);
    }
}
} // namespace gay