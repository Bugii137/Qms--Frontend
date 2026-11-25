DO $$
DECLARE
  appointment_id INTEGER;
  candidate TEXT;
  attempt INTEGER;
BEGIN
  FOR appointment_id IN
    SELECT id
    FROM appointments
    WHERE ticket_number IS NOT NULL
      AND length(ticket_number) <> 9
    ORDER BY id
  LOOP
    attempt := 0;
    LOOP
      attempt := attempt + 1;
      candidate := 'QMS-' || (
        SELECT string_agg(
          substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', get_byte(random_bytes.bytes, positions.position) % 32 + 1, 1),
          '' ORDER BY positions.position
        )
        FROM (
          SELECT decode(
            md5(random()::text || clock_timestamp()::text || appointment_id::text || attempt::text),
            'hex'
          ) AS bytes
        ) AS random_bytes
        CROSS JOIN generate_series(0, 4) AS positions(position)
      );

      BEGIN
        UPDATE appointments
        SET ticket_number = candidate
        WHERE id = appointment_id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF attempt >= 100 THEN
          RAISE;
        END IF;
      END;
    END LOOP;
  END LOOP;
END $$;
