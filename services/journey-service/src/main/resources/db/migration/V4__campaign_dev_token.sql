ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS dev_token VARCHAR(36) UNIQUE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS dev_token_created_at TIMESTAMPTZ;
UPDATE campaigns SET dev_token = gen_random_uuid()::text, dev_token_created_at = now() WHERE dev_token IS NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_dev_token ON campaigns(dev_token);
