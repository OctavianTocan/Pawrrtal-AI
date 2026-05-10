const std = @import("std");

pub const WriteError = error{OutOfSpace};

pub const Level = enum {
    trace,
    debug,
    info,
    warn,
    err,
    fatal,

    pub fn name(self: Level) []const u8 {
        return switch (self) {
            .trace => "trace",
            .debug => "debug",
            .info => "info",
            .warn => "warn",
            .err => "err",
            .fatal => "fatal",
        };
    }
};

pub const Kind = enum {
    event,
    span_begin,
    span_end,
    counter,
    gauge,
    frame,

    pub fn name(self: Kind) []const u8 {
        return switch (self) {
            .event => "event",
            .span_begin => "span_begin",
            .span_end => "span_end",
            .counter => "counter",
            .gauge => "gauge",
            .frame => "frame",
        };
    }
};

pub const Format = enum {
    text,
    json_lines,
};

pub const SpanId = u64;

pub const Timestamp = struct {
    ns: i128 = 0,

    pub fn fromNanoseconds(ns: i128) Timestamp {
        return .{ .ns = ns };
    }
};

pub const Duration = struct {
    ns: u64 = 0,

    pub fn fromNanoseconds(ns: u64) Duration {
        return .{ .ns = ns };
    }

    pub fn fromMicroseconds(us: u64) Duration {
        return .{ .ns = us * 1_000 };
    }

    pub fn fromMilliseconds(ms: u64) Duration {
        return .{ .ns = ms * 1_000_000 };
    }

    pub fn fromSeconds(seconds: u64) Duration {
        return .{ .ns = seconds * 1_000_000_000 };
    }
};

pub const FieldValue = union(enum) {
    string: []const u8,
    boolean: bool,
    int: i64,
    uint: u64,
    float: f64,
};

pub const Field = struct {
    key: []const u8,
    value: FieldValue,
};

pub const Record = struct {
    timestamp: Timestamp,
    level: Level = .info,
    kind: Kind = .event,
    name: []const u8,
    message: ?[]const u8 = null,
    fields: []const Field = &.{},
    span_id: ?SpanId = null,
    parent_span_id: ?SpanId = null,
    duration: ?Duration = null,
    value_name: ?[]const u8 = null,
    value: ?FieldValue = null,
};

pub const Span = struct {
    id: SpanId,
    parent_id: ?SpanId = null,
    name: []const u8,
    start: Timestamp,
    fields: []const Field = &.{},
};

pub const Counter = struct {
    name: []const u8,
    value: i64,
    fields: []const Field = &.{},
};

pub const Frame = struct {
    name: []const u8,
    index: u64,
    duration: Duration,
    fields: []const Field = &.{},
};

pub const Sink = struct {
    context: *anyopaque,
    write_fn: *const fn (context: *anyopaque, record: Record) WriteError!void,

    pub fn write(self: Sink, record: Record) WriteError!void {
        return self.write_fn(self.context, record);
    }
};

pub const BufferSink = struct {
    records: []Record,
    len: usize = 0,

    pub fn init(records: []Record) BufferSink {
        return .{ .records = records };
    }

    pub fn sink(self: *BufferSink) Sink {
        return .{ .context = self, .write_fn = write };
    }

    pub fn written(self: *const BufferSink) []const Record {
        return self.records[0..self.len];
    }

    fn write(context: *anyopaque, record: Record) WriteError!void {
        const self: *BufferSink = @ptrCast(@alignCast(context));
        if (self.len >= self.records.len) return error.OutOfSpace;
        self.records[self.len] = record;
        self.len += 1;
    }
};

pub fn string(key: []const u8, value: []const u8) Field {
    return .{ .key = key, .value = .{ .string = value } };
}

pub fn boolean(key: []const u8, value: bool) Field {
    return .{ .key = key, .value = .{ .boolean = value } };
}

pub fn int(key: []const u8, value: i64) Field {
    return .{ .key = key, .value = .{ .int = value } };
}

pub fn uint(key: []const u8, value: u64) Field {
    return .{ .key = key, .value = .{ .uint = value } };
}

pub fn float(key: []const u8, value: f64) Field {
    return .{ .key = key, .value = .{ .float = value } };
}

