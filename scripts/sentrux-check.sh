#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
snapshot_dir="$(mktemp -d "${TMPDIR:-/tmp}/ai-nexus-sentrux.XXXXXX")"

cleanup() {
	rm -rf "$snapshot_dir"
}
trap cleanup EXIT

should_exclude_from_sentrux() {
	case "$1" in
		.agents/* | .claude/* | .cursor/* | .factory/* | .goose/* | .pi/*)
			return 0
			;;
		*)
			return 1
			;;
	esac
}

copy_tracked_project_files() {
	local file

	cd "$repo_root"
	while IFS= read -r -d '' file; do
		if should_exclude_from_sentrux "$file"; then
			continue
		fi

		if [[ ! -f "$file" ]]; then
			continue
		fi

		mkdir -p "$snapshot_dir/$(dirname "$file")"
		cp -p "$file" "$snapshot_dir/$file"
	done < <(git ls-files -z)
}

copy_tracked_project_files

git -C "$snapshot_dir" init --quiet
git -C "$snapshot_dir" add -A
sentrux check "$snapshot_dir"
