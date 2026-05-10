const std = @import("std");

pub const Error = error{
    MissingSource,
    InvalidSpan,
    InvalidSourceText,
    NoSpaceLeft,
};

pub const Severity = enum {
    hint,
    info,
    warning,
    @"error",
    fatal,

    pub fn name(self: Severity) []const u8 {
        return switch (self) {
            .hint => "hint",
            .info => "info",
            .warning => "warning",
            .@"error" => "error",
            .fatal => "fatal",
        };
    }
};

pub const SourceId = u32;

pub const Source = struct {
    id: SourceId,
    name: []const u8,
    text: []const u8,
};

pub const Position = struct {
    byte_offset: usize,
    line: usize,
    column: usize,
};

pub const Span = struct {
    source_id: SourceId,
    start: usize,
    end: usize,
};

pub const Line = struct {
    start: usize,
    end: usize,
    number: usize,
};

pub const LabelStyle = enum {
    primary,
    secondary,
};

pub const Label = struct {
    style: LabelStyle,
    span: Span,
    message: []const u8,
};

pub const Note = struct {
    message: []const u8,
};

pub const Suggestion = struct {
    message: []const u8,
    replacement: []const u8,
    span: ?Span = null,
};

pub const DiagnosticCode = struct {
    namespace: []const u8,
    value: []const u8,

    pub fn isEmpty(self: DiagnosticCode) bool {
        return self.namespace.len == 0 and self.value.len == 0;
    }
};

pub const Diagnostic = struct {
    severity: Severity,
    code: DiagnosticCode = .{ .namespace = "", .value = "" },
    message: []const u8,
    labels: []const Label = &.{},
    notes: []const Note = &.{},
    suggestions: []const Suggestion = &.{},
};

pub const SourceMap = struct {
    sources: []const Source,

    pub fn find(self: SourceMap, id: SourceId) ?Source {
        for (self.sources) |source| {
            if (source.id == id) return source;
        }
        return null;
    }
};

pub const Format = enum {
    short,
    text,
    json_lines,
};

pub fn code(namespace: []const u8, value: []const u8) DiagnosticCode {
    return .{ .namespace = namespace, .value = value };
}

pub fn primary(span: Span, message: []const u8) Label {
    return .{ .style = .primary, .span = span, .message = message };
}

pub fn secondary(span: Span, message: []const u8) Label {
    return .{ .style = .secondary, .span = span, .message = message };
}

pub fn note(message: []const u8) Note {
    return .{ .message = message };
}

pub fn suggestion(message: []const u8, replacement: []const u8, span_value: ?Span) Suggestion {
    return .{ .message = message, .replacement = replacement, .span = span_value };
}

pub fn positionAt(source: Source, byte_offset: usize) Error!Position {
    if (byte_offset > source.text.len) return error.InvalidSpan;
    try validateSourceText(source.text);

    var line: usize = 1;
    var column: usize = 1;
    var index: usize = 0;
    while (index < byte_offset) : (index += 1) {
        if (source.text[index] == '\n') {
            line += 1;
            column = 1;
        } else {
            column += 1;
        }
    }

    return .{ .byte_offset = byte_offset, .line = line, .column = column };
}

pub fn lineAt(source: Source, byte_offset: usize) Error!Line {
    if (byte_offset > source.text.len) return error.InvalidSpan;
    try validateSourceText(source.text);

    var start = byte_offset;
    while (start > 0 and source.text[start - 1] != '\n') {
        start -= 1;
    }

    var end = byte_offset;
    while (end < source.text.len and source.text[end] != '\n') {
        end += 1;
    }

    const position = try positionAt(source, start);
    return .{ .start = start, .end = end, .number = position.line };
}

pub fn validateSpan(source_map: SourceMap, span: Span) Error!void {
    const source = source_map.find(span.source_id) orelse return error.MissingSource;
    try validateSourceText(source.text);
    if (span.start > span.end or span.end > source.text.len) return error.InvalidSpan;
}

