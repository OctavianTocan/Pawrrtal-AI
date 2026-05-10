const std = @import("std");

pub const Rounding = enum {
    truncate,
    floor,
    ceil,
    round,
};

pub const Edge = enum {
    left,
    right,
    top,
    bottom,
};

pub const PointF = Point(f32);
pub const SizeF = Size(f32);
pub const RectF = Rect(f32);
pub const InsetsF = Insets(f32);
pub const OffsetF = Offset(f32);
pub const ScaleF = Scale(f32);
pub const ConstraintsF = Constraints(f32);

pub const PointD = Point(f64);
pub const SizeD = Size(f64);
pub const RectD = Rect(f64);
pub const InsetsD = Insets(f64);
pub const OffsetD = Offset(f64);
pub const ScaleD = Scale(f64);
pub const ConstraintsD = Constraints(f64);

pub const PointI = Point(i32);
pub const SizeI = Size(i32);
pub const RectI = Rect(i32);
pub const InsetsI = Insets(i32);
pub const OffsetI = Offset(i32);
pub const ScaleI = Scale(i32);
pub const ConstraintsI = Constraints(i32);

pub const PointU = Point(u32);
pub const SizeU = Size(u32);
pub const RectU = Rect(u32);
pub const InsetsU = Insets(u32);
pub const OffsetU = Offset(u32);
pub const ScaleU = Scale(u32);
pub const ConstraintsU = Constraints(u32);

pub fn Point(comptime T: type) type {
    requireScalar(T);

    return struct {
        const Self = @This();

        x: T = 0,
        y: T = 0,

        pub fn init(x: T, y: T) Self {
            return .{ .x = x, .y = y };
        }

        pub fn zero() Self {
            return .{};
        }

        pub fn all(value: T) Self {
            return .{ .x = value, .y = value };
        }

        pub fn translate(self: Self, offset: Offset(T)) Self {
            return .{
                .x = self.x + offset.dx,
                .y = self.y + offset.dy,
            };
        }

        pub fn scale(self: Self, factor: Scale(T)) Self {
            return .{
                .x = self.x * factor.x,
                .y = self.y * factor.y,
            };
        }

        pub fn convert(self: Self, comptime U: type, rounding: Rounding) Point(U) {
            return .{
                .x = convertScalar(self.x, U, rounding),
                .y = convertScalar(self.y, U, rounding),
            };
        }
    };
}

pub fn Size(comptime T: type) type {
    requireScalar(T);

    return struct {
        const Self = @This();

        width: T = 0,
        height: T = 0,

        pub fn init(width: T, height: T) Self {
            return .{ .width = width, .height = height };
        }

        pub fn zero() Self {
            return .{};
        }

        pub fn all(value: T) Self {
            return .{ .width = value, .height = value };
        }

        pub fn isEmpty(self: Self) bool {
            return isEmptyExtent(self.width) or isEmptyExtent(self.height);
        }

        pub fn clamp(self: Self, constraints: Constraints(T)) Self {
            return constraints.clampSize(self);
        }

        pub fn scale(self: Self, factor: Scale(T)) Self {
            return .{
                .width = self.width * factor.x,
                .height = self.height * factor.y,
            };
        }

        pub fn convert(self: Self, comptime U: type, rounding: Rounding) Size(U) {
            return .{
                .width = convertScalar(self.width, U, rounding),
                .height = convertScalar(self.height, U, rounding),
            };
        }
    };
}

