import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowDown, ArrowRight, ArrowUpRight, Bell, Check, CheckCircle2, ChevronDown,
  Clock3, Command, Focus, Headphones, Layers3, ListTodo, Menu, MoreHorizontal, Pause, Play, Plus,
  RotateCcw, Sparkles, Target, Timer, TrendingUp, X, Zap,
} from 'lucide-react'

type Priority = 'Высокий' | 'Средний' | 'Низкий'
type Task = { id: number; title: string; time: string; priority: Priority; done: boolean }
type Filter = 'Все' | 'В процессе' | 'Выполненные'

const starterTasks: Task[] = [
  { id: 1, title: 'Подготовить концепцию нового проекта', time: '09:30', priority: 'Высокий', done: true },
  { id: 2, title: 'Созвон с командой продукта', time: '11:00', priority: 'Средний', done: false },
  { id: 3, title: 'Разобрать входящие и ответить на письма', time: '13:30', priority: 'Низкий', done: false },
  { id: 4, title: 'Доделать дизайн главной страницы', time: '15:00', priority: 'Высокий', done: false },
]

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
  { icon: Zap, title: 'Всё синхронизировано', text: 'Ваши планы под рукой на любом устройстве, когда бы ни понадобились.' },
]

function readTasks(): Task[] {
  try {
    const saved = localStorage.getItem('focusflow-tasks')
    if (!saved) return starterTasks
    const parsed: unknown = JSON.parse(saved)
    if (Array.isArray(parsed) && parsed.every((task) =>
      typeof task.id === 'number' && typeof task.title === 'string' &&
      typeof task.time === 'string' && typeof task.done === 'boolean' &&
      ['Высокий', 'Средний', 'Низкий'].includes(task.priority),
    )) return parsed as Task[]
    console.error('Сохранённый список задач FocusFlow имеет неверный формат.')
    return starterTasks
  } catch (error) {
    console.error('Не удалось загрузить задачи FocusFlow из браузера.', error)
    return starterTasks
  }
}

