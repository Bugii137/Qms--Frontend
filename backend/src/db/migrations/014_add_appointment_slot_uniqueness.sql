CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_active_slot
  ON appointments (institution_id, service_id, appointment_date, appointment_time)
  WHERE status NOT IN ('cancelled', 'rejected');
