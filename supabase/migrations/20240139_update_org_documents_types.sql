-- Update org_documents table to allow additional document types for AO and LSG dashboards

-- Drop the existing constraint
ALTER TABLE org_documents DROP CONSTRAINT IF EXISTS org_documents_document_type_check;

-- Add updated constraint with all document types
ALTER TABLE org_documents ADD CONSTRAINT org_documents_document_type_check 
  CHECK (document_type IN (
    'memorandum', 
    'announcement', 
    'functional_chart',
    'resolution',
    'action_plan',
    'budget_proposal',
    'coa_transitional'
  ));
