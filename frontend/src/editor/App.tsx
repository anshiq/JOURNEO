import { ErrorBoundary } from '@shared/ErrorBoundary'
import { strings } from '@shared/strings'
import { lazy, type ReactNode, Suspense } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router'
import { CampaignsPage } from './routes/CampaignsPage'

const WorkspacePage = lazy(() => import('./workspace/Workspace').then(module => ({ default: module.WorkspacePage })))

function Loading() {
  return <p className="p-10 text-slate-500">{strings.loading}</p>
}

function RouteBoundary({ children }: { children: ReactNode }) {
  const location = useLocation()
  return (
    <ErrorBoundary key={location.pathname} context="route">
      {children}
    </ErrorBoundary>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <RouteBoundary>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<CampaignsPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/campaigns/:id" element={<WorkspacePage />} />
            <Route path="*" element={<CampaignsPage />} />
          </Routes>
        </Suspense>
      </RouteBoundary>
    </BrowserRouter>
  )
}
