'use client';

import type { ConversationLabel } from '@/lib/types';

function resolveBadgeColor(label: ConversationLabel): { backgroundColor: string; color: string } {
  if (label.color) {
    return {
      backgroundColor: `color-mix(in srgb, ${label.color} 6%, transparent)`,
      color: `color-mix(in srgb, ${label.color} 75%, var(--foreground))`,
    };
  }

  return {
    backgroundColor: 'rgba(var(--foreground-rgb), 0.05)',
    color: 'rgba(var(--foreground-rgb), 0.8)',
  };
}

export function normalizeConversationLabel(label: ConversationLabel | string): ConversationLabel {
  if (typeof label !== 'string') {
    return label;
  }

  const separatorIndex = label.indexOf(':');

  let namePart: string;
  let valuePart: string | undefined;

  if (separatorIndex === -1) {
    namePart = label;
  } else {
    namePart = label.slice(0, separatorIndex);
    valuePart = label.slice(separatorIndex + 1);
  }

  return {
    id: namePart.trim().toLowerCase().replace(/\s+/g, '-'),
    name: namePart.trim(),
    value: valuePart?.trim(),
  };
}

export function ConversationLabelBadge({
  label,
}: {
  label: ConversationLabel | string;
}): React.JSX.Element {
  const normalized = normalizeConversationLabel(label);
  const style = resolveBadgeColor(normalized);

  return (
    <div
      role="presentation"
      className="shrink-0 h-[18px] max-w-[120px] px-1.5 text-[10px] font-medium rounded flex items-center whitespace-nowrap gap-0.5"
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        event.preventDefault();
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
      style={style}
    >
      <span className="truncate">{normalized.name}</span>
      {normalized.value ? (
        <>
          <span style={{ opacity: 0.4 }}>·</span>
          <span className="font-normal truncate min-w-0" style={{ opacity: 0.75 }}>
            {normalized.value}
          </span>
        </>
      ) : null}
    </div>
  );
}
