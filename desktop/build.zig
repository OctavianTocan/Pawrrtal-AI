const std = @import("std");

const PlatformOption = enum { auto, null, macos, linux, windows };
const TraceOption = enum { off, events, runtime, all };
const WebEngineOption = enum { system, chromium };
const PackageTarget = enum { macos, windows, linux };

/// Path to the zero-native framework checkout.
/// Override with: zig build -Dzero-native-path=/your/path
const default_zero_native_path = "../third_party/zero-native";
const app_exe_name = "ai-nexus";

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});
    const platform_option = b.option(PlatformOption, "platform", "Desktop backend: auto, null, macos, linux, windows") orelse .auto;
    const trace_option = b.option(TraceOption, "trace", "Trace output: off, events, runtime, all") orelse .events;
    const debug_overlay = b.option(bool, "debug-overlay", "Enable debug overlay") orelse false;
    const automation_enabled = b.option(bool, "automation", "Enable zero-native automation artifacts") orelse false;
    const web_engine_override = b.option(WebEngineOption, "web-engine", "Override app.zon web engine: system, chromium");
    const cef_dir_override = b.option([]const u8, "cef-dir", "Override CEF root directory");
    const cef_auto_install_override = b.option(bool, "cef-auto-install", "Override CEF auto-install setting");
    const package_target = b.option(PackageTarget, "package-target", "Package target: macos, windows, linux") orelse .macos;
    const zero_native_path = b.option([]const u8, "zero-native-path", "Path to zero-native framework") orelse default_zero_native_path;
    const optimize_name = @tagName(optimize);

    const selected_platform: PlatformOption = switch (platform_option) {
        .auto => if (target.result.os.tag == .macos) .macos else if (target.result.os.tag == .linux) .linux else .null,
        else => platform_option,
    };

    const app_web_engine = appWebEngineConfig();
    const web_engine = web_engine_override orelse app_web_engine.web_engine;
    const cef_dir = cef_dir_override orelse defaultCefDir(selected_platform, app_web_engine.cef_dir);
    const cef_auto_install = cef_auto_install_override orelse app_web_engine.cef_auto_install;

    const zero_native_mod = zeroNativeModule(b, target, optimize, zero_native_path);
    const options = b.addOptions();
    options.addOption([]const u8, "platform", switch (selected_platform) {
        .auto => unreachable,
        .null => "null",
        .macos => "macos",
        .linux => "linux",
        .windows => "windows",
    });
    options.addOption([]const u8, "trace", @tagName(trace_option));
    options.addOption([]const u8, "web_engine", @tagName(web_engine));
    options.addOption(bool, "debug_overlay", debug_overlay);
    options.addOption(bool, "automation", automation_enabled);
    const options_mod = options.createModule();

    const runner_mod = localModule(b, target, optimize, "src/runner.zig");
    runner_mod.addImport("zero-native", zero_native_mod);
    runner_mod.addImport("build_options", options_mod);

    const app_mod = localModule(b, target, optimize, "src/main.zig");
    app_mod.addImport("zero-native", zero_native_mod);
    app_mod.addImport("runner", runner_mod);

    const exe = b.addExecutable(.{ .name = app_exe_name, .root_module = app_mod });
    linkPlatform(b, target, app_mod, exe, selected_platform, web_engine, zero_native_path, cef_dir, cef_auto_install);
    b.installArtifact(exe);

    // Dev: zero-native dev server manages the frontend dev server via app.zon .frontend.dev.
    // Prerequisite: `just dev` must already be running so :3001 and :8000 are up.
    const dev = b.addSystemCommand(&.{ "zero-native", "dev", "--manifest", "app.zon", "--binary" });
    dev.addFileArg(exe.getEmittedBin());
    dev.step.dependOn(&exe.step);
    const dev_step = b.step("dev", "Run zero-native dev server against the running dev servers");
    dev_step.dependOn(&dev.step);

    // Frontend static export for packaging
    const frontend_build = b.addSystemCommand(&.{ "bun", "--filter", "app.nexus-ai", "run", "build" });
    const frontend_step = b.step("frontend-build", "Build Next.js static export for packaging");
    frontend_step.dependOn(&frontend_build.step);

    const run = b.addRunArtifact(exe);
    run.step.dependOn(&frontend_build.step);
    const run_step = b.step("run", "Build frontend + run desktop app (production assets)");
    run_step.dependOn(&run.step);

    const package = b.addSystemCommand(&.{
        "zero-native",    "package",
        "--target",       @tagName(package_target),
        "--manifest",     "app.zon",
        "--assets",       "../frontend/out",
        "--optimize",     optimize_name,
        "--output",       b.fmt("zig-out/package/{s}-1.0.0-{s}-{s}{s}", .{
            app_exe_name,
            @tagName(package_target),
            optimize_name,
            packageSuffix(package_target),
        }),
        "--binary",
    });
    package.addFileArg(exe.getEmittedBin());
    package.step.dependOn(&exe.step);
    package.step.dependOn(&frontend_build.step);
    const package_step = b.step("package", "Create a distributable package");
    package_step.dependOn(&package.step);

    const tests = b.addTest(.{ .root_module = app_mod });
    const test_step = b.step("test", "Run Zig tests");
    test_step.dependOn(&b.addRunArtifact(tests).step);
}