function App() {
  const [tasks, setTasks] = useState<Task[]>(readTasks)
  const [filter, setFilter] = useState<Filter>('Все')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [timerRunning, setTimerRunning] = useState(false)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 450)
    return () => window.clearTimeout(timeout)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('focusflow-tasks', JSON.stringify(tasks))
    } catch (error) {
      console.error('Не удалось сохранить задачи FocusFlow.', error)
    }
  }, [tasks])

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

  const completed = tasks.filter((task) => task.done).length
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0
  const filteredTasks = useMemo(() => tasks.filter((task) => {
    if (filter === 'В процессе') return !task.done
    if (filter === 'Выполненные') return task.done
    return true
  }), [tasks, filter])
  const timerDisplay = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`
  const timerProgress = (secondsLeft / (25 * 60)) * 100

  function openNewTask() {
    setEditingTask(null)
    setModalOpen(true)
  }

  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    if (!title) return
    const time = String(form.get('time') ?? '12:00')
    const priority = String(form.get('priority') ?? 'Средний') as Priority
    if (editingTask) {
      setTasks((current) => current.map((task) => task.id === editingTask.id ? { ...task, title, time, priority } : task))
      setNotice('Задача обновлена')
    } else {
      setTasks((current) => [...current, { id: Date.now(), title, time, priority, done: false }])
      setNotice('Задача добавлена в ваш план')
    }
    setModalOpen(false)
  }

  function scrollToDashboard() {
    document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' })
  }

  function submitNewsletter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newsletterEmail.trim()) return
    setSubscribed(true)
    setNewsletterEmail('')
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
            <a href="#pricing" onClick={() => setMenuOpen(false)}>Тарифы</a>
          </nav>
          <button className="nav-cta" onClick={scrollToDashboard}>Попробовать бесплатно <ArrowRight size={15} /></button>
        </div>
      </header>

      <main id="home">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> ТВОЙ НОВЫЙ РИТМ РАБОТЫ</div>
            <h1>Работай с фокусом.<br /><span>Успевай больше.</span></h1>
            <p className="hero-subtitle">Планируй задачи, береги внимание и каждый день замечай, как много ты уже сделал.</p>
            <div className="hero-actions">
              <button className="button-primary" onClick={scrollToDashboard}>Начать бесплатно <ArrowRight size={17} /></button>
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
              <div className="panel-header"><div><div className="panel-kicker">СРЕДА, 18 ИЮНЯ</div><h3>План на сегодня <span className="today-badge">Сегодня</span></h3></div><button className="icon-button" aria-label="Другие действия" onClick={() => setNotice('Ваш план сохраняется автоматически')}><MoreHorizontal size={20} /></button></div>
              <div className="day-progress">
                <div className="day-progress-label"><span>Твой прогресс</span><strong>{completed} <span>/ {tasks.length} задач</span></strong></div>
                <div className="day-track"><span style={{ width: `${progress}%` }} /></div>
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
                  <div className="empty-state"><span><ListTodo size={21} /></span><b>{tasks.length === 0 ? 'Пока нет задач' : 'В этом списке пусто'}</b><p>{tasks.length === 0 ? 'Добавь первую задачу и задай тон своему дню.' : 'Попробуй другой фильтр или добавь новую задачу.'}</p>{tasks.length === 0 && <button className="text-action" onClick={openNewTask}>Добавить задачу <ArrowRight size={14} /></button>}</div>
                ) : filteredTasks.map((task) => (
                  <div className={`task-row ${task.done ? 'is-done' : ''}`} key={task.id}>
                    <button className={`task-checkbox ${task.done ? 'is-checked' : ''}`} aria-label={task.done ? 'Вернуть задачу в план' : 'Завершить задачу'} onClick={() => setTasks((current) => current.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))}>{task.done && <Check size={13} />}</button>
                    <div className="task-description"><span>{task.title}</span><small><Clock3 size={12} /> {task.time}</small></div>
                    <span className={`priority priority-${task.priority === 'Высокий' ? 'high' : task.priority === 'Средний' ? 'medium' : 'low'}`}><i /> {task.priority}</span>
                    <div className="task-actions"><button aria-label="Редактировать задачу" onClick={() => { setEditingTask(task); setModalOpen(true) }}><span className="sr-only">Редактировать</span><Command size={14} /></button><button aria-label="Удалить задачу" onClick={() => { setTasks((current) => current.filter((item) => item.id !== task.id)); setNotice('Задача удалена') }}><span className="sr-only">Удалить</span><X size={15} /></button></div>
                  </div>
                ))}
              </div>
              <button className="all-tasks-link" onClick={() => { setFilter('Все'); setNotice(`В твоём плане ${tasks.length} задач`) }}>Все задачи <ArrowRight size={14} /></button>
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
                <div className="stats-total"><strong>18.5</strong><span>часов фокуса <i><TrendingUp size={12} /> 12%</i></span></div>
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

        <section className="pricing-section section-wrap" id="pricing">
          <div className="section-heading centered"><div className="eyebrow"><span className="eyebrow-dot" /> ПРОСТО И ЧЕСТНО</div><h2>Начни бесплатно.<br /><span>Расти в своём темпе.</span></h2><p>Все важные инструменты — уже в бесплатном плане. Никакой карты, никаких обязательств.</p></div>
          <div className="pricing-cards">
            <article className="price-card"><div className="plan-name">Для себя</div><h3>Бесплатно</h3><p>Чтобы найти свой ритм и сосредоточиться на главном.</p><button className="plan-button plan-light" onClick={scrollToDashboard}>Начать бесплатно <ArrowRight size={15} /></button><div className="plan-divider" /><ul><li><Check size={15} /> Неограниченные задачи</li><li><Check size={15} /> Фокус-таймер Pomodoro</li><li><Check size={15} /> Статистика за неделю</li><li><Check size={15} /> Синхронизация устройств</li></ul></article>
            <article className="price-card price-featured"><span className="popular-label"><Sparkles size={12} /> СКОРО</span><div className="plan-name">Для больших планов</div><h3>FocusFlow Pro</h3><p>Больше ясности для тех, кто хочет большего от своего времени.</p><button className="plan-button plan-purple" onClick={() => setNotice('FocusFlow Pro скоро появится. Следи за обновлениями!')}>Скоро появится <ArrowRight size={15} /></button><div className="plan-divider" /><ul><li><Check size={15} /> Всё из бесплатного плана</li><li><Check size={15} /> Умная аналитика привычек</li><li><Check size={15} /> Неограниченные проекты</li><li><Check size={15} /> Персональные темы</li></ul></article>
          </div>
        </section>

        <section className="closing-cta section-wrap"><div className="closing-spark"><Sparkles size={20} /></div><h2>Твой следующий хороший день<br />начинается <span>с одного шага.</span></h2><p>Создай бесплатный план и почувствуй разницу уже сегодня.</p><button className="button-primary" onClick={scrollToDashboard}>Начать бесплатно <ArrowRight size={16} /></button><small>Бесплатно навсегда · Без кредитной карты</small></section>
      </main>

      <footer className="site-footer">
        <div className="section-wrap footer-main">
          <div className="footer-brand-col"><a className="brand" href="#home"><span className="brand-mark"><Focus size={20} strokeWidth={2.4} /></span><span>focus<span className="brand-light">flow</span></span></a><p>Чуть меньше спешки.<br />Чуть больше того, что важно.</p><div className="social-links"><a href="https://t.me/" aria-label="Telegram">tg</a><a href="https://instagram.com/" aria-label="Instagram">in</a><a href="https://linkedin.com/" aria-label="LinkedIn">li</a></div></div>
          <div className="footer-nav-col"><b>Продукт</b><a href="#features">Возможности</a><a href="#dashboard">Как это работает</a><a href="#pricing">Тарифы</a><a href="#reviews">Отзывы</a></div>
          <div className="footer-nav-col"><b>Компания</b><a href="#home">О нас</a><a href="mailto:hello@focusflow.app">Контакты</a><a href="mailto:hello@focusflow.app">Поддержка</a></div>
          <div className="footer-news"><b>Немного фокуса в почту</b><p>Письма о продуктивности. Редко и по делу.</p><form onSubmit={submitNewsletter}><input type="email" required placeholder="Твоя почта" aria-label="Электронная почта" value={newsletterEmail} onChange={(event) => setNewsletterEmail(event.target.value)} /><button aria-label="Подписаться" type="submit"><ArrowRight size={16} /></button></form>{subscribed && <small className="subscribe-success"><Check size={13} /> Ты в списке! Скоро напишем.</small>}</div>
        </div>
        <div className="section-wrap footer-bottom"><span>© 2025 FocusFlow. Сделано с заботой о твоём времени.</span><div><a href="mailto:hello@focusflow.app?subject=Политика%20конфиденциальности">Конфиденциальность</a><a href="mailto:hello@focusflow.app?subject=Условия%20использования">Условия использования</a><a href="#home"><Bell size={13} /> RU</a></div></div>
      </footer>

      {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false) }}><form className="task-modal" onSubmit={saveTask} aria-labelledby="modal-title"><div className="modal-heading"><span className="modal-icon"><ListTodo size={18} /></span><button className="modal-close" type="button" onClick={() => setModalOpen(false)} aria-label="Закрыть"><X size={18} /></button></div><h3 id="modal-title">{editingTask ? 'Изменить задачу' : 'Новая задача'}</h3><p>Добавь важное — остальное подождёт.</p><label htmlFor="task-title">Название задачи</label><input id="task-title" name="title" required maxLength={100} placeholder="Например, подготовить презентацию" defaultValue={editingTask?.title ?? ''} autoFocus /><div className="modal-fields"><div><label htmlFor="task-time">Время</label><input id="task-time" name="time" type="time" defaultValue={editingTask?.time ?? '12:00'} /></div><div><label htmlFor="task-priority">Приоритет</label><select id="task-priority" name="priority" defaultValue={editingTask?.priority ?? 'Средний'}><option>Высокий</option><option>Средний</option><option>Низкий</option></select></div></div><button className="button-primary modal-submit" type="submit">{editingTask ? 'Сохранить изменения' : 'Добавить задачу'} <ArrowRight size={16} /></button></form></div>}
      {notice && <div className="toast" role="status"><span><Check size={14} /></span>{notice}<button aria-label="Закрыть уведомление" onClick={() => setNotice('')}><X size={14} /></button></div>}
    </>
  )
}

export default App
