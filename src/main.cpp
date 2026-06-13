// Jolt Physics Library (https://github.com/jrouwe/JoltPhysics)
// SPDX-FileCopyrightText: 2025 Jorrit Rouwe
// SPDX-License-Identifier: CC0-1.0
// This file is in the public domain. It serves as an example to start building
// your own application using Jolt Physics. Feel free to copy paste without
// attribution!

// The Jolt headers don't include Jolt.h. Always include Jolt.h before including
// any other Jolt header. You can use Jolt.h in your precompiled header to speed
// up compilation.
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

// Disable common warnings triggered by Jolt, you can use
// JPH_SUPPRESS_WARNING_PUSH / JPH_SUPPRESS_WARNING_POP to store and restore the
// warning state
JPH_SUPPRESS_WARNINGS

gay::PhysicsHandler* physics_handler;
// Now we can create the actual physics system.
JPH::BodyID sphere_id;
const float sphere_radius = 0.5f;

using namespace JPH::literals;

static JPH::BodyID CreateFloorAndSphere(const float sphere_radius) {
    JPH::BodyInterface& body_interface = physics_handler->physics_system->GetBodyInterface();
    printf("a\n");
    JPH::BodyCreationSettings floor_settings(
        new JPH::BoxShape(JPH::Vec3(100.0f, 1.0f, 100.0f)),
        JPH::RVec3(0.0_r, -1.0_r, 0.0_r), JPH::Quat::sIdentity(),
        JPH::EMotionType::Static, gay::Layers::NON_MOVING);
    // Create the actual rigid body
    JPH::BodyID floor_id = body_interface.CreateAndAddBody(
        floor_settings, JPH::EActivation::Activate);

    printf("b\n");
    // Now create a dynamic body to bounce on the floor
    // Note that this uses the shorthand version of creating and adding a body
    // to the world
    JPH::BodyCreationSettings sphere_settings(
        new JPH::SphereShape(sphere_radius), JPH::RVec3(0.0_r, 20.0_r, 0.0_r),
        JPH::Quat::sIdentity(), JPH::EMotionType::Dynamic, gay::Layers::MOVING);
    JPH::BodyID sphere_id = body_interface.CreateAndAddBody(
        sphere_settings, JPH::EActivation::Activate);

    printf("c\n");
    // Now you can interact with the dynamic body, in this case we're going to
    // give it a velocity. (note that if we had used CreateBody then we could
    // have set the velocity straight on the body before adding it to the
    // physics system)
    body_interface.SetLinearVelocity(sphere_id, JPH::Vec3(0.0f, -5.0f, 0.0f));

    physics_handler->physics_system->OptimizeBroadPhase();

    return sphere_id;
}

// Program entry point
int main(int argc, char** argv) {
    physics_handler = new gay::PhysicsHandler();
    physics_handler->InitPhysics(gay::DEFAULT_PHYSICS_CONFIG);
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

    physics_handler->CleanupPhysics();

    return 0;
}

JPH::uint step = 0;
void UpdateDrawFrame(void) {
    ++step;

    JPH::BodyInterface& body_interface =
        physics_handler->physics_system->GetBodyInterface();
    JPH::RVec3 sphere_position =
        body_interface.GetCenterOfMassPosition(sphere_id);
    JPH::RVec3 sphere_velocity = body_interface.GetLinearVelocity(sphere_id);
    // Output current position and velocity of the sphere
    // If you take larger steps than 1 / 60th of a second you need to do
    // multiple collision steps in order to keep the simulation stable. Do 1
    // collision step per 1 / 60th of a second (round up).
    const int cCollisionSteps = 1;

    // Step the world
    physics_handler->Update(cCollisionSteps);

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