pub fn validateDiagnostic(source_map: SourceMap, diagnostic: Diagnostic) Error!void {
    for (diagnostic.labels) |label| {
        try validateSpan(source_map, label.span);
    }
    for (diagnostic.suggestions) |item| {
        if (item.span) |span| try validateSpan(source_map, span);
    }
}

pub fn formatShort(diagnostic: Diagnostic, writer: anytype) !void {
    try writer.print("{s}", .{diagnostic.severity.name()});
    if (!diagnostic.code.isEmpty()) {
        try writer.print("[{s}.{s}]", .{ diagnostic.code.namespace, diagnostic.code.value });
    }
    try writer.print(": {s}", .{diagnostic.message});
}

pub fn formatText(source_map: SourceMap, diagnostic: Diagnostic, writer: anytype) !void {
    try validateDiagnostic(source_map, diagnostic);
    try formatShort(diagnostic, writer);
    try writer.writeAll("\n");

    for (diagnostic.labels) |label| {
        const source = source_map.find(label.span.source_id) orelse return error.MissingSource;
        const start_pos = try positionAt(source, label.span.start);
        const line = try lineAt(source, label.span.start);
        const excerpt = source.text[line.start..line.end];
        const marker_start = label.span.start - line.start;
        const marker_end = @min(label.span.end, line.end) - line.start;
        const marker_len = @max(@as(usize, 1), marker_end - marker_start);
        const marker_char: u8 = if (label.style == .primary) '^' else '~';

        try writer.print("--> {s}:{d}:{d}\n", .{ source.name, start_pos.line, start_pos.column });
        try writer.print("{d} | {s}\n", .{ line.number, excerpt });
        try writer.writeAll("  | ");
        var i: usize = 0;
        while (i < marker_start) : (i += 1) try writer.writeByte(' ');
        i = 0;
        while (i < marker_len) : (i += 1) try writer.writeByte(marker_char);
        if (label.message.len > 0) try writer.print(" {s}", .{label.message});
        try writer.writeAll("\n");
    }

    for (diagnostic.notes) |item| {
        try writer.print("note: {s}\n", .{item.message});
    }
    for (diagnostic.suggestions) |item| {
        try writer.print("help: {s}", .{item.message});
        if (item.replacement.len > 0) try writer.print(" replace with `{s}`", .{item.replacement});
        try writer.writeAll("\n");
    }
}

pub fn formatJsonLine(diagnostic: Diagnostic, writer: anytype) !void {
    try writer.writeAll("{\"severity\":");
    try writeJsonString(writer, diagnostic.severity.name());
    try writer.writeAll(",\"code\":");
    try writeJsonString(writer, if (diagnostic.code.isEmpty()) "" else diagnostic.code.namespace);
    try writer.writeAll(",\"code_value\":");
    try writeJsonString(writer, diagnostic.code.value);
    try writer.writeAll(",\"message\":");
    try writeJsonString(writer, diagnostic.message);

    try writer.writeAll(",\"labels\":[");
    for (diagnostic.labels, 0..) |label, i| {
        if (i != 0) try writer.writeAll(",");
        try writer.print("{{\"style\":\"{s}\",\"source_id\":{d},\"start\":{d},\"end\":{d},\"message\":", .{
            if (label.style == .primary) "primary" else "secondary",
            label.span.source_id,
            label.span.start,
            label.span.end,
        });
        try writeJsonString(writer, label.message);
        try writer.writeAll("}");
    }
    try writer.writeAll("]");

    try writer.writeAll(",\"notes\":[");
    for (diagnostic.notes, 0..) |item, i| {
        if (i != 0) try writer.writeAll(",");
        try writeJsonString(writer, item.message);
    }
    try writer.writeAll("]");

    try writer.writeAll(",\"suggestions\":[");
    for (diagnostic.suggestions, 0..) |item, i| {
        if (i != 0) try writer.writeAll(",");
        try writer.writeAll("{\"message\":");
        try writeJsonString(writer, item.message);
        try writer.writeAll(",\"replacement\":");
        try writeJsonString(writer, item.replacement);
        if (item.span) |span| {
            try writer.print(",\"source_id\":{d},\"start\":{d},\"end\":{d}", .{ span.source_id, span.start, span.end });
        }
        try writer.writeAll("}");
    }
    try writer.writeAll("]}\n");
}

