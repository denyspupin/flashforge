-- Seed data for FlashForge
-- This runs automatically when the Postgres container starts for the first time

-- Insert default languages
INSERT INTO languages (name, code) VALUES
  ('English', 'en'),
  ('Spanish', 'es'),
  ('German', 'de'),
  ('French', 'fr'),
  ('Italian', 'it'),
  ('Portuguese', 'pt'),
  ('Russian', 'ru'),
  ('Japanese', 'ja'),
  ('Chinese', 'zh')
ON CONFLICT (code) DO NOTHING;

-- Insert default topics
INSERT INTO topics (name, slug) VALUES
  ('Food', 'food'),
  ('Animals', 'animals'),
  ('Household', 'household'),
  ('Work Meeting', 'work-meeting'),
  ('Doctor Visit', 'doctor-visit'),
  ('Travel', 'travel'),
  ('Shopping', 'shopping')
ON CONFLICT (slug) DO NOTHING;
