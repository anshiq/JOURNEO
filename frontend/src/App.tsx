import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Campaigns from './pages/Campaigns'
import CampaignDetail from './pages/CampaignDetail'
import JourneyCanvas from './pages/JourneyCanvas'
import Analytics from './pages/Analytics'
import KnowledgeBase from './pages/KnowledgeBase'
import StudioAI from './pages/StudioAI'
import Approvals from './pages/Approvals'
import DataCatalog from './pages/DataCatalog'
import Eval from './pages/Eval'
import Trace from './pages/Trace'
import CampaignSetup from './pages/CampaignSetup'
import PublicCampaign from './pages/PublicCampaign'
import { Toaster } from './components/ui/Sonner'
import { TooltipProvider } from './components/ui/Tooltip'

function Nav(){
  const links=[["/campaigns","Campaigns"],["/analytics","Analytics"],["/knowledge-base","Knowledge"],["/studio-ai","Studio AI"],["/approvals","Approvals"],["/data-catalog","Catalog"],["/eval","Eval"],["/trace","Trace"]]
  return <nav className="bg-foreground text-background">
    <div className="mx-auto flex max-w-7xl items-baseline gap-8 px-6 py-4">
      <Link to="/campaigns" className="font-display text-2xl tracking-tight">JOURNEO</Link>
      <div className="flex flex-wrap items-center gap-5">
        {links.map(([to,label])=><Link key={to} to={to} className="text-eyebrow opacity-70 transition-colors hover:opacity-100">{label}</Link>)}
      </div>
    </div>
    <div className="rule-strong" />
  </nav>
}
function Shell(){
  const { pathname } = useLocation()
  const isWorkspace = /\/campaigns\/.+\/setup/.test(pathname) || pathname.startsWith('/c/') || pathname.startsWith('/d/')
  return (
    <>
      {!isWorkspace && <Nav />}
      <Routes>
        <Route path="/" element={<div className="mx-auto max-w-7xl p-6 md:p-8"><Campaigns /></div>} />
        <Route path="/campaigns" element={<div className="mx-auto max-w-7xl p-6 md:p-8"><Campaigns /></div>} />
        <Route path="/campaigns/:id" element={<div className="mx-auto max-w-7xl p-6 md:p-8"><CampaignDetail /></div>} />
        <Route path="/campaigns/:id/setup" element={<CampaignSetup />} />
        <Route path="/c/:id" element={<PublicCampaign />} />
        <Route path="/d/:token" element={<PublicCampaign />} />
        <Route path="/campaigns/:id/journey" element={<div className="mx-auto max-w-7xl p-6 md:p-8"><JourneyCanvas /></div>} />
        <Route path="/campaigns/:id/analytics" element={<div className="mx-auto max-w-7xl p-6 md:p-8"><Analytics /></div>} />
        <Route path="/knowledge-base" element={<div className="mx-auto max-w-7xl p-6 md:p-8"><KnowledgeBase /></div>} />
        <Route path="/studio-ai" element={<div className="mx-auto max-w-7xl p-6 md:p-8"><StudioAI /></div>} />
        <Route path="/approvals" element={<div className="mx-auto max-w-7xl p-6 md:p-8"><Approvals /></div>} />
        <Route path="/data-catalog" element={<div className="mx-auto max-w-7xl p-6 md:p-8"><DataCatalog /></div>} />
        <Route path="/eval" element={<div className="mx-auto max-w-7xl p-6 md:p-8"><Eval /></div>} />
        <Route path="/trace" element={<div className="mx-auto max-w-7xl p-6 md:p-8"><Trace /></div>} />
        <Route path="/analytics" element={<div className="mx-auto max-w-7xl p-6 md:p-8"><Analytics /></div>} />
      </Routes>
      <Toaster />
    </>
  )
}
export default function App(){
  return <BrowserRouter><TooltipProvider><Shell /></TooltipProvider></BrowserRouter>
}
