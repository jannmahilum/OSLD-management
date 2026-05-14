import { supabase } from '@/lib/supabase';

interface Submission {
  id: string;
  organization: string;
  submission_type: string;
  file_name: string;
  file_url: string;
  submitted_at: string;
  activity_title?: string;
}

// Determine semester based on submission date
export const getSemesterFromDate = (date: Date): '1st' | '2nd' => {
  const month = date.getMonth() + 1;
  // 1st Semester: October (10) - December (12) audits
  // 2nd Semester: January (1) - September (9) audits (March/May are the main ones)
  if (month >= 10 && month <= 12) {
    return '1st';
  } else {
    return '2nd';
  }
};

// Determine audit type based on month
export const getAuditTypeFromDate = (date: Date, semester: '1st' | '2nd'): 'initial' | 'final' => {
  const month = date.getMonth() + 1;
  
  if (semester === '1st') {
    // October = initial, December = final
    return month === 10 ? 'initial' : 'final';
  } else {
    // March = initial, May = final
    return month === 3 ? 'initial' : 'final';
  }
};

// Copy submission to COA review folder structure
// semester is passed from the caller based on audit counting (not date)
export const copyToAuditFolder = async (
  submission: Submission,
  auditType: 'initial' | 'final',
  semester?: '1st' | '2nd'
): Promise<void> => {
  const submissionDate = new Date(submission.submitted_at);
  const year = submissionDate.getFullYear();
  // Use passed semester if provided, otherwise fallback to date-based (legacy)
  const finalSemester = semester || getSemesterFromDate(submissionDate);
  
  // Build storage path: {year}/{organization}/semester_{semester}/audit_{auditType}/{filename}
  const storagePath = `${year}/${submission.organization}/semester_${finalSemester}/audit_${auditType}/${submission.file_name}`;
  
  let finalFileUrl = submission.file_url;
  
  // Copy file in storage bucket (optional - if fails, use original URL)
  try {
    // Extract the actual file path from the file_url
    // URL format: https://{project}.supabase.co/storage/v1/object/public/submissions/{path}
    const urlParts = submission.file_url.split('/submissions/');
    const originalPath = urlParts.length > 1 ? urlParts[1] : submission.file_name;
    
    // Download original file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('submissions')
      .download(originalPath);
    
    if (downloadError) {
      console.warn('Could not download file for copying, using original URL:', downloadError.message);
    } else {
      // Upload to new path
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(storagePath, fileData, {
          contentType: fileData.type,
          upsert: true
        });
      
      if (uploadError) {
        console.warn('Could not upload file copy, using original URL:', uploadError.message);
      } else {
        // Get public URL for the copied file
        const { data: { publicUrl } } = supabase.storage
          .from('submissions')
          .getPublicUrl(storagePath);
        
        finalFileUrl = publicUrl;
      }
    }
  } catch (error: any) {
    console.warn('File copy failed, using original URL:', error.message);
  }
  
  // Save reference in coa_review_copies table (this is the important part)
  try {
    const { error: insertError } = await supabase
      .from('coa_review_copies')
      .insert({
        submission_id: submission.id,
        organization: submission.organization,
        year,
        semester: finalSemester,
        audit_type: auditType,
        file_name: submission.file_name,
        file_url: finalFileUrl,
        storage_path: storagePath,
        original_submission_date: submission.submitted_at
      });
    
    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to save audit record: ${insertError.message}`);
    }
  } catch (error: any) {
    console.error('Error saving to coa_review_copies:', error);
    throw new Error(error.message || 'Failed to save file to audit folder');
  }
};

// Copy pending submissions to initial audit folder (keep them in Pending)
export const copyPendingToInitialAudit = async (
  organization: string,
  year: number,
  semester: '1st' | '2nd'
): Promise<void> => {
  // Get all pending submissions for this org
  const { data: pendingSubmissions, error: fetchError } = await supabase
    .from('submissions')
    .select('*')
    .eq('organization', organization)
    .eq('submitted_to', 'COA')
    .eq('status', 'Pending')
    .in('submission_type', ['Accomplishment Report', 'Liquidation Report']);
  
  if (fetchError) throw fetchError;
  
  if (!pendingSubmissions || pendingSubmissions.length === 0) return;
  
  // Copy each pending submission to initial audit folder (keep in Pending)
  for (const submission of pendingSubmissions) {
    await copyToAuditFolder(submission, 'initial', semester);
    
    // Update submission to mark it with initial audit type (keep status as Pending)
    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        audit_type: 'initial'
      })
      .eq('id', submission.id);
    
    if (updateError) {
      console.error('Error updating submission with initial audit type:', updateError);
      throw updateError;
    }
  }
};

// Check if initial audit has been completed for a submission
export const hasInitialAudit = async (
  organization: string,
  year: number,
  semester: '1st' | '2nd'
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('coa_review_copies')
    .select('id')
    .eq('organization', organization)
    .eq('year', year)
    .eq('semester', semester)
    .eq('audit_type', 'initial')
    .limit(1);
  
  if (error) {
    console.error('Error checking initial audit:', error);
    return false;
  }
  
  return (data?.length || 0) > 0;
};

// Move pending submissions to final audit folder AND remove from pending
export const movePendingToFinalAudit = async (
  organization: string,
  year: number,
  semester: '1st' | '2nd'
): Promise<void> => {
  // Get all pending submissions for this org
  const { data: pendingSubmissions, error: fetchError } = await supabase
    .from('submissions')
    .select('*')
    .eq('organization', organization)
    .eq('submitted_to', 'COA')
    .eq('status', 'Pending')
    .in('submission_type', ['Accomplishment Report', 'Liquidation Report']);
  
  if (fetchError) throw fetchError;
  
  if (!pendingSubmissions || pendingSubmissions.length === 0) return;
  
  // Copy each pending submission to final audit folder and mark as 'final'
  for (const submission of pendingSubmissions) {
    await copyToAuditFolder(submission, 'final', semester);
    
    // Update submission to mark it with final audit type and change status
    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        audit_type: 'final',
        status: 'In Final Audit'
      })
      .eq('id', submission.id);
    
    if (updateError) {
      console.error('Error updating submission to final audit:', updateError);
      throw updateError;
    }
  }
};

// Get audit folder contents
export const getAuditFolderContents = async (
  organization: string,
  year: number,
  semester: '1st' | '2nd',
  auditType: 'initial' | 'final'
) => {
  const { data, error } = await supabase
    .from('coa_review_copies')
    .select('*')
    .eq('organization', organization)
    .eq('year', year)
    .eq('semester', semester)
    .eq('audit_type', auditType)
    .order('copied_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching audit folder contents:', error);
    return [];
  }
  
  return data || [];
};
