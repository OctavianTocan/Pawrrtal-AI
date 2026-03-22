/**
 * Stub for dismissible-layer-bridge (originally from Craft's Electron app)
 * Provides a bridge to track open Radix DismissibleLayer instances.
 */

interface DismissibleLayerBridge {
  hasOpenLayers(): boolean
}

let bridge: DismissibleLayerBridge | null = null

export function setDismissibleLayerBridge(b: DismissibleLayerBridge) {
  bridge = b
}

export function getDismissibleLayerBridge(): DismissibleLayerBridge | null {
  return bridge
}
