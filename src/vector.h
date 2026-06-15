#pragma once

#include <Jolt/Jolt.h>
#include <Jolt/Math/Vec3.h>
#include <Jolt/Math/Vec4.h>

#include "Vector3.hpp"
#include "Vector4.hpp"

namespace gay {
raylib::Vector3 raylibVector3FromJPH(const JPH::Vec3& vec);

JPH::Vec3 JPHVec3FromRaylib(const raylib::Vector3& vec);

raylib::Vector4 raylibVector4FromJPH(const JPH::Vec4& vec);

JPH::Vec4 JPHVec4FromRaylib(const raylib::Vector4& vec);

JPH::QuatArg JPHQuatFromRaylib(const raylib::Quaternion& quat);
} // namespace gay