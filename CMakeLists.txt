cmake_minimum_required(VERSION 4.3)
project(gaycyberspace C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_CONFIGURATION_TYPES "Debug;Release;Distribution")

include(FetchContent)

# jolt section
# --------------------------------------------------------------------------------------
# When turning this option on, the library will be compiled using doubles for positions. This allows for much bigger worlds.
set(DOUBLE_PRECISION OFF)

# When turning this option on, the library will be compiled with debug symbols
set(GENERATE_DEBUG_SYMBOLS ON)

# When turning this option on, the library will override the default CMAKE_CXX_FLAGS_DEBUG/RELEASE values, otherwise they will use the platform defaults
set(OVERRIDE_CXX_FLAGS ON)

# When turning this option on, the library will be compiled in such a way to attempt to keep the simulation deterministic across platforms
set(CROSS_PLATFORM_DETERMINISTIC OFF)

# When turning this option on, the library will be compiled with interprocedural optimizations enabled, also known as link-time optimizations or link-time code generation.
# Note that if you turn this on you need to use SET_INTERPROCEDURAL_OPTIMIZATION() or set(CMAKE_INTERPROCEDURAL_OPTIMIZATION ON) to enable LTO specifically for your own project as well.
# If you don't do this you may get an error: /usr/bin/ld: libJolt.a: error adding symbols: file format not recognized
set(INTERPROCEDURAL_OPTIMIZATION ON)

# When turning this on, in Debug and Release mode, the library will emit extra code to ensure that the 4th component of a 3-vector is kept the same as the 3rd component 
# and will enable floating point exceptions during simulation to detect divisions by zero. 
# Note that this currently only works using MSVC. Clang turns Float2 into a SIMD vector sometimes causing floating point exceptions (the option is ignored).
set(FLOATING_POINT_EXCEPTIONS_ENABLED OFF)

# When turning this on, the library will be compiled with C++ exceptions enabled.
# This adds some overhead and Jolt doesn't use exceptions so by default it is off.
set(CPP_EXCEPTIONS_ENABLED ON)

# When turning this on, the library will be compiled with C++ RTTI enabled.
# This adds some overhead and Jolt doesn't use RTTI so by default it is off.
set(CPP_RTTI_ENABLED OFF)

# Number of bits to use in ObjectLayer. Can be 16 or 32.
set(OBJECT_LAYER_BITS 16)

# Select X86 processor features to use, by default the library compiles with AVX2, if everything is off it will be SSE2 compatible.
set(USE_SSE4_1 ON)
set(USE_SSE4_2 ON)
set(USE_AVX ON)
set(USE_AVX2 ON)
set(USE_AVX512 OFF)
set(USE_LZCNT ON)
set(USE_TZCNT ON)
set(USE_F16C ON)
set(USE_FMADD ON)

# Include Jolt
find_package(Jolt QUIET)
if(NOT Jolt_FOUND)
    FetchContent_Declare(
        JoltPhysics
        GIT_REPOSITORY "https://github.com/jrouwe/JoltPhysics"
        GIT_TAG "v5.5.0"
        SOURCE_SUBDIR "Build"
    )
    FetchContent_MakeAvailable(JoltPhysics)
endif()

# # Enable warnings
# if(ENABLE_ALL_WARNINGS)
#     set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Werror")
# endif()

# # Optionally generate debug symbols
# if(GENERATE_DEBUG_SYMBOLS)
#     set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g")
# endif()

# if(NOT CPP_RTTI_ENABLED)
#     # Set compiler flag for disabling RTTI
#     set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fno-rtti")
# else()
#     # Set compiler flag for enabling RTTI
#     set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -frtti")
# endif()

# if(NOT CPP_EXCEPTIONS_ENABLED)
#     # Set compiler flag for disabling exception-handling
#     set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fno-exceptions")
# else()
#     # Set compiler flag for enabling exception-handling
#     set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fexceptions")
# endif()

# if("${CMAKE_CXX_COMPILER_ID}" STREQUAL "GNU")
#     # Also disable -Wstringop-overflow or it will generate false positives that can't be disabled from code when link-time optimizations are enabled
#     # Also turn off automatic fused multiply add contractions, there doesn't seem to be a way to do this selectively through the macro JPH_PRECISE_MATH_OFF
#     set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wno-stringop-overflow -ffp-contract=off")
# else()
#     # Do not use -ffast-math since it cannot be turned off in a single compilation unit under clang, see Core.h
#     set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -ffp-model=precise")

#     # On clang 14 and later we can turn off float contraction through a pragma, older versions and deterministic versions need it off always, see Core.h
#     if(CMAKE_CXX_COMPILER_VERSION LESS 14 OR CROSS_PLATFORM_DETERMINISTIC)
#         set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -ffp-contract=off")
#     endif()
# endif()

