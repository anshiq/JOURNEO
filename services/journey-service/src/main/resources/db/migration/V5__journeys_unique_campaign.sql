DELETE FROM journeys j USING journeys k
 WHERE j.campaign_id = k.campaign_id
   AND j.id <> k.id
   AND (
     (COALESCE(j.status,'DRAFT') <> 'PUBLISHED' AND COALESCE(k.status,'DRAFT') = 'PUBLISHED')
     OR (COALESCE(j.status,'DRAFT') = COALESCE(k.status,'DRAFT') AND j.created_at < k.created_at)
     OR (COALESCE(j.status,'DRAFT') = COALESCE(k.status,'DRAFT') AND j.created_at = k.created_at AND j.id < k.id)
   );
CREATE UNIQUE INDEX IF NOT EXISTS idx_journeys_campaign ON journeys(campaign_id);
CREATE INDEX IF NOT EXISTS idx_journeys_campaign_created ON journeys(campaign_id, created_at);
