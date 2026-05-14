import { supabase } from '@/lib/supabase';

export interface ApproveAppealParams {
  submissionId: string;
  eventId: string;
  deadlineType: 'accomplishment' | 'liquidation';
  organizationSubmittingAppeal: string;
  reviewingOrganization: string;
  approvedBy?: string;
  notes?: string;
}

/**
 * Approves a Letter of Appeal and sets the corresponding deadline override on the event
 * Updates submission status to 'Approved' and creates/updates the deadline override
 */
export const approveAppeal = async (params: ApproveAppealParams) => {
  try {
    const {
      submissionId,
      eventId,
      deadlineType,
      organizationSubmittingAppeal,
      reviewingOrganization,
      approvedBy,
      notes
    } = params;

    // Step 1: Update the submission status to 'Approved'
    const { error: updateSubmissionError } = await supabase
      .from('submissions')
      .update({
        status: 'Approved',
        approved_by: approvedBy || reviewingOrganization,
        revision_reason: notes || null,
      })
      .eq('id', submissionId);

    if (updateSubmissionError) throw updateSubmissionError;

    // Step 2: Get the original deadline from the event
    const deadlineField = deadlineType === 'accomplishment'
      ? 'accomplishment_deadline'
      : 'liquidation_deadline';

    const { data: eventData, error: fetchEventError } = await supabase
      .from('osld_events')
      .select(deadlineField)
      .eq('id', eventId)
      .single();

    if (fetchEventError) throw fetchEventError;

    // Helper function to add working days (excluding weekends)
    const addWorkingDays = (startDate: Date, days: number): Date => {
      const result = new Date(startDate);
      let addedDays = 0;
      
      while (addedDays < days) {
        result.setDate(result.getDate() + 1);
        const dayOfWeek = result.getDay();
        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          addedDays++;
        }
      }
      
      return result;
    };

    // Calculate new deadline (original deadline + 3 WORKING days)
    // IMPORTANT: Always use the original deadline, not any existing override
    const originalDeadline = new Date(eventData[deadlineField]);
    const newDeadlineDate = addWorkingDays(originalDeadline, 3);

    // Step 3: Set the deadline override on the parent event
    const overrideField = deadlineType === 'accomplishment'
      ? 'accomplishment_deadline_override'
      : 'liquidation_deadline_override';

    const { error: updateEventError } = await supabase
      .from('osld_events')
      .update({
        [overrideField]: newDeadlineDate.toISOString()
      })
      .eq('id', eventId);

    if (updateEventError) throw updateEventError;

    // Step 4: Create a notification for the organization whose appeal was approved
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        event_id: eventId,
        event_title: `Letter of Appeal Approved - ${deadlineType === 'accomplishment' ? 'Accomplishment' : 'Liquidation'} Report`,
        event_description: `Your appeal for the ${deadlineType === 'accomplishment' ? 'Accomplishment' : 'Liquidation'} Report has been approved by ${reviewingOrganization}. You now have 3 days to submit the report. New deadline: ${newDeadlineDate.toLocaleDateString()}`,
        created_by: reviewingOrganization,
        target_org: organizationSubmittingAppeal
      });

    if (notificationError) console.warn('Warning: Could not create notification', notificationError);

    return {
      success: true,
      newDeadline: newDeadlineDate.toISOString(),
      message: `Appeal approved successfully. New deadline set for ${deadlineType === 'accomplishment' ? 'Accomplishment' : 'Liquidation'} Report.`
    };
  } catch (error: any) {
    console.error('Error approving appeal:', error);
    throw new Error(error?.message || 'Failed to approve appeal');
  }
};

/**
 * Rejects a Letter of Appeal
 * Updates submission status to 'Rejected' and stores rejection reason
 */
export const rejectAppeal = async (params: ApproveAppealParams) => {
  try {
    const {
      submissionId,
      reviewingOrganization,
      approvedBy,
      notes
    } = params;

    const { error: updateSubmissionError } = await supabase
      .from('submissions')
      .update({
        status: 'Rejected',
        approved_by: approvedBy || reviewingOrganization,
        revision_reason: notes || 'Appeal rejected',
      })
      .eq('id', submissionId);

    if (updateSubmissionError) throw updateSubmissionError;

    return {
      success: true,
      message: 'Appeal rejected successfully'
    };
  } catch (error: any) {
    console.error('Error rejecting appeal:', error);
    throw new Error(error?.message || 'Failed to reject appeal');
  }
};

/**
 * Gets all pending appeals for a reviewing organization
 */
export const getPendingAppeals = async (reviewingOrganization: string, submittedToOrg?: string) => {
  try {
    let query = supabase
      .from('submissions')
      .select('*')
      .eq('submission_type', 'Letter of Appeal')
      .eq('status', 'Pending');

    if (submittedToOrg) {
      query = query.eq('submitted_to', submittedToOrg);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error: any) {
    console.error('Error fetching pending appeals:', error);
    throw new Error(error?.message || 'Failed to fetch pending appeals');
  }
};
