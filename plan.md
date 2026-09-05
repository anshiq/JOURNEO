# Plan — Dev Link, Storybook Viewport Device Simulation & Event-Driven Tracking

## Goal
Replace three ad-hoc workflows with a single coherent system: (1) campaign creation immediately yields a shareable **dev link** for internal preview without publishing, (2) device simulation in the app uses **Storybook's viewport addon** as the single source of truth for phone/tablet/desktop rather than a bespoke `MockFrame` + manual scale, (3) node tracking, execution progress and cross-device updates flow through a **typed event bus** instead of prop-drilled `useState`.

## Non-Goals
- No change to node schema/registry (18 types stay frozen, owned by `frontend/src/nodes/`).
- No change to publishing gate — `POST /api/campaigns/:id/journeys/:jid/publish` keeps current `JourneyGraphValidator` semantics.
- No public SEO or auth for dev links — unguessable token + `X-Robots: noindex` is enough for internal team.
- No attempt to run Storybook in production — we reuse its viewport *definitions* and *toolbar* pattern inside the app's own preview, not an iframe'd Storybook build.

## File Ownership (exclusive to this plan)
```
# Dev link
services/journey-service/src/main/java/com/journeo/journey/entity/Campaign.java
services/journey-service/src/main/java/com/journeo/journey/controller/CampaignController.java
services/journey-service/src/main/java/com/journeo/journey/service/DevLinkService.java      # new
services/journey-service/src/main/resources/db/migration/V4__campaign_dev_token.sql # new
frontend/src/lib/viewports.ts                     # new - single viewport source
frontend/src/lib/eventBus.ts                      # new - typed mitt
frontend/src/lib/devLink.ts                       # new - helper
frontend/src/pages/Campaigns.tsx                  # create → dev link
frontend/src/pages/CampaignDetail.tsx             # show dev link
frontend/src/pages/PublicCampaign.tsx             # handle ?devToken + /d/:token
frontend/src/App.tsx                              # route /d/:token

# Viewport device simulation
frontend/.storybook/main.ts                       # add @storybook/addon-viewport
frontend/.storybook/preview.tsx                   # import viewports from lib
frontend/src/components/preview/DevicePreviewPanel.tsx  # rewrite to ViewportToolbar + ViewportFrame
frontend/src/components/preview/ViewportFrame.tsx       # new - viewport-scaled container
frontend/src/components/preview/ViewportToolbar.tsx     # new - Storybook-like toolbar

# Event bus
frontend/src/lib/events.ts                        # new - event names + payload types
frontend/src/components/preview/FanFlowPlayer.tsx # remove history useState, emit events
frontend/src/pages/CampaignSetup.tsx              # subscribe via events, not handleSelectNode state
frontend/src/pages/JourneyCanvas.tsx              # same

# Tests
frontend/src/lib/eventBus.test.ts
frontend/src/lib/devLink.test.ts
services/journey-service/src/test/java/com/journeo/journey/DevLinkTest.java
```
Does not touch `frontend/src/nodes/**`, `frontend/src/lib/nodeSchemas.ts`, `JourneyExecutionEngine.java`.

## 1. Dev Link Generation

### Contract
```ts
// Campaign.java
@Entity
public class Campaign {
  @Id String id; // UUID
  @Column(unique=true) String devToken; // UUID, indexed
  Instant devTokenCreatedAt;
  String devLink; // transient or derived: /d/{devToken}
}

// POST /api/campaigns -> 201 { id, devToken, devLink, name }
// GET /d/:token -> 302 or JSON { campaign, journeys } for preview
// GET /api/campaigns/:id/dev-link -> { devToken, devLink, createdAt }
// POST /api/campaigns/:id/dev-link/rotate -> new token
```

