const std = @import("std");
const builtin = @import("builtin");

pub const ValidationError = error{
    DuplicateCheck,
    DuplicateGpuApi,
    DuplicateSdk,
    InvalidCapability,
    InvalidMessage,
    InvalidTarget,
};

pub const OS = enum {
    macos,
    windows,
    linux,
    ios,
    android,
    unknown,
};

pub const Arch = enum {
    x86_64,
    aarch64,
    arm,
    riscv64,
    wasm32,
    unknown,
};

pub const Abi = enum {
    none,
    gnu,
    musl,
    msvc,
    android,
    simulator,
    unknown,
};

pub const DisplayServer = enum {
    none,
    appkit,
    win32,
    wayland,
    x11,
    uikit,
    android_surface,
    unknown,
};

pub const GpuApi = enum {
    metal,
    vulkan,
    direct3d12,
    direct3d11,
    opengl,
    opengles,
    software,
    unknown,
};

pub const SdkKind = enum {
    xcode,
    macos_sdk,
    ios_sdk,
    android_sdk,
    android_ndk,
    windows_sdk,
    vulkan_sdk,
    wayland,
    unknown,
};

pub const Status = enum {
    available,
    missing,
    unsupported,
    unknown,

    pub fn isProblem(self: Status) bool {
        return self == .missing or self == .unsupported;
    }

    pub fn label(self: Status) []const u8 {
        return switch (self) {
            .available => "available",
            .missing => "missing",
            .unsupported => "unsupported",
            .unknown => "unknown",
        };
    }
};

pub const Target = struct {
    os: OS,
    arch: Arch,
    abi: Abi = .none,

    pub fn current() Target {
        const abi_value = abiFromBuiltin(builtin.abi);
        const os_value = osFromBuiltin(builtin.os.tag);
        return .{
            .os = if (os_value == .linux and abi_value == .android) .android else os_value,
            .arch = archFromBuiltin(builtin.cpu.arch),
            .abi = abi_value,
        };
    }

    pub fn validate(self: Target) ValidationError!void {
        if (self.os == .unknown or self.arch == .unknown) return error.InvalidTarget;
    }
};

pub const EnvVar = struct {
    name: []const u8,
    value: []const u8,

    pub fn validate(self: EnvVar) ValidationError!void {
        try validateLabel(self.name);
        if (containsNull(self.value)) return error.InvalidMessage;
    }
};

pub const SdkRecord = struct {
    kind: SdkKind,
    status: Status,
    path: ?[]const u8 = null,
    version: ?[]const u8 = null,
    message: ?[]const u8 = null,

    pub fn validate(self: SdkRecord) ValidationError!void {
        if (self.kind == .unknown) return error.InvalidCapability;
        if (self.path) |path| try validateMessage(path);
        if (self.version) |version| try validateMessage(version);
        if (self.message) |message| try validateMessage(message);
    }
};

pub const GpuApiRecord = struct {
    api: GpuApi,
    status: Status,
    message: ?[]const u8 = null,

    pub fn validate(self: GpuApiRecord) ValidationError!void {
        if (self.api == .unknown) return error.InvalidCapability;
        if (self.message) |message| try validateMessage(message);
    }
};

pub const HostProbeInputs = struct {
    target: Target,
    env: []const EnvVar = &.{},
    sdks: []const SdkRecord = &.{},
    gpu_apis: []const GpuApiRecord = &.{},
    simulator: bool = false,
    device: bool = false,
};

pub const HostInfo = struct {
    target: Target,
    display_server: DisplayServer = .none,
    simulator: bool = false,
    device: bool = false,
    sdks: []const SdkRecord = &.{},
    gpu_apis: []const GpuApiRecord = &.{},

    pub fn validate(self: HostInfo) ValidationError!void {
        try self.target.validate();
        for (self.sdks, 0..) |sdk, index| {
            try sdk.validate();
            for (self.sdks[0..index]) |previous| {
                if (previous.kind == sdk.kind) return error.DuplicateSdk;
            }
        }
        for (self.gpu_apis, 0..) |gpu_api, index| {
            try gpu_api.validate();
            for (self.gpu_apis[0..index]) |previous| {
                if (previous.api == gpu_api.api) return error.DuplicateGpuApi;
            }
        }
    }
};

pub const DoctorCheck = struct {
    id: []const u8,
    status: Status,
    message: []const u8,

    pub fn ok(id: []const u8, message: []const u8) DoctorCheck {
        return .{ .id = id, .status = .available, .message = message };
    }

    pub fn missing(id: []const u8, message: []const u8) DoctorCheck {
        return .{ .id = id, .status = .missing, .message = message };
    }

    pub fn unsupported(id: []const u8, message: []const u8) DoctorCheck {
        return .{ .id = id, .status = .unsupported, .message = message };
    }

    pub fn validate(self: DoctorCheck) ValidationError!void {
        try validateLabel(self.id);
        try validateMessage(self.message);
    }
};

