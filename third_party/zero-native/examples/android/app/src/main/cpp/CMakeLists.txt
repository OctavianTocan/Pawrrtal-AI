cmake_minimum_required(VERSION 3.22.1)

project(zero_native_android_example C)

add_library(zero-native STATIC IMPORTED)
set_target_properties(zero-native PROPERTIES
    IMPORTED_LOCATION "${CMAKE_CURRENT_SOURCE_DIR}/lib/libzero-native.a"
)

add_library(zero_native_example SHARED zero_native_jni.c)
target_include_directories(zero_native_example PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}")
target_link_libraries(zero_native_example zero-native android log)
