#import "automation_host.h"

#import <Foundation/Foundation.h>

int zero_native_automation_write_placeholder_screenshot(const char *path) {
    if (!path) {
        return 0;
    }
    NSData *data = [@"P3\n2 2\n255\n255 255 255 0 0 0\n0 0 0 255 255 255\n" dataUsingEncoding:NSUTF8StringEncoding];
    NSString *filePath = [NSString stringWithUTF8String:path];
    return [data writeToFile:filePath atomically:YES] ? 1 : 0;
}