pub fn event(timestamp: Timestamp, level: Level, name: []const u8, message: ?[]const u8, fields: []const Field) Record {
    return .{ .timestamp = timestamp, .level = level, .kind = .event, .name = name, .message = message, .fields = fields };
}

pub fn spanBegin(timestamp: Timestamp, level: Level, span: Span, message: ?[]const u8) Record {
    return .{
        .timestamp = timestamp,
        .level = level,
        .kind = .span_begin,
        .name = span.name,
        .message = message,
        .fields = span.fields,
        .span_id = span.id,
        .parent_span_id = span.parent_id,
    };
}

pub fn spanEnd(timestamp: Timestamp, level: Level, span: Span, message: ?[]const u8) Record {
    return .{
        .timestamp = timestamp,
        .level = level,
        .kind = .span_end,
        .name = span.name,
        .message = message,
        .fields = span.fields,
        .span_id = span.id,
        .parent_span_id = span.parent_id,
        .duration = durationBetween(span.start, timestamp),
    };
}

pub fn counter(timestamp: Timestamp, name: []const u8, value: i64, fields: []const Field) Record {
    return .{
        .timestamp = timestamp,
        .level = .info,
        .kind = .counter,
        .name = name,
        .fields = fields,
        .value_name = "value",
        .value = .{ .int = value },
    };
}

pub fn gauge(timestamp: Timestamp, name: []const u8, value: f64, fields: []const Field) Record {
    return .{
        .timestamp = timestamp,
        .level = .info,
        .kind = .gauge,
        .name = name,
        .fields = fields,
        .value_name = "value",
        .value = .{ .float = value },
    };
}

pub fn frame(timestamp: Timestamp, value: Frame) Record {
    return .{
        .timestamp = timestamp,
        .level = .info,
        .kind = .frame,
        .name = value.name,
        .fields = value.fields,
        .duration = value.duration,
        .value_name = "index",
        .value = .{ .uint = value.index },
    };
}

pub fn durationBetween(start: Timestamp, end_timestamp: Timestamp) Duration {
    if (end_timestamp.ns <= start.ns) return .{};
    return .{ .ns = @intCast(end_timestamp.ns - start.ns) };
}

pub fn writeRecord(sink: Sink, record: Record) WriteError!void {
    return sink.write(record);
}

pub fn formatText(record: Record, writer: anytype) !void {
    try writer.print("ts={d} level={s} kind={s} name=\"{s}\"", .{ record.timestamp.ns, record.level.name(), record.kind.name(), record.name });
    if (record.message) |message| {
        try writer.print(" message=\"{s}\"", .{message});
    }
    if (record.span_id) |span_id| {
        try writer.print(" span_id={d}", .{span_id});
    }
    if (record.parent_span_id) |parent_span_id| {
        try writer.print(" parent_span_id={d}", .{parent_span_id});
    }
    if (record.duration) |duration| {
        try writer.print(" duration_ns={d}", .{duration.ns});
    }
    if (record.value_name) |value_name| {
        if (record.value) |value| {
            try writer.print(" {s}=", .{value_name});
            try formatFieldValueText(value, writer);
        }
    }
    for (record.fields) |field| {
        try writer.print(" {s}=", .{field.key});
        try formatFieldValueText(field.value, writer);
    }
}

pub fn formatJsonLine(record: Record, writer: anytype) !void {
    try writer.print("{{\"timestamp_ns\":{d},\"level\":\"{s}\",\"kind\":\"{s}\",\"name\":", .{ record.timestamp.ns, record.level.name(), record.kind.name() });
    try writeJsonString(writer, record.name);
    if (record.message) |message| {
        try writer.writeAll(",\"message\":");
        try writeJsonString(writer, message);
    }
    if (record.span_id) |span_id| {
        try writer.print(",\"span_id\":{d}", .{span_id});
    }
    if (record.parent_span_id) |parent_span_id| {
        try writer.print(",\"parent_span_id\":{d}", .{parent_span_id});
    }
    if (record.duration) |duration| {
        try writer.print(",\"duration_ns\":{d}", .{duration.ns});
    }
    try writer.writeAll(",\"fields\":{");
    var field_count: usize = 0;
    if (record.value_name) |value_name| {
        if (record.value) |value| {
            try writeJsonString(writer, value_name);
            try writer.writeAll(":");
            try formatFieldValueJson(value, writer);
            field_count += 1;
        }
    }
    for (record.fields) |field| {
        if (field_count != 0) try writer.writeAll(",");
        try writeJsonString(writer, field.key);
        try writer.writeAll(":");
        try formatFieldValueJson(field.value, writer);
        field_count += 1;
    }
    try writer.writeAll("}}\n");
}

