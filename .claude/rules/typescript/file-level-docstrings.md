---# File-Level Docstrings

Every TypeScript/TSX file should have a file-level docstring at the top
(after imports) explaining what the file contains. Use JSDoc `@fileoverview`
format for consistency. This helps developers quickly understand a file's
purpose without reading the entire implementation.

## Verify
"Does the file have a file-level docstring? Does it clearly explain the
file's purpose? Is it located after imports but before the first code?"

## Patterns

Bad -- no file-level documentation:

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function ConversationList() {
  // ...
}
```

Good -- file-level docstring:

```tsx
/**
 * Conversation list sidebar component.
 *
 * Displays all user conversations grouped by date (Today, Yesterday, etc.)
 * with search filtering, collapsible groups, and context menu actions.
 *
 * @fileoverview Sidebar conversation list with search and grouping
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function ConversationList() {
  // ...
}
```

## Notes

- Keep docstrings concise (2-4 sentences max)
- Focus on "what" and "why", not "how"
- Update docstrings when file purpose changes significantly
- Use `@fileoverview` tag for consistency with JSDoc conventions