// ---------------------------------------------------------------------------
// Build helpers
// ---------------------------------------------------------------------------

fn localModule(b: *std.Build, target: std.Build.ResolvedTarget, optimize: std.builtin.OptimizeMode, path: []const u8) *std.Build.Module {
    return b.createModule(.{
        .root_source_file = b.path(path),
        .target = target,
        .optimize = optimize,
    });
}

fn zeroNativePath(b: *std.Build, zero_native_path: []const u8, sub_path: []const u8) std.Build.LazyPath {
    return .{ .cwd_relative = b.pathJoin(&.{ zero_native_path, sub_path }) };
}

fn zeroNativeModule(b: *std.Build, target: std.Build.ResolvedTarget, optimize: std.builtin.OptimizeMode, zero_native_path: []const u8) *std.Build.Module {
    const geometry_mod      = externalModule(b, target, optimize, zero_native_path, "src/primitives/geometry/root.zig");
    const assets_mod        = externalModule(b, target, optimize, zero_native_path, "src/primitives/assets/root.zig");
    const app_dirs_mod      = externalModule(b, target, optimize, zero_native_path, "src/primitives/app_dirs/root.zig");
    const trace_mod         = externalModule(b, target, optimize, zero_native_path, "src/primitives/trace/root.zig");
    const app_manifest_mod  = externalModule(b, target, optimize, zero_native_path, "src/primitives/app_manifest/root.zig");
    const diagnostics_mod   = externalModule(b, target, optimize, zero_native_path, "src/primitives/diagnostics/root.zig");
    const platform_info_mod = externalModule(b, target, optimize, zero_native_path, "src/primitives/platform_info/root.zig");
    const json_mod          = externalModule(b, target, optimize, zero_native_path, "src/primitives/json/root.zig");
    const debug_mod         = externalModule(b, target, optimize, zero_native_path, "src/debug/root.zig");
    debug_mod.addImport("app_dirs", app_dirs_mod);
    debug_mod.addImport("trace", trace_mod);
    const zero_native_mod = externalModule(b, target, optimize, zero_native_path, "src/root.zig");
    zero_native_mod.addImport("geometry",      geometry_mod);
    zero_native_mod.addImport("assets",        assets_mod);
    zero_native_mod.addImport("app_dirs",      app_dirs_mod);
    zero_native_mod.addImport("trace",         trace_mod);
    zero_native_mod.addImport("app_manifest",  app_manifest_mod);
    zero_native_mod.addImport("diagnostics",   diagnostics_mod);
    zero_native_mod.addImport("platform_info", platform_info_mod);
    zero_native_mod.addImport("json",          json_mod);
    return zero_native_mod;
}

fn externalModule(b: *std.Build, target: std.Build.ResolvedTarget, optimize: std.builtin.OptimizeMode, zero_native_path: []const u8, path: []const u8) *std.Build.Module {
    return b.createModule(.{
        .root_source_file = zeroNativePath(b, zero_native_path, path),
        .target = target,
        .optimize = optimize,
    });
}

