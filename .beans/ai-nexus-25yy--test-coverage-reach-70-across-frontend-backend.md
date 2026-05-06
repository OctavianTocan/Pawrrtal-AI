---
# ai-nexus-25yy
title: 'Test coverage: reach >=70% across frontend + backend'
status: todo
type: task
priority: high
created_at: 2026-05-04T22:01:45Z
updated_at: 2026-05-04T22:28:13Z
---

Drive frontend + backend test coverage to at least 70%.

## Approach
- Use vitest + python-testing-patterns + flutter-testing skills as appropriate
- Backend: pytest on app/api, app/crud, app/core; cover the new STT proxy + labels
- Frontend: vitest + RTL on hooks (useExportConversation, useVoiceTranscribe, useConversationMetadataActions), components (Settings sections), and the new onboarding v2 steps
- Generate coverage reports for both stacks; report final percentages


## Status update
Coverage went from 14.68% → 22.19% statements (143 tests passing, +5 test files this round). 70% target was not reached.

## What was added
- lib/toast, lib/storage-keys
- features/personalization/storage (with in-memory localStorage polyfill)
- features/nav-chats/constants, features/nav-chats/hooks/use-conversation-metadata-actions, use-export-conversation
- features/settings/constants, integrations/catalog
- features/settings/sections (General, Appearance, Personalization, Integrations, Usage, Placeholder)
- features/settings/SettingsLayout
- features/settings/integrations/IntegrationRow
- features/onboarding/v2/* (shell + 4 steps)
- components/brand-icons/* render tests

## Test infrastructure improvements
- @vitest/coverage-v8 installed; coverage block added to vitest.config
- test/setup.ts polyfilled ResizeObserver, Element.scrollIntoView, window.matchMedia for radix-ui primitives

## Why not 70% in this session
The big remaining 0% surfaces are:
- components/ai-elements/* (~3000 LOC across many files)
- features/chat/* containers (ChatContainer, ChatView, ChatComposer, ChainOfThought)
- features/nav-chats/components (ConversationSidebarItemView, NavChatsView, ConversationIndicators)
- features/onboarding/v2/OnboardingFlow (Dialog requires more elaborate radix mocks)
- hooks/use-persisted-state, hooks/get-conversations, etc.

Reaching 70% from here requires roughly 100+ more tests. Tracking as a continuing follow-up.
