---
# pawrrtal-x6zc
title: Add concurrency limiter to conversation search fetching
status: todo
type: task
priority: low
created_at: 2026-04-04T06:52:48Z
updated_at: 2026-04-04T06:52:48Z
---

Promise.all in useConversationSearch fires unbounded concurrent requests for all uncached conversations. If the conversation list grows large (hundreds+), this can overwhelm the backend and browser. Add a concurrency pool (e.g. p-limit or manual batching) to cap parallel requests.
