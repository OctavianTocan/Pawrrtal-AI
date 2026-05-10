const zig_assets = @import("assets");

pub const RuntimeAssets = struct {
    manifest: zig_assets.Manifest = .{ .assets = &.{} },

    pub fn init(manifest: zig_assets.Manifest) RuntimeAssets {
        return .{ .manifest = manifest };
    }

    pub fn find(self: RuntimeAssets, id: []const u8) ?zig_assets.Asset {
        return self.manifest.findById(id);
    }
};

test "runtime assets wrap package bundle" {
    const assets = [_]zig_assets.Asset{.{ .id = "index.html", .source_path = "assets/index.html", .bundle_path = "index.html" }};
    const runtime_assets = RuntimeAssets.init(.{ .assets = &assets });

    try @import("std").testing.expect(runtime_assets.find("index.html") != null);
}
