-- 015_add_team_requirements_to_cases.sql
-- Case tablosuna team_requirements field'ı ekleme
-- Job type'lar için kişi sayısı ve öncelik bilgilerini saklayacak

-- Case tablosuna team_requirements JSONB field'ı ekle
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS team_requirements JSONB DEFAULT '[]'::jsonb;

-- Index ekle performans için
CREATE INDEX IF NOT EXISTS idx_cases_team_requirements ON cases USING GIN (team_requirements);

-- team_requirements field'ının JSONB array formatında olduğunu garanti et
ALTER TABLE cases 
ADD CONSTRAINT check_team_requirements_format 
  CHECK (jsonb_typeof(team_requirements) = 'array');

-- Mevcut case'lere varsayılan team_requirements ekle
-- job_types array'inden otomatik team_requirements oluştur
UPDATE cases 
SET team_requirements = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'jobType', job_type_element,
      'count', 1,
      'priority', 'medium'
    )
  )
  FROM unnest(job_types) AS job_type_element
)
WHERE team_requirements = '[]'::jsonb 
  AND array_length(job_types, 1) > 0;

-- Comment ekle
COMMENT ON COLUMN cases.team_requirements IS 'JSON array of team requirements: [{"jobType": "Frontend Developer", "count": 2, "priority": "high"}]';

-- View güncelle - case_stats view'ına team requirements summary ekle
DROP VIEW IF EXISTS case_stats;

CREATE VIEW case_stats AS
SELECT 
  c.id,
  c.title,
  c.status,
  c.domain,
  c.job_types,
  c.team_requirements,
  -- Team requirement counts
  COALESCE(
    (
      SELECT SUM((req->>'count')::integer)
      FROM jsonb_array_elements(c.team_requirements) AS req
    ), 
    0
  ) as total_required_members,
  COUNT(tm.id) as current_team_member_count,
  COUNT(CASE WHEN tm.assessment_status = 'completed' THEN 1 END) as completed_assessments,
  COUNT(ar.id) as assessment_results_count,
  -- Progress percentage
  CASE 
    WHEN COALESCE(
      (
        SELECT SUM((req->>'count')::integer)
        FROM jsonb_array_elements(c.team_requirements) AS req
      ), 
      0
    ) > 0 THEN
      ROUND(
        (COUNT(tm.id) * 100.0) / 
        COALESCE(
          (
            SELECT SUM((req->>'count')::integer)
            FROM jsonb_array_elements(c.team_requirements) AS req
          ), 
          1
        )
      )
    ELSE 0
  END as team_completion_percentage
FROM cases c
LEFT JOIN team_members tm ON c.id = tm.case_id
LEFT JOIN assessment_results ar ON c.id = ar.case_id
GROUP BY c.id, c.title, c.status, c.domain, c.job_types, c.team_requirements;

-- Grant permissions
GRANT SELECT ON case_stats TO anon, authenticated;

-- End of migration


