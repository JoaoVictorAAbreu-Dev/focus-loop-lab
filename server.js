import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, 'data')
const dataFile = path.join(dataDir, 'state.json')
const port = 3001

const defaultState = {
  tasks: [
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
  ],
  pomodoro: {
    focus: 25 * 60,
    breakTime: 5 * 60,
    running: false,
    cycles: 1,
    activeTimer: 'focus',
  },
}

async function readState() {
  try {
    const raw = await fs.readFile(dataFile, 'utf8')
    return JSON.parse(raw)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
    await fs.writeFile(dataFile, JSON.stringify(defaultState, null, 2))
    return defaultState
  }
}

async function writeState(state) {
  await fs.mkdir(dataDir, { recursive: true })
  await fs.writeFile(dataFile, JSON.stringify(state, null, 2))
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify(payload))
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve(text ? JSON.parse(text) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

export async function requestHandler(req, res) {
  if (!req.url) {
    sendJson(res, 400, { error: 'Missing URL' })
    return
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  if (req.url === '/api/health') {
    sendJson(res, 200, { ok: true })
    return
  }

  const state = await readState()

  if (req.url === '/api/state' && req.method === 'GET') {
    sendJson(res, 200, state)
    return
  }

  if (req.url === '/api/tasks' && req.method === 'POST') {
    const body = await collectBody(req)
    const task = {
      id: crypto.randomUUID(),
      title: String(body.title ?? '').trim(),
      note: String(body.note ?? '').trim(),
      priority: body.priority ?? 'Agora',
      done: false,
      createdAt: Date.now(),
    }

    if (!task.title) {
      sendJson(res, 400, { error: 'Task title is required' })
      return
    }

    const nextState = { ...state, tasks: [task, ...state.tasks] }
    await writeState(nextState)
    sendJson(res, 201, task)
    return
  }

  const taskMatch = req.url.match(/^\/api\/tasks\/([^/]+)$/)
  if (taskMatch && req.method === 'PATCH') {
    const body = await collectBody(req)
    const nextTasks = state.tasks.map((task) =>
      task.id === taskMatch[1] ? { ...task, ...body } : task,
    )
    const nextState = { ...state, tasks: nextTasks }
    await writeState(nextState)
    sendJson(res, 200, { ok: true })
    return
  }

  if (taskMatch && req.method === 'DELETE') {
    const nextState = {
      ...state,
      tasks: state.tasks.filter((task) => task.id !== taskMatch[1]),
    }
    await writeState(nextState)
    sendJson(res, 200, { ok: true })
    return
  }

  if (req.url === '/api/pomodoro' && req.method === 'PATCH') {
    const body = await collectBody(req)
    const nextState = {
      ...state,
      pomodoro: {
        ...state.pomodoro,
        ...body,
      },
    }
    await writeState(nextState)
    sendJson(res, 200, nextState.pomodoro)
    return
  }

  sendJson(res, 404, { error: 'Not found' })
}

const server = http.createServer((req, res) => {
  void requestHandler(req, res)
})

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  server.listen(port, () => {
    console.log(`Focus Loop API running on http://127.0.0.1:${port}`)
  })
}