pub fn Rect(comptime T: type) type {
    requireScalar(T);

    return struct {
        const Self = @This();

        x: T = 0,
        y: T = 0,
        width: T = 0,
        height: T = 0,

        pub fn init(x: T, y: T, width: T, height: T) Self {
            return .{ .x = x, .y = y, .width = width, .height = height };
        }

        pub fn zero() Self {
            return .{};
        }

        pub fn all(value: T) Self {
            return .{ .x = value, .y = value, .width = value, .height = value };
        }

        pub fn fromSize(size_value: Size(T)) Self {
            return .{ .width = size_value.width, .height = size_value.height };
        }

        pub fn fromPoints(a: Point(T), b: Point(T)) Self {
            const x0 = @min(a.x, b.x);
            const y0 = @min(a.y, b.y);
            const x1 = @max(a.x, b.x);
            const y1 = @max(a.y, b.y);
            return .{
                .x = x0,
                .y = y0,
                .width = x1 - x0,
                .height = y1 - y0,
            };
        }

        pub fn minX(self: Self) T {
            return self.x;
        }

        pub fn maxX(self: Self) T {
            return self.x + self.width;
        }

        pub fn minY(self: Self) T {
            return self.y;
        }

        pub fn maxY(self: Self) T {
            return self.y + self.height;
        }

        pub fn size(self: Self) Size(T) {
            return .{ .width = self.width, .height = self.height };
        }

        pub fn topLeft(self: Self) Point(T) {
            return .{ .x = self.x, .y = self.y };
        }

        pub fn topRight(self: Self) Point(T) {
            return .{ .x = self.maxX(), .y = self.y };
        }

        pub fn bottomLeft(self: Self) Point(T) {
            return .{ .x = self.x, .y = self.maxY() };
        }

        pub fn bottomRight(self: Self) Point(T) {
            return .{ .x = self.maxX(), .y = self.maxY() };
        }

        pub fn center(self: Self) Point(T) {
            return .{
                .x = self.x + halfScalar(self.width),
                .y = self.y + halfScalar(self.height),
            };
        }

        pub fn hasNegativeSize(self: Self) bool {
            if (comptime canBeNegative(T)) {
                return self.width < 0 or self.height < 0;
            }
            return false;
        }

        pub fn normalized(self: Self) Self {
            if (comptime !canBeNegative(T)) {
                return self;
            }

            var result = self;
            if (result.width < 0) {
                result.x += result.width;
                result.width = -result.width;
            }
            if (result.height < 0) {
                result.y += result.height;
                result.height = -result.height;
            }
            return result;
        }

        pub fn isEmpty(self: Self) bool {
            return isEmptyExtent(self.width) or isEmptyExtent(self.height);
        }

        pub fn containsPoint(self: Self, point: Point(T)) bool {
            self.assertNormalized();
            return !self.isEmpty() and
                point.x >= self.minX() and point.x < self.maxX() and
                point.y >= self.minY() and point.y < self.maxY();
        }

        pub fn containsRect(self: Self, other: Self) bool {
            self.assertNormalized();
            other.assertNormalized();
            return !self.isEmpty() and !other.isEmpty() and
                other.minX() >= self.minX() and
                other.maxX() <= self.maxX() and
                other.minY() >= self.minY() and
                other.maxY() <= self.maxY();
        }

        pub fn intersects(self: Self, other: Self) bool {
            return !Self.intersection(self, other).isEmpty();
        }

        pub fn intersection(a: Self, b: Self) Self {
            a.assertNormalized();
            b.assertNormalized();

            const x0 = @max(a.minX(), b.minX());
            const y0 = @max(a.minY(), b.minY());
            const x1 = @min(a.maxX(), b.maxX());
            const y1 = @min(a.maxY(), b.maxY());

            if (x1 <= x0 or y1 <= y0) {
                return .{ .x = x0, .y = y0 };
            }

            return .{
                .x = x0,
                .y = y0,
                .width = x1 - x0,
                .height = y1 - y0,
            };
        }

        pub fn unionWith(a: Self, b: Self) Self {
            a.assertNormalized();
            b.assertNormalized();

            if (a.isEmpty() and b.isEmpty()) return .{};
            if (a.isEmpty()) return b;
            if (b.isEmpty()) return a;

            const x0 = @min(a.minX(), b.minX());
            const y0 = @min(a.minY(), b.minY());
            const x1 = @max(a.maxX(), b.maxX());
            const y1 = @max(a.maxY(), b.maxY());

            return .{
                .x = x0,
                .y = y0,
                .width = x1 - x0,
                .height = y1 - y0,
            };
        }

        pub fn translate(self: Self, offset: Offset(T)) Self {
            return .{
                .x = self.x + offset.dx,
                .y = self.y + offset.dy,
                .width = self.width,
                .height = self.height,
            };
        }

        pub fn scale(self: Self, factor: Scale(T)) Self {
            return .{
                .x = self.x * factor.x,
                .y = self.y * factor.y,
                .width = self.width * factor.x,
                .height = self.height * factor.y,
            };
        }

        pub fn inflate(self: Self, insets: Insets(T)) Self {
            self.assertNormalized();
            return .{
                .x = subFloorZeroIfUnsigned(self.x, insets.left),
                .y = subFloorZeroIfUnsigned(self.y, insets.top),
                .width = self.width + insets.left + insets.right,
                .height = self.height + insets.top + insets.bottom,
            };
        }

        pub fn deflate(self: Self, insets: Insets(T)) Self {
            self.assertNormalized();

            const move_x = @min(insets.left, self.width);
            const move_y = @min(insets.top, self.height);

            return .{
                .x = self.x + move_x,
                .y = self.y + move_y,
                .width = shrinkExtent(self.width, insets.left, insets.right),
                .height = shrinkExtent(self.height, insets.top, insets.bottom),
            };
        }

        pub fn inset(self: Self, insets: Insets(T)) Self {
            return self.deflate(insets);
        }

        pub fn outset(self: Self, insets: Insets(T)) Self {
            return self.inflate(insets);
        }

        pub fn clampSize(self: Self, constraints: Constraints(T)) Self {
            const clamped = constraints.clampSize(self.size());
            return .{
                .x = self.x,
                .y = self.y,
                .width = clamped.width,
                .height = clamped.height,
            };
        }

        pub fn split(self: Self, edge: Edge, amount: T) [2]Self {
            self.assertNormalized();

            return switch (edge) {
                .left => blk: {
                    const clamped = clampExtent(amount, self.width);
                    break :blk .{
                        .{ .x = self.x, .y = self.y, .width = clamped, .height = self.height },
                        .{ .x = self.x + clamped, .y = self.y, .width = self.width - clamped, .height = self.height },
                    };
                },
                .right => blk: {
                    const clamped = clampExtent(amount, self.width);
                    break :blk .{
                        .{ .x = self.maxX() - clamped, .y = self.y, .width = clamped, .height = self.height },
                        .{ .x = self.x, .y = self.y, .width = self.width - clamped, .height = self.height },
                    };
                },
                .top => blk: {
                    const clamped = clampExtent(amount, self.height);
                    break :blk .{
                        .{ .x = self.x, .y = self.y, .width = self.width, .height = clamped },
                        .{ .x = self.x, .y = self.y + clamped, .width = self.width, .height = self.height - clamped },
                    };
                },
                .bottom => blk: {
                    const clamped = clampExtent(amount, self.height);
                    break :blk .{
                        .{ .x = self.x, .y = self.maxY() - clamped, .width = self.width, .height = clamped },
                        .{ .x = self.x, .y = self.y, .width = self.width, .height = self.height - clamped },
                    };
                },
            };
        }

        pub fn splitProportion(self: Self, edge: Edge, proportion: f32) [2]Self {
            const clamped_proportion = std.math.clamp(proportion, 0, 1);
            const extent = switch (edge) {
                .left, .right => self.width,
                .top, .bottom => self.height,
            };
            const amount = convertScalar(scalarToF64(extent) * clamped_proportion, T, .round);
            return self.split(edge, amount);
        }

        pub fn convert(self: Self, comptime U: type, rounding: Rounding) Rect(U) {
            return .{
                .x = convertScalar(self.x, U, rounding),
                .y = convertScalar(self.y, U, rounding),
                .width = convertScalar(self.width, U, rounding),
                .height = convertScalar(self.height, U, rounding),
            };
        }

        pub fn snapOut(self: Self, comptime U: type) Rect(U) {
            self.assertNormalized();
            const x0 = convertScalar(self.minX(), U, .floor);
            const y0 = convertScalar(self.minY(), U, .floor);
            const x1 = convertScalar(self.maxX(), U, .ceil);
            const y1 = convertScalar(self.maxY(), U, .ceil);
            return .{
                .x = x0,
                .y = y0,
                .width = x1 - x0,
                .height = y1 - y0,
            };
        }

        pub fn snapIn(self: Self, comptime U: type) Rect(U) {
            self.assertNormalized();
            const x0 = convertScalar(self.minX(), U, .ceil);
            const y0 = convertScalar(self.minY(), U, .ceil);
            const x1 = convertScalar(self.maxX(), U, .floor);
            const y1 = convertScalar(self.maxY(), U, .floor);
            if (x1 <= x0 or y1 <= y0) {
                return .{ .x = x0, .y = y0 };
            }
            return .{
                .x = x0,
                .y = y0,
                .width = x1 - x0,
                .height = y1 - y0,
            };
        }

        fn assertNormalized(self: Self) void {
            std.debug.assert(!self.hasNegativeSize());
        }
    };
}

