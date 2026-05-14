UPDATE submissions 
SET coa_reviewed = true 
WHERE coa_opinion IS NOT NULL 
  AND coa_comment IS NOT NULL 
  AND (coa_reviewed IS NULL OR coa_reviewed = false);
