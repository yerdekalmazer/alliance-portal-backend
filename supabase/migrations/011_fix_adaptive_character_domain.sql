-- 011_fix_adaptive_character_domain.sql
-- Adaptive character sorularında domain düzeltmesi

-- Mevcut adaptive-character sorularını güncelle
UPDATE question_bank_questions 
SET domain = 'leadership' 
WHERE category = 'adaptive-character' AND domain = 'character';

-- Log
RAISE NOTICE 'Adaptive character questions domain updated from character to leadership';







