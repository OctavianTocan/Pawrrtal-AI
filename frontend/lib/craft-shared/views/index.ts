/**
 * Views Module
 *
 * Dynamic views computed from session state using Filtrex expressions.
 * Never persisted on sessions — purely runtime evaluation.
 */

export type { ViewConfig, CompiledView, ViewEvaluationContext } from './types';
export { compileView, compileAllViews, evaluateViews, buildViewContext } from './evaluator';
export { validateViewExpression, AVAILABLE_FIELDS, AVAILABLE_FUNCTIONS } from './validation';
export { getDefaultViews } from './defaults';
export { VIEW_FUNCTIONS } from './functions';
