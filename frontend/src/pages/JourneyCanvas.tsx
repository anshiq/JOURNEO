import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCampaignJourney } from '../hooks/useCampaignJourney'
import JourneyGraphEditor from '../components/journey/JourneyGraphEditor'
import LiveAdStage from '../components/preview/LiveAdStage'
import { journeyApi } from '../lib/api'
import { serializeGraph } from '../lib/journeyGraph'
import { Button } from '../components/ui/Button'
import { Alert, AlertDescription } from '../components/ui/Alert'

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
    <div className="flex h-[calc(100vh-120px)] flex-col">
      <p className="text-eyebrow text-muted-foreground">Canvas</p>
      <h1 className="font-display text-display-md mt-1">Journey Canvas</h1>
      <div className="mb-3 mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Drag nodes from the palette onto the canvas.</span>
        <Button size="sm" onClick={handleSave} disabled={journey.saveState === 'saving'}>
          {journey.saveState === 'saving' ? 'Saving…' : 'Save'}
        </Button>
        <Button size="sm" variant="outline" onClick={handleValidate}>Validate</Button>
        <Button size="sm" variant="editorial" onClick={handlePublish} disabled={journey.saveState === 'saving'}>Publish</Button>
        <Button size="sm" variant="ghost" onClick={() => setShowDevice(s => !s)}>
          {showDevice ? 'Hide device preview' : 'Test on device'}
        </Button>
        {journey.saveState === 'error' && journey.error && <span className="text-xs text-rouge">{journey.error}</span>}
        {publishStatus && <span className="text-xs text-muted-foreground">{publishStatus}</span>}
        {validateResult && (
          <span className="text-xs text-muted-foreground">
            {validateResult.valid ? 'Valid' : (validateResult.errors || []).map((e: any) => e.message).join(', ')}
          </span>
        )}
      </div>
      {validateResult && !validateResult.valid && <Alert variant="destructive" className="mb-3">
        <AlertDescription>{(validateResult.errors || []).map((e: any) => e.message).join(', ')}</AlertDescription>
      </Alert>}
      <div className="flex min-h-0 flex-1 gap-4">
        <div className="min-h-0 flex-1">
          <JourneyGraphEditor
            graph={journey.graph}
            onGraphChange={journey.applyGraph}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        </div>
        {showDevice && (
          <div className="w-[380px] shrink-0 border border-border bg-background p-2">
            {journey.journeyId ? (
              <div className="h-[560px]">
                <LiveAdStage start={{ mode: 'test', campaignId: id, journeyId: journey.journeyId }} framed studio />
              </div>
            ) : (
              <div className="mt-2 text-xs text-muted-foreground">Save the journey first to test it on device.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
