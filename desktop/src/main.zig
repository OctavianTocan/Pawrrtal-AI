//! AI Nexus desktop shell — zero-native Zig entry point.
//!
//! Bridges the Next.js frontend (served on :3001 in dev, packaged assets
//! in production) to native OS capabilities via `window.zero.invoke()`.
//!
//! Bridge surface exposed to JavaScript:
//!
//!   desktop.openExternal  { url }                → opens in OS browser
//!   desktop.getPlatform   {}                     → { platform: "darwin"|"linux" }
//!   desktop.getVersion    {}                     → { version: "1.0.0" }
//!
//!   workspace.listRoots   {}                     → { roots: string[] }
//!   workspace.addRoot     { path? }              → { roots: string[] }
//!   workspace.removeRoot  { path }               → { roots: string[] }
//!
//!   fs.readFile           { path }               → { ok, content? }
//!   fs.writeFile          { path, content }      → { ok }
//!   fs.listDirectory      { path }               → { ok, entries? }
//!
//!   shell.run             { command, cwd, timeoutMs? } → { ok, stdout, stderr, exitCode }
//!
//!   permissions.getMode   {}                     → { mode }
//!   permissions.setMode   { mode }               → { mode }
//!
//! Built-in zero-native commands (enabled via builtin_bridge policy):
//!   zero-native.dialog.openFile
//!   zero-native.dialog.showMessage
//!
//! Streaming ops (fs.watchDirectory, shell.spawnStreaming, permissions.onPrompt,
//! onMenuNewChat) are NOT supported — zero-native bridge is request/response
//! only. Frontend stubs return { ok: false, reason: "not-supported" } for these.

const std = @import("std");
const builtin = @import("builtin");
const runner = @import("runner");
const zero_native = @import("zero-native");

pub const panic = std.debug.FullPanic(zero_native.debug.capturePanic);

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------

const App = struct {
    env_map: *std.process.Environ.Map,
    allocator: std.mem.Allocator,

    /// Workspace root allowlist. fs.* and shell.run validate paths against this.
    /// Empty = open (workspace not yet configured).
    workspace_roots: std.ArrayList([]const u8),

    /// Permission mode — matches the frontend PermissionMode type.
    permission_mode: []const u8,

    /// Bridge handler slots wired into the BridgeRegistry.
    handlers: [12]zero_native.bridge.Handler,

    fn init(allocator: std.mem.Allocator, env_map: *std.process.Environ.Map) App {
        return .{
            .env_map = env_map,
            .allocator = allocator,
            .workspace_roots = std.ArrayList([]const u8).init(allocator),
            .permission_mode = "default",
            .handlers = undefined,
        };
    }

    fn deinit(self: *App) void {
        for (self.workspace_roots.items) |root| self.allocator.free(root);
        self.workspace_roots.deinit();
    }

    fn app(self: *@This()) zero_native.App {
        return .{
            .context = self,
            .name = "ai-nexus",
            .source = zero_native.frontend.productionSource(.{ .dist = "../frontend/out" }),
            .source_fn = source,
        };
    }

    fn source(context: *anyopaque) anyerror!zero_native.WebViewSource {
        const self: *App = @ptrCast(@alignCast(context));
        return zero_native.frontend.sourceFromEnv(self.env_map, .{
            .dist = "../frontend/out",
            .entry = "index.html",
        });
    }

    fn bridge(self: *@This()) zero_native.BridgeDispatcher {
        // Per-command policy: which origins may call each command.
        const allowed_origins = [_][]const u8{ "zero://app", "http://127.0.0.1:3001" };

        const policies = [_]zero_native.bridge.CommandPolicy{
            .{ .name = "desktop.openExternal",  .origins = &allowed_origins },
            .{ .name = "desktop.getPlatform",   .origins = &allowed_origins },
            .{ .name = "desktop.getVersion",    .origins = &allowed_origins },
            .{ .name = "workspace.listRoots",   .origins = &allowed_origins },
            .{ .name = "workspace.addRoot",     .origins = &allowed_origins },
            .{ .name = "workspace.removeRoot",  .origins = &allowed_origins },
            .{ .name = "fs.readFile",           .origins = &allowed_origins },
            .{ .name = "fs.writeFile",          .origins = &allowed_origins },
            .{ .name = "fs.listDirectory",      .origins = &allowed_origins },
            .{ .name = "shell.run",             .origins = &allowed_origins },
            .{ .name = "permissions.getMode",   .origins = &allowed_origins },
            .{ .name = "permissions.setMode",   .origins = &allowed_origins },
        };

        self.handlers = .{
            .{ .name = "desktop.openExternal",  .context = self, .invoke_fn = handleOpenExternal },
            .{ .name = "desktop.getPlatform",   .context = self, .invoke_fn = handleGetPlatform },
            .{ .name = "desktop.getVersion",    .context = self, .invoke_fn = handleGetVersion },
            .{ .name = "workspace.listRoots",   .context = self, .invoke_fn = handleWorkspaceListRoots },
            .{ .name = "workspace.addRoot",     .context = self, .invoke_fn = handleWorkspaceAddRoot },
            .{ .name = "workspace.removeRoot",  .context = self, .invoke_fn = handleWorkspaceRemoveRoot },
            .{ .name = "fs.readFile",           .context = self, .invoke_fn = handleFsReadFile },
            .{ .name = "fs.writeFile",          .context = self, .invoke_fn = handleFsWriteFile },
            .{ .name = "fs.listDirectory",      .context = self, .invoke_fn = handleFsListDirectory },
            .{ .name = "shell.run",             .context = self, .invoke_fn = handleShellRun },
            .{ .name = "permissions.getMode",   .context = self, .invoke_fn = handlePermissionsGetMode },
            .{ .name = "permissions.setMode",   .context = self, .invoke_fn = handlePermissionsSetMode },
        };

        return .{
            .policy   = .{ .enabled = true, .commands = &policies },
            .registry = .{ .handlers = &self.handlers },
        };
    }
};