pub fn Insets(comptime T: type) type {
    requireScalar(T);

    return struct {
        const Self = @This();

        top: T = 0,
        right: T = 0,
        bottom: T = 0,
        left: T = 0,

        pub fn init(top: T, right: T, bottom: T, left: T) Self {
            return .{ .top = top, .right = right, .bottom = bottom, .left = left };
        }

        pub fn zero() Self {
            return .{};
        }

        pub fn all(value: T) Self {
            return .{ .top = value, .right = value, .bottom = value, .left = value };
        }

        pub fn symmetric(vertical_value: T, horizontal_value: T) Self {
            return .{
                .top = vertical_value,
                .right = horizontal_value,
                .bottom = vertical_value,
                .left = horizontal_value,
            };
        }

        pub fn horizontal(self: Self) T {
            return self.left + self.right;
        }

        pub fn vertical(self: Self) T {
            return self.top + self.bottom;
        }

        pub fn convert(self: Self, comptime U: type, rounding: Rounding) Insets(U) {
            return .{
                .top = convertScalar(self.top, U, rounding),
                .right = convertScalar(self.right, U, rounding),
                .bottom = convertScalar(self.bottom, U, rounding),
                .left = convertScalar(self.left, U, rounding),
            };
        }
    };
}

pub fn Offset(comptime T: type) type {
    requireScalar(T);

    return struct {
        const Self = @This();

        dx: T = 0,
        dy: T = 0,

        pub fn init(dx: T, dy: T) Self {
            return .{ .dx = dx, .dy = dy };
        }

        pub fn zero() Self {
            return .{};
        }

        pub fn all(value: T) Self {
            return .{ .dx = value, .dy = value };
        }

        pub fn convert(self: Self, comptime U: type, rounding: Rounding) Offset(U) {
            return .{
                .dx = convertScalar(self.dx, U, rounding),
                .dy = convertScalar(self.dy, U, rounding),
            };
        }
    };
}

