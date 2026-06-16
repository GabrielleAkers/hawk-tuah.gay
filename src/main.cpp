#include "gaycyberspace.h"
#include "raylib-cpp.hpp"
#include "rlgl.h"

#if defined(PLATFORM_WEB)
#include <emscripten/emscripten.h>
#endif

using namespace JPH::literals;

int screen_width = 1200;
int screen_height = 800;

#if defined(PLATFORM_WEB)
extern "C" {
EMSCRIPTEN_KEEPALIVE
extern void setWindowSize(const int width, const int height) {
    screen_width = width;
    screen_height = height;
}
}
#endif

raylib::Window window;
raylib::Camera3D camera;
raylib::Camera3D light_camera;
raylib::RenderTexture2D shadow_map;
raylib::Shader shadow_shader;
raylib::Matrix light_view;
raylib::Matrix light_proj;
raylib::Matrix light_view_proj;
raylib::Vector3 light_dir;
raylib::Model floor_model;
raylib::Model sphere_model;

gay::EntityHandle floor_handle;
gay::EntityHandle sphere_handle;

static void UpdateDrawFrame(float dt);
static raylib::Camera InitCamera(void);
static raylib::Camera InitLightCamera(raylib::Vector3 light_dir);
static raylib::RenderTexture2D LoadRenderTextureDepthTex(int width, int height);
static void UnloadRenderTextureDepthTex(raylib::RenderTexture2D target);
static void DrawSphereAndFloor();

const float sphere_radius = 0.5f;
const int shadowmap_resolution = 1024;
int texture_active_slot = 10;
int light_vp_loc;
int shadow_map_loc;

std::unique_ptr<gay::World> world;