// ---------------------------------------------------------------------------
// Bridge handlers
// ---------------------------------------------------------------------------

fn handleOpenExternal(context: *anyopaque, inv: zero_native.bridge.Invocation, out: []u8) anyerror![]const u8 {
    _ = @ptrCast(@alignCast(context)); // App unused — no state needed
    const url = extractStringField(inv.request.payload, "url") orelse return error.InvalidPayload;
    if (!std.mem.startsWith(u8, url, "http://") and !std.mem.startsWith(u8, url, "https://"))
        return error.InvalidPayload;
    const opener = comptime if (builtin.os.tag == .macos) "open" else "xdg-open";
    var child = std.process.Child.init(&.{ opener, url }, std.heap.page_allocator);
    child.stdout_behavior = .Ignore;
    child.stderr_behavior = .Ignore;
    _ = try child.spawnAndWait();
    return std.fmt.bufPrint(out, "{{}}", .{});
}

fn handleGetPlatform(context: *anyopaque, inv: zero_native.bridge.Invocation, out: []u8) anyerror![]const u8 {
    _ = context;
    _ = inv;
    const platform = comptime if (builtin.os.tag == .macos) "darwin" else "linux";
    return std.fmt.bufPrint(out, "{{\"platform\":\"{s}\"}}", .{platform});
}

fn handleGetVersion(context: *anyopaque, inv: zero_native.bridge.Invocation, out: []u8) anyerror![]const u8 {
    _ = context;
    _ = inv;
    return std.fmt.bufPrint(out, "{{\"version\":\"1.0.0\"}}", .{});
}

fn handleWorkspaceListRoots(context: *anyopaque, inv: zero_native.bridge.Invocation, out: []u8) anyerror![]const u8 {
    const self: *App = @ptrCast(@alignCast(context));
    _ = inv;
    return formatRootsArray(self, out);
}

