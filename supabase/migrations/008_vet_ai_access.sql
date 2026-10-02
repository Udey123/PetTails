-- Enrich AI handoffs with full context + give assigned vets read access
-- to the session's messages, triage, and photos.
-- Safe to run multiple times.

ALTER TABLE ai_handoffs ADD COLUMN IF NOT EXISTS pet_snapshot JSONB;
ALTER TABLE ai_handoffs ADD COLUMN IF NOT EXISTS triage_snapshot JSONB;

-- Vets can read the AI session context for handoffs assigned to them
DROP POLICY IF EXISTS "Vets read assigned AI sessions" ON ai_care_sessions;
CREATE POLICY "Vets read assigned AI sessions" ON ai_care_sessions
  FOR SELECT USING (
    id IN (
      SELECT session_id FROM ai_handoffs
      WHERE vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Vets read assigned AI messages" ON ai_care_messages;
CREATE POLICY "Vets read assigned AI messages" ON ai_care_messages
  FOR SELECT USING (
    session_id IN (
      SELECT session_id FROM ai_handoffs
      WHERE vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Vets read assigned AI triage" ON ai_triage_results;
CREATE POLICY "Vets read assigned AI triage" ON ai_triage_results
  FOR SELECT USING (
    session_id IN (
      SELECT session_id FROM ai_handoffs
      WHERE vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Vets read assigned AI media" ON ai_care_media;
CREATE POLICY "Vets read assigned AI media" ON ai_care_media
  FOR SELECT USING (
    session_id IN (
      SELECT session_id FROM ai_handoffs
      WHERE vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid())
    )
  );

-- Vets can create signed URLs for photos in assigned handoffs
DROP POLICY IF EXISTS "Vets read assigned pet media objects" ON storage.objects;
CREATE POLICY "Vets read assigned pet media objects" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'pet-care-media'
    AND EXISTS (
      SELECT 1 FROM ai_care_media m
      WHERE m.storage_path = storage.objects.name
        AND m.session_id IN (
          SELECT session_id FROM ai_handoffs
          WHERE vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid())
        )
    )
  );
