const std = @import("std");

pub const Error = error{
    DuplicateModule,
    MissingDependency,
    ModuleFailed,
};

pub const ModuleId = u64;

pub const CapabilityKind = enum {
    native_module,
    webview,
    js_bridge,
    filesystem,
    network,
    clipboard,
    custom,
};

pub const Capability = struct {
    kind: CapabilityKind,
    name: []const u8 = "",
};

pub const RuntimeContext = struct {
    platform_name: []const u8,
};

pub const Command = struct {
    name: []const u8,
    target: ?ModuleId = null,
};

pub const ModuleHooks = struct {
    start_fn: ?*const fn (context: *anyopaque, runtime: RuntimeContext) anyerror!void = null,
    stop_fn: ?*const fn (context: *anyopaque, runtime: RuntimeContext) anyerror!void = null,
    command_fn: ?*const fn (context: *anyopaque, runtime: RuntimeContext, command: Command) anyerror!void = null,
};

pub const ModuleInfo = struct {
    id: ModuleId,
    name: []const u8,
    dependencies: []const ModuleId = &.{},
    capabilities: []const Capability = &.{},
};

pub const Module = struct {
    info: ModuleInfo,
    context: *anyopaque,
    hooks: ModuleHooks = .{},
};

pub const ModuleRegistry = struct {
    modules: []const Module = &.{},

    pub fn validate(self: ModuleRegistry) Error!void {
        for (self.modules, 0..) |module, index| {
            for (self.modules[0..index]) |previous| {
                if (previous.info.id == module.info.id) return error.DuplicateModule;
            }
            for (module.info.dependencies) |dependency| {
                if (self.findIndexById(dependency) == null) return error.MissingDependency;
            }
        }
    }

    pub fn startAll(self: ModuleRegistry, runtime: RuntimeContext) Error!void {
        try self.validate();
        for (self.modules) |module| {
            if (module.hooks.start_fn) |start_fn| start_fn(module.context, runtime) catch return error.ModuleFailed;
        }
    }

    pub fn stopAll(self: ModuleRegistry, runtime: RuntimeContext) Error!void {
        var index = self.modules.len;
        while (index > 0) {
            index -= 1;
            const module = self.modules[index];
            if (module.hooks.stop_fn) |stop_fn| stop_fn(module.context, runtime) catch return error.ModuleFailed;
        }
    }

    pub fn dispatchCommand(self: ModuleRegistry, runtime: RuntimeContext, command: Command) Error!void {
        if (command.target) |target| {
            const module = self.findById(target) orelse return error.MissingDependency;
            if (module.hooks.command_fn) |command_fn| command_fn(module.context, runtime, command) catch return error.ModuleFailed;
            return;
        }
        for (self.modules) |module| {
            if (module.hooks.command_fn) |command_fn| command_fn(module.context, runtime, command) catch return error.ModuleFailed;
        }
    }

    pub fn hasCapability(self: ModuleRegistry, kind: CapabilityKind) bool {
        for (self.modules) |module| {
            for (module.info.capabilities) |capability| {
                if (capability.kind == kind) return true;
            }
        }
        return false;
    }

    pub fn findById(self: ModuleRegistry, id: ModuleId) ?Module {
        const index = self.findIndexById(id) orelse return null;
        return self.modules[index];
    }

    fn findIndexById(self: ModuleRegistry, id: ModuleId) ?usize {
        for (self.modules, 0..) |module, index| {
            if (module.info.id == id) return index;
        }
        return null;
    }
};

test "registry validates module ids and dispatches hooks" {
    const State = struct {
        started: bool = false,
        stopped: bool = false,
        commands: u32 = 0,

        fn start(context: *anyopaque, runtime: RuntimeContext) anyerror!void {
            _ = runtime;
            const self: *@This() = @ptrCast(@alignCast(context));
            self.started = true;
        }

        fn stop(context: *anyopaque, runtime: RuntimeContext) anyerror!void {
            _ = runtime;
            const self: *@This() = @ptrCast(@alignCast(context));
            self.stopped = true;
        }

        fn command(context: *anyopaque, runtime: RuntimeContext, value: Command) anyerror!void {
            _ = runtime;
            const self: *@This() = @ptrCast(@alignCast(context));
            if (std.mem.eql(u8, value.name, "ping")) self.commands += 1;
        }
    };

    var state: State = .{};
    const caps = [_]Capability{.{ .kind = .native_module }};
    const modules = [_]Module{.{
        .info = .{ .id = 1, .name = "test", .capabilities = &caps },
        .context = &state,
        .hooks = .{ .start_fn = State.start, .stop_fn = State.stop, .command_fn = State.command },
    }};
    const registry = ModuleRegistry{ .modules = &modules };
    const runtime = RuntimeContext{ .platform_name = "null" };

    try registry.startAll(runtime);
    try registry.dispatchCommand(runtime, .{ .name = "ping" });
    try registry.stopAll(runtime);

    try std.testing.expect(state.started);
    try std.testing.expect(state.stopped);
    try std.testing.expectEqual(@as(u32, 1), state.commands);
    try std.testing.expect(registry.hasCapability(.native_module));
}

test "registry rejects duplicate module ids" {
    const state: u8 = 0;
    const modules = [_]Module{
        .{ .info = .{ .id = 1, .name = "a" }, .context = @constCast(&state) },
        .{ .info = .{ .id = 1, .name = "b" }, .context = @constCast(&state) },
    };
    try std.testing.expectError(error.DuplicateModule, (ModuleRegistry{ .modules = &modules }).validate());
}

test "registry validates dependencies and routes targeted commands" {
    const State = struct {
        calls: u32 = 0,

        fn command(context: *anyopaque, runtime: RuntimeContext, value: Command) anyerror!void {
            _ = runtime;
            const self: *@This() = @ptrCast(@alignCast(context));
            if (std.mem.eql(u8, value.name, "targeted")) self.calls += 1;
        }
    };

    var first: State = .{};
    var second: State = .{};
    const modules = [_]Module{
        .{ .info = .{ .id = 1, .name = "core" }, .context = &first, .hooks = .{ .command_fn = State.command } },
        .{ .info = .{ .id = 2, .name = "dependent", .dependencies = &.{1} }, .context = &second, .hooks = .{ .command_fn = State.command } },
    };
    const registry = ModuleRegistry{ .modules = &modules };
    try registry.validate();
    try registry.dispatchCommand(.{ .platform_name = "null" }, .{ .name = "targeted", .target = 2 });
    try std.testing.expectEqual(@as(u32, 0), first.calls);
    try std.testing.expectEqual(@as(u32, 1), second.calls);

    const missing = [_]Module{.{ .info = .{ .id = 1, .name = "bad", .dependencies = &.{42} }, .context = &first }};
    try std.testing.expectError(error.MissingDependency, (ModuleRegistry{ .modules = &missing }).validate());
}