Backend:
```java
// CampaignController.java
@PostMapping("/campaigns") public Campaign create(@RequestBody Map b){
  Campaign c=new Campaign();
  c.setDevToken(UUID.randomUUID().toString());
  c.setDevTokenCreatedAt(Instant.now());
  // ...
}
// GET /api/campaigns/dev/:token
@GetMapping("/dev/{token}") public ResponseEntity<Campaign> byDevToken(@PathVariable String token){
  return campRepo.findByDevToken(token).map(ResponseEntity::ok).orElse(notFound());
}
@GetMapping("/c/{id}/dev") // alias for /d/:token via id lookup
```

Migration `V4__campaign_dev_token.sql`:
```sql
ALTER TABLE campaigns ADD COLUMN dev_token VARCHAR(36) UNIQUE;
ALTER TABLE campaigns ADD COLUMN dev_token_created_at TIMESTAMPTZ;
UPDATE campaigns SET dev_token = gen_random_uuid()::text, dev_token_created_at = now() WHERE dev_token IS NULL;
CREATE INDEX idx_campaign_dev_token ON campaigns(dev_token);
```

Frontend `src/lib/devLink.ts`:
```ts
export const devLinkFor = (token:string)=> `${window.location.origin}/d/${token}`;
export const devLinkForCampaign = (c:any)=> devLinkFor(c.devToken);
```

Flow:
- `Campaigns.tsx` `mut` onSuccess: `navigate(/campaigns/${id}/setup)` + toast with `devLink` + Copy button + QR (using `qrcode.react` optional).
- `CampaignDetail.tsx` and `CampaignSetup.tsx` header: dev badge `DEV · /d/abc123` with Copy / Rotate.
- `PublicCampaign.tsx` currently serves `/c/:id` only if `PUBLISHED`. Add `/d/:token` route: `App.tsx` `<Route path="/d/:token" element={<PublicCampaign dev />}` — fetches `GET /api/campaigns/dev/:token`, renders journey via `FanFlowPlayer` in `readOnly` without requiring `PUBLISHED`. Add `X-Robots: noindex` via `meta` if dev.

Security: token is UUIDv4 122-bit, not sequential, rate-limited `GET /dev/:token` 60/min/IP, rotated on demand, never logged.

### Acceptance
- Creating campaign in `Campaigns.tsx` immediately shows `devLink` without extra round-trip (POST response contains it).
- `curl /api/campaigns/dev/<token>` returns campaign + journeys even when status `DRAFT`.
- Rotating invalidates old token (old returns 404).

## 2. Storybook Viewport Device Simulation

Current: `DevicePreviewPanel.tsx` owns `DEVICES` (iPhone 17, Galaxy S25, MacBook Pro) + `react-mockframe` + manual `ResizeObserver` scale `Math.min(0.68, fitW, fitH)`. Duplicated in `.storybook/preview.tsx` ad-hoc `deviceViewports` not shared.

Target: single source `src/lib/viewports.ts` imported by both Storybook and app.

```ts
// src/lib/viewports.ts
export const DEVICE_VIEWPORTS = {
  iphone14: { name: 'iPhone 14', styles: { width: '390px', height: '844px' }, type: 'mobile' as const },
  pixel7:   { name: 'Pixel 7',   styles: { width: '412px', height: '915px' }, type: 'mobile' as const },
  ipadAir:  { name: 'iPad Air',  styles: { width: '820px', height: '1180px' }, type: 'tablet' as const },
  desktopHD:{ name: 'Desktop HD',styles: { width: '1440px', height: '900px' }, type: 'desktop' as const },
} as const
export type ViewportId = keyof typeof DEVICE_VIEWPORTS
export const DEFAULT_VIEWPORT: ViewportId = 'iphone14'
```

Storybook:
```ts
// .storybook/main.ts addons: [..., "@storybook/addon-viewport"]
// .storybook/preview.tsx
import { DEVICE_VIEWPORTS } from '../src/lib/viewports'
parameters: { viewport: { options: DEVICE_VIEWPORTS }, initialGlobals: { viewport: { value: 'iphone14' } } }
```

