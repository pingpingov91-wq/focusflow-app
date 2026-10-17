import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Priority, Task, TaskList, Workspace } from './workspace'

function getClient() {
  if (!supabase) {
    throw new Error('Синхронизация не настроена. Подключите проект Supabase.')
  }
  return supabase
}

export async function loadCloudWorkspace(user: User): Promise<Workspace> {
  const client = getClient()
  const { data: existingLists, error: listError } = await client
    .from('task_lists')
    .select('id, name, position')
    .order('position')

  if (listError) throw new Error(listError.message)

  let lists = existingLists as TaskList[]

  if (lists.length === 0) {
    const { data, error } = await client
      .from('task_lists')
      .insert({ user_id: user.id, name: 'Мой день', position: 0 })
      .select('id, name, position')
      .single()
    if (error) throw new Error(error.message)
    lists = [data as TaskList]
  }

  const listIds = lists.map((list) => list.id)
  const { data: cloudTasks, error: taskError } = await client
    .from('tasks')
    .select('id, list_id, title, scheduled_time, priority, done')
    .in('list_id', listIds)
    .order('created_at')

  if (taskError) throw new Error(taskError.message)

  const tasks: Task[] = cloudTasks.map((task) => ({
    id: task.id,
    listId: task.list_id,
    title: task.title,
    time: task.scheduled_time,
    priority: task.priority as Priority,
    done: task.done,
  }))

  return { lists, tasks, selectedListId: lists[0].id }
}

export async function insertCloudList(user: User, name: string, position: number): Promise<TaskList> {
  const { data, error } = await getClient()
    .from('task_lists')
    .insert({ user_id: user.id, name, position })
    .select('id, name, position')
    .single()
  if (error) throw new Error(error.message)
  return data as TaskList
}

export async function renameCloudList(listId: string, name: string): Promise<void> {
  const { error } = await getClient().from('task_lists').update({ name }).eq('id', listId)
  if (error) throw new Error(error.message)
}

export async function deleteCloudList(listId: string): Promise<void> {
  const { error } = await getClient().from('task_lists').delete().eq('id', listId)
  if (error) throw new Error(error.message)
}

export async function insertCloudTask(user: User, task: Task): Promise<void> {
  const { error } = await getClient().from('tasks').insert({
    id: task.id,
    user_id: user.id,
    list_id: task.listId,
    title: task.title,
    scheduled_time: task.time,
    priority: task.priority,
    done: task.done,
  })
  if (error) throw new Error(error.message)
}

export async function updateCloudTask(task: Task): Promise<void> {
  const { error } = await getClient().from('tasks').update({
    title: task.title,
    scheduled_time: task.time,
    priority: task.priority,
    done: task.done,
  }).eq('id', task.id)
  if (error) throw new Error(error.message)
}

export async function deleteCloudTask(taskId: string): Promise<void> {
  const { error } = await getClient().from('tasks').delete().eq('id', taskId)
  if (error) throw new Error(error.message)
}
