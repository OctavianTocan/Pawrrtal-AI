const std = @import("std");

pub const StringStorage = struct {
    buffer: []u8,
    index: usize = 0,

    pub fn init(buffer: []u8) StringStorage {
        return .{ .buffer = buffer };
    }

    fn append(self: *StringStorage, bytes: []const u8) !void {
        if (self.index + bytes.len > self.buffer.len) return error.NoSpaceLeft;
        @memcpy(self.buffer[self.index..][0..bytes.len], bytes);
        self.index += bytes.len;
    }

    fn appendByte(self: *StringStorage, byte: u8) !void {
        if (self.index >= self.buffer.len) return error.NoSpaceLeft;
        self.buffer[self.index] = byte;
        self.index += 1;
    }
};

pub fn fieldValue(payload: []const u8, field: []const u8) ?[]const u8 {
    var index: usize = 0;
    skipWhitespace(payload, &index);
    if (index >= payload.len or payload[index] != '{') return null;
    index += 1;
    while (index < payload.len) {
        skipWhitespace(payload, &index);
        if (index < payload.len and payload[index] == '}') return null;
        const key = parseStringSpan(payload, &index) orelse return null;
        skipWhitespace(payload, &index);
        if (index >= payload.len or payload[index] != ':') return null;
        index += 1;
        skipWhitespace(payload, &index);
        const value_start = index;
        skipValueSpan(payload, &index) orelse return null;
        const value = payload[value_start..index];
        if (std.mem.eql(u8, key, field)) return value;
        skipWhitespace(payload, &index);
        if (index < payload.len and payload[index] == ',') {
            index += 1;
            continue;
        }
        if (index < payload.len and payload[index] == '}') return null;
        return null;
    }
    return null;
}

pub fn stringField(payload: []const u8, field: []const u8, storage: *StringStorage) ?[]const u8 {
    const value = fieldValue(payload, field) orelse return null;
    return parseStringValue(value, storage) catch null;
}

pub fn boolField(payload: []const u8, field: []const u8) ?bool {
    const value = fieldValue(payload, field) orelse return null;
    if (std.mem.eql(u8, value, "true")) return true;
    if (std.mem.eql(u8, value, "false")) return false;
    return null;
}

pub fn numberField(payload: []const u8, field: []const u8) ?f32 {
    const bytes = numberBytes(payload, field) orelse return null;
    return std.fmt.parseFloat(f32, bytes) catch null;
}

pub fn unsignedField(comptime T: type, payload: []const u8, field: []const u8) ?T {
    const bytes = numberBytes(payload, field) orelse return null;
    return std.fmt.parseUnsigned(T, bytes, 10) catch null;
}

fn numberBytes(payload: []const u8, field: []const u8) ?[]const u8 {
    const value = fieldValue(payload, field) orelse return null;
    if (value.len == 0) return null;
    var index: usize = 0;
    while (index < value.len and (std.ascii.isDigit(value[index]) or value[index] == '.' or value[index] == '-')) : (index += 1) {}
    if (index == 0 or index != value.len) return null;
    return value;
}

pub fn parseStringValue(value: []const u8, storage: *StringStorage) ![]const u8 {
    if (value.len < 2 or value[0] != '"' or value[value.len - 1] != '"') return error.InvalidJson;
    var index: usize = 1;
    const direct_start = index;
    var copied = false;
    const output_start = storage.index;
    while (index + 1 < value.len) {
        const ch = value[index];
        if (ch == '\\') {
            if (!copied) {
                try storage.append(value[direct_start..index]);
                copied = true;
            }
            index += 1;
            if (index + 1 >= value.len) return error.InvalidJson;
            switch (value[index]) {
                '"' => try storage.appendByte('"'),
                '\\' => try storage.appendByte('\\'),
                '/' => try storage.appendByte('/'),
                'b' => try storage.appendByte(0x08),
                'f' => try storage.appendByte(0x0c),
                'n' => try storage.appendByte('\n'),
                'r' => try storage.appendByte('\r'),
                't' => try storage.appendByte('\t'),
                'u' => {
                    if (index + 4 >= value.len) return error.InvalidJson;
                    const codepoint = try parseHex4(value[index + 1 .. index + 5]);
                    if (codepoint > 0x7f) return error.NonAsciiEscape;
                    try storage.appendByte(@intCast(codepoint));
                    index += 4;
                },
                else => return error.InvalidJson,
            }
            index += 1;
            continue;
        }
        if (ch <= 0x1f) return error.InvalidJson;
        if (copied) try storage.appendByte(ch);
        index += 1;
    }
    if (!copied) return value[direct_start .. value.len - 1];
    return storage.buffer[output_start..storage.index];
}