pub fn Scale(comptime T: type) type {
    requireScalar(T);

    return struct {
        const Self = @This();

        x: T = 1,
        y: T = 1,

        pub fn init(x: T, y: T) Self {
            return .{ .x = x, .y = y };
        }

        pub fn identity() Self {
            return .{};
        }

        pub fn uniform(value: T) Self {
            return .{ .x = value, .y = value };
        }

        pub fn convert(self: Self, comptime U: type, rounding: Rounding) Scale(U) {
            return .{
                .x = convertScalar(self.x, U, rounding),
                .y = convertScalar(self.y, U, rounding),
            };
        }
    };
}

pub fn Constraints(comptime T: type) type {
    requireScalar(T);

    return struct {
        const Self = @This();

        min_width: T = 0,
        min_height: T = 0,
        max_width: T = scalarMax(T),
        max_height: T = scalarMax(T),

        pub fn init(min_size: Size(T), max_size: Size(T)) Self {
            return .{
                .min_width = min_size.width,
                .min_height = min_size.height,
                .max_width = max_size.width,
                .max_height = max_size.height,
            };
        }

        pub fn unconstrained() Self {
            return .{};
        }

        pub fn tight(size_value: Size(T)) Self {
            return .{
                .min_width = size_value.width,
                .min_height = size_value.height,
                .max_width = size_value.width,
                .max_height = size_value.height,
            };
        }

        pub fn loose(max_size: Size(T)) Self {
            return .{
                .max_width = max_size.width,
                .max_height = max_size.height,
            };
        }

        pub fn clampSize(self: Self, size_value: Size(T)) Size(T) {
            return .{
                .width = std.math.clamp(size_value.width, self.min_width, self.max_width),
                .height = std.math.clamp(size_value.height, self.min_height, self.max_height),
            };
        }
    };
}

pub fn logicalToPhysical(rect: RectF, scale_factor: f32) RectI {
    return rect.scale(ScaleF.uniform(scale_factor)).snapOut(i32);
}

pub fn physicalToLogical(rect: RectI, scale_factor: f32) RectF {
    std.debug.assert(scale_factor != 0);
    return rect.convert(f32, .round).scale(ScaleF.uniform(1 / scale_factor));
}

fn requireScalar(comptime T: type) void {
    switch (@typeInfo(T)) {
        .int, .float => {},
        else => @compileError("geometry scalar types must be concrete ints or floats"),
    }
}

fn canBeNegative(comptime T: type) bool {
    return switch (@typeInfo(T)) {
        .float => true,
        .int => |info| info.signedness == .signed,
        else => false,
    };
}

