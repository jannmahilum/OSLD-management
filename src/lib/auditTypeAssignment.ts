import { supabase } from './supabase';

/**
 * Determines the audit type (semester and initial/final) based on submission count in the year.
 * 
 * Schedule (based on COA audit sequence per organization per year):
 * - 1st audit submission → 1st Semester Initial
 * - 2nd audit submission → 1st Semester Final
 * - 3rd audit submission → 2nd Semester Initial
 * - 4th audit submission → 2nd Semester Final
 * 
 * Each organization has exactly 4 audits per year, sequenced by when COA reviews them.
 * 
 * @param organization - The organization short name (e.g., 'USED', 'USG')
 * @returns Object containing semester, audit_type, and submission_count
 */
export async function getNextAuditType(organization: string): Promise<{
  semester: '1st' | '2nd';
  audit_type: 'Initial' | 'Final';
  submission_count: number;
  display_text: string;
}> {
  const currentYear = new Date().getFullYear();
  
  // Count how many DISTINCT audits have been completed for this org this year
  // Each unique combination of (semester, audit_type) = 1 audit
  const { data, error } = await supabase
    .from('submissions')
    .select('semester, audit_type')
    .eq('organization', organization)
    .eq('coa_reviewed', true)
    .gte('coa_reviewed_at', `${currentYear}-01-01`)
    .lte('coa_reviewed_at', `${currentYear}-12-31`);

  if (error) {
    console.error('Error counting audit submissions:', error);
    throw error;
  }

  // Get unique audits by semester + audit_type combination
  // e.g., "1st-Initial", "1st-Final", "2nd-Initial" are 3 different audits
  const uniqueAudits = new Set(data?.map(d => {
    if (d.semester && d.audit_type) {
      return `${d.semester}-${d.audit_type}`;
    }
    // Fallback: use the full audit_type display text if semester is missing
    return d.audit_type || '';
  }) || []);
  const submission_count = uniqueAudits.size + 1; // +1 because this is the NEXT audit
  
  // Determine audit type based on submission count (1st, 2nd, 3rd, or 4th audit of the year)
  let semester: '1st' | '2nd';
  let audit_type: 'Initial' | 'Final';
  let display_text: string;
  
  switch (submission_count) {
    case 1:
      // 1st audit of the year
      semester = '1st';
      audit_type = 'Initial';
      display_text = '1st Semester Initial Audit';
      break;
    case 2:
      // 2nd audit of the year
      semester = '1st';
      audit_type = 'Final';
      display_text = '1st Semester Final Audit';
      break;
    case 3:
      // 3rd audit of the year
      semester = '2nd';
      audit_type = 'Initial';
      display_text = '2nd Semester Initial Audit';
      break;
    case 4:
      // 4th audit of the year
      semester = '2nd';
      audit_type = 'Final';
      display_text = '2nd Semester Final Audit';
      break;
    default:
      // If more than 4, cycle back to determine which audit type
      const cycled = ((submission_count - 1) % 4) + 1;
      switch (cycled) {
        case 1:
          semester = '1st';
          audit_type = 'Initial';
          display_text = '1st Semester Initial Audit';
          break;
        case 2:
          semester = '1st';
          audit_type = 'Final';
          display_text = '1st Semester Final Audit';
          break;
        case 3:
          semester = '2nd';
          audit_type = 'Initial';
          display_text = '2nd Semester Initial Audit';
          break;
        case 4:
        default:
          semester = '2nd';
          audit_type = 'Final';
          display_text = '2nd Semester Final Audit';
          break;
      }
      break;
  }
  
  return {
    semester,
    audit_type,
    submission_count,
    display_text
  };
}

/**
 * Get a summary of all audit submissions for an organization in the current year
 */
export async function getAuditSubmissionSummary(organization: string): Promise<{
  year: number;
  total_audits: number;
  audits: Array<{
    semester: string;
    audit_type: string;
    submitted_at: string;
  }>;
}> {
  const currentYear = new Date().getFullYear();
  
  const { data, error } = await supabase
    .from('submissions')
    .select('audit_type, coa_reviewed_at')
    .eq('organization', organization)
    .eq('coa_reviewed', true)
    .gte('coa_reviewed_at', `${currentYear}-01-01`)
    .lte('coa_reviewed_at', `${currentYear}-12-31`)
    .order('coa_reviewed_at', { ascending: true });

  if (error) {
    console.error('Error fetching audit summary:', error);
    throw error;
  }

  const audits = (data || []).map((item, index) => {
    // Reconstruct the audit type from position
    const position = index % 4;
    let semester: string;
    let audit_type: string;
    
    switch (position) {
      case 0:
        semester = '1st';
        audit_type = 'Initial';
        break;
      case 1:
        semester = '1st';
        audit_type = 'Final';
        break;
      case 2:
        semester = '2nd';
        audit_type = 'Initial';
        break;
      case 3:
        semester = '2nd';
        audit_type = 'Final';
        break;
      default:
        semester = '1st';
        audit_type = 'Initial';
    }
    
    return {
      semester,
      audit_type,
      submitted_at: item.coa_reviewed_at || ''
    };
  });

  return {
    year: currentYear,
    total_audits: audits.length,
    audits
  };
}
