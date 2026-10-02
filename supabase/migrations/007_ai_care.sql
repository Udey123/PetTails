-- AI Care Assistant tables
CREATE TABLE IF NOT EXISTS ai_care_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  triage_level TEXT CHECK (triage_level IN ('low', 'moderate', 'uncertain', 'urgent', 'emergency')),
  recommended_specialty TEXT,
  needs_vet BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_care_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_care_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'VOICE', 'IMAGE', 'SYSTEM')),
  language TEXT DEFAULT 'en',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_care_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_care_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_triage_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_care_sessions(id) ON DELETE CASCADE,
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'moderate', 'uncertain', 'urgent', 'emergency')),
  confidence NUMERIC(3,2) DEFAULT 0.5,
  specialty TEXT,
  next_action TEXT NOT NULL DEFAULT 'CONTINUE_CHAT',
  observations JSONB DEFAULT '[]'::jsonb,
  red_flags JSONB DEFAULT '[]'::jsonb,
  missing_information JSONB DEFAULT '[]'::jsonb,
  guidance JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_care_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vet_id UUID REFERENCES vets(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  case_summary TEXT,
  urgency TEXT,
  specialty TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user ON ai_care_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_messages_session ON ai_care_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_media_session ON ai_care_media(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_triage_session ON ai_triage_results(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_handoffs_vet ON ai_handoffs(vet_id, status);

-- RLS
ALTER TABLE ai_care_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_care_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_care_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_triage_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_handoffs ENABLE ROW LEVEL SECURITY;

-- Sessions
CREATE POLICY "Users manage own AI sessions" ON ai_care_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Messages
CREATE POLICY "Users manage own AI messages" ON ai_care_messages
  FOR ALL USING (
    session_id IN (SELECT id FROM ai_care_sessions WHERE user_id = auth.uid())
  );

-- Media
CREATE POLICY "Users manage own AI media" ON ai_care_media
  FOR ALL USING (auth.uid() = user_id);

-- Triage
CREATE POLICY "Users read own triage" ON ai_triage_results
  FOR SELECT USING (
    session_id IN (SELECT id FROM ai_care_sessions WHERE user_id = auth.uid())
  );
CREATE POLICY "Insert triage results" ON ai_triage_results
  FOR INSERT WITH CHECK (true);

-- Handoffs: user creates, assigned vet reads
CREATE POLICY "Users manage own handoffs" ON ai_handoffs
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Vets read assigned handoffs" ON ai_handoffs
  FOR SELECT USING (
    vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid())
  );
CREATE POLICY "Vets update assigned handoffs" ON ai_handoffs
  FOR UPDATE USING (
    vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid())
  );

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_ai_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER ai_sessions_updated_at BEFORE UPDATE ON ai_care_sessions
  FOR EACH ROW EXECUTE FUNCTION update_ai_updated_at();
CREATE TRIGGER ai_handoffs_updated_at BEFORE UPDATE ON ai_handoffs
  FOR EACH ROW EXECUTE FUNCTION update_ai_updated_at();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('pet-care-media', 'pet-care-media', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own pet media" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pet-care-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users read own pet media" ON storage.objects FOR SELECT
  USING (bucket_id = 'pet-care-media' AND auth.uid()::text = (storage.foldername(name))[1]);
