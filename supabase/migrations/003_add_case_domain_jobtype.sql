-- 003_add_case_domain_jobtype.sql
-- Add domain field to cases table

-- Add domain field to cases table
ALTER TABLE cases ADD COLUMN IF NOT EXISTS domain TEXT;

-- Drop existing constraints if they exist
ALTER TABLE cases DROP CONSTRAINT IF EXISTS check_domain;

-- Add constraints for domain values - mevcut kategoriler
ALTER TABLE cases ADD CONSTRAINT check_domain 
  CHECK (domain IS NULL OR domain IN (
    'gorsel-tasarim', 'video-icerigi', 'animasyon', 'kisa-film', 'cizgi-film', 
    'belgesel-filmi', 'podcast', 'ses-ve-muzik', 'dijital-enstalasyon',
    'ui-ux-tasarimi', 'oyun', 'ar-vr-uygulamalari', 'interaktif-video',
    'web-platformu', 'mobil-uygulama', 'masaustu-uygulamalari', 
    'yapay-zeka-uygulamalari', 'blockchain-uygulamalari', 'entegrasyon-yazilimlari',
    'dijital-varliklar', 'dijital-materyaller'
  ));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cases_domain ON cases(domain);

-- Update existing cases with default values if needed
UPDATE cases 
SET domain = 'web-platformu'
WHERE domain IS NULL;
