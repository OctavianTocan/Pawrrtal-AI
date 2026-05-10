#include <jni.h>
#include <stdint.h>

#include "zero_native.h"

JNIEXPORT jlong JNICALL Java_dev_zero_1native_examples_android_MainActivity_nativeCreate(JNIEnv *env, jobject self) {
    (void)env;
    (void)self;
    return (jlong)zero_native_app_create();
}

JNIEXPORT void JNICALL Java_dev_zero_1native_examples_android_MainActivity_nativeDestroy(JNIEnv *env, jobject self, jlong app) {
    (void)env;
    (void)self;
    zero_native_app_destroy((void *)app);
}

JNIEXPORT void JNICALL Java_dev_zero_1native_examples_android_MainActivity_nativeStart(JNIEnv *env, jobject self, jlong app) {
    (void)env;
    (void)self;
    zero_native_app_start((void *)app);
}

JNIEXPORT void JNICALL Java_dev_zero_1native_examples_android_MainActivity_nativeStop(JNIEnv *env, jobject self, jlong app) {
    (void)env;
    (void)self;
    zero_native_app_stop((void *)app);
}

JNIEXPORT void JNICALL Java_dev_zero_1native_examples_android_MainActivity_nativeResize(JNIEnv *env, jobject self, jlong app, jfloat width, jfloat height, jfloat scale, jobject surface) {
    (void)env;
    (void)self;
    zero_native_app_resize((void *)app, width, height, scale, surface);
}

JNIEXPORT void JNICALL Java_dev_zero_1native_examples_android_MainActivity_nativeTouch(JNIEnv *env, jobject self, jlong app, jlong id, jint phase, jfloat x, jfloat y, jfloat pressure) {
    (void)env;
    (void)self;
    zero_native_app_touch((void *)app, (uint64_t)id, phase, x, y, pressure);
}

JNIEXPORT void JNICALL Java_dev_zero_1native_examples_android_MainActivity_nativeFrame(JNIEnv *env, jobject self, jlong app) {
    (void)env;
    (void)self;
    zero_native_app_frame((void *)app);
}
