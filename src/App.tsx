import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  ArrowDown, ArrowRight, ArrowUpRight, Bell, Check, CheckCircle2, ChevronDown,
  Clock3, Command, Focus, Headphones, Layers3, ListTodo, Menu, MoreHorizontal, Pause, Play, Plus,
  RotateCcw, Sparkles, Target, Timer, TrendingUp, UserRound, X, Zap,
} from 'lucide-react'
import AuthDialog from './components/AuthDialog'
import LegalDialog, { type LegalDocument } from './components/LegalDialog'
import { deleteCloudList, deleteCloudTask, insertCloudList, insertCloudTask, loadCloudWorkspace, renameCloudList, updateCloudTask } from './lib/cloudWorkspace'
import { isSupabaseConfigured, supportEmail, supabase } from './lib/supabase'
import { demoWorkspace, readWorkspace, saveWorkspace, type Task, type TaskList, type Workspace } from './lib/workspace'

type Priority = Task['priority']
type Filter = 'Все' | 'В процессе' | 'Выполненные'

const week = [
  { day: 'ПН', value: 48 },
  { day: 'ВТ', value: 72 },
  { day: 'СР', value: 56 },
  { day: 'ЧТ', value: 88 },
  { day: 'ПТ', value: 66 },
  { day: 'СБ', value: 38 },
  { day: 'ВС', value: 24 },
]

const features = [
  { icon: Layers3, title: 'Планирование без перегрузки', text: 'Соберите важное в одном месте и двигайтесь в комфортном темпе.' },
  { icon: Focus, title: 'Фокус-сессии', text: 'Работайте короткими отрезками и устраивайте паузы вовремя.' },
  { icon: TrendingUp, title: 'Аналитика привычек', text: 'Замечайте свой прогресс, находите ритм и закрепляйте полезное.' },
  { icon: Zap, title: 'Свои планы на каждом устройстве', text: 'При подключённом аккаунте твои списки и задачи синхронизируются между устройствами.' },
]

