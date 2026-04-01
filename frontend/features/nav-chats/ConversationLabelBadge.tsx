'use client';

import type { ConversationLabel } from '@/lib/types';

function stringToHue(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 360;
  }
  return Math.abs(hash);
}

function resolveBadgeColor(label: ConversationLabel): { backgroundColor: string; color: string } {
  if (label.color) {
    return {
      backgroundColor: `color-mix(in srgb, ${label.color} 12%, transparent)`,
      color: `color-mix(in srgb, ${label.color} 75%, var(--foreground))`,
    };
  }

  const hue = stringToHue(label.id ?? label.name);
  return {
    backgroundColor: `hsla(${hue}, 80%, 55%, 0.12)`,
    color: `hsl(${hue}, 65%, 40%)`,
  };
}

export function normalizeConversationLabel(label: ConversationLabel | string): ConversationLabel {
  if (typeof label !== 'string') {
    return label;
  }

  const [namePart = label, valuePart] = label.split(':');
  return {
    id: namePart.trim().toLowerCase().replace(/\s+/g, '-'),
    name: namePart.trim(),
    value: valuePart?.trim(),
  };
}

export function ConversationLabelBadge({ label }: { label: ConversationLabel | string }): React.JSX.Element {
  const normalized = normalizeConversationLabel(label);
  const style = resolveBadgeColor(normalized);

  return (
    <div
      role="presentation"
      className="shrink-0 h-[18px] max-w-[140px] px-1.5 text-[10px] font-medium rounded flex items-center whitespace-nowrap gap-0.5"
      onMouseDown={(event) => {
        event.stopPropagation();
        event.preventDefault();
      }}
      style={style}
    >
      <span className="truncate">{normalized.name}</span>
      {normalized.value ? (
        <>
          <span style={{ opacity: 0.4 }}>·</span>
          <span className="font-normal truncate min-w-0" style={{ opacity: 0.8 }}>
            {normalized.value}
          </span>
        </>
      ) : null}
    </div>
  );
}
