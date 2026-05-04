# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual field values used in this repo's bean files.

## Bean `status` field mapping

The beans system uses a flat `status` field — no triage state machine exists. The five canonical roles map as follows:

| Role in mattpocock/skills | Bean `status` | Meaning                                                    |
| ------------------------- | ------------- | ---------------------------------------------------------- |
| `needs-triage`            | `todo`        | Maintainer needs to evaluate (status = todo)              |
| `needs-info`              | `todo`        | Waiting on reporter for more information                   |
| `ready-for-agent`         | `todo`        | Fully specified, ready for an AFK agent                    |
| `ready-for-human`         | `todo`        | Requires human implementation                               |
| `wontfix`                 | `completed`   | Will not be actioned — mark completed with a `wontfix` tag |

## How triage skills should behave

Since `status: todo` is a catch-all for everything that isn't done, the triage skill should treat `todo` as the queue. When a skill says "apply the AFK-ready triage label", it should ensure the bean has `status: todo` and a `tags` array that includes `ready-for-agent` if that concept is relevant — but since beans has no native triage state machine, the skill should primarily rely on `status` and `tags` to communicate state.

## Tags

Beans support a `tags` array. Useful tags include: `bug`, `feature`, `polish`, `tech-debt`, `accessibility`, `v2`, `wontfix`.