import { useEffect, useMemo, useState, type FormEvent } from 'react'
import './App.css'

type Priority = 'Agora' | 'Hoje' | 'Depois'
type ViewFilter = Priority | 'Todas'

type Task = {
  id: string
  title: string
  note: string
  priority: Priority
  done: boolean
  createdAt: number
}

const STORAGE_KEY = 'focus-loop.tasks.v1'

const seedTasks: Task[] = [
  {
    id: 'seed-1',
    title: 'Responder a mensagem que destrava o trabalho',
    note: 'Acao curta que remove bloqueio sem virar contexto novo.',
    priority: 'Agora',
    done: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 4,
  },
  {
    id: 'seed-2',
    title: 'Pagar uma conta ou agendar algo pendente',
    note: 'Evita esquecer um compromisso administrativo do dia.',
    priority: 'Hoje',
    done: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 8,
  },
  {
    id: 'seed-3',
    title: 'Organizar a lista da semana',
    note: 'Boa candidata para depois do expediente.',
    priority: 'Depois',
    done: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
]

const priorities: Priority[] = ['Agora', 'Hoje', 'Depois']

function createTask(title: string, note: string, priority: Priority): Task {
  return {
    id: crypto.randomUUID(),
    title,
    note,
    priority,
    done: false,
    createdAt: Date.now(),
  }
}

function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return seedTasks

    try {
      const parsed = JSON.parse(saved) as Task[]
      return parsed.length > 0 ? parsed : seedTasks
    } catch {
      return seedTasks
    }
  })
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [priority, setPriority] = useState<Priority>('Agora')
  const [view, setView] = useState<ViewFilter>('Todas')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  const pendingCount = tasks.filter((task) => !task.done).length
  const doneCount = tasks.filter((task) => task.done).length
  const nextTask = tasks.find((task) => !task.done) ?? tasks[0]
  const focusStreak = tasks.filter((task) => !task.done && task.priority === 'Agora').length

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
      return [
        'Tudo em ordem.',
        'Use a lista para capturar novas pendencias.',
        'Feche o dia sem ruido.',
      ]
    }

    return [
      `Proxima prioridade: ${nextTask?.title ?? 'Nenhuma tarefa aberta'}.`,
      focusStreak > 1
        ? 'Ha mais de uma acao urgente em aberto.'
        : 'Um passo curto pode destravar o resto.',
      doneCount > 0 ? `${doneCount} item(ns) ja foram finalizados.` : 'Comece pela tarefa mais curta.',
    ]
  }, [doneCount, focusStreak, nextTask, pendingCount])

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    setTasks((current) => [createTask(trimmedTitle, note.trim(), priority), ...current])
    setTitle('')
    setNote('')
    setPriority('Agora')
  }

  function toggleTask(id: string) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    )
  }

  function clearDone() {
    setTasks((current) => current.filter((task) => !task.done))
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
                  stroke="#d7ff4f"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient id="brandStroke" x1="8" x2="88" y1="12" y2="84">
                    <stop offset="0%" stopColor="#76f6d6" />
                    <stop offset="100%" stopColor="#1f6cff" />
                  </linearGradient>
                  <linearGradient id="brandStroke2" x1="8" x2="88" y1="84" y2="12">
                    <stop offset="0%" stopColor="#0f254f" />
                    <stop offset="100%" stopColor="#19b8d7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <p className="eyebrow">Focus Loop</p>
              <h1>Capture tarefas rapidas sem sair do fluxo.</h1>
            </div>
          </div>
          <p className="lede">
            Um painel simples para anotar o que apareceu, separar por urgencia e revisar o que
            ficou concluido no fim do dia.
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
          <button type="button" onClick={() => nextTask && toggleTask(nextTask.id)}>
            {nextTask?.done ? 'Reabrir tarefa' : 'Marcar como concluida'}
          </button>
        </aside>
      </section>

      <section className="workspace">
        <section className="insight-strip" aria-label="Resumo do momento">
          {prompts.map((prompt) => (
            <p key={prompt}>{prompt}</p>
          ))}
        </section>

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
          <button type="submit">Salvar tarefa</button>
        </form>

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
                    <button
                      key={task.id}
                      type="button"
                      className="task"
                      onClick={() => toggleTask(task.id)}
                    >
                      <div>
                        <strong>{task.title}</strong>
                        <p>{task.note || 'Sem observacao.'}</p>
                      </div>
                      <span>{task.done ? 'Feita' : 'Abrir'}</span>
                    </button>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>

        <footer className="footer-actions">
          <p>As tarefas concluidas continuam salvas localmente ate voce limpar a lista.</p>
          <button type="button" className="ghost" onClick={clearDone}>
            Limpar concluidas
          </button>
        </footer>
      </section>
    </main>
  )
}

export default App