pub const DoctorReport = struct {
    host: HostInfo,
    checks: []const DoctorCheck = &.{},

    pub fn validate(self: DoctorReport) ValidationError!void {
        try self.host.validate();
        for (self.checks, 0..) |check, index| {
            try check.validate();
            for (self.checks[0..index]) |previous| {
                if (std.mem.eql(u8, previous.id, check.id)) return error.DuplicateCheck;
            }
        }
    }

    pub fn hasProblems(self: DoctorReport) bool {
        for (self.checks) |check| {
            if (check.status.isProblem()) return true;
        }
        for (self.host.sdks) |sdk| {
            if (sdk.status.isProblem()) return true;
        }
        for (self.host.gpu_apis) |gpu_api| {
            if (gpu_api.status.isProblem()) return true;
        }
        return false;
    }

    pub fn formatText(self: DoctorReport, writer: anytype) !void {
        try self.validate();
        try writer.print("target: {s}-{s}-{s}\n", .{ @tagName(self.host.target.os), @tagName(self.host.target.arch), @tagName(self.host.target.abi) });
        try writer.print("display: {s}\n", .{@tagName(self.host.display_server)});
        try writer.print("context: simulator={any} device={any}\n", .{ self.host.simulator, self.host.device });

        for (self.host.sdks) |sdk| {
            try writer.print("sdk {s}: {s}", .{ @tagName(sdk.kind), sdk.status.label() });
            if (sdk.version) |version| try writer.print(" {s}", .{version});
            if (sdk.path) |path| try writer.print(" at {s}", .{path});
            if (sdk.message) |message| try writer.print(" - {s}", .{message});
            try writer.writeAll("\n");
        }

        for (self.host.gpu_apis) |gpu_api| {
            try writer.print("gpu {s}: {s}", .{ @tagName(gpu_api.api), gpu_api.status.label() });
            if (gpu_api.message) |message| try writer.print(" - {s}", .{message});
            try writer.writeAll("\n");
        }

        for (self.checks) |check| {
            try writer.print("check {s}: {s} - {s}\n", .{ check.id, check.status.label(), check.message });
        }
    }
};

pub fn detectHost(inputs: HostProbeInputs) HostInfo {
    return .{
        .target = inputs.target,
        .display_server = detectDisplayServer(inputs.target.os, inputs.env),
        .simulator = inputs.simulator,
        .device = inputs.device,
        .sdks = inputs.sdks,
        .gpu_apis = inputs.gpu_apis,
    };
}

pub fn detectDisplayServer(os: OS, env: []const EnvVar) DisplayServer {
    return switch (os) {
        .macos => .appkit,
        .windows => .win32,
        .ios => .uikit,
        .android => .android_surface,
        .linux => {
            if (envValue(env, "WAYLAND_DISPLAY")) |value| {
                if (value.len > 0) return .wayland;
            }
            if (envValue(env, "DISPLAY")) |value| {
                if (value.len > 0) return .x11;
            }
            return .none;
        },
        .unknown => .unknown,
    };
}

pub fn defaultGpuStatus(os: OS, display_server: DisplayServer, api: GpuApi) Status {
    return switch (api) {
        .metal => if (os == .macos or os == .ios) .available else .unsupported,
        .vulkan => if (os == .linux or os == .windows or os == .android) .unknown else .unsupported,
        .direct3d12, .direct3d11 => if (os == .windows) .unknown else .unsupported,
        .opengles => if (os == .android or os == .ios) .unknown else .unsupported,
        .opengl => if (display_server == .x11 or display_server == .wayland or os == .windows or os == .macos) .unknown else .unsupported,
        .software => .available,
        .unknown => .unknown,
    };
}

fn envValue(env: []const EnvVar, name: []const u8) ?[]const u8 {
    for (env) |item| {
        if (std.mem.eql(u8, item.name, name)) return item.value;
    }
    return null;
}

fn osFromBuiltin(os_tag: std.Target.Os.Tag) OS {
    return switch (os_tag) {
        .macos => .macos,
        .windows => .windows,
        .linux => .linux,
        .ios => .ios,
        else => .unknown,
    };
}

fn archFromBuiltin(arch: std.Target.Cpu.Arch) Arch {
    return switch (arch) {
        .x86_64 => .x86_64,
        .aarch64 => .aarch64,
        .arm => .arm,
        .riscv64 => .riscv64,
        .wasm32 => .wasm32,
        else => .unknown,
    };
}

fn abiFromBuiltin(abi: std.Target.Abi) Abi {
    return switch (abi) {
        .gnu => .gnu,
        .musl => .musl,
        .msvc => .msvc,
        .android => .android,
        .simulator => .simulator,
        .none => .none,
        else => .unknown,
    };
}