fn handleWorkspaceAddRoot(context: *anyopaque, inv: zero_native.bridge.Invocation, out: []u8) anyerror![]const u8 {
    const self: *App = @ptrCast(@alignCast(context));
    if (extractStringField(inv.request.payload, "path")) |path| {
        for (self.workspace_roots.items) |existing| {
            if (std.mem.eql(u8, existing, path)) return formatRootsArray(self, out);
        }
        const owned = try self.allocator.dupe(u8, path);
        try self.workspace_roots.append(owned);
    }
    return formatRootsArray(self, out);
}

fn handleWorkspaceRemoveRoot(context: *anyopaque, inv: zero_native.bridge.Invocation, out: []u8) anyerror![]const u8 {
    const self: *App = @ptrCast(@alignCast(context));
    const path = extractStringField(inv.request.payload, "path") orelse return formatRootsArray(self, out);
    var i: usize = 0;
    while (i < self.workspace_roots.items.len) {
        if (std.mem.eql(u8, self.workspace_roots.items[i], path)) {
            const removed = self.workspace_roots.swapRemove(i);
            self.allocator.free(removed);
        } else {
            i += 1;
        }
    }
    return formatRootsArray(self, out);
}

fn handleFsReadFile(context: *anyopaque, inv: zero_native.bridge.Invocation, out: []u8) anyerror![]const u8 {
    const self: *App = @ptrCast(@alignCast(context));
    const path = extractStringField(inv.request.payload, "path") orelse return error.InvalidPayload;
    if (!isAllowedPath(self, path))
        return std.fmt.bufPrint(out, "{{\"ok\":false,\"reason\":\"path-not-allowed\"}}", .{});
    const content = std.fs.cwd().readFileAlloc(self.allocator, path, 10 * 1024 * 1024) catch |err| {
        return std.fmt.bufPrint(out, "{{\"ok\":false,\"reason\":\"{s}\"}}", .{@errorName(err)});
    };
    defer self.allocator.free(content);
    var fbs = std.io.fixedBufferStream(out);
    const w = fbs.writer();
    try w.writeAll("{\"ok\":true,\"content\":");
    try writeJsonString(w, content);
    try w.writeByte('}');
    return fbs.getWritten();
}

fn handleFsWriteFile(context: *anyopaque, inv: zero_native.bridge.Invocation, out: []u8) anyerror![]const u8 {
    const self: *App = @ptrCast(@alignCast(context));
    const path    = extractStringField(inv.request.payload, "path")    orelse return error.InvalidPayload;
    const content = extractStringField(inv.request.payload, "content") orelse return error.InvalidPayload;
    if (!isAllowedPath(self, path))
        return std.fmt.bufPrint(out, "{{\"ok\":false,\"reason\":\"path-not-allowed\"}}", .{});
    std.fs.cwd().writeFile(.{ .sub_path = path, .data = content }) catch |err| {
        return std.fmt.bufPrint(out, "{{\"ok\":false,\"reason\":\"{s}\"}}", .{@errorName(err)});
    };
    return std.fmt.bufPrint(out, "{{\"ok\":true}}", .{});
}

fn handleFsListDirectory(context: *anyopaque, inv: zero_native.bridge.Invocation, out: []u8) anyerror![]const u8 {
    const self: *App = @ptrCast(@alignCast(context));
    const path = extractStringField(inv.request.payload, "path") orelse return error.InvalidPayload;
    if (!isAllowedPath(self, path))
        return std.fmt.bufPrint(out, "{{\"ok\":false,\"reason\":\"path-not-allowed\"}}", .{});

    var dir = std.fs.cwd().openDir(path, .{ .iterate = true }) catch |err| {
        return std.fmt.bufPrint(out, "{{\"ok\":false,\"reason\":\"{s}\"}}", .{@errorName(err)});
    };
    defer dir.close();

    var fbs = std.io.fixedBufferStream(out);
    const w = fbs.writer();
    try w.writeAll("{\"ok\":true,\"entries\":[");
    var it = dir.iterate();
    var first = true;
    while (try it.next()) |entry| {
        if (!first) try w.writeByte(',');
        first = false;
        const full_path = try std.fmt.allocPrint(self.allocator, "{s}/{s}", .{ path, entry.name });
        defer self.allocator.free(full_path);
        const stat = std.fs.cwd().statFile(full_path) catch blk: {
            break :blk std.fs.File.Stat{
                .size = 0, .mtime = 0, .kind = .file,
                .inode = 0, .mode = 0, .atime = 0, .ctime = 0,
            };
        };
        const is_dir = entry.kind == .directory;
        try w.writeAll("{\"name\":");
        try writeJsonString(w, entry.name);
        try w.writeAll(",\"path\":");
        try writeJsonString(w, full_path);
        try w.print(",\"isDirectory\":{},\"size\":{d},\"modifiedAt\":{d}}}", .{
            is_dir,
            stat.size,
            @divTrunc(stat.mtime, std.time.ns_per_ms),
        });
    }
    try w.writeAll("]}");
    return fbs.getWritten();
}

