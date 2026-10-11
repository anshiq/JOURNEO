import { strings } from '@shared/strings'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { CampaignsPage } from './routes/CampaignsPage'

const WorkspacePage = lazy(() => import('./workspace/Workspace').then(module => ({ default: module.WorkspacePage })))

function Loading() {
  return <p className="p-10 text-slate-500">{strings.loading}</p>
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<CampaignsPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/campaigns/:id" element={<WorkspacePage />} />
          <Route path="*" element={<CampaignsPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
