export type Priority = 'Высокий' | 'Средний' | 'Низкий'

export type TaskList = {
  id: string
  name: string
  position: number
}

export type Task = {
  id: string
  listId: string
  title: string
  time: string
  priority: Priority
  done: boolean
}

export type Workspace = {
  lists: TaskList[]
  tasks: Task[]
  selectedListId: string
}

const demoListId = 'demo-list-daily'

export const demoWorkspace: Workspace = {
  lists: [
    { id: demoListId, name: 'Мой день', position: 0 },
    { id: 'demo-list-projects', name: 'Мои проекты', position: 1 },
  ],
  tasks: [
    { id: 'demo-task-1', listId: demoListId, title: 'Подготовить концепцию нового проекта', time: '09:30', priority: 'Высокий', done: true },
    { id: 'demo-task-2', listId: demoListId, title: 'Созвон с командой продукта', time: '11:00', priority: 'Средний', done: false },
    { id: 'demo-task-3', listId: demoListId, title: 'Разобрать входящие и ответить на письма', time: '13:30', priority: 'Низкий', done: false },
    { id: 'demo-task-4', listId: demoListId, title: 'Доделать дизайн главной страницы', time: '15:00', priority: 'Высокий', done: false },
  ],
  selectedListId: demoListId,
}

const storageKey = 'focusflow-workspace'
const priorities: Priority[] = ['Высокий', 'Средний', 'Низкий']

function isTaskList(value: unknown): value is TaskList {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.id === 'string' && typeof item.name === 'string' && typeof item.position === 'number'
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.id === 'string' && typeof item.listId === 'string' &&
    typeof item.title === 'string' && typeof item.time === 'string' &&
    typeof item.done === 'boolean' && priorities.includes(item.priority as Priority)
}

export function readWorkspace(): Workspace {
  try {
    const stored = localStorage.getItem(storageKey) ?? localStorage.getItem('focusflow-tasks')
    if (!stored) return demoWorkspace

    const parsed: unknown = JSON.parse(stored)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const candidate = parsed as Record<string, unknown>
      if (Array.isArray(candidate.lists) && candidate.lists.length > 0 && candidate.lists.every(isTaskList) &&
        Array.isArray(candidate.tasks) && candidate.tasks.every(isTask) &&
        typeof candidate.selectedListId === 'string') {
        const lists = candidate.lists as TaskList[]
        const tasks = candidate.tasks as Task[]
        return {
          lists,
          tasks,
          selectedListId: lists.some((list) => list.id === candidate.selectedListId)
            ? candidate.selectedListId
            : lists[0]?.id ?? demoListId,
        }
      }
    }

    if (Array.isArray(parsed) && parsed.every((item) => item && typeof item === 'object')) {
      const legacyTasks = parsed as Array<Record<string, unknown>>
      if (legacyTasks.every((task) => typeof task.title === 'string' &&
        typeof task.time === 'string' && typeof task.done === 'boolean' &&
        priorities.includes(task.priority as Priority))) {
        return {
          ...demoWorkspace,
          tasks: legacyTasks.map((task) => ({
            id: typeof task.id === 'number' ? String(task.id) : crypto.randomUUID(),
            listId: demoListId,
            title: task.title as string,
            time: task.time as string,
            priority: task.priority as Priority,
            done: task.done as boolean,
          })),
        }
      }
    }

    console.error('Сохранённый список задач FocusFlow имеет неверный формат.')
    return demoWorkspace
  } catch (error) {
    console.error('Не удалось загрузить задачи FocusFlow из браузера.', error)
    return demoWorkspace
  }
}

export function saveWorkspace(workspace: Workspace): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(workspace))
  } catch (error) {
    console.error('Не удалось сохранить задачи FocusFlow.', error)
  }
}