fn scalarMax(comptime T: type) T {
    return switch (@typeInfo(T)) {
        .float => std.math.inf(T),
        .int => std.math.maxInt(T),
        else => unreachable,
    };
}

fn isEmptyExtent(value: anytype) bool {
    const T = @TypeOf(value);
    if (comptime canBeNegative(T)) {
        return value <= 0;
    }
    return value == 0;
}

fn halfScalar(value: anytype) @TypeOf(value) {
    return switch (@typeInfo(@TypeOf(value))) {
        .float => value / 2,
        .int => @divTrunc(value, 2),
        else => unreachable,
    };
}

fn clampExtent(value: anytype, extent: @TypeOf(value)) @TypeOf(value) {
    if (value <= 0) return 0;
    if (value >= extent) return extent;
    return value;
}

fn shrinkExtent(value: anytype, start: @TypeOf(value), end_value: @TypeOf(value)) @TypeOf(value) {
    const T = @TypeOf(value);
    if (comptime canBeNegative(T)) {
        return @max(0, value - start - end_value);
    }

    if (start >= value) return 0;
    const remaining = value - start;
    if (end_value >= remaining) return 0;
    return remaining - end_value;
}

fn subFloorZeroIfUnsigned(value: anytype, amount: @TypeOf(value)) @TypeOf(value) {
    const T = @TypeOf(value);
    if (comptime canBeNegative(T)) {
        return value - amount;
    }
    if (amount >= value) return 0;
    return value - amount;
}

fn scalarToF64(value: anytype) f64 {
    return switch (@typeInfo(@TypeOf(value))) {
        .float => @floatCast(value),
        .int => @floatFromInt(value),
        else => unreachable,
    };
}

fn convertScalar(value: anytype, comptime U: type, rounding: Rounding) U {
    requireScalar(U);

    const Source = @TypeOf(value);
    return switch (@typeInfo(U)) {
        .float => switch (@typeInfo(Source)) {
            .float => @floatCast(value),
            .int => @floatFromInt(value),
            else => unreachable,
        },
        .int => switch (@typeInfo(Source)) {
            .float => @intFromFloat(roundFloat(value, rounding)),
            .int => @intCast(value),
            else => unreachable,
        },
        else => unreachable,
    };
}

fn roundFloat(value: anytype, rounding: Rounding) @TypeOf(value) {
    return switch (rounding) {
        .truncate => @trunc(value),
        .floor => @floor(value),
        .ceil => @ceil(value),
        .round => @round(value),
    };
}

test "aliases compile and expose zero values" {
    try std.testing.expectEqualDeep(PointF.zero(), PointF.init(0, 0));
    try std.testing.expectEqualDeep(SizeD.zero(), SizeD.init(0, 0));
    try std.testing.expectEqualDeep(RectI.zero(), RectI.init(0, 0, 0, 0));
    try std.testing.expectEqualDeep(InsetsU.zero(), InsetsU.init(0, 0, 0, 0));
    try std.testing.expectEqualDeep(OffsetF.zero(), OffsetF.init(0, 0));
    try std.testing.expectEqualDeep(ScaleI.identity(), ScaleI.init(1, 1));
    try std.testing.expectEqualDeep(ConstraintsU.unconstrained().min_width, 0);
}

test "rect accessors and constructors" {
    const rect = RectI.init(10, 20, 30, 40);

    try std.testing.expectEqual(10, rect.minX());
    try std.testing.expectEqual(40, rect.maxX());
    try std.testing.expectEqual(20, rect.minY());
    try std.testing.expectEqual(60, rect.maxY());
    try std.testing.expectEqualDeep(SizeI.init(30, 40), rect.size());
    try std.testing.expectEqualDeep(PointI.init(10, 20), rect.topLeft());
    try std.testing.expectEqualDeep(PointI.init(40, 60), rect.bottomRight());
    try std.testing.expectEqualDeep(PointI.init(25, 40), rect.center());
    try std.testing.expectEqualDeep(RectI.init(0, 0, 30, 40), RectI.fromSize(rect.size()));
    try std.testing.expectEqualDeep(RectI.init(10, 20, 30, 40), RectI.fromPoints(.{ .x = 40, .y = 60 }, .{ .x = 10, .y = 20 }));
}

