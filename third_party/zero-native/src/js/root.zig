const std = @import("std");

pub const Error = error{
    EngineUnavailable,
    InvalidCall,
};

pub const ValueKind = enum {
    null,
    boolean,
    number,
    string,
};

pub const Value = union(ValueKind) {
    null: void,
    boolean: bool,
    number: f64,
    string: []const u8,
};

pub const Call = struct {
    module: []const u8,
    function: []const u8,
    args: []const Value = &.{},
};

pub const RuntimeHooks = struct {
    context: ?*anyopaque = null,
    call_fn: ?*const fn (context: ?*anyopaque, call: Call) anyerror!Value = null,

    pub fn call(self: RuntimeHooks, value: Call) anyerror!Value {
        const call_fn = self.call_fn orelse return error.EngineUnavailable;
        return call_fn(self.context, value);
    }
};

pub const Bridge = struct {
    hooks: RuntimeHooks = .{},

    pub fn call(self: Bridge, value: Call) anyerror!Value {
        if (value.module.len == 0 or value.function.len == 0) return error.InvalidCall;
        return self.hooks.call(value);
    }
};

pub const NullEngine = struct {
    pub fn bridge(self: *NullEngine) Bridge {
        _ = self;
        return .{};
    }
};

test "null bridge reports unavailable engine" {
    var engine: NullEngine = .{};
    const bridge = engine.bridge();
    try std.testing.expectError(error.EngineUnavailable, bridge.call(.{ .module = "app", .function = "main" }));
}

test "bridge validates call names before invoking engine" {
    var engine: NullEngine = .{};
    const bridge = engine.bridge();
    try std.testing.expectError(error.InvalidCall, bridge.call(.{ .module = "", .function = "main" }));
}

