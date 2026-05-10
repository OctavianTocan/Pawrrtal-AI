#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
usage: tools/cef/build-from-source.sh --platform macosarm64|macosx64|linux64|linuxarm64|windows64|windowsarm64 [options]

Build CEF from source for zero-native maintainers, assemble the expected runtime
layout, and package a zero-native-cef release archive.

options:
  --platform name          Required. CEF platform slug.
  --work-dir path          Working directory for CEF/depot_tools checkout.
                           Default: .zig-cache/zero-native-cef-source
  --depot-tools-dir path   Existing depot_tools checkout. If omitted, the
                           script clones depot_tools into the work dir.
  --cef-branch branch      Optional CEF branch passed to automate-git.py.
  --version version        Version to use in the zero-native release artifact name.
                           If omitted, derived from the generated CEF archive.
  --output path            Output directory for prepared runtime archive.
                           Default: zig-out/cef
  --zero-native-bin path   Path to zero-native CLI. Default: zig-out/bin/zero-native.
  --force                  Pass --force-build and --force-distrib to CEF.
  --help                   Show this help.
EOF
}

platform=""
work_dir=".zig-cache/zero-native-cef-source"
depot_tools_dir=""
cef_branch=""
version=""
output_dir="zig-out/cef"
zero_native_bin="zig-out/bin/zero-native"
force=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform)
      platform="${2:-}"
      shift 2
      ;;
    --work-dir)
      work_dir="${2:-}"
      shift 2
      ;;
    --depot-tools-dir)
      depot_tools_dir="${2:-}"
      shift 2
      ;;
    --cef-branch)
      cef_branch="${2:-}"
      shift 2
      ;;
    --version)
      version="${2:-}"
      shift 2
      ;;
    --output)
      output_dir="${2:-}"
      shift 2
      ;;
    --zero-native-bin)
      zero_native_bin="${2:-}"
      shift 2
      ;;
    --force)
      force=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage
      exit 2
      ;;
  esac
done

case "$platform" in
  macosarm64) arch_flag="--arm64-build" ;;
  macosx64) arch_flag="--x64-build" ;;
  linuxarm64) arch_flag="--arm64-build" ;;
  linux64) arch_flag="--x64-build" ;;
  windowsarm64) arch_flag="--arm64-build" ;;
  windows64) arch_flag="--x64-build" ;;
  *)
    echo "--platform must be macosarm64, macosx64, linux64, linuxarm64, windows64, or windowsarm64" >&2
    exit 2
    ;;
esac

command -v python3 >/dev/null || { echo "python3 is required" >&2; exit 1; }
command -v git >/dev/null || { echo "git is required" >&2; exit 1; }
command -v cmake >/dev/null || { echo "cmake is required" >&2; exit 1; }
case "$platform" in
  macos*) command -v xcodebuild >/dev/null || { echo "Xcode Command Line Tools are required" >&2; exit 1; } ;;
esac

mkdir -p "$work_dir" "$output_dir"

if [[ -z "$depot_tools_dir" ]]; then
  depot_tools_dir="$work_dir/depot_tools"
  if [[ ! -d "$depot_tools_dir/.git" ]]; then
    git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git "$depot_tools_dir"
  fi
fi

export PATH="$depot_tools_dir:$PATH"

automate="$work_dir/automate-git.py"
if [[ ! -f "$automate" ]]; then
  curl --fail --location --output "$automate" \
    https://bitbucket.org/chromiumembedded/cef/raw/master/tools/automate/automate-git.py
fi

download_dir="$work_dir/source"
args=(
  python3 "$automate"
  "--download-dir=$download_dir"
  "--depot-tools-dir=$depot_tools_dir"
  "$arch_flag"
  --minimal-distrib
  --client-distrib
  --no-debug-build
  --force-distrib
)

if [[ -n "$cef_branch" ]]; then
  args+=("--branch=$cef_branch")
fi

if [[ "$force" == "true" ]]; then
  args+=(--force-build --force-distrib)
fi

"${args[@]}"

distrib_dir="$download_dir/chromium/src/cef/binary_distrib"
archive="$(ls -t "$distrib_dir"/cef_binary_*_"$platform"*.tar.bz2 | head -n 1)"
if [[ -z "$archive" || ! -f "$archive" ]]; then
  echo "could not find generated CEF binary distribution in $distrib_dir" >&2
  exit 1
fi

base="$(basename "$archive")"
detected="${base#cef_binary_}"
detected="${detected%%_${platform}*}"
if [[ -z "$version" ]]; then
  version="$detected"
fi

extract_dir="$work_dir/extracted"
rm -rf "$extract_dir"
mkdir -p "$extract_dir"
tar -xjf "$archive" -C "$extract_dir"
cef_root="$(find "$extract_dir" -mindepth 1 -maxdepth 1 -type d | head -n 1)"

cmake -S "$cef_root" -B "$cef_root/build/libcef_dll_wrapper"
cmake --build "$cef_root/build/libcef_dll_wrapper" --target libcef_dll_wrapper --config Release
mkdir -p "$cef_root/libcef_dll_wrapper"
case "$platform" in
  windows*) wrapper="libcef_dll_wrapper.lib" ;;
  *) wrapper="libcef_dll_wrapper.a" ;;
esac
find "$cef_root/build/libcef_dll_wrapper" -name "$wrapper" -print -quit \
  | xargs -I{} cp "{}" "$cef_root/libcef_dll_wrapper/$wrapper"

if [[ ! -x "$zero_native_bin" ]]; then
  zig build
fi

"$zero_native_bin" cef prepare-release --dir "$cef_root" --output "$output_dir" --version "$version"