fn formatFieldValueText(value: FieldValue, writer: anytype) !void {
    switch (value) {
        .string => |v| try writer.print("\"{s}\"", .{v}),
        .boolean => |v| try writer.writeAll(if (v) "true" else "false"),
        .int => |v| try writer.print("{d}", .{v}),
        .uint => |v| try writer.print("{d}", .{v}),
        .float => |v| try writer.print("{d}", .{v}),
    }
}

fn formatFieldValueJson(value: FieldValue, writer: anytype) !void {
    switch (value) {
        .string => |v| try writeJsonString(writer, v),
        .boolean => |v| try writer.writeAll(if (v) "true" else "false"),
        .int => |v| try writer.print("{d}", .{v}),
        .uint => |v| try writer.print("{d}", .{v}),
        .float => |v| try writer.print("{d}", .{v}),
    }
}

fn writeJsonString(writer: anytype, value: []const u8) !void {
    try writer.writeAll("\"");
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
    try writer.writeAll("\"");
}

test "level and kind names" {
    try std.testing.expectEqualStrings("trace", Level.trace.name());
    try std.testing.expectEqualStrings("err", Level.err.name());
    try std.testing.expectEqualStrings("span_begin", Kind.span_begin.name());
    try std.testing.expectEqualStrings("frame", Kind.frame.name());
}

test "duration constructors and between helper" {
    try std.testing.expectEqual(@as(u64, 1), Duration.fromNanoseconds(1).ns);
    try std.testing.expectEqual(@as(u64, 1_000), Duration.fromMicroseconds(1).ns);
    try std.testing.expectEqual(@as(u64, 1_000_000), Duration.fromMilliseconds(1).ns);
    try std.testing.expectEqual(@as(u64, 1_000_000_000), Duration.fromSeconds(1).ns);
    try std.testing.expectEqual(@as(u64, 15), durationBetween(.{ .ns = 10 }, .{ .ns = 25 }).ns);
    try std.testing.expectEqual(@as(u64, 0), durationBetween(.{ .ns = 25 }, .{ .ns = 10 }).ns);
}

test "field constructors cover every value type" {
    const fields = [_]Field{
        string("phase", "layout"),
        boolean("dirty", true),
        int("delta", -3),
        uint("count", 42),
        float("ratio", 0.5),
    };

    try std.testing.expectEqualStrings("phase", fields[0].key);
    try std.testing.expectEqualStrings("layout", fields[0].value.string);
    try std.testing.expect(fields[1].value.boolean);
    try std.testing.expectEqual(@as(i64, -3), fields[2].value.int);
    try std.testing.expectEqual(@as(u64, 42), fields[3].value.uint);
    try std.testing.expectApproxEqAbs(@as(f64, 0.5), fields[4].value.float, 0.000001);
}

test "record constructors build expected records" {
    const fields = [_]Field{string("route", "/")};
    const record = event(.{ .ns = 100 }, .info, "request", "ok", &fields);
    try std.testing.expectEqual(Kind.event, record.kind);
    try std.testing.expectEqualStrings("request", record.name);
    try std.testing.expectEqualStrings("ok", record.message.?);

    const span: Span = .{ .id = 7, .parent_id = 3, .name = "render", .start = .{ .ns = 10 }, .fields = &fields };
    const begin = spanBegin(.{ .ns = 10 }, .debug, span, null);
    const end = spanEnd(.{ .ns = 25 }, .debug, span, "done");
    try std.testing.expectEqual(Kind.span_begin, begin.kind);
    try std.testing.expectEqual(@as(SpanId, 7), begin.span_id.?);
    try std.testing.expectEqual(Kind.span_end, end.kind);
    try std.testing.expectEqual(@as(u64, 15), end.duration.?.ns);
}

