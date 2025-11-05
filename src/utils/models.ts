export interface TaskModel {
  id: string;
  title: string;
  // column is a free-form key (supports custom columns)
  column: string;
  color: string;
}

export interface DragItem {
  index: number;
  id: TaskModel['id'];
  // origin column key
  from: string;
}