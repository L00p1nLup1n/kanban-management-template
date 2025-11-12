import { PopulatedUser } from '../api/client';

export interface TaskModel {
  id: string;
  title: string;
  // column is a free-form key (supports custom columns)
  column: string;
  color: string;
  // Scrumban fields
  storyPoints?: number;
  priority?: 'low' | 'medium' | 'high';
  // Task assignment
  assigneeId?: string;
  assignee?: PopulatedUser;
  // Due date
  dueDate?: string;
}

export interface DragItem {
  index: number;
  id: TaskModel['id'];
  // origin column key
  from: string;
}
