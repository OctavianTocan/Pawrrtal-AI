const std = @import("std");

pub const default_dir = ".zig-cache/zero-native-automation";
pub const max_command_bytes: usize = 16 * 1024 + 64;

pub const Error = error{
    InvalidCommand,
    CommandTooLarge,
};

pub const Action = enum {
    reload,
    wait,
    bridge,
};

pub const Command = struct {
    action: Action,
    value: []const u8 = "",

    pub fn parse(line: []const u8) Error!Command {
        const trimmed = std.mem.trim(u8, line, " \n\r\t");
        if (trimmed.len == 0) return error.InvalidCommand;
        const separator = std.mem.indexOfScalar(u8, trimmed, ' ');
        const action_text = if (separator) |index| trimmed[0..index] else trimmed;
        const value = if (separator) |index| std.mem.trim(u8, trimmed[index + 1 ..], " \n\r\t") else "";
        if (std.mem.eql(u8, action_text, "reload")) return .{ .action = .reload };
        if (std.mem.eql(u8, action_text, "wait")) return .{ .action = .wait, .value = value };
        if (std.mem.eql(u8, action_text, "bridge") and value.len > 0) return .{ .action = .bridge, .value = value };
        return error.InvalidCommand;
    }
};

pub fn commandLine(action: []const u8, value: []const u8, output: []u8) ![]const u8 {
    if (action.len + value.len + 2 > max_command_bytes) return error.CommandTooLarge;
    var writer = std.Io.Writer.fixed(output);
    try writer.writeAll(action);
    if (value.len > 0) try writer.print(" {s}", .{value});
    try writer.writeAll("\n");
    return writer.buffered();
}

test "commands parse reload and wait" {
    const reload = try Command.parse("reload");
    try std.testing.expectEqual(Action.reload, reload.action);
    const wait = try Command.parse("wait frame");
    try std.testing.expectEqual(Action.wait, wait.action);
    try std.testing.expectEqualStrings("frame", wait.value);
    const bridge = try Command.parse("bridge {\"id\":\"1\",\"command\":\"native.ping\",\"payload\":{\"source\":\"smoke test\"}}");
    try std.testing.expectEqual(Action.bridge, bridge.action);
    try std.testing.expectEqualStrings("{\"id\":\"1\",\"command\":\"native.ping\",\"payload\":{\"source\":\"smoke test\"}}", bridge.value);
}
