const std = @import("std");
const zig_assets = @import("assets");

pub const BundleStats = struct {
    asset_count: usize = 0,
    manifest_path: []const u8 = "asset-manifest.zon",
};

pub fn bundle(allocator: std.mem.Allocator, io: std.Io, assets_dir_path: []const u8, output_dir_path: []const u8) !BundleStats {
    var cwd = std.Io.Dir.cwd();
    cwd.createDirPath(io, output_dir_path) catch {};
    var assets_dir = cwd.openDir(io, assets_dir_path, .{ .iterate = true }) catch |err| switch (err) {
        error.FileNotFound => {
            try writeManifest(allocator, io, output_dir_path, &.{});
            return .{};
        },
        else => return err,
    };
    defer assets_dir.close(io);

    var copied: std.ArrayList(zig_assets.Asset) = .empty;
    defer {
        for (copied.items) |asset| {
            allocator.free(asset.id);
            allocator.free(asset.source_path);
            allocator.free(asset.bundle_path);
        }
        copied.deinit(allocator);
    }

    var walker = try assets_dir.walk(allocator);
    defer walker.deinit();
    while (try walker.next(io)) |entry| {
        if (entry.kind != .file) continue;
        const source_path = try std.fs.path.join(allocator, &.{ assets_dir_path, entry.path });
        defer allocator.free(source_path);
        const output_path = try std.fs.path.join(allocator, &.{ output_dir_path, entry.path });
        defer allocator.free(output_path);
        const bytes = try readFile(allocator, io, source_path);
        defer allocator.free(bytes);
        try writeFilePath(io, output_path, bytes);
        try copied.append(allocator, .{
            .id = try allocator.dupe(u8, entry.path),
            .kind = zig_assets.inferKind(entry.path),
            .source_path = try allocator.dupe(u8, source_path),
            .bundle_path = try allocator.dupe(u8, entry.path),
            .byte_len = bytes.len,
            .hash = zig_assets.sha256(bytes),
            .media_type = zig_assets.inferMediaType(entry.path),
        });
    }

    std.mem.sort(zig_assets.Asset, copied.items, {}, lessAsset);
    try writeManifest(allocator, io, output_dir_path, copied.items);
    return .{ .asset_count = copied.items.len };
}

fn lessAsset(_: void, a: zig_assets.Asset, b: zig_assets.Asset) bool {
    return std.mem.lessThan(u8, a.id, b.id);
}

fn writeManifest(allocator: std.mem.Allocator, io: std.Io, output_dir_path: []const u8, assets: []const zig_assets.Asset) !void {
    const manifest_path = try std.fs.path.join(allocator, &.{ output_dir_path, "asset-manifest.zon" });
    defer allocator.free(manifest_path);
    var out: std.ArrayList(u8) = .empty;
    defer out.deinit(allocator);
    try out.appendSlice(allocator, ".{ .assets = .{\n");
    for (assets) |asset| {
        const hex = asset.hash.toHex();
        try out.appendSlice(allocator, "  .{ .id = \"");
        try out.appendSlice(allocator, asset.id);
        try out.appendSlice(allocator, "\", .bundle_path = \"");
        try out.appendSlice(allocator, asset.bundle_path);
        try out.appendSlice(allocator, "\", .source_path = \"");
        try out.appendSlice(allocator, asset.source_path);
        try out.appendSlice(allocator, "\", .byte_len = ");
        const byte_len_text = try std.fmt.allocPrint(allocator, "{d}", .{asset.byte_len});
        defer allocator.free(byte_len_text);
        try out.appendSlice(allocator, byte_len_text);
        try out.appendSlice(allocator, ", .hash = \"");
        try out.appendSlice(allocator, &hex);
        try out.appendSlice(allocator, "\"");
        if (asset.media_type) |media_type| {
            try out.appendSlice(allocator, ", .media_type = \"");
            try out.appendSlice(allocator, media_type);
            try out.appendSlice(allocator, "\"");
        }
        try out.appendSlice(allocator, " },\n");
    }
    try out.appendSlice(allocator, "} }\n");
    try std.Io.Dir.cwd().writeFile(io, .{ .sub_path = manifest_path, .data = out.items });
}

fn readFile(allocator: std.mem.Allocator, io: std.Io, path: []const u8) ![]u8 {
    var file = try std.Io.Dir.cwd().openFile(io, path, .{});
    defer file.close(io);
    var read_buffer: [4096]u8 = undefined;
    var reader = file.reader(io, &read_buffer);
    return reader.interface.allocRemaining(allocator, .limited(16 * 1024 * 1024));
}

fn writeFilePath(io: std.Io, path: []const u8, bytes: []const u8) !void {
    if (std.fs.path.dirname(path)) |parent| {
        std.Io.Dir.cwd().createDirPath(io, parent) catch {};
    }
    try std.Io.Dir.cwd().writeFile(io, .{ .sub_path = path, .data = bytes });
}

test "empty missing asset directory creates empty manifest" {
    const result = try bundle(std.testing.allocator, std.testing.io, "does-not-exist-assets", ".zig-cache/test-empty-assets");
    try std.testing.expectEqual(@as(usize, 0), result.asset_count);
}

test "bundle recursively copies frontend asset trees" {
    const cwd = std.Io.Dir.cwd();
    cwd.createDirPath(std.testing.io, ".zig-cache/test-recursive-assets/src/assets") catch {};
    try cwd.writeFile(std.testing.io, .{ .sub_path = ".zig-cache/test-recursive-assets/src/index.html", .data = "<script src=\"/assets/app.js\"></script>" });
    try cwd.writeFile(std.testing.io, .{ .sub_path = ".zig-cache/test-recursive-assets/src/assets/app.js", .data = "console.log('zero-native');" });

    const result = try bundle(std.testing.allocator, std.testing.io, ".zig-cache/test-recursive-assets/src", ".zig-cache/test-recursive-assets/out");

    try std.testing.expectEqual(@as(usize, 2), result.asset_count);
    var buffer: [64]u8 = undefined;
    var file = try cwd.openFile(std.testing.io, ".zig-cache/test-recursive-assets/out/assets/app.js", .{});
    defer file.close(std.testing.io);
    const len = try file.readPositionalAll(std.testing.io, &buffer, 0);
    try std.testing.expectEqualStrings("console.log('zero-native');", buffer[0..len]);
}