test "rect containment is half open" {
    const rect = RectI.init(10, 20, 30, 40);

    try std.testing.expect(rect.containsPoint(.{ .x = 10, .y = 20 }));
    try std.testing.expect(rect.containsPoint(.{ .x = 39, .y = 59 }));
    try std.testing.expect(!rect.containsPoint(.{ .x = 40, .y = 59 }));
    try std.testing.expect(!rect.containsPoint(.{ .x = 39, .y = 60 }));
    try std.testing.expect(!rect.containsPoint(.{ .x = 9, .y = 20 }));
    try std.testing.expect(!rect.containsPoint(.{ .x = 10, .y = 19 }));
}

test "rect contains rect uses inclusive far edge for contained geometry" {
    const outer = RectI.init(0, 0, 100, 100);

    try std.testing.expect(outer.containsRect(.{ .x = 0, .y = 0, .width = 100, .height = 100 }));
    try std.testing.expect(outer.containsRect(.{ .x = 10, .y = 10, .width = 20, .height = 20 }));
    try std.testing.expect(!outer.containsRect(.{ .x = 90, .y = 90, .width = 20, .height = 20 }));
    try std.testing.expect(!outer.containsRect(.{ .x = 10, .y = 10, .width = 0, .height = 20 }));
}

test "empty rectangles" {
    try std.testing.expect(RectI.init(0, 0, 0, 10).isEmpty());
    try std.testing.expect(RectI.init(0, 0, 10, 0).isEmpty());
    try std.testing.expect(RectI.init(0, 0, -1, 10).isEmpty());
    try std.testing.expect(RectF.init(0, 0, -0.5, 10).isEmpty());
    try std.testing.expect(RectU.init(0, 0, 0, 10).isEmpty());
    try std.testing.expect(!RectU.init(0, 0, 1, 10).isEmpty());
}

test "normalized handles negative extents" {
    try std.testing.expectEqualDeep(RectI.init(5, 10, 10, 20), RectI.init(15, 30, -10, -20).normalized());
    try std.testing.expectEqualDeep(RectF.init(5, 10, 10, 20), RectF.init(15, 30, -10, -20).normalized());
}

test "intersection covers overlap touching containment and no overlap" {
    const a = RectI.init(0, 0, 100, 100);

    try std.testing.expectEqualDeep(RectI.init(50, 50, 50, 50), RectI.intersection(a, .{ .x = 50, .y = 50, .width = 100, .height = 100 }));
    try std.testing.expectEqualDeep(RectI.init(100, 20, 0, 0), RectI.intersection(a, .{ .x = 100, .y = 20, .width = 10, .height = 10 }));
    try std.testing.expectEqualDeep(RectI.init(10, 10, 20, 20), RectI.intersection(a, .{ .x = 10, .y = 10, .width = 20, .height = 20 }));
    try std.testing.expectEqualDeep(RectI.init(200, 200, 0, 0), RectI.intersection(a, .{ .x = 200, .y = 200, .width = 10, .height = 10 }));
    try std.testing.expect(a.intersects(.{ .x = 99, .y = 99, .width = 1, .height = 1 }));
    try std.testing.expect(!a.intersects(.{ .x = 100, .y = 99, .width = 1, .height = 1 }));
}

test "union skips empty rectangles" {
    const a = RectI.init(0, 0, 10, 10);
    const b = RectI.init(5, 20, 10, 10);

    try std.testing.expectEqualDeep(RectI.init(0, 0, 15, 30), RectI.unionWith(a, b));
    try std.testing.expectEqualDeep(a, RectI.unionWith(a, .{}));
    try std.testing.expectEqualDeep(b, RectI.unionWith(.{}, b));
    try std.testing.expectEqualDeep(RectI.zero(), RectI.unionWith(.{}, .{}));
}

test "insets inflate and deflate" {
    const rect = RectI.init(10, 10, 100, 50);
    const insets = InsetsI.init(5, 10, 15, 20);

    try std.testing.expectEqual(30, insets.horizontal());
    try std.testing.expectEqual(20, insets.vertical());
    try std.testing.expectEqualDeep(RectI.init(30, 15, 70, 30), rect.deflate(insets));
    try std.testing.expectEqualDeep(RectI.init(-10, 5, 130, 70), rect.inflate(insets));
}

test "insets can collapse a rect" {
    const rect = RectI.init(10, 10, 20, 20);

    try std.testing.expectEqualDeep(RectI.init(30, 30, 0, 0), rect.deflate(InsetsI.all(50)));
    try std.testing.expectEqualDeep(RectU.init(20, 20, 0, 0), RectU.init(10, 10, 10, 10).deflate(InsetsU.all(20)));
}

