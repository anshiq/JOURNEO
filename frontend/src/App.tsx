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

function Nav(){
  const links=[["/campaigns","Campaigns"],["/analytics","Analytics"],["/knowledge-base","Knowledge"],["/studio-ai","Studio AI"],["/approvals","Approvals"],["/data-catalog","Catalog"],["/eval","Eval"],["/trace","Trace"]]
  return <nav className="bg-slate-900 text-white px-4 py-1.5 flex gap-4 items-center text-sm">
    <Link to="/campaigns" className="font-bold">Journeo</Link>
    {links.map(([to,label])=><Link key={to} to={to} className="opacity-80 hover:opacity-100">{label}</Link>)}
  </nav>
}
function Shell(){
  const { pathname } = useLocation()
  const isWorkspace = /\/campaigns\/.+\/setup/.test(pathname) || pathname.startsWith('/c/') || pathname.startsWith('/d/')
  return (
    <>
      {!isWorkspace && <Nav />}
      <Routes>
        <Route path="/" element={<div className="p-6 max-w-7xl mx-auto"><Campaigns /></div>} />
        <Route path="/campaigns" element={<div className="p-6 max-w-7xl mx-auto"><Campaigns /></div>} />
        <Route path="/campaigns/:id" element={<div className="p-6 max-w-7xl mx-auto"><CampaignDetail /></div>} />
        <Route path="/campaigns/:id/setup" element={<CampaignSetup />} />
        <Route path="/c/:id" element={<PublicCampaign />} />
        <Route path="/d/:token" element={<PublicCampaign />} />
        <Route path="/campaigns/:id/journey" element={<div className="p-6 max-w-7xl mx-auto"><JourneyCanvas /></div>} />
        <Route path="/campaigns/:id/analytics" element={<div className="p-6 max-w-7xl mx-auto"><Analytics /></div>} />
        <Route path="/knowledge-base" element={<div className="p-6 max-w-7xl mx-auto"><KnowledgeBase /></div>} />
        <Route path="/studio-ai" element={<div className="p-6 max-w-7xl mx-auto"><StudioAI /></div>} />
        <Route path="/approvals" element={<div className="p-6 max-w-7xl mx-auto"><Approvals /></div>} />
        <Route path="/data-catalog" element={<div className="p-6 max-w-7xl mx-auto"><DataCatalog /></div>} />
        <Route path="/eval" element={<div className="p-6 max-w-7xl mx-auto"><Eval /></div>} />
        <Route path="/trace" element={<div className="p-6 max-w-7xl mx-auto"><Trace /></div>} />
        <Route path="/analytics" element={<div className="p-6 max-w-7xl mx-auto"><Analytics /></div>} />
      </Routes>
    </>
  )
}
export default function App(){
  return <BrowserRouter><Shell /></BrowserRouter>
}
