const std = @import("std");
const app_dirs = @import("app_dirs");
const trace = @import("trace");

pub const TraceMode = enum {
    off,
    events,
    runtime,
    all,

    pub fn includes(self: TraceMode, category: TraceMode) bool {
        return self == .all or self == category;
    }
};

pub const Config = struct {
    trace: TraceMode = .events,
    debug_overlay: bool = false,
};

pub const LogFormat = enum {
    text,
    json_lines,

    pub fn parse(value: []const u8) ?LogFormat {
        if (std.mem.eql(u8, value, "text")) return .text;
        if (std.mem.eql(u8, value, "jsonl") or std.mem.eql(u8, value, "json_lines")) return .json_lines;
        return null;
    }

    fn traceFormat(self: LogFormat) trace.Format {
        return switch (self) {
            .text => .text,
            .json_lines => .json_lines,
        };
    }
};

pub const LogPathBuffers = struct {
    log_dir: [1024]u8 = undefined,
    log_file: [1200]u8 = undefined,
    panic_file: [1200]u8 = undefined,
};

pub const LogPaths = struct {
    log_dir: []const u8,
    log_file: []const u8,
    panic_file: []const u8,
};

pub const LogSetup = struct {
    paths: LogPaths,
    format: LogFormat = .json_lines,
};

pub const FileTraceSink = struct {
    io: std.Io,
    log_dir: []const u8,
    path: []const u8,
    format: LogFormat = .json_lines,

    pub fn init(io: std.Io, log_dir: []const u8, path: []const u8, format: LogFormat) FileTraceSink {
        return .{ .io = io, .log_dir = log_dir, .path = path, .format = format };
    }

    pub fn sink(self: *FileTraceSink) trace.Sink {
        return .{ .context = self, .write_fn = write };
    }

    fn write(context: *anyopaque, record: trace.Record) trace.WriteError!void {
        const self: *FileTraceSink = @ptrCast(@alignCast(context));
        appendTraceRecord(self.io, self.log_dir, self.path, self.format, record) catch {};
    }
};

pub const FanoutTraceSink = struct {
    sinks: []const trace.Sink,

    pub fn sink(self: *FanoutTraceSink) trace.Sink {
        return .{ .context = self, .write_fn = write };
    }

    fn write(context: *anyopaque, record: trace.Record) trace.WriteError!void {
        const self: *FanoutTraceSink = @ptrCast(@alignCast(context));
        var first_error: ?trace.WriteError = null;
        for (self.sinks) |child| {
            child.write(record) catch |err| {
                if (first_error == null) first_error = err;
            };
        }
        if (first_error) |err| return err;
    }
};

pub fn setupLogging(io: std.Io, env_map: *std.process.Environ.Map, app_name: []const u8, buffers: *LogPathBuffers) !LogSetup {
    _ = io;
    const paths = try resolveLogPaths(buffers, app_name, envFromMap(env_map), env_map.get("ZERO_NATIVE_LOG_DIR"));
    return .{
        .paths = paths,
        .format = if (env_map.get("ZERO_NATIVE_LOG_FORMAT")) |value| LogFormat.parse(value) orelse .json_lines else .json_lines,
    };
}

pub fn resolveLogPaths(buffers: *LogPathBuffers, app_name: []const u8, env: app_dirs.Env, override_dir: ?[]const u8) !LogPaths {
    const platform = app_dirs.currentPlatform();
    const log_dir = if (override_dir) |dir|
        try copyInto(&buffers.log_dir, dir)
    else
        try app_dirs.resolveOne(.{ .name = app_name }, platform, env, .logs, &buffers.log_dir);
    const log_file = try app_dirs.join(platform, &buffers.log_file, &.{ log_dir, "zero-native.jsonl" });
    const panic_file = try app_dirs.join(platform, &buffers.panic_file, &.{ log_dir, "last-panic.txt" });
    return .{ .log_dir = log_dir, .log_file = log_file, .panic_file = panic_file };
}

pub fn installPanicCapture(io: std.Io, paths: LogPaths) void {
    panic_state.install(io, paths) catch {};
}

pub fn capturePanic(msg: []const u8, ra: ?usize) noreturn {
    panic_state.write(msg, ra) catch {};
    std.debug.defaultPanic(msg, ra);
}

pub fn parseTraceMode(value: []const u8) ?TraceMode {
    if (std.mem.eql(u8, value, "off")) return .off;
    if (std.mem.eql(u8, value, "events")) return .events;
    if (std.mem.eql(u8, value, "runtime")) return .runtime;
    if (std.mem.eql(u8, value, "all")) return .all;
    return null;
}