App:
- Install: `npm i -D @storybook/addon-viewport` (already has storybook 10, addon-viewport is bundled in 8+ but explicit install guarantees version).
- `src/components/preview/ViewportToolbar.tsx` — renders Storybook-like toolbar: mobile/tablet/desktop icons + viewport name + rotate button, emits `device:viewportChange`. No longer `MockFrame` from `react-mockframe`; uses plain `div` with `viewports[viewportId].styles` as `width/height` + outer scaling logic kept (0.68 cap) for fit-to-panel.
- `src/components/preview/ViewportFrame.tsx` — `div` with `style={{ width: styles.width, height: styles.height }}` + `transform: scale(fit)` + `border` + `shadow`, contains `FanFlowPlayer`.
- `DevicePreviewPanel.tsx` rewrite: `const [viewportId,setViewportId]=useState<ViewportId>('iphone14')` + `useEventBus('device:viewportChange', setViewportId)` + `useLayoutEffect` for fit scale (reuse existing `ResizeObserver` but read `DEVICE_VIEWPORTS[viewportId].styles` instead of `MockFrame` scrollWidth). Emits `device:viewportChange` on toolbar click; Storybook stories automatically get same viewports via `parameters.viewport`.

```
CampaignSetup (Experience step)
  ├─ DevicePreviewPanel
  │    ├─ ViewportToolbar (emits device:viewportChange)
  │    └─ ViewportFrame (390|412|820|1440 × 844|915|1180|900, scaled 0.68)
  │         └─ FanFlowPlayer (readOnly device, emits execution events)
  └─ StyleConfigRouter (subscribes node:select)
Storybook
  └─ preview.tsx viewport.options = DEVICE_VIEWPORTS (same)
```

No `react-mockframe` removal forced — keep dependency for one release, mark deprecated, delete in follow-up.

### Acceptance
- `.storybook/preview.tsx` and `DevicePreviewPanel` import same `DEVICE_VIEWPORTS` — changing one updates both (grep shows single source).
- Panel shows Storybook toolbar (iPhone/Pixel/iPad/Desktop + rotate) and renders journey at exact viewport dimensions, not `frame.scrollWidth` heuristic.
- `npm run storybook` viewport addon dropdown lists 4 devices, matches in-app toolbar.
- `tsc` + `vite build` pass, `npm run build-storybook` still passes.

## 3. Event Bus Instead of Prop-Drilled State

Current: `FanFlowPlayer` owns `history`, `currentId`, `flashingId`, calls `onSelectNode`/`onExecutionChange` props; `CampaignSetup` owns `selectedNodeId`, `nodeStyles`, `Theme`, passes `handleSelectNode`, `updateNodeStyle` down; `JourneyCanvas` duplicates same state. Tracking across device and canvas is via callbacks, easy to desync (`onExecutionChangeRef` workaround).

Target: `src/lib/eventBus.ts` using `mitt` (already have `zustand`, `mitt` is 200b, no extra dep if we use `EventTarget`; choose `mitt` for typed).

```ts
// src/lib/eventBus.ts
import mitt from 'mitt'
type Events = {
  'campaign:created': { campaignId:string; devToken:string; devLink:string }
  'campaign:devLinkRotated': { campaignId:string; devToken:string }
  'device:viewportChange': { viewportId: ViewportId; width:string; height:string }
  'node:select': { nodeId:string|null; source:'canvas'|'device'|'toolbar' }
  'node:update': { nodeId:string; config:any; style?:NodeStyle }
  'node:track': { nodeId:string; type:string; handle?:string; viewportId:ViewportId; devToken?:string }
  'execution:change': PreviewExecution & { viewportId:ViewportId }
  'execution:advance': { from:string; to:string; handle?:string }
  'journey:save': { campaignId:string; graph:any }
  ' journey:publish': { campaignId:string; journeyId:string }
}
export const bus = mitt<Events>()
export const useEvent = <K extends keyof Events>(type:K, handler:(p:Events[K])=>void)=>{
  useEffect(()=>{ bus.on(type, handler as any); return ()=> bus.off(type, handler as any)},[type,handler])
}
```