fn handleShellRun(context: *anyopaque, inv: zero_native.bridge.Invocation, out: []u8) anyerror![]const u8 {
    const self: *App = @ptrCast(@alignCast(context));
    const command = extractStringField(inv.request.payload, "command") orelse return error.InvalidPayload;
    const cwd     = extractStringField(inv.request.payload, "cwd") orelse ".";

    if (!isAllowedPath(self, cwd))
        return std.fmt.bufPrint(out,
            "{{\"ok\":false,\"reason\":\"cwd-not-allowed\",\"stdout\":\"\",\"stderr\":\"\",\"exitCode\":1}}", .{});

    var arena = std.heap.ArenaAllocator.init(self.allocator);
    defer arena.deinit();
    const alloc = arena.allocator();

    var child = std.process.Child.init(&.{ "sh", "-c", command }, alloc);
    child.cwd = cwd;
    child.stdout_behavior = .Pipe;
    child.stderr_behavior = .Pipe;
    try child.spawn();

    const stdout_bytes = try child.stdout.?.readToEndAlloc(alloc, 1 * 1024 * 1024);
    const stderr_bytes = try child.stderr.?.readToEndAlloc(alloc, 1 * 1024 * 1024);
    const term = try child.wait();
    const exit_code: i32 = switch (term) {
        .Exited => |c| @intCast(c),
        else    => -1,
    };

    var fbs = std.io.fixedBufferStream(out);
    const w = fbs.writer();
    try w.writeAll("{\"ok\":true,\"stdout\":");
    try writeJsonString(w, stdout_bytes);
    try w.writeAll(",\"stderr\":");
    try writeJsonString(w, stderr_bytes);
    try w.print(",\"exitCode\":{d}}}", .{exit_code});
    return fbs.getWritten();
}

fn handlePermissionsGetMode(context: *anyopaque, inv: zero_native.bridge.Invocation, out: []u8) anyerror![]const u8 {
    const self: *App = @ptrCast(@alignCast(context));
    _ = inv;
    return std.fmt.bufPrint(out, "{{\"mode\":\"{s}\"}}", .{self.permission_mode});
}

