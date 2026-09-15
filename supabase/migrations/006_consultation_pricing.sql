-- Consultation pricing table (urgency-based one-time pricing)
CREATE TABLE IF NOT EXISTS consultation_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vet_id UUID NOT NULL REFERENCES vets(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL DEFAULT 'video_consult',
  urgency TEXT NOT NULL CHECK (urgency IN ('routine', 'soon', 'urgent', 'emergency')),
  price INTEGER NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One pricing per vet+service+urgency
ALTER TABLE consultation_pricing ADD CONSTRAINT consultation_pricing_vet_service_urgency_key UNIQUE (vet_id, service_type, urgency);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consultation_pricing_vet_id ON consultation_pricing(vet_id);
CREATE INDEX IF NOT EXISTS idx_consultation_pricing_lookup ON consultation_pricing(vet_id, service_type, urgency, is_active);

-- RLS
ALTER TABLE consultation_pricing ENABLE ROW LEVEL SECURITY;

-- Anyone can read active pricing (for booking flow)
CREATE POLICY "Anyone can view active pricing"
  ON consultation_pricing FOR SELECT
  USING (is_active = true);

-- Vets can manage their own pricing
CREATE POLICY "Vets can manage their own pricing"
  ON consultation_pricing FOR ALL
  USING (
    vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid())
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_consultation_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consultation_pricing_updated_at
  BEFORE UPDATE ON consultation_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_consultation_pricing_updated_at();
