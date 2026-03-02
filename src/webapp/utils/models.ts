import { PopulatedUser } from '../api/client';

export interface TaskModel {
  id: string;
  title: string;
  // column is a free-form key (supports custom columns)
  column: string;
  color: string;
  // Scrumban fields
  priority?: 'low' | 'medium' | 'high';
  // Task assignment
  assigneeId?: string;
  assignee?: PopulatedUser;
  // Due date
  dueDate?: string;
  // Status timestamps
  committedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface DragItem {
  index: number;
  id: TaskModel['id'];
  // origin column key
  from: string;
}