fn validateSourceText(text: []const u8) Error!void {
    for (text) |byte| {
        if (byte == 0) return error.InvalidSourceText;
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

fn sampleSource() Source {
    return .{ .id = 1, .name = "app.zon", .text = "name = \"demo\"\nid = \"Bad\"\n" };
}

fn sampleMap() SourceMap {
    const State = struct {
        const sources = [_]Source{sampleSource()};
    };
    return .{ .sources = &State.sources };
}

test "severity names" {
    try std.testing.expectEqualStrings("hint", Severity.hint.name());
    try std.testing.expectEqualStrings("warning", Severity.warning.name());
    try std.testing.expectEqualStrings("error", Severity.@"error".name());
}

test "source lookup by id" {
    const map = sampleMap();
    try std.testing.expectEqualStrings("app.zon", map.find(1).?.name);
    try std.testing.expect(map.find(99) == null);
}

test "position at offsets" {
    const source = sampleSource();

    try std.testing.expectEqualDeep(Position{ .byte_offset = 0, .line = 1, .column = 1 }, try positionAt(source, 0));
    try std.testing.expectEqualDeep(Position{ .byte_offset = 3, .line = 1, .column = 4 }, try positionAt(source, 3));
    try std.testing.expectEqualDeep(Position{ .byte_offset = 14, .line = 2, .column = 1 }, try positionAt(source, 14));
    try std.testing.expectEqualDeep(Position{ .byte_offset = source.text.len, .line = 3, .column = 1 }, try positionAt(source, source.text.len));
}

test "line at boundaries" {
    const source = sampleSource();

    try std.testing.expectEqualDeep(Line{ .start = 0, .end = 13, .number = 1 }, try lineAt(source, 0));
    try std.testing.expectEqualDeep(Line{ .start = 14, .end = 24, .number = 2 }, try lineAt(source, 18));
}

test "span validation" {
    const map = sampleMap();

    try validateSpan(map, .{ .source_id = 1, .start = 14, .end = 24 });
    try std.testing.expectError(error.MissingSource, validateSpan(map, .{ .source_id = 9, .start = 0, .end = 1 }));
    try std.testing.expectError(error.InvalidSpan, validateSpan(map, .{ .source_id = 1, .start = 5, .end = 4 }));
    try std.testing.expectError(error.InvalidSpan, validateSpan(map, .{ .source_id = 1, .start = 0, .end = 999 }));
}

test "diagnostic validation checks labels and suggestions" {
    const map = sampleMap();
    const labels = [_]Label{primary(.{ .source_id = 1, .start = 19, .end = 22 }, "must be lowercase")};
    const suggestions = [_]Suggestion{suggestion("use lowercase", "bad", .{ .source_id = 1, .start = 20, .end = 23 })};
    const diagnostic: Diagnostic = .{
        .severity = .@"error",
        .message = "invalid app id",
        .labels = &labels,
        .suggestions = &suggestions,
    };

    try validateDiagnostic(map, diagnostic);

    const bad_labels = [_]Label{primary(.{ .source_id = 99, .start = 0, .end = 1 }, "missing")};
    try std.testing.expectError(error.MissingSource, validateDiagnostic(map, .{ .severity = .warning, .message = "bad", .labels = &bad_labels }));
}

test "constructor helpers build expected values" {
    const span: Span = .{ .source_id = 1, .start = 0, .end = 4 };
    const diagnostic_code = code("manifest", "invalid-id");
    const label = primary(span, "label");
    const secondary_label = secondary(span, "secondary");
    const diagnostic_note = note("note");
    const diagnostic_suggestion = suggestion("fix it", "replacement", span);

    try std.testing.expectEqualStrings("manifest", diagnostic_code.namespace);
    try std.testing.expectEqual(LabelStyle.primary, label.style);
    try std.testing.expectEqual(LabelStyle.secondary, secondary_label.style);
    try std.testing.expectEqualStrings("note", diagnostic_note.message);
    try std.testing.expectEqualStrings("replacement", diagnostic_suggestion.replacement);
}

test "short formatting" {
    var buffer: [128]u8 = undefined;
    var writer = std.Io.Writer.fixed(&buffer);
    try formatShort(.{ .severity = .warning, .code = code("asset", "missing"), .message = "missing icon" }, &writer);

    try std.testing.expectEqualStrings("warning[asset.missing]: missing icon", writer.buffered());
}

test "text formatting includes source label note and suggestion" {
    const map = sampleMap();
    const labels = [_]Label{primary(.{ .source_id = 1, .start = 19, .end = 22 }, "expected lowercase id")};
    const notes = [_]Note{note("app ids are stable public identifiers")};
    const suggestions = [_]Suggestion{suggestion("try this id", "bad", .{ .source_id = 1, .start = 20, .end = 23 })};
    const diagnostic: Diagnostic = .{
        .severity = .@"error",
        .code = code("manifest", "invalid-id"),
        .message = "invalid app id",
        .labels = &labels,
        .notes = &notes,
        .suggestions = &suggestions,
    };

    var buffer: [512]u8 = undefined;
    var writer = std.Io.Writer.fixed(&buffer);
    try formatText(map, diagnostic, &writer);

    try std.testing.expectEqualStrings(
        "error[manifest.invalid-id]: invalid app id\n" ++
            "--> app.zon:2:6\n" ++
            "2 | id = \"Bad\"\n" ++
            "  |      ^^^ expected lowercase id\n" ++
            "note: app ids are stable public identifiers\n" ++
            "help: try this id replace with `bad`\n",
        writer.buffered(),
    );
}

test "json line formatting escapes and preserves order" {
    const labels = [_]Label{
        primary(.{ .source_id = 1, .start = 0, .end = 4 }, "first"),
        secondary(.{ .source_id = 1, .start = 5, .end = 7 }, "second"),
    };
    const notes = [_]Note{ note("quote \" note"), note("next") };
    const suggestions = [_]Suggestion{suggestion("replace slash", "a\\b", null)};
    const diagnostic: Diagnostic = .{
        .severity = .info,
        .code = code("cfg", "quoted"),
        .message = "bad \"thing\"",
        .labels = &labels,
        .notes = &notes,
        .suggestions = &suggestions,
    };

    var buffer: [768]u8 = undefined;
    var writer = std.Io.Writer.fixed(&buffer);
    try formatJsonLine(diagnostic, &writer);

    try std.testing.expectEqualStrings(
        "{\"severity\":\"info\",\"code\":\"cfg\",\"code_value\":\"quoted\",\"message\":\"bad \\\"thing\\\"\",\"labels\":[{\"style\":\"primary\",\"source_id\":1,\"start\":0,\"end\":4,\"message\":\"first\"},{\"style\":\"secondary\",\"source_id\":1,\"start\":5,\"end\":7,\"message\":\"second\"}],\"notes\":[\"quote \\\" note\",\"next\"],\"suggestions\":[{\"message\":\"replace slash\",\"replacement\":\"a\\\\b\"}]}\n",
        writer.buffered(),
    );
}

test "writer exhaustion propagates cleanly" {
    var buffer: [8]u8 = undefined;
    var writer = std.Io.Writer.fixed(&buffer);
    try std.testing.expectError(error.WriteFailed, formatShort(.{ .severity = .fatal, .message = "this message is too long" }, &writer));
}

test {
    std.testing.refAllDecls(@This());
}