pub fn writeString(writer: anytype, value: []const u8) !void {
    try writer.writeByte('"');
    for (value) |ch| {
        switch (ch) {
            '"' => try writer.writeAll("\\\""),
            '\\' => try writer.writeAll("\\\\"),
            '\n' => try writer.writeAll("\\n"),
            '\r' => try writer.writeAll("\\r"),
            '\t' => try writer.writeAll("\\t"),
            0...8, 11...12, 14...0x1f => try writer.print("\\u{x:0>4}", .{ch}),
            else => try writer.writeByte(ch),
        }
    }
    try writer.writeByte('"');
}

pub fn isValidValue(raw: []const u8) bool {
    var index: usize = 0;
    skipWhitespace(raw, &index);
    skipValueSpan(raw, &index) orelse return false;
    skipWhitespace(raw, &index);
    return index == raw.len;
}

fn skipWhitespace(bytes: []const u8, index: *usize) void {
    while (index.* < bytes.len and std.ascii.isWhitespace(bytes[index.*])) : (index.* += 1) {}
}

fn parseStringSpan(bytes: []const u8, index: *usize) ?[]const u8 {
    if (index.* >= bytes.len or bytes[index.*] != '"') return null;
    index.* += 1;
    const start = index.*;
    while (index.* < bytes.len) : (index.* += 1) {
        const ch = bytes[index.*];
        if (ch == '"') {
            const value = bytes[start..index.*];
            index.* += 1;
            return value;
        }
        if (ch == '\\') {
            index.* += 1;
            if (index.* >= bytes.len) return null;
        } else if (ch <= 0x1f) {
            return null;
        }
    }
    return null;
}

fn skipValueSpan(bytes: []const u8, index: *usize) ?void {
    if (index.* >= bytes.len) return null;
    return switch (bytes[index.*]) {
        '"' => if (parseStringSpan(bytes, index) != null) {} else null,
        '{' => skipContainerSpan(bytes, index, '{', '}'),
        '[' => skipContainerSpan(bytes, index, '[', ']'),
        else => skipAtomSpan(bytes, index),
    };
}

fn skipContainerSpan(bytes: []const u8, index: *usize, open: u8, close: u8) ?void {
    if (index.* >= bytes.len or bytes[index.*] != open) return null;
    index.* += 1;
    skipWhitespace(bytes, index);
    if (index.* < bytes.len and bytes[index.*] == close) {
        index.* += 1;
        return;
    }
    while (index.* < bytes.len) {
        skipWhitespace(bytes, index);
        if (open == '{') {
            _ = parseStringSpan(bytes, index) orelse return null;
            skipWhitespace(bytes, index);
            if (index.* >= bytes.len or bytes[index.*] != ':') return null;
            index.* += 1;
            skipWhitespace(bytes, index);
        }
        skipValueSpan(bytes, index) orelse return null;
        skipWhitespace(bytes, index);
        if (index.* < bytes.len and bytes[index.*] == ',') {
            index.* += 1;
            continue;
        }
        if (index.* < bytes.len and bytes[index.*] == close) {
            index.* += 1;
            return;
        }
        return null;
    }
    return null;
}

fn skipAtomSpan(bytes: []const u8, index: *usize) ?void {
    const start = index.*;
    while (index.* < bytes.len) : (index.* += 1) {
        switch (bytes[index.*]) {
            ',', '}', ']', ' ', '\n', '\r', '\t' => break,
            else => {},
        }
    }
    if (index.* == start) return null;
    const atom = bytes[start..index.*];
    if (std.mem.eql(u8, atom, "true") or std.mem.eql(u8, atom, "false") or std.mem.eql(u8, atom, "null")) return;
    _ = std.fmt.parseFloat(f64, atom) catch return null;
}

fn parseHex4(bytes: []const u8) !u21 {
    if (bytes.len != 4) return error.InvalidJson;
    var result: u21 = 0;
    for (bytes) |ch| {
        result <<= 4;
        result |= hexValue(ch) orelse return error.InvalidJson;
    }
    return result;
}

fn hexValue(ch: u8) ?u21 {
    return switch (ch) {
        '0'...'9' => ch - '0',
        'a'...'f' => ch - 'a' + 10,
        'A'...'F' => ch - 'A' + 10,
        else => null,
    };
}

test "string field unescapes top-level JSON strings" {
    var buffer: [128]u8 = undefined;
    var storage = StringStorage.init(&buffer);
    const value = stringField(
        \\{"title":"Hello \"user\"\\n","nested":{"title":"wrong"}}
    , "title", &storage).?;
    try std.testing.expectEqualStrings("Hello \"user\"\\n", value);
}

test "validates JSON values" {
    try std.testing.expect(isValidValue("{\"ok\":true}"));
    try std.testing.expect(!isValidValue("{\"ok\":true"));
}
