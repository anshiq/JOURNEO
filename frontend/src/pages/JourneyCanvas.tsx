import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCampaignJourney } from '../hooks/useCampaignJourney'
import JourneyGraphEditor from '../components/journey/JourneyGraphEditor'
import LiveAdStage from '../components/preview/LiveAdStage'
import { journeyApi } from '../lib/api'
import { serializeGraph } from '../lib/journeyGraph'

export { NODE_DRAG_MIME } from '../components/journey/JourneyGraphEditor'

export default function JourneyCanvas() {
  const { id = '' } = useParams()
  const journey = useCampaignJourney(id)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showDevice, setShowDevice] = useState(false)
  const [validateResult, setValidateResult] = useState<any | null>(null)
  const [publishStatus, setPublishStatus] = useState<string | null>(null)

  useEffect(() => {
    if (id) journey.load()
  }, [id])

  const handleValidate = async () => {
    setValidateResult(null)
    setPublishStatus(null)
    try {
      const res = await journeyApi.post(`/api/campaigns/${id}/journey/validate`, { graph: JSON.parse(serializeGraph(journey.graph)) })
      setValidateResult(res.data)
    } catch (e: any) {
      setValidateResult({ valid: false, errors: [{ message: e?.message || 'validate failed' }] })
    }
  }

  const handleSave = async () => {
    setPublishStatus(null)
    await journey.save()
  }

  const handlePublish = async () => {
    setPublishStatus('Publishing…')
    const res = await journey.publish()
    if (res.ok) setPublishStatus('Published')
    else setPublishStatus(res.errors?.map((e: any) => e.message).filter(Boolean).join(' ') || 'Publish failed')
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <span className="text-xs text-slate-500">Drag nodes from the palette onto the canvas.</span>
        <button onClick={handleSave} disabled={journey.saveState === 'saving'} className="bg-blue-600 text-white px-4 py-1 rounded text-sm disabled:opacity-50">
          {journey.saveState === 'saving' ? 'Saving…' : 'Save'}
        </button>
        <button onClick={handleValidate} className="border px-4 py-1 rounded text-sm">Validate</button>
        <button onClick={handlePublish} disabled={journey.saveState === 'saving'} className="bg-green-600 text-white px-4 py-1 rounded text-sm disabled:opacity-50">Publish</button>
        <button onClick={() => setShowDevice(s => !s)} className="border px-4 py-1 rounded text-sm">
          {showDevice ? 'Hide device preview' : 'Test on device'}
        </button>
        {journey.saveState === 'error' && journey.error && <span className="text-xs text-red-600">{journey.error}</span>}
        {publishStatus && <span className="text-xs text-slate-600">{publishStatus}</span>}
        {validateResult && (
          <span className="text-xs text-slate-600">
            {validateResult.valid ? 'Valid' : (validateResult.errors || []).map((e: any) => e.message).join(', ')}
          </span>
        )}
      </div>
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 min-h-0">
          <JourneyGraphEditor
            graph={journey.graph}
            onGraphChange={journey.applyGraph}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        </div>
        {showDevice && (
          <div className="w-[380px] shrink-0 border rounded bg-white p-2">
            {journey.journeyId ? (
              <div className="h-[560px]">
                <LiveAdStage start={{ mode: 'test', campaignId: id, journeyId: journey.journeyId }} framed studio />
              </div>
            ) : (
              <div className="text-xs opacity-60 mt-2">Save the journey first to test it on device.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
