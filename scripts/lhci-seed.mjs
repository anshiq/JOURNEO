const api = process.env.API_URL ?? 'http://localhost:8000'
const name = 'Lighthouse template'

async function request(path, init = {}) {
  const response = await fetch(`${api}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path} failed with ${response.status}`)
  return response.json()
}

const { campaign } = await request('/api/v1/campaigns', {
  method: 'POST',
  body: JSON.stringify({ name, start: { mode: 'template', templateId: 'lead-gen-launch' } }),
})
const workspace = await request(`/api/v1/campaigns/${campaign.id}/journey`)
await request(`/api/v1/campaigns/${campaign.id}/journey/publish`, {
  method: 'POST',
  body: JSON.stringify({ revision: workspace.draft.revision }),
})
console.log(campaign.slug)
