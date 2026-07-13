CREATE TABLE IF NOT EXISTS institution_staff (
  id              SERIAL PRIMARY KEY,
  institution_id  INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_title       VARCHAR(50) NOT NULL DEFAULT 'Receptionist',
  access_level    VARCHAR(30) NOT NULL DEFAULT 'view_only'
                  CHECK (access_level IN ('view_only', 'manage_appointments', 'full_access')),
  status          VARCHAR(20) NOT NULL DEFAULT 'invited'
                  CHECK (status IN ('invited', 'active', 'inactive')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (institution_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_institution_staff_institution_id ON institution_staff(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_staff_user_id ON institution_staff(user_id);
