import { useEffect, useMemo, useState, type FormEvent } from 'react'
import './App.css'

type Priority = 'Agora' | 'Hoje' | 'Depois'
type ViewFilter = Priority | 'Todas'
type Screen = 'tarefas' | 'pomodoro' | 'agenda'

type Task = {
  id: string
  title: string
  note: string
  priority: Priority
  done: boolean
  createdAt: number
}

type PomodoroState = {
  focus: number
  breakTime: number
  running: boolean
  cycles: number
  activeTimer: 'focus' | 'break'
}

type ApiState = {
  tasks: Task[]
  pomodoro: PomodoroState
}

const API_BASE = '/api'
const priorities: Priority[] = ['Agora', 'Hoje', 'Depois']

const agendaItems = [
  { time: '08:30', title: 'Planejar o dia', note: 'Ver primeira tarefa e definir foco.' },
  { time: '10:00', title: 'Bloco profundo', note: 'Uma sessão de Pomodoro sem distrações.' },
  { time: '14:00', title: 'Responder pendências', note: 'E-mails, mensagens e retornos rápidos.' },
  { time: '17:30', title: 'Fechamento', note: 'Revisar concluídas e preparar amanhã.' },
]

const fallbackPomodoro: PomodoroState = {
  focus: 25 * 60,
  breakTime: 5 * 60,
  running: false,
  cycles: 1,
  activeTimer: 'focus',
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

function App() {
  const [screen, setScreen] = useState<Screen>('tarefas')
  const [state, setState] = useState<ApiState | null>(null)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [priority, setPriority] = useState<Priority>('Agora')
  const [view, setView] = useState<ViewFilter>('Todas')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadState() {
      try {
        setLoading(true)
        const data = await apiFetch<ApiState>('/state')
        if (active) setState(data)
      } catch {
        if (active) setError('Nao foi possivel carregar os dados do backend.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadState()
    return () => {
      active = false
    }
  }, [])

  const tasks = useMemo(() => state?.tasks ?? [], [state])
  const pomodoro = state?.pomodoro ?? fallbackPomodoro

  useEffect(() => {
    if (!state?.pomodoro.running) return

    const interval = window.setInterval(() => {
      setState((current) => {
        if (!current) return current
        const timerKey = current.pomodoro.activeTimer === 'focus' ? 'focus' : 'breakTime'
        const nextValue = Math.max(0, current.pomodoro[timerKey] - 1)

        if (nextValue > 0) {
          void apiFetch('/pomodoro', {
            method: 'PATCH',
            body: JSON.stringify({
              [timerKey]: nextValue,
              running: current.pomodoro.running,
              activeTimer: current.pomodoro.activeTimer,
            }),
          })
          return {
            ...current,
            pomodoro: { ...current.pomodoro, [timerKey]: nextValue } as PomodoroState,
          }
        }

        const resetValue = current.pomodoro.activeTimer === 'focus' ? 25 * 60 : 5 * 60
        const nextTimer: PomodoroState['activeTimer'] =
          current.pomodoro.activeTimer === 'focus' ? 'break' : 'focus'
        const nextPomodoro: PomodoroState = {
          ...current.pomodoro,
          [timerKey]: resetValue,
          running: false,
          cycles:
            current.pomodoro.activeTimer === 'focus'
              ? current.pomodoro.cycles + 1
              : current.pomodoro.cycles,
          activeTimer: nextTimer,
        }

        void apiFetch('/pomodoro', {
          method: 'PATCH',
          body: JSON.stringify(nextPomodoro),
        })
          return { ...current, pomodoro: nextPomodoro }
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [state?.pomodoro.running, state?.pomodoro.activeTimer])

  const pendingCount = tasks.filter((task) => !task.done).length
  const doneCount = tasks.filter((task) => task.done).length
  const nextTask = tasks.find((task) => !task.done) ?? tasks[0]
  const focusStreak = tasks.filter((task) => !task.done && task.priority === 'Agora').length
  const topPending = tasks
    .filter((task) => !task.done)
    .sort((left, right) => priorities.indexOf(left.priority) - priorities.indexOf(right.priority))
    .slice(0, 3)

  const groupedTasks = useMemo(
    () =>
      priorities.map((level) => ({
        level,
        items: tasks.filter(
          (task) =>
            task.priority === level &&
            !task.done &&
            (view === 'Todas' || task.priority === view),
        ),
      })),
    [tasks, view],
  )

  const prompts = useMemo(() => {
    if (pendingCount === 0) {
      return ['Tudo em ordem.', 'Capture novas pendencias quando surgirem.', 'Feche o dia sem ruido.']
    }

    return [
      `Proxima prioridade: ${nextTask?.title ?? 'Nenhuma tarefa aberta'}.`,
      focusStreak > 1 ? 'Ha mais de uma acao urgente em aberto.' : 'Um passo curto pode destravar o resto.',
      doneCount > 0 ? `${doneCount} item(ns) ja foram finalizados.` : 'Comece pela tarefa mais curta.',
    ]
  }, [doneCount, focusStreak, nextTask, pendingCount])

  const dailySummary = useMemo(() => {
    const pendingList = topPending.map((task) => `- ${task.title} [${task.priority}]`).join('\n')
    return [
      'Resumo Focus Loop',
      `Pendentes: ${pendingCount}`,
      `Concluidas: ${doneCount}`,
      `Proxima acao: ${nextTask?.title ?? 'Nenhuma tarefa aberta'}`,
      '',
      'Top 3 pendencias:',
      pendingList || '- Nenhuma pendencia',
    ].join('\n')
  }, [doneCount, nextTask, pendingCount, topPending])

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true

      if (typing) return

      if (event.ctrlKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        void navigator.clipboard.writeText(dailySummary)
        return
      }

      if (event.key === '1') setScreen('tarefas')
      if (event.key === '2') setScreen('pomodoro')
      if (event.key === '3') setScreen('agenda')
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [dailySummary])

  async function refreshState() {
    const data = await apiFetch<ApiState>('/state')
    setState(data)
  }

  async function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    if (editingTaskId) {
      await apiFetch(`/tasks/${editingTaskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: trimmedTitle, note: note.trim(), priority }),
      })
      setEditingTaskId(null)
    } else {
      await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: trimmedTitle, note: note.trim(), priority }),
      })
    }

    setTitle('')
    setNote('')
    setPriority('Agora')
    await refreshState()
  }

  function startEditingTask(task: Task) {
    setEditingTaskId(task.id)
    setTitle(task.title)
    setNote(task.note)
    setPriority(task.priority)
    setScreen('tarefas')
  }

  function cancelEditingTask() {
    setEditingTaskId(null)
    setTitle('')
    setNote('')
    setPriority('Agora')
  }

  async function toggleTask(id: string, done: boolean) {
    await apiFetch(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ done }),
    })
    await refreshState()
  }

  async function clearDone() {
    const completed = tasks.filter((task) => task.done)
    await Promise.all(completed.map((task) => apiFetch(`/tasks/${task.id}`, { method: 'DELETE' })))
    await refreshState()
  }

  async function copyDailySummary() {
    await navigator.clipboard.writeText(dailySummary)
  }

  async function resetPomodoro() {
    await apiFetch('/pomodoro', {
      method: 'PATCH',
      body: JSON.stringify({
        focus: 25 * 60,
        breakTime: 5 * 60,
        running: false,
        cycles: 1,
        activeTimer: 'focus',
      }),
    })
    await refreshState()
  }

  async function togglePomodoro() {
    await apiFetch('/pomodoro', {
      method: 'PATCH',
      body: JSON.stringify({ ...pomodoro, running: !pomodoro.running }),
    })
    await refreshState()
  }

  if (loading) {
    return (
      <main className="app-shell">
        <section className="summary-card">
          <div>
            <p className="card-kicker">Carregando</p>
            <h3>Conectando ao backend local.</h3>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 96 96" role="presentation">
                <path
                  d="M67 11c13 5 23 18 23 33 0 20-15 37-35 37-12 0-23-5-30-14"
                  fill="none"
                  stroke="url(#brandStroke)"
                  strokeWidth="9"
                  strokeLinecap="round"
                />
                <path
                  d="M30 85C16 79 8 66 8 50 8 30 23 14 43 14c10 0 19 4 26 10"
                  fill="none"
                  stroke="url(#brandStroke2)"
                  strokeWidth="9"
                  strokeLinecap="round"
                />
                <path
                  d="M26 49l12 12 24-26"
                  fill="none"
                  stroke="#c17746"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient id="brandStroke" x1="8" x2="88" y1="12" y2="84">
                    <stop offset="0%" stopColor="#8f5b3d" />
                    <stop offset="100%" stopColor="#c17746" />
                  </linearGradient>
                  <linearGradient id="brandStroke2" x1="8" x2="88" y1="84" y2="12">
                    <stop offset="0%" stopColor="#f3efe6" />
                    <stop offset="100%" stopColor="#d7b894" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <p className="eyebrow">Focus Loop</p>
              <h1>Capture tarefas, faça pausas e feche o dia com clareza.</h1>
            </div>
          </div>
          <p className="lede">
            Um painel leve para organizar tarefas, usar Pomodoro e acompanhar a agenda em uma
            interface clara, quente e confortável.
          </p>

          <div className="stats">
            <article>
              <strong>{pendingCount}</strong>
              <span>Pendentes</span>
            </article>
            <article>
              <strong>{doneCount}</strong>
              <span>Concluidas</span>
            </article>
            <article>
              <strong>{tasks.length}</strong>
              <span>Total</span>
            </article>
          </div>
        </div>

        <aside className="focus-card">
          <p className="card-kicker">Radar do dia</p>
          <span className="card-label">Proxima acao</span>
          <h2>{nextTask?.title ?? 'Nada pendente'}</h2>
          <p>{nextTask?.note ?? 'Seu quadro esta limpo. Bom momento para encerrar o dia.'}</p>
          <button type="button" onClick={() => nextTask && toggleTask(nextTask.id, !nextTask.done)}>
            {nextTask?.done ? 'Reabrir tarefa' : 'Marcar como concluida'}
          </button>
        </aside>
      </section>

      {error ? (
        <section className="summary-card">
          <div>
            <p className="card-kicker">Backend</p>
            <h3>{error}</h3>
            <p>Verifique se o servidor local esta rodando em paralelo com o Vite.</p>
          </div>
        </section>
      ) : null}

      <nav className="screen-switcher" aria-label="Telas do aplicativo">
        {[
          { id: 'tarefas', label: 'Tarefas' },
          { id: 'pomodoro', label: 'Pomodoro' },
          { id: 'agenda', label: 'Agenda' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={screen === item.id ? 'screen-chip active' : 'screen-chip'}
            onClick={() => setScreen(item.id as Screen)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <section className="workspace">
        <section className="insight-strip" aria-label="Resumo do momento">
          {prompts.map((prompt) => (
            <p key={prompt}>{prompt}</p>
          ))}
        </section>

        <section className="summary-card" aria-label="Resumo para compartilhar">
          <div>
            <p className="card-kicker">Compartilhar</p>
            <h3>Resumo do dia pronto para copiar.</h3>
            <p>
              Use isso para colar no WhatsApp, no Slack ou no seu notebook e manter o foco sem
              reescrever manualmente.
            </p>
          </div>
          <button type="button" className="ghost" onClick={copyDailySummary}>
            Copiar resumo
          </button>
        </section>

        <section className="shortcut-strip" aria-label="Atalhos">
          <span>Atalhos</span>
          <p>1 tarefas</p>
          <p>2 pomodoro</p>
          <p>3 agenda</p>
          <p>Ctrl + K copia resumo</p>
        </section>

        {screen === 'tarefas' && (
          <>
          <form className="quick-add" onSubmit={handleAddTask}>
              <label>
                <span>Tarefa</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ex: responder cliente, pagar conta, marcar consulta"
                />
              </label>
              <label>
                <span>Detalhe curto</span>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Opcional: contexto de 1 linha"
                />
              </label>
              <label>
                <span>Prioridade</span>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as Priority)}
                >
                  {priorities.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit">{editingTaskId ? 'Salvar alterações' : 'Salvar tarefa'}</button>
            </form>
            {editingTaskId ? (
              <div className="edit-banner">
                <span>Editando tarefa</span>
                <button type="button" className="ghost" onClick={cancelEditingTask}>
                  Cancelar edição
                </button>
              </div>
            ) : null}

            <div className="view-switcher" role="tablist" aria-label="Filtrar lista">
              {(['Todas', ...priorities] as ViewFilter[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={view === item ? 'chip active' : 'chip'}
                  onClick={() => setView(item)}
                  aria-pressed={view === item}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="columns">
              {groupedTasks.map(({ level, items }) => (
                <section key={level} className="lane">
                  <header>
                    <h3>{level}</h3>
                    <span>{items.length}</span>
                  </header>

                  <div className="task-list">
                    {items.length === 0 ? (
                      <p className="empty-state">Sem tarefas nesta faixa.</p>
                    ) : (
                      items.map((task) => (
                    <article key={task.id} className="task">
                      <button
                        type="button"
                        className="task-body"
                        onClick={() => toggleTask(task.id, !task.done)}
                      >
                        <div>
                          <strong>{task.title}</strong>
                          <p>{task.note || 'Sem observacao.'}</p>
                        </div>
                        <span>{task.done ? 'Feita' : 'Abrir'}</span>
                      </button>
                      <div className="task-actions">
                        <button
                          type="button"
                          className="task-link"
                          onClick={() => startEditingTask(task)}
                        >
                          Editar
                        </button>
                      </div>
                    </article>
                  ))
                )}
                  </div>
                </section>
              ))}
            </div>

            <footer className="footer-actions">
              <p>As tarefas concluidas continuam salvas no backend ate voce limpar a lista.</p>
              <button type="button" className="ghost" onClick={clearDone}>
                Limpar concluidas
              </button>
            </footer>
          </>
        )}

        {screen === 'pomodoro' && (
          <section className="pomodoro-panel">
            <div className="pomodoro-ring">
              <span>Pomodoro</span>
              <strong>{formatTime(pomodoro.activeTimer === 'focus' ? pomodoro.focus : pomodoro.breakTime)}</strong>
              <p>{pomodoro.activeTimer === 'focus' ? 'Bloco de foco' : 'Pausa curta'}</p>
            </div>

            <div className="pomodoro-actions">
              <button type="button" className="primary" onClick={togglePomodoro}>
                {pomodoro.running ? 'Pausar' : 'Iniciar'}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={async () => {
                  const nextTimer = pomodoro.activeTimer === 'focus' ? 'break' : 'focus'
                  await apiFetch('/pomodoro', {
                    method: 'PATCH',
                    body: JSON.stringify({ ...pomodoro, activeTimer: nextTimer, running: false }),
                  })
                  await refreshState()
                }}
              >
                Alternar foco/pausa
              </button>
              <button type="button" className="ghost" onClick={resetPomodoro}>
                Reiniciar
              </button>
            </div>

            <div className="pomodoro-meta">
              <article>
                <strong>{pomodoro.cycles}</strong>
                <span>Ciclos</span>
              </article>
              <article>
                <strong>25</strong>
                <span>Min foco</span>
              </article>
              <article>
                <strong>5</strong>
                <span>Min pausa</span>
              </article>
            </div>
          </section>
        )}

        {screen === 'agenda' && (
          <section className="agenda-panel">
            {agendaItems.map((item) => (
              <article key={item.time} className="agenda-item">
                <span>{item.time}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.note}</p>
                </div>
              </article>
            ))}
          </section>
        )}
      </section>
    </main>
  )
}

export default App
