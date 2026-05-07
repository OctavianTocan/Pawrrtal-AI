---
# ai-nexus-yczp
title: 'Fix react-dropdown not opening: usePortal + placement priority'
status: completed
type: bug
priority: normal
created_at: 2026-05-07T07:43:55Z
updated_at: 2026-05-07T09:30:07Z
---

AutoReviewSelector and NavUser dropdowns built on @octavian-tocan/react-dropdown fail to open because:
1. DropdownContent renders absolute-positioned inside overflow:hidden ancestors (sidebar panel, composer controls area), so content is clipped.
2. dropdownPlacement='bottom' default in DropdownMenu silently overrides placement='top'.

Fix:
- Remove dropdownPlacement='bottom' default from DropdownMenu so DropdownRoot uses the correct placement fallback
- Add usePortal prop to DropdownMenuDef and thread through to DropdownMenu
- Pass usePortal to both AutoReviewSelector and NavUser dropdowns to escape overflow clipping



## Resolution

The not-opening bug was fixed in the prior pass via `usePortal` + `placement` priority. Subsequent work (`ai-nexus-amlb`) closed 12 of 14 Radix-parity improvements. The remaining Radix gaps and full migration plan are tracked under bean ai-nexus-2v85 (parity overhaul) and ai-nexus-2v86 (migration).