int main(int argc, char** argv) {
    world = std::make_unique<gay::World>();
    world->Init();

    world->RegisterComponent<gay::Transform>();
    world->RegisterComponent<gay::Collider>();
    world->RegisterComponent<gay::RigidBody>();

    auto physics_system = world->RegisterSystem<gay::PhysicsSystem>();

    world->SetSystemSignature<gay::PhysicsSystem, gay::Transform, gay::Collider,
                              gay::RigidBody>();

    floor_handle = world->CreateEntity();

    floor_handle.AddComponent(gay::Transform{
        .position = raylib::Vector3{0.0f, -1.0f, 0.0f},
        .rotation = raylib::Quaternion::Identity(),
    });
    floor_handle.AddComponent(
        gay::Collider(gay::BoxCollider{.shape = std::make_shared<JPH::BoxShape>(
                                           JPH::Vec3(100.0f, 1.0f, 100.0f))}));
    floor_handle.AddComponent(gay::RigidBody{
        .motion_type = JPH::EMotionType::Static,
        .layer = gay::Layers::NON_MOVING,
        .activation_mode = JPH::EActivation::DontActivate,
    });

    sphere_handle = world->CreateEntity();
    sphere_handle.AddComponent(gay::Transform{
        .position = raylib::Vector3{0.0f, 10.0f, 0.0f},
        .rotation = raylib::Quaternion::Identity(),
    });
    sphere_handle.AddComponent(gay::Collider(gay::SphereCollider{
        .shape = std::make_shared<JPH::SphereShape>(sphere_radius)}));
    sphere_handle.AddComponent(
        gay::RigidBody{.motion_type = JPH::EMotionType::Dynamic,
                       .layer = gay::Layers::MOVING,
                       .activation_mode = JPH::EActivation::Activate,
                       .initial_linear_velocity = JPH::Vec3(0.0f, -5.0f, 0.0f),
                       .restitution = 0.8f});

    physics_system->Init();

    SetConfigFlags(FLAG_MSAA_4X_HINT + FLAG_WINDOW_RESIZABLE);
    window.Init(screen_width, screen_height, "Hawk Tuah! 🏳️‍⚧️");
    camera = InitCamera();

    shadow_shader =
        LoadShader(ASSETS_PATH "shadow.vs", ASSETS_PATH "shadow.fs");
    shadow_shader.locs[SHADER_LOC_VECTOR_VIEW] =
        GetShaderLocation(shadow_shader, "viewPos");

    light_dir = Vector3Normalize((raylib::Vector3){0.35f, -1.0f, -0.35f});
    raylib::Color light_color = WHITE;
    raylib::Vector4 light_color_normalized = ColorNormalize(light_color);
    int light_dir_loc = GetShaderLocation(shadow_shader, "lightDir");
    int light_col_loc = GetShaderLocation(shadow_shader, "lightColor");
    SetShaderValue(shadow_shader, light_dir_loc, &light_dir,
                   SHADER_UNIFORM_VEC3);
    SetShaderValue(shadow_shader, light_col_loc, &light_color_normalized,
                   SHADER_UNIFORM_VEC4);
    int ambient_loc = GetShaderLocation(shadow_shader, "ambient");
    float ambient[4] = {0.1f, 0.1f, 0.1f, 1.0f};
    SetShaderValue(shadow_shader, ambient_loc, ambient, SHADER_UNIFORM_VEC4);
    light_vp_loc = GetShaderLocation(shadow_shader, "lightVP");
    shadow_map_loc = GetShaderLocation(shadow_shader, "shadowMap");
    SetShaderValue(shadow_shader,
                   GetShaderLocation(shadow_shader, "shadowMapResolution"),
                   &shadowmap_resolution, SHADER_UNIFORM_INT);

    // testing stuff
    auto floor_shape =
        floor_handle.GetComponent<gay::Collider, gay::BoxCollider>().shape;
    JPH::Vec3 extents = floor_shape->GetHalfExtent();
    floor_model = LoadModelFromMesh(GenMeshCube(
        extents.GetX(), extents.GetY() + sphere_radius, extents.GetZ()));
    floor_model.materials[0].shader = shadow_shader;

    auto sphere_shape =
        sphere_handle.GetComponent<gay::Collider, gay::SphereCollider>().shape;
    auto radius = sphere_shape->GetRadius();
    sphere_model = LoadModelFromMesh(GenMeshSphere(radius, 32, 32));
    sphere_model.materials[0].shader = shadow_shader;
    //

    shadow_map =
        LoadRenderTextureDepthTex(shadowmap_resolution, shadowmap_resolution);

    light_camera = InitLightCamera(light_dir);
#if defined(PLATFORM_WEB)
    emscripten_set_main_loop(UpdateDrawFrame, 0, 1);
#else
    SetTargetFPS(60);
    float dt = 0.0f;
    while (!WindowShouldClose()) {
        auto start_time = std::chrono::high_resolution_clock::now();
        UpdateDrawFrame(dt);
        auto stop_time = std::chrono::high_resolution_clock::now();
        dt = std::chrono::duration<float, std::chrono::seconds::period>(
                 stop_time - start_time)
                 .count();
    }
#endif

    shadow_map.Unload();
    shadow_shader.Unload();
    window.Close();

    physics_system->Cleanup();

    return 0;
}

static raylib::Camera InitCamera(void) {
    raylib::Camera camera = (raylib::Vector3){0, 0, 0};
    camera.position = (raylib::Vector3){10.0f, 10.0f, 10.0f};
    camera.target = (raylib::Vector3){0.0f, 0.0f, 0.0f};
    camera.up = (raylib::Vector3){0.0f, 1.0f, 0.0f};
    camera.fovy = 60.0f;
    camera.projection = CAMERA_PERSPECTIVE;
    return camera;
}

static raylib::Camera InitLightCamera(raylib::Vector3 light_dir) {
    raylib::Camera3D light_camera = (raylib::Vector3){0, 0, 0};
    light_camera.position = Vector3Scale(light_dir, -15.0f);
    light_camera.target = Vector3Zero();
    light_camera.projection =
        CAMERA_ORTHOGRAPHIC; // Use an orthographic projection for directional
                             // lights
    light_camera.up = (raylib::Vector3){0.0f, 1.0f, 0.0f};
    light_camera.fovy = 20.0f;
    return light_camera;
}

