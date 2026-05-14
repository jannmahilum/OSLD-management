import { supabase } from './supabase';

/**
 * Marks a deleted submission in a way that prevents its deadline from reappearing
 * in the calendar. This is used when a user deletes an approved submission.
 * 
 * @param submissionId - The ID of the submission being deleted
 * @param eventId - The associated event ID (if any)
 * @param activityTitle - The activity title
 * @param submissionType - Type of submission (e.g., 'Accomplishment Report', 'Liquidation Report')
 * @param organization - The organization that owns the submission
 */
export async function markSubmissionAsDeletedButApproved(
  submissionId: string,
  eventId: string | null,
  activityTitle: string,
  submissionType: string,
  organization: string,
  status: string
): Promise<void> {
  // Only prevent deadline reappearance if the submission was approved
  if (status !== 'Approved') {
    return;
  }

  // Instead of deleting, we mark the submission as "deleted" but keep a record
  // This allows the calendar logic to still recognize that an approved submission existed
  await supabase
    .from('submissions')
    .update({
      status: 'Deleted (Previously Approved)',
      file_url: null, // Clear the file reference
      file_name: null, // Clear the file name
      gdrive_link: null, // Clear gdrive link if any
      deleted_at: new Date().toISOString()
    })
    .eq('id', submissionId);
}

/**
 * Check if a deadline should appear in the calendar
 * Returns false if there's an approved submission (even if deleted)
 */
export async function shouldShowDeadline(
  activityTitle: string,
  submissionType: string,
  organization: string,
  eventId?: string | null
): Promise<boolean> {
  let query = supabase
    .from('submissions')
    .select('status')
    .eq('activity_title', activityTitle)
    .eq('submission_type', submissionType)
    .eq('organization', organization);

  if (eventId) {
    query = query.eq('event_id', eventId);
  }

  const { data } = await query;

  if (!data || data.length === 0) {
    return true; // No submission found, show deadline
  }

  // Don't show deadline if there's an approved submission (even if marked as deleted)
  const hasApprovedOrDeletedApproved = data.some(
    s => s.status === 'Approved' || s.status === 'Deleted (Previously Approved)'
  );

  return !hasApprovedOrDeletedApproved;
}