fn validateLabel(value: []const u8) ValidationError!void {
    if (value.len == 0) return error.InvalidMessage;
    try validateMessage(value);
}

fn validateMessage(value: []const u8) ValidationError!void {
    if (containsNull(value)) return error.InvalidMessage;
}

fn containsNull(value: []const u8) bool {
    for (value) |byte| {
        if (byte == 0) return true;
    }
    return false;
}

test "current target maps builtin values" {
    const target = Target.current();
    try std.testing.expect(target.os != .unknown);
    try std.testing.expect(target.arch != .unknown);
}

test "display server detection is driven by injected environment" {
    const wayland_env = [_]EnvVar{.{ .name = "WAYLAND_DISPLAY", .value = "wayland-0" }};
    const x11_env = [_]EnvVar{.{ .name = "DISPLAY", .value = ":0" }};

    try std.testing.expectEqual(DisplayServer.wayland, detectDisplayServer(.linux, &wayland_env));
    try std.testing.expectEqual(DisplayServer.x11, detectDisplayServer(.linux, &x11_env));
    try std.testing.expectEqual(DisplayServer.none, detectDisplayServer(.linux, &.{}));
    try std.testing.expectEqual(DisplayServer.appkit, detectDisplayServer(.macos, &.{}));
}

test "host info validates SDK and GPU records" {
    const sdks = [_]SdkRecord{
        .{ .kind = .xcode, .status = .available, .path = "/Applications/Xcode.app", .version = "16.0" },
    };
    const gpu_apis = [_]GpuApiRecord{
        .{ .api = .metal, .status = .available },
        .{ .api = .software, .status = .available },
    };
    const host = detectHost(.{
        .target = .{ .os = .macos, .arch = .aarch64, .abi = .none },
        .sdks = &sdks,
        .gpu_apis = &gpu_apis,
        .device = true,
    });

    try host.validate();
    try std.testing.expectEqual(DisplayServer.appkit, host.display_server);
    try std.testing.expectEqual(Status.available, defaultGpuStatus(.macos, .appkit, .metal));
    try std.testing.expectEqual(Status.unsupported, defaultGpuStatus(.linux, .wayland, .metal));
}

test "doctor reports format deterministic output and detect problems" {
    const sdks = [_]SdkRecord{
        .{ .kind = .android_sdk, .status = .missing, .message = "ANDROID_HOME is not set" },
    };
    const gpu_apis = [_]GpuApiRecord{
        .{ .api = .vulkan, .status = .unknown, .message = "loader not probed" },
    };
    const checks = [_]DoctorCheck{
        DoctorCheck.ok("zig", "Zig 0.16 is available"),
        DoctorCheck.missing("android-ndk", "NDK path was not provided"),
    };
    const report = DoctorReport{
        .host = detectHost(.{
            .target = .{ .os = .linux, .arch = .x86_64, .abi = .gnu },
            .env = &.{.{ .name = "WAYLAND_DISPLAY", .value = "wayland-0" }},
            .sdks = &sdks,
            .gpu_apis = &gpu_apis,
        }),
        .checks = &checks,
    };
    var bytes: [512]u8 = undefined;
    var writer = std.Io.Writer.fixed(&bytes);

    try report.validate();
    try std.testing.expect(report.hasProblems());
    try report.formatText(&writer);
    const output = writer.buffered();
    try std.testing.expect(std.mem.indexOf(u8, output, "target: linux-x86_64-gnu") != null);
    try std.testing.expect(std.mem.indexOf(u8, output, "display: wayland") != null);
    try std.testing.expect(std.mem.indexOf(u8, output, "android-ndk") != null);
}

test "validation catches duplicate records and invalid text" {
    const duplicate_sdks = [_]SdkRecord{
        .{ .kind = .xcode, .status = .available },
        .{ .kind = .xcode, .status = .missing },
    };
    const duplicate_gpu = [_]GpuApiRecord{
        .{ .api = .software, .status = .available },
        .{ .api = .software, .status = .available },
    };
    const duplicate_checks = [_]DoctorCheck{
        DoctorCheck.ok("zig", "ok"),
        DoctorCheck.ok("zig", "still ok"),
    };

    try std.testing.expectError(error.DuplicateSdk, (HostInfo{ .target = .{ .os = .macos, .arch = .aarch64 }, .sdks = &duplicate_sdks }).validate());
    try std.testing.expectError(error.DuplicateGpuApi, (HostInfo{ .target = .{ .os = .linux, .arch = .x86_64 }, .gpu_apis = &duplicate_gpu }).validate());
    try std.testing.expectError(error.DuplicateCheck, (DoctorReport{ .host = .{ .target = .{ .os = .linux, .arch = .x86_64 } }, .checks = &duplicate_checks }).validate());
    try std.testing.expectError(error.InvalidMessage, (EnvVar{ .name = "", .value = "" }).validate());
}

test {
    std.testing.refAllDecls(@This());
}
