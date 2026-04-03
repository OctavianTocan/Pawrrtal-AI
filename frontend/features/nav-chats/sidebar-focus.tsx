'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type FocusZoneId = 'sidebar' | 'navigator' | 'chat';
export type FocusIntent = 'keyboard' | 'click' | 'programmatic';

export interface FocusZoneOptions {
  intent?: FocusIntent;
  moveFocus?: boolean;
}

type FocusZoneRegistration = {
  id: FocusZoneId;
  ref: React.RefObject<HTMLElement | null>;
  focusFirst?: () => void;
};

type FocusState = {
  zone: FocusZoneId | null;
  intent: FocusIntent | null;
  shouldMoveDOMFocus: boolean;
};

type FocusContextValue = {
  focusState: FocusState;
  registerZone: (zone: FocusZoneRegistration) => void;
  unregisterZone: (id: FocusZoneId) => void;
  focusZone: (id: FocusZoneId, options?: FocusZoneOptions) => void;
  focusNextZone: () => void;
  focusPreviousZone: () => void;
  isZoneFocused: (id: FocusZoneId) => boolean;
};

const ZONE_ORDER: FocusZoneId[] = ['sidebar', 'navigator', 'chat'];

const FocusContext = createContext<FocusContextValue | null>(null);

export function SidebarFocusProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const zonesRef = useRef(new Map<FocusZoneId, FocusZoneRegistration>());
  const [focusState, setFocusState] = useState<FocusState>({
    zone: null,
    intent: null,
    shouldMoveDOMFocus: false,
  });

  const registerZone = useCallback((zone: FocusZoneRegistration) => {
    zonesRef.current.set(zone.id, zone);
  }, []);

  const unregisterZone = useCallback((id: FocusZoneId) => {
    zonesRef.current.delete(id);
  }, []);

  const focusZone = useCallback((id: FocusZoneId, options?: FocusZoneOptions) => {
    const zone = zonesRef.current.get(id);
    if (!zone) {
      return;
    }

    const intent = options?.intent ?? 'programmatic';
    const shouldMoveDOMFocus = options?.moveFocus ?? (intent !== 'click');

    setFocusState({ zone: id, intent, shouldMoveDOMFocus });

    if (shouldMoveDOMFocus) {
      if (zone.focusFirst) {
        zone.focusFirst();
      } else {
        zone.ref.current?.focus();
      }

      queueMicrotask(() => {
        setFocusState((current) => ({ ...current, shouldMoveDOMFocus: false }));
      });
    }
  }, []);

  const focusNextZone = useCallback(() => {
    const currentIndex = focusState.zone ? ZONE_ORDER.indexOf(focusState.zone) : -1;
    const nextZone = ZONE_ORDER[(currentIndex + 1 + ZONE_ORDER.length) % ZONE_ORDER.length] as FocusZoneId;
    focusZone(nextZone, { intent: 'keyboard', moveFocus: true });
  }, [focusState.zone, focusZone]);

  const focusPreviousZone = useCallback(() => {
    const currentIndex = focusState.zone ? ZONE_ORDER.indexOf(focusState.zone) : 0;
    const prevZone = ZONE_ORDER[(currentIndex - 1 + ZONE_ORDER.length) % ZONE_ORDER.length] as FocusZoneId;
    focusZone(prevZone, { intent: 'keyboard', moveFocus: true });
  }, [focusState.zone, focusZone]);

  const value = useMemo<FocusContextValue>(
    () => ({
      focusState,
      registerZone,
      unregisterZone,
      focusZone,
      focusNextZone,
      focusPreviousZone,
      isZoneFocused: (id) => focusState.zone === id,
    }),
    [focusState, registerZone, unregisterZone, focusZone, focusNextZone, focusPreviousZone]
  );

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useSidebarFocusContext(): FocusContextValue {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error('useSidebarFocusContext must be used within SidebarFocusProvider.');
  }
  return context;
}

export function useFocusZone({
  zoneId,
  enabled = true,
  onFocus,
  onBlur,
  focusFirst,
}: {
  zoneId: FocusZoneId;
  enabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  focusFirst?: () => void;
}) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const { focusState, registerZone, unregisterZone, focusZone, isZoneFocused } = useSidebarFocusContext();
  const isFocused = enabled && isZoneFocused(zoneId);
  const shouldMoveDOMFocus = enabled && focusState.zone === zoneId && focusState.shouldMoveDOMFocus;
  const intent = focusState.zone === zoneId ? focusState.intent : null;
  const previousIsFocused = useRef(isFocused);

  useEffect(() => {
    if (!enabled) {
      unregisterZone(zoneId);
      return;
    }

    if (zoneRef.current) {
      zoneRef.current.dataset.focusZone = zoneId;
    }

    registerZone({
      id: zoneId,
      ref: zoneRef,
      focusFirst,
    });

    return () => unregisterZone(zoneId);
  }, [enabled, focusFirst, registerZone, unregisterZone, zoneId]);

  useEffect(() => {
    if (isFocused && !previousIsFocused.current) {
      onFocus?.();
    }

    if (!isFocused && previousIsFocused.current) {
      onBlur?.();
    }

    previousIsFocused.current = isFocused;
  }, [isFocused, onBlur, onFocus]);

  return {
    zoneRef,
    isFocused,
    shouldMoveDOMFocus,
    intent,
    focus: useCallback((options?: FocusZoneOptions) => focusZone(zoneId, options), [focusZone, zoneId]),
  };
}