function App() {
  const [workspace, setWorkspace] = useState<Workspace>(readWorkspace)
  const { tasks, lists, selectedListId } = workspace
  const selectedList = lists.find((list) => list.id === selectedListId) ?? lists[0]
  const activeTasks = tasks.filter((task) => task.listId === selectedList?.id)
  const [filter, setFilter] = useState<Filter>('Все')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [listModalOpen, setListModalOpen] = useState(false)
  const [editingList, setEditingList] = useState<TaskList | null>(null)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(null)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [workspaceOwner, setWorkspaceOwner] = useState<string | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [mutationBusy, setMutationBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [timerRunning, setTimerRunning] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
        setAuthDialogOpen(true)
      }
    })
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        console.error('Не удалось восстановить сессию FocusFlow.', error)
        setNotice('Не удалось проверить аккаунт. Попробуй обновить страницу.')
        setLoading(false)
        return
      }
      setAuthUser(data.session?.user ?? null)
    }).catch((error: unknown) => {
      if (!active) return
      console.error('Не удалось подключиться к Supabase Auth.', error)
      setNotice('Не удалось подключиться к службе аккаунтов.')
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true
    if (!authUser) {
      setWorkspaceOwner('demo')
      setWorkspace(readWorkspace())
      setLoading(false)
      return () => { active = false }
    }

    setWorkspaceOwner(authUser.id)
    setWorkspace({ lists: [], tasks: [], selectedListId: '' })
    setLoading(true)
    void loadCloudWorkspace(authUser).then((cloudWorkspace) => {
      if (active) setWorkspace(cloudWorkspace)
    }).catch((error: unknown) => {
      if (!active) return
      console.error('Не удалось загрузить списки и задачи аккаунта.', error)
      setWorkspace({ lists: [], tasks: [], selectedListId: '' })
      setNotice('Не удалось загрузить облачный план. Проверь настройки базы Supabase.')
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [authUser])

  useEffect(() => {
    if (!authUser && workspaceOwner === 'demo') saveWorkspace(workspace)
  }, [authUser, workspace, workspaceOwner])

  useEffect(() => {
    if (!timerRunning) return
    const interval = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          setTimerRunning(false)
          setNotice('Фокус-сессия завершена. Время немного отдохнуть!')
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [timerRunning])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const completed = activeTasks.filter((task) => task.done).length
  const progress = activeTasks.length ? Math.round((completed / activeTasks.length) * 100) : 0
  const filteredTasks = useMemo(() => activeTasks.filter((task) => {
    if (filter === 'В процессе') return !task.done
    if (filter === 'Выполненные') return task.done
    return true
  }), [activeTasks, filter])
  const timerDisplay = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`
  const timerProgress = (secondsLeft / (25 * 60)) * 100
  const supportUrl = supportEmail
    ? `mailto:${supportEmail}`
    : 'https://github.com/pingpingov91-wq/focusflow-app/issues/new?title=Вопрос%20по%20FocusFlow'

  function openNewTask() {
    setEditingTask(null)
    setModalOpen(true)
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    if (!title || !selectedList) return
    const time = String(form.get('time') ?? '12:00')
    const priority = String(form.get('priority') ?? 'Средний') as Priority
    setMutationBusy(true)
    if (editingTask) {
      const updatedTask = { ...editingTask, title, time, priority }
      try {
        if (authUser) await updateCloudTask(updatedTask)
        setWorkspace((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === editingTask.id ? updatedTask : task) }))
        setNotice('Задача обновлена')
        setModalOpen(false)
      } catch (error) {
        console.error('Не удалось сохранить задачу.', error)
        setNotice('Не удалось сохранить задачу. Попробуй ещё раз.')
      }
    } else {
      const task: Task = { id: crypto.randomUUID(), listId: selectedList.id, title, time, priority, done: false }
      try {
        if (authUser) await insertCloudTask(authUser, task)
        setWorkspace((current) => ({ ...current, tasks: [...current.tasks, task] }))
        setNotice('Задача добавлена в твой список')
        setModalOpen(false)
      } catch (error) {
        console.error('Не удалось добавить задачу.', error)
        setNotice('Не удалось добавить задачу. Попробуй ещё раз.')
      }
    }
    setMutationBusy(false)
  }

  async function saveList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    if (!name) return
    setMutationBusy(true)

    try {
      if (editingList) {
        if (authUser) await renameCloudList(editingList.id, name)
        setWorkspace((current) => ({
          ...current,
          lists: current.lists.map((list) => list.id === editingList.id ? { ...list, name } : list),
        }))
        setNotice('Название списка обновлено')
      } else {
        const localList: TaskList = { id: crypto.randomUUID(), name, position: lists.length }
        const list = authUser ? await insertCloudList(authUser, name, lists.length) : localList
        setWorkspace((current) => ({ ...current, lists: [...current.lists, list], selectedListId: list.id }))
        setFilter('Все')
        setNotice('Новый список готов')
      }
      setListModalOpen(false)
    } catch (error) {
      console.error('Не удалось сохранить список FocusFlow.', error)
      setNotice('Не удалось сохранить список. Попробуй ещё раз.')
    } finally {
      setMutationBusy(false)
    }
  }

  async function removeList(list: TaskList) {
    if (lists.length <= 1) {
      setNotice('Оставь хотя бы один список в своём плане')
      return
    }
    if (!window.confirm(`Удалить список «${list.name}» и все его задачи?`)) return
    try {
      if (authUser) await deleteCloudList(list.id)
      setWorkspace((current) => {
        const remainingLists = current.lists.filter((item) => item.id !== list.id)
        return {
          ...current,
          lists: remainingLists,
          tasks: current.tasks.filter((task) => task.listId !== list.id),
          selectedListId: list.id === current.selectedListId ? remainingLists[0].id : current.selectedListId,
        }
      })
      setFilter('Все')
      setNotice('Список и его задачи удалены')
    } catch (error) {
      console.error('Не удалось удалить список FocusFlow.', error)
      setNotice('Не удалось удалить список. Попробуй ещё раз.')
    }
  }

  async function toggleTask(task: Task) {
    const updatedTask = { ...task, done: !task.done }
    setWorkspace((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? updatedTask : item) }))
    if (!authUser) return
    try {
      await updateCloudTask(updatedTask)
    } catch (error) {
      console.error('Не удалось обновить статус задачи.', error)
      setWorkspace((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? task : item) }))
      setNotice('Не удалось синхронизировать задачу. Попробуй ещё раз.')
    }
  }

  async function removeTask(task: Task) {
    if (authUser) {
      try {
        await deleteCloudTask(task.id)
      } catch (error) {
        console.error('Не удалось удалить задачу.', error)
        setNotice('Не удалось удалить задачу. Попробуй ещё раз.')
        return
      }
    }
    setWorkspace((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== task.id) }))
    setNotice('Задача удалена')
  }

  async function signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Не удалось выйти из аккаунта FocusFlow.', error)
      setNotice('Не удалось выйти из аккаунта. Попробуй ещё раз.')
    }
  }

  function scrollToDashboard() {
    document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <header className="site-header">
        <div className="nav-shell">
          <a className="brand" href="#home" aria-label="FocusFlow — на главную">
            <span className="brand-mark"><Focus size={20} strokeWidth={2.4} /></span>
            <span>focus<span className="brand-light">flow</span></span>
          </a>
          <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Открыть меню">
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <nav className={`nav-links ${menuOpen ? 'nav-open' : ''}`}>
            <a href="#features" onClick={() => setMenuOpen(false)}>Возможности</a>
            <a href="#dashboard" onClick={() => setMenuOpen(false)}>Демо</a>
            <a href="#reviews" onClick={() => setMenuOpen(false)}>Отзывы</a>
            <a href="#support" onClick={() => setMenuOpen(false)}>Поддержка</a>
          </nav>
          {authUser ? <button className="nav-cta account-button" onClick={() => void signOut()}><UserRound size={14} /> <span className="account-email">{authUser.email}</span><span>Выйти</span></button> : <button className="nav-cta" onClick={() => setAuthDialogOpen(true)}><UserRound size={14} /> Войти / регистрация <ArrowRight size={15} /></button>}
        </div>
      </header>

      <main id="home">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> ТВОЙ НОВЫЙ РИТМ РАБОТЫ</div>
            <h1>Работай с фокусом.<br /><span>Успевай больше.</span></h1>
            <p className="hero-subtitle">Планируй задачи, береги внимание и каждый день замечай, как много ты уже сделал.</p>
            <div className="hero-actions">
              <button className="button-primary" onClick={() => setAuthDialogOpen(true)}>Создать свой план <ArrowRight size={17} /></button>
              <button className="button-quiet" onClick={scrollToDashboard}><span className="play-small"><Play size={12} fill="currentColor" /></span> Посмотреть демо</button>
            </div>
            <div className="hero-trust"><div className="avatar-stack"><span>М</span><span>А</span><span>К</span><span>+</span></div><span><strong>2 400+</strong> человек нашли свой фокус</span></div>
          </div>
          <div className="hero-art" aria-label="Предпросмотр интерфейса FocusFlow">
            <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
            <div className="floating-note note-top"><span className="note-icon purple"><Check size={14} /></span><span><b>Отличный темп!</b><small>3 задачи выполнено</small></span><Sparkles size={16} className="sparkle-icon" /></div>
            <div className="preview-window">
              <div className="preview-top"><div className="window-dots"><i /><i /><i /></div><div className="preview-date">СРЕДА, 18 ИЮНЯ</div><div className="preview-avatar">М</div></div>
              <div className="preview-greeting"><span>Доброе утро, Мария <span className="wave">✦</span></span><small>Вот твой план на сегодня</small></div>
              <div className="preview-progress"><div className="preview-progress-top"><span>Прогресс дня</span><b>2 из 5 задач</b></div><div className="progress-track"><span style={{ width: '42%' }} /></div></div>
              <div className="preview-task checked"><span className="preview-check"><Check size={12} /></span><span>Подготовить презентацию<small>09:30 · Работа</small></span><CheckCircle2 size={16} className="task-done-icon" /></div>
              <div className="preview-task"><span className="preview-empty" /><span>Созвон с командой<small>11:00 · Встречи</small></span><span className="preview-priority" /></div>
              <div className="preview-task"><span className="preview-empty" /><span>Время для фокуса<small>14:00 · Личное</small></span><span className="preview-priority muted" /></div>
              <div className="preview-bottom"><div><span className="preview-timer-icon"><Timer size={15} /></span><span><b>Фокус-сессия</b><small>25 минут концентрации</small></span></div><span className="preview-start"><Play size={13} fill="currentColor" /></span></div>
            </div>
            <div className="floating-note note-bottom"><div className="mini-chart"><i /><i /><i /><i /><i /><i /><i /></div><span><b>+24%</b><small>продуктивность за неделю</small></span><TrendingUp size={17} className="trend-icon" /></div>
          </div>
          <a className="hero-scroll" href="#dashboard"><span><ArrowDown size={14} /></span> Посмотреть, как это работает</a>
        </section>

        <section className="dashboard-section section-wrap" id="dashboard">
          <div className="section-heading dashboard-heading">
            <div><div className="eyebrow"><span className="eyebrow-dot" /> ТВОЁ ПРОСТРАНСТВО</div><h2>День под твоим <span>контролем.</span></h2></div>
            <p>Не нужно делать всё. Достаточно<br className="desktop-break" /> делать важное — в своём темпе.</p>
          </div>
          <div className="dashboard-grid">
            <div className="panel tasks-panel">
              <div className="panel-header"><div><div className="panel-kicker">{authUser ? `АККАУНТ · ${authUser.email}` : 'ДЕМОНСТРАЦИЯ · ТВОЙ ПЛАН'}</div><h3>{selectedList?.name ?? 'Мой план'} <span className="today-badge">Твой список</span></h3></div><button className="icon-button" aria-label="Другие действия" onClick={() => setNotice(authUser ? 'Изменения синхронизируются с твоим аккаунтом' : 'Демо-план сохраняется только в этом браузере')}><MoreHorizontal size={20} /></button></div>
              <div className="day-progress">
                <div className="day-progress-label"><span>Твой прогресс</span><strong>{completed} <span>/ {activeTasks.length} задач</span></strong></div>
                <div className="day-track"><span style={{ width: `${progress}%` }} /></div>
              </div>
              <div className="list-switcher" aria-label="Твои списки">
                {lists.map((list) => <button key={list.id} className={`list-tab ${selectedListId === list.id ? 'active' : ''}`} aria-pressed={selectedListId === list.id} onClick={() => { setWorkspace((current) => ({ ...current, selectedListId: list.id })); setFilter('Все') }}><ListTodo size={13} />{list.name}<span>{tasks.filter((task) => task.listId === list.id).length}</span></button>)}
                <button className="create-list-button" onClick={() => { setEditingList(null); setListModalOpen(true) }}><Plus size={14} /> Новый список</button>
                {selectedList && <button className="manage-list-button" aria-label="Изменить название списка" onClick={() => { setEditingList(selectedList); setListModalOpen(true) }}><Command size={14} /></button>}
              </div>
              <div className="task-toolbar">
                <div className="filter-tabs" role="tablist" aria-label="Фильтр задач">
                  {(['Все', 'В процессе', 'Выполненные'] as Filter[]).map((item) => (
                    <button key={item} role="tab" aria-selected={filter === item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>
                  ))}
                </div>
                <button className="add-task-button" onClick={openNewTask}><Plus size={15} /> <span>Добавить</span></button>
              </div>
              <div className="task-list">
                {loading ? (
                  <div className="loading-state" aria-label="Загрузка задач"><i /><i /><i /></div>
                ) : filteredTasks.length === 0 ? (
                  <div className="empty-state"><span><ListTodo size={21} /></span><b>{activeTasks.length === 0 ? 'Список пока пуст' : 'В этом разделе пусто'}</b><p>{activeTasks.length === 0 ? `Добавь первую задачу в «${selectedList?.name ?? 'свой план'}».` : 'Попробуй другой фильтр или добавь новую задачу.'}</p>{activeTasks.length === 0 && <button className="text-action" onClick={openNewTask}>Добавить задачу <ArrowRight size={14} /></button>}</div>
                ) : filteredTasks.map((task) => (
                  <div className={`task-row ${task.done ? 'is-done' : ''}`} key={task.id}>
                    <button className={`task-checkbox ${task.done ? 'is-checked' : ''}`} aria-label={task.done ? 'Вернуть задачу в план' : 'Завершить задачу'} onClick={() => void toggleTask(task)}>{task.done && <Check size={13} />}</button>
                    <div className="task-description"><span>{task.title}</span><small><Clock3 size={12} /> {task.time}</small></div>
                    <span className={`priority priority-${task.priority === 'Высокий' ? 'high' : task.priority === 'Средний' ? 'medium' : 'low'}`}><i /> {task.priority}</span>
                    <div className="task-actions"><button aria-label="Редактировать задачу" onClick={() => { setEditingTask(task); setModalOpen(true) }}><span className="sr-only">Редактировать</span><Command size={14} /></button><button aria-label="Удалить задачу" onClick={() => void removeTask(task)}><span className="sr-only">Удалить</span><X size={15} /></button></div>
                  </div>
                ))}
              </div>
              <div className="list-bottom-actions"><button className="all-tasks-link" onClick={() => { setFilter('Все'); setNotice(`В списке «${selectedList?.name ?? 'Мой день'}» ${activeTasks.length} задач`) }}>Все задачи <ArrowRight size={14} /></button>{lists.length > 1 && selectedList && <button className="delete-list-button" onClick={() => void removeList(selectedList)}>Удалить список</button>}</div>
            </div>

            <div className="side-panels">
              <div className="panel focus-panel">
                <div className="side-panel-top"><div><div className="panel-kicker">POMODORO</div><h3>Время фокуса</h3></div><span className="focus-pill"><span /> Готов к старту</span></div>
                <div className="timer-layout">
                  <div className="timer-ring" style={{ background: `conic-gradient(#7164ef ${timerProgress * 3.6}deg, #efeff9 0deg)` }}><div className="timer-inner"><span>{timerDisplay}</span><small>МИНУТ ФОКУСА</small></div></div>
                  <div className="timer-details"><p>Один шаг за раз.<br />Ты справишься.</p><div className="timer-buttons"><button className="timer-play" onClick={() => { if (secondsLeft === 0) setSecondsLeft(25 * 60); setTimerRunning(!timerRunning) }}>{timerRunning ? <Pause size={15} fill="currentColor" /> : <Play size={14} fill="currentColor" />}{timerRunning ? 'Пауза' : 'Начать'}</button><button className="timer-reset" aria-label="Сбросить таймер" onClick={() => { setTimerRunning(false); setSecondsLeft(25 * 60) }}><RotateCcw size={15} /></button></div></div>
                </div>
                <div className="focus-footer"><span><Headphones size={14} /> Тихий режим включён</span><span><Target size={13} /> Сессия 1 из 4</span></div>
              </div>
              <div className="panel stats-panel">
                <div className="stats-header"><div><div className="panel-kicker">ТВОЙ ПРОГРЕСС</div><h3>Эта неделя</h3></div><button className="week-select" onClick={() => setNotice('Показана статистика текущей недели')}>Эта неделя <ChevronDown size={13} /></button></div>
                <div className="stats-total"><strong>18.5</strong><span>часов фокуса <i><TrendingUp size={12} /> демо</i></span></div>
                <div className="week-chart" aria-label="График часов фокуса за неделю">{week.map((item, index) => <div className="chart-column" key={item.day}><div className="chart-bar-wrap"><span className={`chart-bar ${index === 3 ? 'bar-today' : ''}`} style={{ height: `${item.value}%` }} /></div><small className={index === 3 ? 'chart-today' : ''}>{item.day}</small></div>)}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="features-section section-wrap" id="features">
          <div className="section-heading centered"><div className="eyebrow"><span className="eyebrow-dot" /> МЕНЬШЕ ШУМА, БОЛЬШЕ ЯСНОСТИ</div><h2>Всё для продуктивности.<br /><span>Без лишнего.</span></h2><p>Простые инструменты, которые помогают сосредоточиться на том, что действительно важно.</p></div>
          <div className="features-grid">{features.map(({ icon: Icon, title, text }, index) => <article className="feature-card" key={title}><div className={`feature-icon feature-icon-${index}`}><Icon size={19} strokeWidth={1.9} /></div><h3>{title}</h3><p>{text}</p><a href="#dashboard">Узнать больше <ArrowRight size={14} /></a></article>)}</div>
          <div className="feature-note"><span className="note-spark"><Sparkles size={17} /></span><span><b>Фокус — это не делать больше.</b> Это делать то, что важно именно сейчас.</span></div>
        </section>

        <section className="testimonial-section" id="reviews">
          <div className="section-wrap testimonial-inner">
            <div className="testimonial-copy"><div className="eyebrow"><span className="eyebrow-dot" /> НАС ВЫБИРАЮТ ЛЮДИ</div><h2>Хороший день —<br /><span>это не случайность.</span></h2><p>Иногда чтобы успевать больше, нужно не ускоряться, а наконец выдохнуть и сосредоточиться.</p><div className="rating-row"><div className="stars">★★★★★</div><strong>4.9</strong><span>из 5 на основе 240+ отзывов</span></div></div>
            <div className="quote-card"><div className="quote-mark">“</div><p>Раньше в конце дня я видела только то, что не успела. Теперь FocusFlow помогает замечать всё, что я сделала. Это совершенно другое ощущение.</p><div className="quote-author"><div className="author-avatar author-one">АК</div><span><b>Анна Крылова</b><small>Дизайнер продукта</small></span><div className="quote-dots"><i /><i /><i /></div></div><ArrowUpRight className="quote-arrow" size={18} /></div>
          </div>
        </section>

        <section className="closing-cta section-wrap"><div className="closing-spark"><Sparkles size={20} /></div><h2>Твой следующий хороший день<br />начинается <span>с одного шага.</span></h2><p>Составь собственный план и сосредоточься на главном.</p><button className="button-primary" onClick={() => { setWorkspace((current) => ({ ...current, selectedListId: current.lists[0]?.id ?? demoWorkspace.selectedListId })); scrollToDashboard() }}>Открыть мои списки <ArrowRight size={16} /></button><small>Все инструменты FocusFlow бесплатны</small></section>
      </main>

      <footer className="site-footer">
        <div className="section-wrap footer-main">
          <div className="footer-brand-col"><a className="brand" href="#home"><span className="brand-mark"><Focus size={20} strokeWidth={2.4} /></span><span>focus<span className="brand-light">flow</span></span></a><p>Чуть меньше спешки.<br />Чуть больше того, что важно.</p><div className="social-links"><a href="https://t.me/" aria-label="Telegram">tg</a><a href="https://instagram.com/" aria-label="Instagram">in</a><a href="https://linkedin.com/" aria-label="LinkedIn">li</a></div></div>
          <div className="footer-nav-col"><b>Продукт</b><a href="#features">Возможности</a><a href="#dashboard">Как это работает</a><a href="#reviews">Отзывы</a><button className="footer-legal" onClick={() => setAuthDialogOpen(true)}>Войти / регистрация</button></div>
          <div className="footer-nav-col"><b>Правовая информация</b><button className="footer-legal" onClick={() => setLegalDocument('terms')}>Пользовательское соглашение</button><button className="footer-legal" onClick={() => setLegalDocument('privacy')}>Конфиденциальность</button></div>
          <div className="footer-news" id="support"><b>Поддержка FocusFlow</b><p>Демо и собственные списки бесплатны. По вопросам работы сервиса свяжись с поддержкой.</p><a className="support-link" href={supportUrl} target={supportEmail ? undefined : '_blank'} rel={supportEmail ? undefined : 'noreferrer'}>{supportEmail ? 'Написать в службу поддержки' : 'Создать обращение на GitHub'} <ArrowUpRight size={15} /></a>{!supportEmail && <small className="support-note">Обращение будет видно публично. Не отправляй пароли и личные данные.</small>}</div>
        </div>
        <div className="section-wrap footer-bottom"><span>© 2026 FocusFlow. Сделано с заботой о твоём времени.</span><div><button onClick={() => setLegalDocument('privacy')}>Конфиденциальность</button><button onClick={() => setLegalDocument('terms')}>Условия использования</button><a href="#home"><Bell size={13} /> RU</a></div></div>
      </footer>

      {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !mutationBusy) setModalOpen(false) }}><form className="task-modal" onSubmit={(event) => void saveTask(event)} aria-labelledby="modal-title"><div className="modal-heading"><span className="modal-icon"><ListTodo size={18} /></span><button className="modal-close" type="button" onClick={() => setModalOpen(false)} aria-label="Закрыть"><X size={18} /></button></div><h3 id="modal-title">{editingTask ? 'Изменить задачу' : 'Новая задача'}</h3><p>Добавь важное в список «{selectedList?.name ?? 'Мой день'}».</p><label htmlFor="task-title">Название задачи</label><input id="task-title" name="title" required maxLength={100} placeholder="Например, подготовить презентацию" defaultValue={editingTask?.title ?? ''} autoFocus /><div className="modal-fields"><div><label htmlFor="task-time">Время</label><input id="task-time" name="time" type="time" defaultValue={editingTask?.time ?? '12:00'} /></div><div><label htmlFor="task-priority">Приоритет</label><select id="task-priority" name="priority" defaultValue={editingTask?.priority ?? 'Средний'}><option>Высокий</option><option>Средний</option><option>Низкий</option></select></div></div><button className="button-primary modal-submit" type="submit" disabled={mutationBusy}>{mutationBusy ? 'Сохраняю…' : editingTask ? 'Сохранить изменения' : 'Добавить задачу'} <ArrowRight size={16} /></button></form></div>}
      {listModalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !mutationBusy) setListModalOpen(false) }}><form className="task-modal" onSubmit={(event) => void saveList(event)} aria-labelledby="list-modal-title"><div className="modal-heading"><span className="modal-icon"><Layers3 size={18} /></span><button className="modal-close" type="button" onClick={() => setListModalOpen(false)} aria-label="Закрыть"><X size={18} /></button></div><h3 id="list-modal-title">{editingList ? 'Переименовать список' : 'Новый список'}</h3><p>{editingList ? 'Измени название своего плана.' : 'Раздели задачи так, как удобно именно тебе.'}</p><label htmlFor="list-name">Название списка</label><input id="list-name" name="name" required maxLength={60} placeholder="Например, Учёба или Мой проект" defaultValue={editingList?.name ?? ''} autoFocus /><button className="button-primary modal-submit" type="submit" disabled={mutationBusy}>{mutationBusy ? 'Сохраняю…' : editingList ? 'Сохранить название' : 'Создать список'} <ArrowRight size={16} /></button></form></div>}
      {authDialogOpen && <AuthDialog initialMode={passwordRecovery ? 'update-password' : undefined} onClose={() => { setAuthDialogOpen(false); setPasswordRecovery(false) }} onOpenLegal={setLegalDocument} onSuccess={setNotice} />}
      {legalDocument && <LegalDialog document={legalDocument} onChange={setLegalDocument} onClose={() => setLegalDocument(null)} supportEmail={supportEmail} />}
      {notice && <div className="toast" role="status"><span><Check size={14} /></span>{notice}<button aria-label="Закрыть уведомление" onClick={() => setNotice('')}><X size={14} /></button></div>}
    </>
  )
}

export default App
