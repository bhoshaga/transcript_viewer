// =============================================================================
// Tasks API - GraphQL
// =============================================================================

import { graphqlClient } from '../lib/graphql/client';
import { LIST_TASKS } from '../lib/graphql/queries';
import { CREATE_TASK, UPDATE_TASK, DELETE_TASK } from '../lib/graphql/mutations';
import {
  Task,
  TasksResponse,
  TaskStatus,
  TaskPriority,
  MutationResponse,
} from '../types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ListTasksData {
  tasks: TasksResponse;
}

interface CreateTaskData {
  createTask: MutationResponse & { task: Task };
}

interface UpdateTaskData {
  updateTask: MutationResponse;
}

interface DeleteTaskData {
  deleteTask: MutationResponse;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  meetingId: string;
  priority?: TaskPriority;
  assignedToUserId?: string;
  dueTime?: { date: string };
  tags?: string[];
}

export interface UpdateTaskInput {
  taskId: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedToUserId?: string;
  dueTime?: { date: string };
}

// -----------------------------------------------------------------------------
// API Functions
// -----------------------------------------------------------------------------

export async function listTasks(
  meetingId: string,
  limit: number = 100
): Promise<TasksResponse> {
  const data = await graphqlClient.query<ListTasksData>(
    LIST_TASKS,
    { input: { meetingId, limit } },
    'ListTasks'
  );

  return data.tasks;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const data = await graphqlClient.mutate<CreateTaskData>(
    CREATE_TASK,
    { input },
    'CreateTask'
  );

  return data.createTask.task;
}

export async function updateTask(input: UpdateTaskInput): Promise<boolean> {
  const data = await graphqlClient.mutate<UpdateTaskData>(
    UPDATE_TASK,
    { input },
    'UpdateTask'
  );

  return data.updateTask.success;
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const data = await graphqlClient.mutate<DeleteTaskData>(
    DELETE_TASK,
    { input: { taskId } },
    'DeleteTask'
  );

  return data.deleteTask.success;
}
