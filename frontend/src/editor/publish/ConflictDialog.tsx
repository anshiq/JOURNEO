import { createCheckpoint } from '../queries/journey'
import { useEditor } from '../store'
import { activeAutosave } from '../sync/autosave'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

export function ConflictDialog({ campaignId }: { campaignId: string }) {
  const conflict = useEditor(state => state.conflict)
  return (
    <Dialog
      open={conflict !== null}
      onOpenChange={() => undefined}
      title="Changed in another tab or by someone else"
      description="Both versions are kept in Version history, so nothing is lost."
      footer={
        <>
          <Button
            onClick={async () => {
              await createCheckpoint(campaignId).catch(() => undefined)
              useEditor.getState().keepMine()
              await activeAutosave()?.flush()
            }}
          >
            Keep mine
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!conflict) return
              useEditor
                .getState()
                .replaceDoc(conflict.serverDoc, 'conflict', conflict.serverRevision, conflict.serverHash)
            }}
          >
            Load latest
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-700">
        Load the latest version to continue from there, or keep your version and overwrite the other change.
      </p>
    </Dialog>
  )
}