fn handlePermissionsSetMode(context: *anyopaque, inv: zero_native.bridge.Invocation, out: []u8) anyerror![]const u8 {
    const self: *App = @ptrCast(@alignCast(context));
    const mode = extractStringField(inv.request.payload, "mode") orelse return error.InvalidPayload;
    const valid = std.mem.eql(u8, mode, "default") or
                  std.mem.eql(u8, mode, "accept-edits") or
                  std.mem.eql(u8, mode, "yolo") or
                  std.mem.eql(u8, mode, "plan");
    if (!valid) return error.InvalidPayload;
    const owned = try self.allocator.dupe(u8, mode);
    self.allocator.free(self.permission_mode);
    self.permission_mode = owned;
    return std.fmt.bufPrint(out, "{{\"mode\":\"{s}\"}}", .{self.permission_mode});
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Returns true when `path` is under at least one workspace root.
/// If no roots are configured, all paths are allowed (workspace not set up yet).
fn isAllowedPath(self: *App, path: []const u8) bool {
    if (self.workspace_roots.items.len == 0) return true;
    for (self.workspace_roots.items) |root| {
        if (std.mem.startsWith(u8, path, root)) return true;
    }
    return false;
}

fn formatRootsArray(self: *App, out: []u8) ![]const u8 {
    var fbs = std.io.fixedBufferStream(out);
    const w = fbs.writer();
    try w.writeAll("{\"roots\":[");
    for (self.workspace_roots.items, 0..) |root, i| {
        if (i > 0) try w.writeByte(',');
        try writeJsonString(w, root);
    }
    try w.writeAll("]}");
    return fbs.getWritten();
}

/// Minimal JSON string writer — escapes characters that would break JSON parsing.
fn writeJsonString(w: anytype, s: []const u8) !void {
    try w.writeByte('"');
    for (s) |c| {
        switch (c) {
            '"'  => try w.writeAll("\\\""),
            '\\' => try w.writeAll("\\\\"),
            '\n' => try w.writeAll("\\n"),
            '\r' => try w.writeAll("\\r"),
            '\t' => try w.writeAll("\\t"),
            else => try w.writeByte(c),
        }
    }
    try w.writeByte('"');
}

/// Minimal payload parser — extracts a string-valued field from a flat JSON
/// object. Handles \" escapes. Not a full JSON parser; all bridge payloads
/// use a flat key:string shape, so this is sufficient.
fn extractStringField(payload: []const u8, field: []const u8) ?[]const u8 {
    var needle_buf: [128]u8 = undefined;
    const needle = std.fmt.bufPrint(&needle_buf, "\"{s}\"", .{field}) catch return null;
    const idx    = std.mem.indexOf(u8, payload, needle) orelse return null;
    const after_key = payload[idx + needle.len ..];
    const colon  = std.mem.indexOf(u8, after_key, ":") orelse return null;
    const rest   = std.mem.trimLeft(u8, after_key[colon + 1 ..], " \t\r\n");
    if (rest.len == 0 or rest[0] != '"') return null;
    const end    = findStringEnd(rest[1..]) orelse return null;
    return rest[1 .. end + 1];
}

fn findStringEnd(s: []const u8) ?usize {
    var i: usize = 0;
    while (i < s.len) {
        if (s[i] == '\\') { i += 2; continue; }
        if (s[i] == '"')  return i;
        i += 1;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const dev_origins = [_][]const u8{ "zero://app", "zero://inline", "http://127.0.0.1:3001" };

pub fn main(init: std.process.Init) !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var app = App.init(allocator, init.environ_map);
    defer app.deinit();

    try runner.runWithOptions(app.app(), .{
        .app_name    = "AI Nexus",
        .window_title = "AI Nexus",
        .bundle_id   = "ai.nexus.desktop",
        .icon_path   = "assets/icon.icns",
        .bridge      = app.bridge(),
        .builtin_bridge = .{
            .enabled  = true,
            .commands = &.{
                .{ .name = "zero-native.dialog.openFile",    .origins = &dev_origins },
                .{ .name = "zero-native.dialog.showMessage", .origins = &dev_origins },
            },
        },
        .security = .{
            .navigation = .{ .allowed_origins = &dev_origins },
        },
    }, init);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test "extractStringField: simple payload" {
    const payload = "{\"url\":\"https://example.com\",\"other\":\"val\"}";
    try std.testing.expectEqualStrings(
        "https://example.com",
        extractStringField(payload, "url").?,
    );
}

test "extractStringField: field not present" {
    try std.testing.expect(extractStringField("{\"a\":\"b\"}", "missing") == null);
}

test "isAllowedPath: open when no roots configured" {
    const alloc = std.testing.allocator;
    var app = App.init(alloc, undefined);
    defer app.deinit();
    try std.testing.expect(isAllowedPath(&app, "/any/path"));
}

test "isAllowedPath: denies path outside roots" {
    const alloc = std.testing.allocator;
    var app = App.init(alloc, undefined);
    defer app.deinit();
    try app.workspace_roots.append(try alloc.dupe(u8, "/home/user/workspace"));
    try std.testing.expect(!isAllowedPath(&app, "/etc/passwd"));
    try std.testing.expect(isAllowedPath(&app, "/home/user/workspace/file.txt"));
}
