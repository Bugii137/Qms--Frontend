CREATE TABLE IF NOT EXISTS platform_settings (
  id                SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- enforces exactly one row
  platform_name     VARCHAR(100) NOT NULL DEFAULT 'JIPANGE',
  support_email     VARCHAR(150) NOT NULL DEFAULT 'support@jipange.co.ke',
  maintenance_mode  BOOLEAN NOT NULL DEFAULT FALSE,
  maintenance_message TEXT NOT NULL DEFAULT 'JIPANGE is currently undergoing scheduled maintenance. Please check back shortly.',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;