test "translate scale and point operations" {
    const point = PointI.init(2, 3);
    const rect = RectI.init(1, 2, 3, 4);

    try std.testing.expectEqualDeep(PointI.init(7, 1), point.translate(.{ .dx = 5, .dy = -2 }));
    try std.testing.expectEqualDeep(PointI.init(4, 9), point.scale(ScaleI.init(2, 3)));
    try std.testing.expectEqualDeep(RectI.init(6, 0, 3, 4), rect.translate(.{ .dx = 5, .dy = -2 }));
    try std.testing.expectEqualDeep(RectI.init(2, 6, 6, 12), rect.scale(.{ .x = 2, .y = 3 }));
}

test "constraints clamp sizes" {
    const constraints = ConstraintsI.init(SizeI.init(10, 20), SizeI.init(100, 200));

    try std.testing.expectEqualDeep(SizeI.init(10, 20), constraints.clampSize(.{ .width = 5, .height = 10 }));
    try std.testing.expectEqualDeep(SizeI.init(50, 60), constraints.clampSize(.{ .width = 50, .height = 60 }));
    try std.testing.expectEqualDeep(SizeI.init(100, 200), constraints.clampSize(.{ .width = 150, .height = 300 }));
    try std.testing.expectEqualDeep(SizeI.init(42, 64), ConstraintsI.tight(.{ .width = 42, .height = 64 }).clampSize(.{ .width = 1, .height = 2 }));
}

test "split by edge and proportion" {
    const rect = RectI.init(0, 0, 100, 50);

    try std.testing.expectEqualDeep([2]RectI{ RectI.init(0, 0, 25, 50), RectI.init(25, 0, 75, 50) }, rect.split(.left, 25));
    try std.testing.expectEqualDeep([2]RectI{ RectI.init(75, 0, 25, 50), RectI.init(0, 0, 75, 50) }, rect.split(.right, 25));
    try std.testing.expectEqualDeep([2]RectI{ RectI.init(0, 0, 100, 10), RectI.init(0, 10, 100, 40) }, rect.split(.top, 10));
    try std.testing.expectEqualDeep([2]RectI{ RectI.init(0, 40, 100, 10), RectI.init(0, 0, 100, 40) }, rect.split(.bottom, 10));
    try std.testing.expectEqualDeep([2]RectI{ RectI.init(0, 0, 25, 50), RectI.init(25, 0, 75, 50) }, rect.splitProportion(.left, 0.25));
    try std.testing.expectEqualDeep([2]RectI{ RectI.init(0, 0, 100, 50), RectI.init(100, 0, 0, 50) }, rect.split(.left, 200));
}

test "conversion and deterministic rounding" {
    const rect = RectF.init(1.25, 2.75, 10.5, 20.25);

    try std.testing.expectEqualDeep(RectI.init(1, 2, 10, 20), rect.convert(i32, .floor));
    try std.testing.expectEqualDeep(RectI.init(2, 3, 11, 21), rect.convert(i32, .ceil));
    try std.testing.expectEqualDeep(RectI.init(1, 3, 11, 20), rect.convert(i32, .round));
    try std.testing.expectEqualDeep(RectI.init(1, 2, 10, 20), rect.convert(i32, .truncate));
    try std.testing.expectEqualDeep(RectF.init(1, 2, 10, 20), RectI.init(1, 2, 10, 20).convert(f32, .round));
}

test "snap out and snap in use rect edges" {
    const rect = RectF.init(1.25, 2.75, 10.5, 20.25);

    try std.testing.expectEqualDeep(RectI.init(1, 2, 11, 21), rect.snapOut(i32));
    try std.testing.expectEqualDeep(RectI.init(2, 3, 9, 20), rect.snapIn(i32));
    try std.testing.expectEqualDeep(RectI.init(2, 3, 0, 0), RectF.init(1.25, 2.75, 0.5, 0.1).snapIn(i32));
}

test "logical and physical pixel conversion is explicit" {
    const logical = RectF.init(0.25, 1.25, 10.25, 20.25);
    const physical = logicalToPhysical(logical, 2);

    try std.testing.expectEqualDeep(RectI.init(0, 2, 21, 41), physical);
    try std.testing.expectEqualDeep(RectF.init(0, 1, 10.5, 20.5), physicalToLogical(physical, 2));
}

test {
    std.testing.refAllDecls(@This());
}