test "buffer sink stores records in order and reports out of space" {
    var records: [2]Record = undefined;
    var buffer_sink = BufferSink.init(&records);
    const sink = buffer_sink.sink();

    try writeRecord(sink, event(.{ .ns = 1 }, .info, "one", null, &.{}));
    try writeRecord(sink, event(.{ .ns = 2 }, .warn, "two", null, &.{}));
    try std.testing.expectError(error.OutOfSpace, writeRecord(sink, event(.{ .ns = 3 }, .err, "three", null, &.{})));

    try std.testing.expectEqual(@as(usize, 2), buffer_sink.written().len);
    try std.testing.expectEqualStrings("one", buffer_sink.written()[0].name);
    try std.testing.expectEqualStrings("two", buffer_sink.written()[1].name);
}

test "sink interface dispatch writes through context" {
    const Context = struct {
        count: usize = 0,

        fn write(context: *anyopaque, record: Record) WriteError!void {
            _ = record;
            const self: *@This() = @ptrCast(@alignCast(context));
            self.count += 1;
        }
    };

    var context: Context = .{};
    const sink: Sink = .{ .context = &context, .write_fn = Context.write };
    try sink.write(event(.{ .ns = 1 }, .info, "tick", null, &.{}));
    try std.testing.expectEqual(@as(usize, 1), context.count);
}

test "text formatting includes metadata and fields in order" {
    const fields = [_]Field{ string("phase", "draw"), uint("items", 3) };
    const record: Record = .{
        .timestamp = .{ .ns = 123 },
        .level = .debug,
        .kind = .span_end,
        .name = "render",
        .message = "done",
        .fields = &fields,
        .span_id = 9,
        .parent_span_id = 1,
        .duration = .{ .ns = 456 },
    };
    var buf: [256]u8 = undefined;
    var writer = std.Io.Writer.fixed(&buf);
    try formatText(record, &writer);

    try std.testing.expectEqualStrings(
        "ts=123 level=debug kind=span_end name=\"render\" message=\"done\" span_id=9 parent_span_id=1 duration_ns=456 phase=\"draw\" items=3",
        writer.buffered(),
    );
}

test "json line formatting is deterministic and escapes strings" {
    const fields = [_]Field{
        string("quote", "a\"b"),
        string("path", "a\\b"),
        string("line", "a\nb"),
        boolean("ok", true),
    };
    const record = event(.{ .ns = 5 }, .info, "cli\nrun", "hi \"there\"", &fields);
    var buf: [512]u8 = undefined;
    var writer = std.Io.Writer.fixed(&buf);
    try formatJsonLine(record, &writer);

    try std.testing.expectEqualStrings(
        "{\"timestamp_ns\":5,\"level\":\"info\",\"kind\":\"event\",\"name\":\"cli\\nrun\",\"message\":\"hi \\\"there\\\"\",\"fields\":{\"quote\":\"a\\\"b\",\"path\":\"a\\\\b\",\"line\":\"a\\nb\",\"ok\":true}}\n",
        writer.buffered(),
    );
}

test "counter gauge and frame constructors include values" {
    var buf: [256]u8 = undefined;

    var writer = std.Io.Writer.fixed(&buf);
    try formatJsonLine(counter(.{ .ns = 1 }, "requests", 12, &.{}), &writer);
    try std.testing.expectEqualStrings("{\"timestamp_ns\":1,\"level\":\"info\",\"kind\":\"counter\",\"name\":\"requests\",\"fields\":{\"value\":12}}\n", writer.buffered());

    writer = std.Io.Writer.fixed(&buf);
    try formatJsonLine(gauge(.{ .ns = 2 }, "load", 0.75, &.{}), &writer);
    try std.testing.expectEqualStrings("{\"timestamp_ns\":2,\"level\":\"info\",\"kind\":\"gauge\",\"name\":\"load\",\"fields\":{\"value\":0.75}}\n", writer.buffered());

    writer = std.Io.Writer.fixed(&buf);
    try formatJsonLine(frame(.{ .ns = 3 }, .{ .name = "main", .index = 4, .duration = .{ .ns = 16_000_000 } }), &writer);
    try std.testing.expectEqualStrings("{\"timestamp_ns\":3,\"level\":\"info\",\"kind\":\"frame\",\"name\":\"main\",\"duration_ns\":16000000,\"fields\":{\"index\":4}}\n", writer.buffered());
}

test {
    std.testing.refAllDecls(@This());
}
