ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(16);

UPDATE appointments
SET ticket_number = 'QMS-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT || id::TEXT) FROM 1 FOR 5))
WHERE queue_number IS NOT NULL
  AND ticket_number IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_ticket_number
  ON appointments(ticket_number)
  WHERE ticket_number IS NOT NULL;
