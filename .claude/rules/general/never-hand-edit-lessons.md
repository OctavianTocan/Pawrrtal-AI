---
name: never-hand-edit-lessons
paths: [".no-match"]
---

# Never Hand-Edit LESSONS.md

When using a structured lesson system (graduate/reject pipeline), never hand-edit `LESSONS.md` or equivalent files. Use the designated scripts (`graduate.py`, `reject.py`) for lesson lifecycle management.

**Why:** Hand-edited lessons skip validation, can violate the schema, and break the automated review pipeline. The scripts enforce format, check for duplicates, and maintain ordering.

**Learned from:** agentic-stack (dream cycle) — lesson management protocol.

## Verify

"Am I about to edit LESSONS.md directly? Should I use the graduate/reject scripts instead?"

## Patterns

Bad — direct edit skips validation:

```bash
# Manually add lesson to LESSONS.md
echo "- name: new-lesson\n  ..." >> LESSONS.md
# May have wrong format, duplicate name, or wrong ordering
# Automated pipeline breaks
```

Good — use the designated script:

```bash
python3 scripts/graduate.py --name new-lesson
# Validates format, checks for duplicates, maintains ordering
# Pipeline continues to work
```
