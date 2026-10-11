import createClient, { type Middleware } from 'openapi-fetch'
import { API_BASE } from '../env'
import type { paths } from './api.gen'
import { toProblem } from './problem'
import { readEditorToken } from './token'

const auth: Middleware = {
  onRequest({ request }) {
    const token = readEditorToken()
    if (token) request.headers.set('Authorization', `Bearer ${token}`)
    return request
  },
  async onResponse({ response }) {
    if (!response.ok) throw await toProblem(response)
    return response
  },
}

export const api = createClient<paths>({ baseUrl: API_BASE })
api.use(auth)
