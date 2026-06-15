#include "vector.h"

namespace gay {
raylib::Vector3 raylibVector3FromJPH(const JPH::Vec3& vec) {
    return raylib::Vector3(vec.GetX(), vec.GetY(), vec.GetZ());
}

JPH::Vec3 JPHVec3FromRaylib(const raylib::Vector3& vec) {
    return JPH::Vec3(vec.GetX(), vec.GetY(), vec.GetZ());
}

raylib::Vector4 raylibVector4FromJPH(const JPH::Vec4& vec) {
    return raylib::Vector4(vec.GetX(), vec.GetY(), vec.GetZ(), vec.GetW());
}

JPH::Vec4 JPHVec4FromRaylib(const raylib::Vector4& vec) {
    return JPH::Vec4(vec.GetX(), vec.GetY(), vec.GetZ(), vec.GetW());
}

JPH::QuatArg JPHQuatFromRaylib(const raylib::Quaternion& quat) {
    return JPH::QuatArg(JPHVec4FromRaylib(quat));
}
} // namespace gay