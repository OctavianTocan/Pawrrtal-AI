---
# ai-nexus-1fs1
title: Python CLI commit message generator
status: completed
type: feature
priority: normal
created_at: 2026-03-21T18:46:56Z
updated_at: 2026-03-21T18:49:04Z
---

Build a simple Python CLI using Agno/Gemini to auto-generate conventional commit messages from staged changes. Replaces commit.ts as the default commit tool.

## Tasks\n\n- [x] Create `backend/app/cli/__init__.py`\n- [x] Create `backend/app/cli/commit.py` with Agno/Gemini integration\n- [x] Update `justfile` to use Python CLI\n- [x] Test with staged changes

## Summary of Changes\n\nCreated a Python CLI commit message generator at `backend/app/cli/commit.py` that:\n- Uses Agno + Gemini (same pattern as `create_utility_agent()`) to generate conventional commit messages\n- Reads staged git diff, sends to Gemini, auto-commits with the generated message\n- Runs via `just commit` (updated justfile)\n- No interactive prompts — fully automatic\n- Loads `GOOGLE_API_KEY` from project root `.env` via python-dotenv\n\nFiles created/modified:\n- `backend/app/cli/__init__.py` (new)\n- `backend/app/cli/commit.py` (new)\n- `justfile` (updated commit recipe)
