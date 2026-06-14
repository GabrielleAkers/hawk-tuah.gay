#include "gaycyberspace.h"
#include "raylib-cpp.hpp"
#include "rlgl.h"

#if defined(PLATFORM_WEB)
#include <emscripten/emscripten.h>
#endif

int screenWidth = 1200;
int screenHeight = 800;

#if defined(PLATFORM_WEB)
extern "C" {
EMSCRIPTEN_KEEPALIVE
extern void setWindowSize(const int width, const int height) {
    screenWidth = width;
    screenHeight = height;
}
}
#endif

raylib::Window window;
raylib::Camera camera;

void UpdateDrawFrame(void);
raylib::Camera InitCamera(void);

raylib::Camera InitCamera(void) {
    raylib::Camera camera = (raylib::Vector3){0, 0, 0};
    camera.position = (raylib::Vector3){0.0f, 2.0f, 10.0f};
    camera.target = (raylib::Vector3){0.0f, 2.0f, 0.0f};
    camera.up = (raylib::Vector3){0.0f, 1.0f, 0.0f};
    camera.fovy = 60.0f;
    camera.projection = CAMERA_PERSPECTIVE;
    return camera;
}

gay::PhysicsManager* physics_manager;
JPH::BodyID sphere_id;
const float sphere_radius = 0.5f;

using namespace JPH::literals;

static JPH::BodyID CreateFloorAndSphere(const float sphere_radius) {
    JPH::BodyInterface& body_interface = physics_manager->GetBodyInterface();
    
    JPH::BodyCreationSettings floor_settings(
        new JPH::BoxShape(JPH::Vec3(100.0f, 1.0f, 100.0f)),
        JPH::RVec3(0.0_r, -1.0_r, 0.0_r), JPH::Quat::sIdentity(),
        JPH::EMotionType::Static, gay::Layers::NON_MOVING);
    JPH::BodyID floor_id = body_interface.CreateAndAddBody(
        floor_settings, JPH::EActivation::Activate);

    JPH::BodyCreationSettings sphere_settings(
        new JPH::SphereShape(sphere_radius), JPH::RVec3(0.0_r, 10.0_r, 0.0_r),
        JPH::Quat::sIdentity(), JPH::EMotionType::Dynamic, gay::Layers::MOVING);
    JPH::BodyID sphere_id = body_interface.CreateAndAddBody(
        sphere_settings, JPH::EActivation::Activate);

    body_interface.SetLinearVelocity(sphere_id, JPH::Vec3(0.0f, -5.0f, 0.0f));

    physics_manager->physics_system->OptimizeBroadPhase();

    return sphere_id;
}

int main(int argc, char** argv) {
    physics_manager = new gay::PhysicsManager();
    physics_manager->InitPhysics(gay::DEFAULT_PHYSICS_CONFIG);
    sphere_id = CreateFloorAndSphere(sphere_radius);

    window.Init(screenWidth, screenHeight, "Hawk Tuah! 🏳️‍⚧️");
    camera = InitCamera();
#if defined(PLATFORM_WEB)
    emscripten_set_main_loop(UpdateDrawFrame, 0, 1);
#else
    SetTargetFPS(60);

    while (!WindowShouldClose()) {
        UpdateDrawFrame();
    }
#endif

    window.Close();

    physics_manager->CleanupPhysics();

    return 0;
}

JPH::uint step = 0;
void UpdateDrawFrame(void) {
    ++step;

    JPH::BodyInterface& body_interface =
        physics_manager->physics_system->GetBodyInterface();
    JPH::RVec3 sphere_position =
        body_interface.GetCenterOfMassPosition(sphere_id);
    JPH::RVec3 sphere_velocity = body_interface.GetLinearVelocity(sphere_id);

    const int cCollisionSteps = 1;

    physics_manager->Update(cCollisionSteps);

    // camera.Update(CAMERA_FIRST_PERSON);

    window.BeginDrawing();

    window.ClearBackground(raylib::Color::RayWhite());

    camera.BeginMode();

    DrawCube(raylib::Vector3(0, -1, 0), 100.0f, 1.0f, 100.f,
             raylib::Color::Red());

    DrawSphere(gay::raylibVector3FromJPH(sphere_position), sphere_radius,
               raylib::Color::Yellow());

    camera.EndMode();

    window.EndDrawing();
}
