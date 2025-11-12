import { TaskModel } from '../../utils/models';

export type TaskProps = {
  index: number;
  task: TaskModel;
  // onUpdate accepts a patch (partial) to avoid sending full objects
  onUpdate: (id: TaskModel['id'], updatedTask: Partial<TaskModel>) => void;
  onDelete: (id: TaskModel['id']) => void;
  onDropHover: (i: number, j: number) => void;
};