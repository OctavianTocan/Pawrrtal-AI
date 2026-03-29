import { useCallback, useRef } from "react";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

// Forked from useEventCallback (usehooks-ts)
// biome-ignore lint/complexity/noBannedTypes: stable callback pattern requires Function type
export function useStableCallback<Callback extends Function>(
  fn: Callback
): Callback {
  const ref = useRef<Callback>(fn);

  useIsomorphicLayoutEffect(() => {
    ref.current = fn;
  }, [fn]);

  return useCallback(
    (...args: unknown[]) => ref.current?.(...args),
    [ref]
  ) as unknown as Callback;
}
