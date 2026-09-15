-- Add Google Meet URL field to vets table
ALTER TABLE vets ADD COLUMN IF NOT EXISTS google_meet_url TEXT;

-- Verify the column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vets' AND column_name = 'google_meet_url'
  ) THEN
    ALTER TABLE vets ADD COLUMN google_meet_url TEXT;
  END IF;
END $$;
