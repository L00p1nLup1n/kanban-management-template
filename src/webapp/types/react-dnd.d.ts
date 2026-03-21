// Local declaration override for react-dnd to work around ESM .js extension
// resolution issue with TypeScript moduleResolution: Node + TS 4.7

declare module 'react-dnd' {
  import type { FC, ReactNode } from 'react';

  export interface XYCoord {
    x: number;
    y: number;
  }

  export type ConnectDragSource = (element: any) => any;
  export type ConnectDropTarget = (element: any) => any;
  export type ConnectDragPreview = (element: any, options?: any) => any;

  export interface DragSourceMonitor<
    DragObject = unknown,
    DropResult = unknown,
  > {
    canDrag(): boolean;
    isDragging(): boolean;
    getItemType(): string | symbol | null;
    getItem<T = DragObject>(): T;
    getDropResult<T = DropResult>(): T | null;
    didDrop(): boolean;
    getInitialClientOffset(): XYCoord | null;
    getInitialSourceClientOffset(): XYCoord | null;
    getClientOffset(): XYCoord | null;
    getDifferenceFromInitialOffset(): XYCoord | null;
    getSourceClientOffset(): XYCoord | null;
  }

  export interface DropTargetMonitor<
    DragObject = unknown,
    DropResult = unknown,
  > {
    canDrop(): boolean;
    isOver(options?: { shallow?: boolean }): boolean;
    getItemType(): string | symbol | null;
    getItem<T = DragObject>(): T;
    getDropResult<T = DropResult>(): T | null;
    didDrop(): boolean;
    getInitialClientOffset(): XYCoord | null;
    getInitialSourceClientOffset(): XYCoord | null;
    getClientOffset(): XYCoord | null;
    getDifferenceFromInitialOffset(): XYCoord | null;
    getSourceClientOffset(): XYCoord | null;
  }

  export interface DragSourceHookSpec<DragObject, DropResult, CollectedProps> {
    type: string | symbol;
    item: DragObject | (() => DragObject);
    previewOptions?: any;
    options?: any;
    end?: (
      draggedItem: DragObject,
      monitor: DragSourceMonitor<DragObject, DropResult>,
    ) => void;
    canDrag?:
      | boolean
      | ((monitor: DragSourceMonitor<DragObject, DropResult>) => boolean);
    isDragging?: (
      monitor: DragSourceMonitor<DragObject, DropResult>,
    ) => boolean;
    collect?: (
      monitor: DragSourceMonitor<DragObject, DropResult>,
    ) => CollectedProps;
  }

  export interface DropTargetHookSpec<DragObject, DropResult, CollectedProps> {
    accept: string | symbol | string[];
    options?: any;
    drop?: (
      item: DragObject,
      monitor: DropTargetMonitor<DragObject, DropResult>,
    ) => DropResult | undefined | void;
    hover?: (
      item: DragObject,
      monitor: DropTargetMonitor<DragObject, DropResult>,
    ) => void;
    canDrop?: (
      item: DragObject,
      monitor: DropTargetMonitor<DragObject, DropResult>,
    ) => boolean;
    collect?: (
      monitor: DropTargetMonitor<DragObject, DropResult>,
    ) => CollectedProps;
  }

  export function useDrag<
    DragObject = unknown,
    DropResult = unknown,
    CollectedProps = unknown,
  >(
    spec: DragSourceHookSpec<DragObject, DropResult, CollectedProps>,
  ): [CollectedProps, ConnectDragSource, ConnectDragPreview];

  export function useDrop<
    DragObject = unknown,
    DropResult = unknown,
    CollectedProps = unknown,
  >(
    spec: DropTargetHookSpec<DragObject, DropResult, CollectedProps>,
  ): [CollectedProps, ConnectDropTarget];

  export interface DndProviderProps<
    BackendContext = unknown,
    BackendOptions = unknown,
  > {
    backend: any;
    children?: ReactNode;
    context?: BackendContext;
    options?: BackendOptions;
    debugMode?: boolean;
  }

  export const DndProvider: FC<DndProviderProps<any, any>>;
}