pub fn envFromMap(env_map: *std.process.Environ.Map) app_dirs.Env {
    return .{
        .home = env_map.get("HOME"),
        .xdg_config_home = env_map.get("XDG_CONFIG_HOME"),
        .xdg_cache_home = env_map.get("XDG_CACHE_HOME"),
        .xdg_data_home = env_map.get("XDG_DATA_HOME"),
        .xdg_state_home = env_map.get("XDG_STATE_HOME"),
        .local_app_data = env_map.get("LOCALAPPDATA"),
        .app_data = env_map.get("APPDATA"),
        .temp = env_map.get("TEMP"),
        .tmp = env_map.get("TMP"),
        .tmpdir = env_map.get("TMPDIR"),
    };
}

pub fn appendTraceRecord(io: std.Io, log_dir: []const u8, path: []const u8, format: LogFormat, record: trace.Record) !void {
    var line_buffer: [4096]u8 = undefined;
    var writer = std.Io.Writer.fixed(&line_buffer);
    switch (format.traceFormat()) {
        .text => {
            try trace.formatText(record, &writer);
            try writer.writeAll("\n");
        },
        .json_lines => try trace.formatJsonLine(record, &writer),
    }
    try appendFile(io, log_dir, path, writer.buffered());
}

fn appendFile(io: std.Io, directory: []const u8, path: []const u8, bytes: []const u8) !void {
    var cwd = std.Io.Dir.cwd();
    cwd.createDirPath(io, directory) catch {};
    var file = try cwd.createFile(io, path, .{ .read = true, .truncate = false });
    defer file.close(io);
    const stat = try file.stat(io);
    try file.writePositionalAll(io, bytes, stat.size);
}

fn copyInto(buffer: []u8, value: []const u8) ![]const u8 {
    if (value.len > buffer.len) return error.NoSpaceLeft;
    @memcpy(buffer[0..value.len], value);
    return buffer[0..value.len];
}

const PanicState = struct {
    installed: bool = false,
    io: std.Io = undefined,
    log_dir_buffer: [1024]u8 = undefined,
    log_file_buffer: [1200]u8 = undefined,
    panic_file_buffer: [1200]u8 = undefined,
    log_dir: []const u8 = &.{},
    log_file: []const u8 = &.{},
    panic_file: []const u8 = &.{},

    fn install(self: *PanicState, io: std.Io, paths: LogPaths) !void {
        self.io = io;
        self.log_dir = try copyInto(&self.log_dir_buffer, paths.log_dir);
        self.log_file = try copyInto(&self.log_file_buffer, paths.log_file);
        self.panic_file = try copyInto(&self.panic_file_buffer, paths.panic_file);
        self.installed = true;
    }

    fn write(self: *PanicState, msg: []const u8, ra: ?usize) !void {
        if (!self.installed) return;
        var report_buffer: [1024]u8 = undefined;
        var report = std.Io.Writer.fixed(&report_buffer);
        try report.print("panic: {s}\n", .{msg});
        if (ra) |addr| try report.print("return_address: 0x{x}\n", .{addr});

        var cwd = std.Io.Dir.cwd();
        cwd.createDirPath(self.io, self.log_dir) catch {};
        try cwd.writeFile(self.io, .{ .sub_path = self.panic_file, .data = report.buffered() });

        var fields: [1]trace.Field = undefined;
        const field_slice = if (ra) |addr| blk: {
            fields[0] = trace.uint("return_address", addr);
            break :blk fields[0..1];
        } else fields[0..0];
        try appendTraceRecord(self.io, self.log_dir, self.log_file, .json_lines, trace.event(.{}, .fatal, "panic", msg, field_slice));
    }
};

var panic_state: PanicState = .{};

test "trace mode parsing and matching" {
    try std.testing.expectEqual(TraceMode.events, parseTraceMode("events").?);
    try std.testing.expect(TraceMode.all.includes(.runtime));
    try std.testing.expect(!TraceMode.events.includes(.runtime));
}

test "log path resolution uses platform logs directory and overrides" {
    var buffers: LogPathBuffers = .{};
    const env: app_dirs.Env = .{ .home = "/Users/alice", .tmpdir = "/tmp" };
    const paths = try resolveLogPaths(&buffers, "dev.zero_native.test", env, "/tmp/zero-native-logs");
    try std.testing.expectEqualStrings("/tmp/zero-native-logs", paths.log_dir);
    try std.testing.expect(std.mem.indexOf(u8, paths.log_file, "zero-native.jsonl") != null);
    try std.testing.expect(std.mem.indexOf(u8, paths.panic_file, "last-panic.txt") != null);
}

test "fanout sink writes every child sink" {
    var records_a: [2]trace.Record = undefined;
    var records_b: [2]trace.Record = undefined;
    var sink_a = trace.BufferSink.init(&records_a);
    var sink_b = trace.BufferSink.init(&records_b);
    const sinks = [_]trace.Sink{ sink_a.sink(), sink_b.sink() };
    var fanout: FanoutTraceSink = .{ .sinks = &sinks };

    try fanout.sink().write(trace.event(.{ .ns = 1 }, .info, "one", null, &.{}));

    try std.testing.expectEqual(@as(usize, 1), sink_a.written().len);
    try std.testing.expectEqual(@as(usize, 1), sink_b.written().len);
}
