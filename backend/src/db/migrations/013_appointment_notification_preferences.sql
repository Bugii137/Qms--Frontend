ALTER TABLE users
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{
    "emailConfirmed": true,
    "emailApproved": true,
    "emailRejected": true,
    "emailRescheduled": true,
    "emailCancelled": true,
    "emailCompleted": true,
    "appConfirmed": true,
    "appApproved": true,
    "appRejected": true,
    "appRescheduled": true,
    "appCancelled": true,
    "appCompleted": true
  }'::jsonb;
