import { useRef } from 'react';
import { useDrag, useDrop, XYCoord } from 'react-dnd';
import { ItemType } from '../utils/enums';
import { DragItem, TaskModel } from '../utils/models';

export function useTaskDragAndDrop<T extends HTMLElement>(
  { task, index, canDrag = true }: { task: TaskModel; index: number; canDrag?: boolean },
  handleDropHover: (i: number, j: number) => void,
) {
  const ref = useRef<T>(null);

  const [{ isDragging }, drag] = useDrag<
    DragItem,
    void,
    { isDragging: boolean }
  >({
    item: { from: task.column, id: task.id, index },
    type: ItemType.TASK,
    canDrag,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [_, drop] = useDrop<DragItem, void, unknown>({
    accept: ItemType.TASK,
    hover: (item, monitor) => {
      // Disabled: Tasks can only be moved between columns, not reordered within the same column
      return;
    },
  });

  drag(drop(ref));

  return {
    ref,
    isDragging,
  };
}
