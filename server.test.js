import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { requestHandler } from './server.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, 'data')

async function startServer(port) {
  const server = http.createServer((req, res) => {
    void requestHandler(req, res)
  })

  await new Promise((resolve) => server.listen(port, resolve))
  return server
}

async function fetchJson(url, options) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  })
  const body = await response.json()
  return { response, body }
}

test.beforeEach(async () => {
  await fs.rm(dataDir, { recursive: true, force: true })
})

test('health endpoint responds ok', async () => {
  const server = await startServer(3011)

  const { response, body } = await fetchJson('http://127.0.0.1:3011/api/health')

  assert.equal(response.status, 200)
  assert.deepEqual(body, { ok: true })

  await new Promise((resolve) => server.close(resolve))
})

test('state endpoint returns default state', async () => {
  const server = await startServer(3012)

  const { response, body } = await fetchJson('http://127.0.0.1:3012/api/state')

  assert.equal(response.status, 200)
  assert.equal(body.tasks.length, 3)
  assert.equal(body.pomodoro.focus, 25 * 60)

  await new Promise((resolve) => server.close(resolve))
})

test('can create, update and delete tasks', async () => {
  const server = await startServer(3013)

  const created = await fetchJson('http://127.0.0.1:3013/api/tasks', {
    method: 'POST',
    body: JSON.stringify({ title: 'Teste', note: 'Nota', priority: 'Hoje' }),
  })
  assert.equal(created.response.status, 201)
  assert.equal(created.body.title, 'Teste')

  await fetchJson(`http://127.0.0.1:3013/api/tasks/${created.body.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ done: true }),
  })

  const state = await fetchJson('http://127.0.0.1:3013/api/state')
  const updatedTask = state.body.tasks.find((task) => task.id === created.body.id)
  assert.equal(updatedTask.done, true)

  await fetchJson(`http://127.0.0.1:3013/api/tasks/${created.body.id}`, {
    method: 'DELETE',
  })

  const afterDelete = await fetchJson('http://127.0.0.1:3013/api/state')
  const deletedTask = afterDelete.body.tasks.find((task) => task.id === created.body.id)
  assert.equal(deletedTask, undefined)

  await new Promise((resolve) => server.close(resolve))
})

test('can update pomodoro state', async () => {
  const server = await startServer(3014)

  const { response, body } = await fetchJson('http://127.0.0.1:3014/api/pomodoro', {
    method: 'PATCH',
    body: JSON.stringify({
      focus: 1200,
      breakTime: 300,
      running: true,
      cycles: 2,
      activeTimer: 'break',
    }),
  })

  assert.equal(response.status, 200)
  assert.equal(body.focus, 1200)
  assert.equal(body.activeTimer, 'break')

  await new Promise((resolve) => server.close(resolve))
})