JPH::uint step = 0;
static void UpdateDrawFrame(float dt) {
    auto physics_system = world->GetSystem<gay::PhysicsSystem>();
    ++step;

    physics_system->Update(gay::DELTA_TIME);

    const float camera_speed = 0.05f;
    if (IsKeyDown(KEY_LEFT)) {
        if (light_dir.x < 0.6f)
            light_dir.x += camera_speed * 60.0f * dt;
    }
    if (IsKeyDown(KEY_RIGHT)) {
        if (light_dir.x > -0.6f)
            light_dir.x -= camera_speed * 60.0f * dt;
    }
    if (IsKeyDown(KEY_UP)) {
        if (light_dir.z < 0.6f)
            light_dir.z += camera_speed * 60.0f * dt;
    }
    if (IsKeyDown(KEY_DOWN)) {
        if (light_dir.z > -0.6f)
            light_dir.z -= camera_speed * 60.0f * dt;
    }

    light_dir = Vector3Normalize(light_dir);
    light_camera.position = Vector3Scale(light_dir, -15.0f);
    SetShaderValue(shadow_shader, shadow_shader.locs[SHADER_LOC_VECTOR_VIEW],
                   &camera.position, SHADER_UNIFORM_VEC3);

    shadow_map.BeginMode();
    window.ClearBackground(raylib::Color::White());

    light_camera.BeginMode();
    light_view = rlGetMatrixModelview();
    light_proj = rlGetMatrixProjection();
    // physics_system->Render();
    DrawSphereAndFloor();

    light_camera.EndMode();

    shadow_map.EndMode();
    light_view_proj = light_view.Multiply(light_proj);

    window.BeginDrawing();
    window.ClearBackground(raylib::Color::RayWhite());

    SetShaderValueMatrix(shadow_shader, light_vp_loc, light_view_proj);
    rlEnableShader(shadow_shader.id);

    rlActiveTextureSlot(texture_active_slot);
    rlEnableTexture(shadow_map.depth.id);
    rlSetUniform(shadow_map_loc, &texture_active_slot, SHADER_UNIFORM_INT, 1);

    camera.BeginMode();
    // physics_system->Render();
    DrawSphereAndFloor();
    camera.EndMode();

    window.EndDrawing();
}

static raylib::RenderTexture2D LoadRenderTextureDepthTex(int width,
                                                         int height) {
    RenderTexture2D target = {0};

    target.id = rlLoadFramebuffer(); // Load an empty framebuffer
    target.texture.width = width;
    target.texture.height = height;

    if (target.id > 0) {
        rlEnableFramebuffer(target.id);

        // Create depth texture
        // NOTE: No need a color texture attachment for the shadowmap
        target.depth.id = rlLoadTextureDepth(width, height, false);
        target.depth.width = width;
        target.depth.height = height;
        target.depth.format = 19; // DEPTH_COMPONENT_24BIT?
        target.depth.mipmaps = 1;

        // Attach depth texture to FBO
        rlFramebufferAttach(target.id, target.depth.id, RL_ATTACHMENT_DEPTH,
                            RL_ATTACHMENT_TEXTURE2D, 0);

        // Check if fbo is complete with attachments (valid)
        if (rlFramebufferComplete(target.id))
            TRACELOG(LOG_INFO,
                     "FBO: [ID %i] Framebuffer object created successfully",
                     target.id);

        rlDisableFramebuffer();
    } else
        TRACELOG(LOG_WARNING, "FBO: Framebuffer object can not be created");

    return target;
}

static void DrawSphereAndFloor() {
    DrawModelEx(floor_model,
                floor_handle.GetComponent<gay::Transform>().position,
                raylib::Vector3(0.0f, 1.0f, 0.0f), 0.0f, raylib::Vector3::One(),
                raylib::Color::Blue());
    DrawModelEx(sphere_model,
                sphere_handle.GetComponent<gay::Transform>().position,
                raylib::Vector3(0.0f, 1.0f, 0.0f), 0.0f, raylib::Vector3::One(),
                raylib::Color::Red());
}