Refactor:

- `FanFlowPlayer.tsx` — remove `onSelectNode`, `onExecutionChange` props + `onExecutionChangeRef` + `internalSelectedId`. Instead:
  ```ts
  const emit = useCallback((e:Events['execution:change'])=> bus.emit('execution:change', e),[])
  const advance = (handle?)=>{ /* existing logic */ bus.emit('execution:advance',{from:currentId,to:nextId,handle}); bus.emit('node:track',{nodeId:nextId,type:nextNode.type,handle,viewportId}) }
  const handleClick = (id)=> bus.emit('node:select',{nodeId:id,source:'device'})
  useEffect(()=> bus.emit('execution:change', snapshot),[snapshot])
  ```
  Reads `selectedNodeId` via `useEvent('node:select', ...)` for flashing, not prop.

- `DevicePreviewPanel.tsx` — no longer `onSelectNode`/`selectedNodeId` props. Subscribes `node:select`, emits `device:viewportChange`. `handleExecutionChange` becomes `bus.on('execution:change', ...)` to auto-select active node (historyIndex>0).

- `CampaignSetup.tsx` — remove `handleSelectNode`, `selectedNodeId` useState becomes `useEvent('node:select', setSelectedNodeId)`. `updateNodeStyle`/`updateNodeOverride` become `bus.emit('node:update',...)` with single listener that updates `nodeStyles` map. Tracking of nodes: `bus.on('node:track', ({nodeId,type})=> journeyApi.post('/api/campaigns/'+id+'/track',{nodeId,type,viewportId}))` — single place, not duplicated. Journey save: `bus.emit('journey:save', graph)` — canvas subscribes.

- `JourneyCanvas.tsx` — same: `onNodeClick` -> `bus.emit('node:select')`, `addNode` -> `bus.emit('node:track')`, validation errors subscribed via `execution:change`.

Backend tracking: `CampaignController` add `POST /api/campaigns/{id}/track` storing to `ActivityEvent` with `devToken` forwarded, no auth change.

```
User clicks button in ViewportFrame (390px)
  → Device Device.tsx onAdvance('watched')
  → FanFlowPlayer.advance
  → bus.emit('execution:advance')
  → bus.emit('node:track') → CampaignSetup listener POST /track
  → bus.emit('execution:change') → CampaignSetup + JourneyCanvas update flashing/activeStepNodes
  → bus.emit('node:select') → Canvas highlights node, Style panel switches
```

Single source, no `useRef` workaround for `onExecutionChange`.

### Acceptance
- `grep -r "onSelectNode\|onExecutionChange" frontend/src` returns 0 after (except event bus).
- Clicking node in canvas flashes device and clicking device flashes canvas (bidirectional via `node:select`).
- Advancing journey emits `node:track` once per step with correct `viewportId` (`iphone14` etc).
- No `Maximum update depth` — `FanFlowPlayer` no longer calls `setState` inside render via `onExecutionChangeRef`; uses `useEffect` + bus.

