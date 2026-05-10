const std = @import("std");
const runner = @import("runner");
const zero_native = @import("zero-native");

pub const panic = std.debug.FullPanic(zero_native.debug.capturePanic);

const HelloApp = struct {
    fn app(self: *@This()) zero_native.App {
        return .{
            .context = self,
            .name = "hello",
            .source = zero_native.WebViewSource.html(
                \\<!doctype html>
                \\<html>
                \\<body style="font-family: -apple-system, system-ui, sans-serif; padding: 2rem;">
                \\  <h1>Hello from zero-native</h1>
                \\  <p>This app is rendered by the platform WebView.</p>
                \\</body>
                \\</html>
            ),
        };
    }
};

pub fn main(init: std.process.Init) !void {
    var app = HelloApp{};
    try runner.runWithOptions(app.app(), .{
        .app_name = "hello",
        .window_title = "Hello",
        .bundle_id = "dev.zero_native.hello",
        .icon_path = "assets/icon.icns",
    }, init);
}

test "hello app uses inline HTML source" {
    var state = HelloApp{};
    const app = state.app();
    try std.testing.expectEqualStrings("hello", app.name);
    try std.testing.expectEqual(zero_native.WebViewSourceKind.html, app.source.kind);
    try std.testing.expect(std.mem.indexOf(u8, app.source.bytes, "Hello from zero-native") != null);
}
