#pragma once

#include <stddef.h>
#include <stdint.h>

void *zero_native_app_create(void);
void zero_native_app_destroy(void *app);
void zero_native_app_start(void *app);
void zero_native_app_stop(void *app);
void zero_native_app_resize(void *app, float width, float height, float scale, void *surface);
void zero_native_app_touch(void *app, uint64_t id, int phase, float x, float y, float pressure);
void zero_native_app_frame(void *app);
void zero_native_app_set_asset_root(void *app, const char *path, uintptr_t len);
uintptr_t zero_native_app_last_command_count(void *app);
const char *zero_native_app_last_error_name(void *app);
