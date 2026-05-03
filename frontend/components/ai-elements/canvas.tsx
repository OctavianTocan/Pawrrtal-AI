/**
 * React Flow canvas host for diagram-style assistant output.
 *
 * @fileoverview AI Elements — `canvas`.
 */

import { Background, ReactFlow, type ReactFlowProps } from '@xyflow/react';
import type { ReactNode } from 'react';
import '@xyflow/react/dist/style.css';

type CanvasProps = ReactFlowProps & {
  children?: ReactNode;
};

export const Canvas = ({ children, ...props }: CanvasProps) => (
  <ReactFlow
    deleteKeyCode={['Backspace', 'Delete']}
    fitView
    panOnDrag={false}
    panOnScroll
    selectionOnDrag={true}
    zoomOnDoubleClick={false}
    {...props}
  >
    <Background bgColor="var(--sidebar)" />
    {children}
  </ReactFlow>
);