## Migration Steps
1. Backend: add `Campaign.java` fields + `V4__campaign_dev_token.sql`, `DevLinkService.java`, update `CampaignController.java` 3 endpoints, test `curl`.
2. Frontend lib: create `viewports.ts`, `eventBus.ts`, `events.ts`, `devLink.ts`; add `mitt` `npm i mitt`.
3. Storybook: `npm i -D @storybook/addon-viewport` (if not already), update `.storybook/main.ts` addons, `.storybook/preview.tsx` import `DEVICE_VIEWPORTS`.
4. Preview: create `ViewportToolbar.tsx` + `ViewportFrame.tsx`, rewrite `DevicePreviewPanel.tsx` to use them + `viewports.ts` + `eventBus`.
5. FanFlowPlayer: replace props with `bus.emit`/`useEvent`, delete `handleNodeClick` prop drilling, keep `history` logic but move `selectedId` to subscription.
6. CampaignSetup/JourneyCanvas: replace `useState` for `selectedNodeId` + callbacks with `useEvent('node:select')`, replace `updateNodeStyle` etc with `bus.emit('node:update')`, add `useEvent('node:track')` poster.
7. App.tsx: add `<Route path="/d/:token">`, `PublicCampaign.tsx` handle `devToken` query + `/d/:token`.
8. Campaigns.tsx: show devLink after create, copy.
9. Delete dead: `react-mockframe` import from `DevicePreviewPanel`, `Handle` prop drilling, `onExecutionChangeRef`.
10. Verify: `tsc --noEmit`, `vite build`, `npm run build-storybook`, `mvn -f services/journey-service/pom.xml test` (new `DevLinkTest`).

## Validation & Tests
- Unit: `eventBus.test.ts` — emit `node:select` updates two subscribers, `device:viewportChange` changes `DEVICE_VIEWPORTS` width.
- Unit: `devLink.test.ts` — `devLinkFor('abc')` === `${origin}/d/abc`, token is UUID.
- Integration: `CampaignController` — `POST /api/campaigns` returns `devToken`, `GET /dev/:token` returns same campaign even when `DRAFT`, `POST /:id/dev-link/rotate` invalidates old.
- E2E (playwright): create campaign → dev link visible → open `/d/:token` → journey renders in `ViewportFrame` at `iphone14` (390px) → switch to `ipadAir` (820px) → `device:viewportChange` event fired → `FanFlowPlayer` scales → click node in device → canvas highlights same node.
- Visual: Storybook Chromatic for `ViewportFrame` at 4 viewports matches in-app `DevicePreviewPanel`.

## Scalability
- Adding new viewport = one entry in `DEVICE_VIEWPORTS` — Storybook and app both get it.
- Adding new event = one entry in `Events` type — `mitt` enforces payload, `useEvent` gives typed handler, no new props.
- Dev link rotation is single endpoint, not per-environment; dev and prod share same token logic, no branch.

## Risks & Mitigations
- Storybook viewport addon not designed for prod: mitigate by not importing `addon-viewport` at runtime, only its `viewports` data (plain object), no Storybook runtime in bundle.
- Event bus global singleton leaks between tests: `bus.all.clear()` in `beforeEach`.
- Dev link enumeration: UUIDv4, rate-limit, `noindex`, rotate invalidates — not a secret but unguessable.
- Double emit loops (reset `form` → `onChange` → emit): guard with `JSON.stringify` compare and `isEqual` before emit.
- Old `onSelectNode` callers still exist in git history: codemod `grep -R onSelectNode` must be 0 before merge, CI fails otherwise.

## Acceptance Criteria
- `POST /api/campaigns {name}` returns `{id, devToken, devLink: "/d/<uuid>"}` and `GET /api/campaigns/dev/<token>` returns 200 even before publish.
- `frontend/src/lib/viewports.ts` exists, `.storybook/preview.tsx` and `DevicePreviewPanel.tsx` import it, palette still 20 items, Storybook viewport addon shows 4 devices.
- `DevicePreviewPanel` renders `ViewportToolbar` + `ViewportFrame` with `scale=Math.min(0.68, fit)` and no `react-mockframe` import.
- `FanFlowPlayer.tsx` contains 0 `onSelectNode` props, emits `node:select`/`execution:change` via `bus`, `DevicePreviewPanel` and `CampaignSetup` subscribe via `useEvent`.
- `Campaigns.tsx` after create shows dev link with Copy, `PublicCampaign.tsx` handles `/d/:token` and renders journey without publish.
- `tsc`, `vite build`, `build-storybook`, `mvn test` pass, no `media_carousel` reappears.
