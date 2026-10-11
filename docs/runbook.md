# Production runbook

This covers the production database migration, the v3 to v4 backfill and rollback. Run each step in order and record the output of every verification step.

## Before you start

- A maintenance window for any change that writes to the production database.
- Access to the production `DATABASE_URL` (read access is enough for the dump) and to the Render dashboard for `journeo-api`.
- A local Postgres for the restore rehearsal: `make db-up` (port 5437).

## 1. Dump production

```
pg_dump --format=custom --no-owner --file journeo-pre-$(date +%F).dump "$PRODUCTION_DATABASE_URL"
```

Store the dump somewhere outside the repository. It contains real visitor leads.

## 2. Restore locally and rehearse

```
createdb -h localhost -p 5437 -U journeo journeo_restore
pg_restore --no-owner --dbname "postgresql://journeo:journeo_dev@localhost:5437/journeo_restore" journeo-pre-<date>.dump
```

Point the API at the restored database and apply the current migrations:

```
cd services/api
DATABASE_URL=postgresql://journeo:journeo_dev@localhost:5437/journeo_restore uv run alembic upgrade head
```

## 3. Backfill dry run

```
DATABASE_URL=postgresql://journeo:journeo_dev@localhost:5437/journeo_restore uv run python -m app.modules.journeys.backfill --dry-run
```

The log line `backfill finished ... dry_run=True` reports the number of rows that would be upgraded. Review any row-level warnings before continuing. Then run the real backfill against the restored copy and check that the result matches the dry run:

```
DATABASE_URL=postgresql://journeo:journeo_dev@localhost:5437/journeo_restore uv run python -m app.modules.journeys.backfill
```

Only continue to production when the restored copy has been backfilled without errors and every campaign opens in the editor.

## 4. Deploy

1. Confirm that `SEED_ON_START` is `false` in the Render environment for `journeo-api`. `render.yaml` sets it, but check the dashboard as well.
2. Merge to `main`. Render builds `services/api/Dockerfile`. The container start runs `alembic upgrade head`, the backfill and the seeds (skipped when `SEED_ON_START=false`), then starts uvicorn.
3. Watch the deploy logs for `backfill finished` and for the uvicorn ready line.

## 5. Verify

- `GET /health` returns 200. Render uses the same path as its health check.
- Open one existing live campaign link (`/c/<slug>`) and confirm it renders.
- Open the editor, open one campaign's workspace and confirm the flow and the outline load.
- If `SENTRY_DSN` and `VITE_SENTRY_DSN` are set, check the Sentry project for new issues from this release during the first hour.

## 6. Rollback

- Application: in Render, redeploy the previous successful deploy of `journeo-api` and `journeo-frontend`. The previous image still reads the same schema, so this is the first step for any application error.
- Database: no migration from `0001` to `0006` has a working downgrade (each `downgrade()` raises `NotImplementedError`), and the backfill is not reversible in place. A database rollback is therefore always a restore: stop the services, restore the pre-deploy dump into the production database with `pg_restore --clean --if-exists`, and redeploy the previous version. Do this only with the owner's confirmation.

## Pending: migration 0007 (drop v3 columns)

Migration `0007` drops the v3 columns (`journeys.graph_json`, `journeys.version`, `journeys.status`, `journeys.name` and `campaigns.status`). Its downgrade raises `NotImplementedError`, so after it runs, the only rollback is a restore from the dump.

Do not add `0007` to a deployed branch until both of these are true:

- The backfill has run without errors against a restored copy of the production dump (steps 2 and 3).
- The backfill has run against production and every campaign was checked in step 5.

Until then, production stays on the current head.
