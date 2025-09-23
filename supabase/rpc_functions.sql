-- RPC Functions for Alliance Portal

-- Function to increment survey participants count
CREATE OR REPLACE FUNCTION increment_survey_participants(survey_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE survey_links 
  SET current_participants = current_participants + 1 
  WHERE id = survey_id;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement survey participants count
CREATE OR REPLACE FUNCTION decrement_survey_participants(survey_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE survey_links 
  SET current_participants = GREATEST(current_participants - 1, 0) 
  WHERE id = survey_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment survey link participants count
CREATE OR REPLACE FUNCTION increment_survey_link_participants(link_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE survey_links 
  SET current_participants = current_participants + 1 
  WHERE id = link_id;
END;
$$ LANGUAGE plpgsql;