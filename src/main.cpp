#include "raylib.h"

#if defined(PLATFORM_WEB)
#include <emscripten/emscripten.h>
#endif

int screenWidth = 1200;
int screenHeight = 800;

extern "C" {    
    EMSCRIPTEN_KEEPALIVE
    extern void setWindowSize(const int width, const int height) {
        screenWidth = width;
        screenHeight = height;
    }
}

Texture2D texture;

static void UpdateDrawFrame(void);

int main() {
    InitWindow(screenWidth, screenHeight, "Hawk Tuah! 🏳️‍⚧️");
    
    texture = LoadTexture(ASSETS_PATH "wow_logo_icon.png");

#if defined(PLATFORM_WEB)
    emscripten_set_main_loop(UpdateDrawFrame, 0, 1);
#else
    SetTargetFPS(60);

    while (!WindowShouldClose()) {
        UpdateDrawFrame();
    }
#endif

    UnloadTexture(texture);

    CloseWindow();
    return 0;
}

static void UpdateDrawFrame(void) {
    BeginDrawing();

    ClearBackground(RAYWHITE);

    const int texture_x = screenWidth / 2 - texture.width / 2;
    const int texture_y = screenHeight / 2 - texture.height / 2;
    DrawTexture(texture, texture_x, texture_y, WHITE);

    const char* text = "OMG! IT WORKS!";
    const Vector2 text_size = MeasureTextEx(GetFontDefault(), text, 20, 1);
    DrawText(text, screenWidth / 2 - text_size.x / 2,
             texture_y + texture.height + text_size.y + 10, 20, BLACK);

    EndDrawing();
}