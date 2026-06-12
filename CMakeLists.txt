cmake_minimum_required(VERSION 4.3)
project(gaycyberspace C CXX)

set(CMAKE_CXX_STANDARD 17)

add_subdirectory(libs/raylib)
set(BUILD_EXAMPLES OFF CACHE BOOL "" FORCE) # don't build the supplied examples for raylib
set(BUILD_GAMES    OFF CACHE BOOL "" FORCE) # or games

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

target_link_libraries(${PROJECT_NAME} PRIVATE raylib)

if ("${PLATFORM}" STREQUAL "Web")
    add_custom_command(
        TARGET ${PROJECT_NAME} PRE_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_directory ${CMAKE_SOURCE_DIR}/assets $<TARGET_FILE_DIR:${PROJECT_NAME}>/assets
    )

    target_compile_definitions(${PROJECT_NAME} PUBLIC ASSETS_PATH="./assets/")

    set_target_properties(${PROJECT_NAME} PROPERTIES SUFFIX ".html")
    target_link_options(${PROJECT_NAME} PUBLIC -sUSE_GLFW=3 -sWASM=1 -sASSERTIONS=1 PUBLIC --preload-file ../assets --emrun --shell-file ${CMAKE_SOURCE_DIR}/src/shell.html)
else()
    add_custom_command(
        TARGET ${PROJECT_NAME} POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_directory ${CMAKE_SOURCE_DIR}/assets $<TARGET_FILE_DIR:${PROJECT_NAME}>/assets
    )
    target_compile_definitions(${PROJECT_NAME} PUBLIC ASSETS_PATH="${CMAKE_CURRENT_SOURCE_DIR}/assets/")
endif ()