# # See https://github.com/jrouwe/JoltPhysics/issues/922. When compiling with DOUBLE_PRECISION=YES and CMAKE_OSX_DEPLOYMENT_TARGET=10.12 clang triggers a warning that we silence here.
# if("${CMAKE_SYSTEM_NAME}" MATCHES "Darwin" AND "${CMAKE_CXX_COMPILER_ID}" STREQUAL "AppleClang")
#     set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -faligned-allocation")
# endif()

# # Set compiler flags for various configurations
# if(OVERRIDE_CXX_FLAGS)
#     set(CMAKE_CXX_FLAGS_DEBUG "")
#     set(CMAKE_CXX_FLAGS_RELEASE "-O3")
# endif()
# set(CMAKE_CXX_FLAGS_DISTRIBUTION "${CMAKE_CXX_FLAGS_RELEASE}")

# set(CMAKE_EXE_LINKER_FLAGS_DISTRIBUTION "${CMAKE_EXE_LINKER_FLAGS_RELEASE}")

# # Enable link time optimization in Release and Distribution mode if requested and available
# SET_INTERPROCEDURAL_OPTIMIZATION()
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g3")
# --------------------------------------------------------------------------------------

# raylib section
# --------------------------------------------------------------------------------------
if(NOT "${PLATFORM}" STREQUAL "Web")
    set(GLFW_BUILD_WAYLAND ON CACHE BOOL "" FORCE)
    set(GLFW_BUILD_X11 OFF CACHE BOOL "" FORCE)
endif()
set(BUILD_EXAMPLES OFF CACHE BOOL "" FORCE) # don't build the supplied examples for raylib
set(BUILD_GAMES OFF CACHE BOOL "" FORCE) # or games
find_package(raylib QUIET)
if(NOT raylib_FOUND)
    FetchContent_Declare(
        raylib
        GIT_REPOSITORY https://github.com/raysan5/raylib.git
        GIT_TAG 6.0
        GIT_SHALLOW 1
    )
    FetchContent_MakeAvailable(raylib)
endif()
# --------------------------------------------------------------------------------------

# raylib-cpp section
# --------------------------------------------------------------------------------------
find_package(raylib_cpp QUIET)
if(NOT raylib_cpp_FOUND)
    if(NOT DEFINED RAYLIB_CPP_VERSION)
        set(RAYLIB_CPP_VERSION v6.0.0)
    endif()
    include(FetchContent)
    FetchContent_Declare(
        raylib_cpp
        GIT_REPOSITORY https://github.com/RobLoach/raylib-cpp.git
        GIT_TAG ${RAYLIB_CPP_VERSION}
    )
    FetchContent_MakeAvailable(raylib_cpp)
endif()
# --------------------------------------------------------------------------------------

add_executable(${PROJECT_NAME})
add_subdirectory(src)

set_target_properties(${PROJECT_NAME} PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/${PROJECT_NAME})

set(MAX_WEBGL_VERSION "2")
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

set(CLANGD_FILE ${CMAKE_BINARY_DIR}/clangd)
if(EMSCRIPTEN)
    execute_process(COMMAND ${CMAKE_C_COMPILER} --cflags OUTPUT_VARIABLE CLANGD_FLAGS_TO_ADD)
    separate_arguments(CLANGD_FLAGS_TO_ADD UNIX_COMMAND "${CLANGD_FLAGS_TO_ADD}")
    list(JOIN CLANGD_FLAGS_TO_ADD ", " CLANGD_FLAGS_TO_ADD)
    set(CLANGD_TEMPLATE ${PROJECT_SOURCE_DIR}/scripts/clangd.in)
    configure_file(${CLANGD_TEMPLATE} ${CLANGD_FILE})
else()
    file(WRITE ${CLANGD_FILE} "")
endif()

target_include_directories(${PROJECT_NAME} PUBLIC ${JoltPhysics_SOURCE_DIR}/..)
target_link_libraries(${PROJECT_NAME} PUBLIC Jolt raylib raylib_cpp)

if("${PLATFORM}" STREQUAL "Web")
    add_custom_command(
        TARGET ${PROJECT_NAME} PRE_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_directory ${CMAKE_SOURCE_DIR}/assets $<TARGET_FILE_DIR:${PROJECT_NAME}>/assets
    )

    target_compile_definitions(${PROJECT_NAME} PUBLIC ASSETS_PATH="./assets/")

    set_target_properties(${PROJECT_NAME} PROPERTIES SUFFIX ".html")
    target_link_options(${PROJECT_NAME} PUBLIC -sUSE_GLFW=3 -sWASM=1 -sASSERTIONS=1 -sSTACK_SIZE=1048576 -sINITIAL_MEMORY=134217728 PUBLIC --preload-file ../assets --emrun --shell-file ${CMAKE_SOURCE_DIR}/src/shell.html)
else()
    add_custom_command(
        TARGET ${PROJECT_NAME} POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_directory ${CMAKE_SOURCE_DIR}/assets $<TARGET_FILE_DIR:${PROJECT_NAME}>/assets
    )
    target_compile_definitions(${PROJECT_NAME} PUBLIC ASSETS_PATH="${CMAKE_CURRENT_SOURCE_DIR}/assets/")
endif()
