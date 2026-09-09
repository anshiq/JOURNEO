since this is in very initial phase dont care about legecy product/item's backward compatibility, remove old items or upgrade them to fully support new schema. don't write any comment in any file only code/config should be written.

## Node config split: JourneyConfig vs StyleConfig

Every node type under `frontend/src/nodes/<type>/` exposes two separate config components, registered in `frontend/src/nodes/_core/registry.ts` and typed in `frontend/src/nodes/_core/config.ts`:

- `JourneyConfig.tsx` — all logic/behavior: visibility conditions (`blockVisibleWhen`), exit handles/actions, required-ness, validation rules, anything that decides *what* renders or *whether* an edge fires. This is the "journey config" section.
- `StyleConfig.tsx` — all styling/positioning: colors, borders, spacing, fonts, alignment, shadows, opacity — anything that decides *how* it looks. This lives in the "experience section" style config. Shared field widgets live in `frontend/src/nodes/_core/styleWidgets.tsx`; reuse them instead of building new inputs.

Rule for ambiguous fields: if it changes what renders or whether an edge fires, it's `JourneyConfig`. If it changes appearance only — including conditional styling — it's `StyleConfig`. Do not mix the two concerns in one file; when adding or editing a node, put logic-shaped fields in `JourneyConfig` and appearance-shaped fields in `StyleConfig`, and split out anything found violating this in an existing node.
