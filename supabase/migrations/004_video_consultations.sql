-- Video sessions table for real-time consultations
CREATE TABLE IF NOT EXISTS video_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  room_url TEXT,
  provider TEXT NOT NULL DEFAULT 'daily',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'active', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consultation messages table
CREATE TABLE IF NOT EXISTS consultation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one video session per booking
ALTER TABLE video_sessions ADD CONSTRAINT video_sessions_booking_id_key UNIQUE (booking_id);

-- Indexes
CREATE INDEX idx_video_sessions_booking_id ON video_sessions(booking_id);
CREATE INDEX idx_consultation_messages_booking_id ON consultation_messages(booking_id);
CREATE INDEX idx_consultation_messages_created_at ON consultation_messages(booking_id, created_at);

-- RLS for video_sessions
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking participants can view video sessions"
  ON video_sessions FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE owner_id = auth.uid()
    )
    OR
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN vets v ON b.vet_id = v.id
      WHERE v.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create video sessions"
  ON video_sessions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Booking participants can update video sessions"
  ON video_sessions FOR UPDATE
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE owner_id = auth.uid()
    )
    OR
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN vets v ON b.vet_id = v.id
      WHERE v.user_id = auth.uid()
    )
  );

-- RLS for consultation_messages
ALTER TABLE consultation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking participants can view messages"
  ON consultation_messages FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM bookings WHERE owner_id = auth.uid()
    )
    OR
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN vets v ON b.vet_id = v.id
      WHERE v.user_id = auth.uid()
    )
  );

CREATE POLICY "Booking participants can send messages"
  ON consultation_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND
    booking_id IN (
      SELECT id FROM bookings WHERE owner_id = auth.uid()
    )
    OR
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN vets v ON b.vet_id = v.id
      WHERE v.user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_video_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_sessions_updated_at
  BEFORE UPDATE ON video_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_video_sessions_updated_at();