fn linkPlatform(b: *std.Build, target: std.Build.ResolvedTarget, app_mod: *std.Build.Module, exe: *std.Build.Step.Compile, platform: PlatformOption, web_engine: WebEngineOption, zero_native_path: []const u8, cef_dir: []const u8, cef_auto_install: bool) void {
    _ = exe;
    if (platform == .macos) {
        switch (web_engine) {
            .system => {
                app_mod.addCSourceFile(.{
                    .file  = zeroNativePath(b, zero_native_path, "src/platform/macos/appkit_host.m"),
                    .flags = &.{ "-fobjc-arc", "-ObjC" },
                });
                app_mod.linkFramework("WebKit", .{});
            },
            .chromium => {
                if (cef_auto_install) {
                    const cef_auto = b.addSystemCommand(&.{ "zero-native", "cef", "install", "--dir", cef_dir });
                    _ = cef_auto; // step dependency handled by caller
                }
                const include_arg = b.fmt("-I{s}", .{cef_dir});
                const define_arg  = b.fmt("-DZERO_NATIVE_CEF_DIR=\"{s}\"", .{cef_dir});
                app_mod.addCSourceFile(.{
                    .file  = zeroNativePath(b, zero_native_path, "src/platform/macos/cef_host.mm"),
                    .flags = &.{ "-fobjc-arc", "-ObjC++", "-std=c++17", "-stdlib=libc++", include_arg, define_arg },
                });
                app_mod.addObjectFile(b.path(b.fmt("{s}/libcef_dll_wrapper/libcef_dll_wrapper.a", .{cef_dir})));
                app_mod.addFrameworkPath(b.path(b.fmt("{s}/Release", .{cef_dir})));
                app_mod.linkFramework("Chromium Embedded Framework", .{});
                app_mod.addRPath(.{ .cwd_relative = "@executable_path/Frameworks" });
            },
        }
        app_mod.linkFramework("AppKit", .{});
        app_mod.linkFramework("Foundation", .{});
        app_mod.linkFramework("UniformTypeIdentifiers", .{});
        app_mod.linkSystemLibrary("c", .{});
    } else if (platform == .linux) {
        switch (web_engine) {
            .system => {
                app_mod.addCSourceFile(.{
                    .file  = zeroNativePath(b, zero_native_path, "src/platform/linux/gtk_host.c"),
                    .flags = &.{},
                });
                app_mod.linkSystemLibrary("gtk4", .{});
                app_mod.linkSystemLibrary("webkitgtk-6.0", .{});
            },
            .chromium => {
                const include_arg = b.fmt("-I{s}", .{cef_dir});
                const define_arg  = b.fmt("-DZERO_NATIVE_CEF_DIR=\"{s}\"", .{cef_dir});
                app_mod.addCSourceFile(.{
                    .file  = zeroNativePath(b, zero_native_path, "src/platform/linux/cef_host.cpp"),
                    .flags = &.{ "-std=c++17", include_arg, define_arg },
                });
                app_mod.addObjectFile(b.path(b.fmt("{s}/libcef_dll_wrapper/libcef_dll_wrapper.a", .{cef_dir})));
                app_mod.addLibraryPath(b.path(b.fmt("{s}/Release", .{cef_dir})));
                app_mod.linkSystemLibrary("cef", .{});
            },
        }
        app_mod.linkSystemLibrary("c", .{});
    }
}

fn packageSuffix(target: PackageTarget) []const u8 {
    return switch (target) {
        .macos          => ".app",
        .windows, .linux => "",
    };
}

// ---------------------------------------------------------------------------
// app.zon web-engine parser (used at build time)
// ---------------------------------------------------------------------------

const AppWebEngineConfig = struct {
    web_engine:   WebEngineOption = .system,
    cef_dir:      []const u8 = "third_party/cef/macos",
    cef_auto_install: bool = false,
};

fn defaultCefDir(platform: PlatformOption, configured: []const u8) []const u8 {
    if (!std.mem.eql(u8, configured, "third_party/cef/macos")) return configured;
    return switch (platform) {
        .linux => "third_party/cef/linux",
        else   => configured,
    };
}

fn appWebEngineConfig() AppWebEngineConfig {
    const source = @embedFile("app.zon");
    var config: AppWebEngineConfig = .{};
    if (stringField(source, ".web_engine")) |value| {
        if (std.mem.eql(u8, value, "system"))   config.web_engine = .system;
        if (std.mem.eql(u8, value, "chromium")) config.web_engine = .chromium;
    }
    if (objectSection(source, ".cef")) |cef| {
        if (stringField(cef, ".dir")) |value|        config.cef_dir = value;
        if (boolField(cef, ".auto_install")) |value| config.cef_auto_install = value;
    }
    return config;
}

fn stringField(source: []const u8, field: []const u8) ?[]const u8 {
    const idx  = std.mem.indexOf(u8, source, field) orelse return null;
    const after = source[idx + field.len ..];
    const eq   = std.mem.indexOf(u8, after, "=") orelse return null;
    const rest = std.mem.trimLeft(u8, after[eq + 1 ..], " \t\r\n");
    if (rest.len == 0 or rest[0] != '"') return null;
    const end  = std.mem.indexOf(u8, rest[1..], "\"") orelse return null;
    return rest[1 .. end + 1];
}

fn objectSection(source: []const u8, field: []const u8) ?[]const u8 {
    const idx  = std.mem.indexOf(u8, source, field) orelse return null;
    const after = source[idx + field.len ..];
    const eq   = std.mem.indexOf(u8, after, "=") orelse return null;
    const rest = std.mem.trimLeft(u8, after[eq + 1 ..], " \t\r\n");
    if (rest.len == 0 or rest[0] != '.') return null;
    const open = std.mem.indexOf(u8, rest, "{") orelse return null;
    var depth: usize = 0;
    var i = open;
    while (i < rest.len) : (i += 1) {
        if (rest[i] == '{') depth += 1;
        if (rest[i] == '}') {
            depth -= 1;
            if (depth == 0) return rest[open .. i + 1];
        }
    }
    return null;
}

fn boolField(source: []const u8, field: []const u8) ?bool {
    const idx  = std.mem.indexOf(u8, source, field) orelse return null;
    const after = source[idx + field.len ..];
    const eq   = std.mem.indexOf(u8, after, "=") orelse return null;
    const rest = std.mem.trimLeft(u8, after[eq + 1 ..], " \t\r\n");
    if (std.mem.startsWith(u8, rest, "true"))  return true;
    if (std.mem.startsWith(u8, rest, "false")) return false;
    return null;
}
