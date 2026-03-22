/**
 * Panel layout constants - adapted from Craft's panel system.
 *
 * These define the geometry for the app shell's panel layout:
 * gaps between panels, edge insets, corner radii, etc.
 */

/** Gap between any adjacent panels (sidebar <-> content) */
export const PANEL_GAP = 6;

/** Padding from window edges to outermost panels */
export const PANEL_EDGE_INSET = 6;

/** Corner radius for panel edges touching the window boundary */
export const RADIUS_EDGE = 14;

/** Corner radius for interior corners between panels */
export const RADIUS_INNER = 10;

/** Minimum width for the sidebar panel */
export const SIDEBAR_MIN_WIDTH = 240;

/** Default width for the sidebar panel */
export const SIDEBAR_DEFAULT_WIDTH = 260;

/** Maximum width for the sidebar panel */
export const SIDEBAR_MAX_WIDTH = 400;

/** Height of the top bar */
export const TOPBAR_HEIGHT = 48;
