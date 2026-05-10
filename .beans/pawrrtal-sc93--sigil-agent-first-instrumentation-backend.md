---
# pawrrtal-sc93
title: Sigil agent-first instrumentation (backend)
status: completed
type: task
priority: high
created_at: 2026-05-10T13:41:13Z
updated_at: 2026-05-10T13:49:48Z
---

Add Grafana Sigil + OTel providers around AI/agent paths; tests.

## Summary of Changes

- Grafana Sigil SDK + OTLP HTTP bootstrap under app/core/telemetry/
- FastAPI lifespan: init_sigil_runtime / shutdown_sigil_runtime
- Gemini StreamFn: streaming generations + usage metadata + recorder error checks
- Agent loop: Sigil tool spans via execute_tool.run_agent_tool
- tests/test_sigil_runtime.py and backend/.env.example documentation
