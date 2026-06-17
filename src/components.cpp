#include "components.h"

namespace gay {
Collider CreateMeshColliderFromModel(std::shared_ptr<raylib::Model> model,
                                     raylib::Vector3 position,
                                     raylib::Quaternion rotation) {
    auto house_mesh_count = model->GetMeshCount();
    auto house_meshes = model->GetMeshes();
    JPH::Ref<JPH::StaticCompoundShapeSettings> cs =
        new JPH::StaticCompoundShapeSettings;
    for (int i = 0; i < house_mesh_count; i++) {
        auto mesh = house_meshes[i];
        auto vert_count = mesh.vertexCount;
        auto verts = mesh.vertices;

        JPH::Array<JPH::Vec3> shape_verts;
        for (int v = 0; v < 3 * vert_count; v = v + 3) {
            shape_verts.push_back(
                JPH::Vec3(verts[v], verts[v + 1], verts[v + 2]));
        }
        JPH::ConvexHullShapeSettings settings(shape_verts,
                                              JPH::cDefaultConvexRadius);
        auto res =
            settings.Create(); // jolt asserts already dont need to check :)
        cs->AddShape(JPHVec3FromRaylib(position), JPHQuatFromRaylib(rotation),
                     res.Get());
    }
    return gay::Collider(gay::MeshCollider{.shape = cs});
};
} // namespace gay