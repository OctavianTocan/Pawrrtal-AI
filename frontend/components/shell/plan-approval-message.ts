export interface BuildPlanApprovalMessageOptions {
  /** Optional accepted plan path (kept for call-site compatibility; message remains path-agnostic). */
  planPath?: string
  draftInput?: string
}

const PLAN_APPROVAL_LINE = 'Plan approved, please execute.'

function normalizeDraftInput(input?: string): string {
  return (input ?? '').trim()
}

export function buildPlanApprovalMessage(options: BuildPlanApprovalMessageOptions = {}): string {
  const draftInput = normalizeDraftInput(options.draftInput)

  const sections: string[] = [PLAN_APPROVAL_LINE]

  if (draftInput.length > 0) {
    sections.push(['---', '**Additional user context**', draftInput].join('\n\n'))
  }

  return sections.join('\n\n')
}
