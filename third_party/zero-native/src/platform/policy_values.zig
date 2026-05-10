pub fn join(values: []const []const u8, buffer: []u8) ![]const u8 {
    var offset: usize = 0;
    for (values, 0..) |value, index| {
        if (index > 0) {
            if (offset >= buffer.len) return error.NoSpaceLeft;
            buffer[offset] = '\n';
            offset += 1;
        }
        if (offset + value.len > buffer.len) return error.NoSpaceLeft;
        @memcpy(buffer[offset .. offset + value.len], value);
        offset += value.len;
    }
    return buffer[0..offset];
}
