import { useState, useEffect, memo } from "react";
import { FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

const DeadlineAppealSection = memo(({ deadlineType, eventId, orgShortName, targetOrg, appealApproved, onSubmitHere, setActiveNav, setActiveSubmissionTab, eventTitle }: { deadlineType: 'accomplishment' | 'liquidation', eventId: string, orgShortName: string, targetOrg?: string, appealApproved?: boolean, onSubmitHere?: () => void, setActiveNav?: (nav: string) => void, setActiveSubmissionTab?: (tab: string) => void, eventTitle?: string }) => {
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealFile, setAppealFile] = useState<File | null>(null);
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [appealRejected, setAppealRejected] = useState(false);
  const [appealRejectionReason, setAppealRejectionReason] = useState<string | null>(null);
  const [targetOrgAppealSubmitted, setTargetOrgAppealSubmitted] = useState(false);
  const [targetOrgReportSubmitted, setTargetOrgReportSubmitted] = useState(false);
  const { toast } = useToast();

  const reportType = deadlineType === 'accomplishment' ? 'Accomplishment' : 'Liquidation';

  // Check if appeal was already submitted for this specific event (own org)
  useEffect(() => {
    const checkAppealStatus = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('id, status, revision_reason')
        .eq('organization', orgShortName)
        .eq('submission_type', 'Letter of Appeal')
        .eq('event_id', eventId)
        .ilike('activity_title', `%${reportType}%`)
        .limit(1);
      
      if (data && data.length > 0) {
        setAppealSubmitted(true);
        setAppealRejected(data[0].status === 'Rejected');
        setAppealRejectionReason(data[0].revision_reason || null);
      } else {
        setAppealSubmitted(false);
        setAppealRejected(false);
        setAppealRejectionReason(null);
      }
    };
    checkAppealStatus();
  }, [orgShortName, reportType, eventId]);

  // Check if appeal was submitted by target organization (for LCO viewing AO appeals, USG viewing LSG appeals, COA viewing LCO appeals)
  useEffect(() => {
    const checkTargetOrgAppealStatus = async () => {
      if (!targetOrg || targetOrg === orgShortName) return;
      
      // LCO checks for AO appeals, USG checks for LSG appeals, COA checks for LCO/USG appeals
      let submittedToOrg = '';
      if (orgShortName === 'LCO' && targetOrg === 'AO') {
        submittedToOrg = 'LCO';
      } else if (orgShortName === 'USG' && targetOrg === 'LSG') {
        submittedToOrg = 'USG';
      } else if (orgShortName === 'COA' && (targetOrg === 'LCO' || targetOrg === 'USG' || targetOrg === 'AO' || targetOrg === 'LSG' || targetOrg === 'GSC' || targetOrg === 'USED' || targetOrg === 'TGP')) {
        // COA checks for appeals submitted by any org to COA
        submittedToOrg = 'COA';
      }
      
      if (!submittedToOrg) return;
      
      const { data } = await supabase
        .from('submissions')
        .select('id, status')
        .eq('submission_type', 'Letter of Appeal')
        .eq('event_id', eventId)
        .ilike('activity_title', `%${reportType}%`)
        .eq('submitted_to', submittedToOrg)
        .eq('status', 'Pending')
        .limit(1);
      
      setTargetOrgAppealSubmitted(!!data && data.length > 0);
    };
    checkTargetOrgAppealStatus();
  }, [orgShortName, targetOrg, reportType, eventId]);

  // Check if actual report was submitted by target organization
  useEffect(() => {
    const checkTargetOrgReportStatus = async () => {
      if (!targetOrg || targetOrg === orgShortName || !eventId) return;
      
      // LCO checks for AO report submissions, USG checks for LSG report submissions
      let submittedToOrg = '';
      if (orgShortName === 'LCO' && targetOrg === 'AO') {
        submittedToOrg = 'LCO';
      } else if (orgShortName === 'USG' && targetOrg === 'LSG') {
        submittedToOrg = 'USG';
      } else if (orgShortName === 'COA' && targetOrg === 'AO') {
        submittedToOrg = 'COA';
      } else if (orgShortName === 'OSLD' && (targetOrg === 'AO' || targetOrg === 'LSG')) {
        submittedToOrg = 'OSLD';
      }
      
      if (!submittedToOrg) return;
      
      const submissionType = deadlineType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
      
      const { data } = await supabase
        .from('submissions')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('submission_type', submissionType)
        .eq('organization', targetOrg)
        .eq('submitted_to', submittedToOrg)
        .in('status', ['Pending', 'Revision Needed'])
        .limit(1);
      
      setTargetOrgReportSubmitted(!!data && data.length > 0);
    };
    checkTargetOrgReportStatus();
  }, [orgShortName, targetOrg, reportType, deadlineType, eventId]);
  
  // Determine if this is the org's own deadline (can submit appeal) or just a notification
  const isOwnDeadline = targetOrg === orgShortName;
  const canSubmitAppeal = isOwnDeadline && orgShortName !== 'OSLD';

  const [notificationSent, setNotificationSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleNotifyOrganization = async () => {
    if (targetOrg) {
      await supabase
        .from('notifications')
        .insert({
          event_id: eventId,
          event_title: `Reminder: ${reportType} Report Due Today`,
          event_description: `${orgShortName} is reminding you that today is the deadline for the submission of ${reportType} report.`,
          created_by: orgShortName,
          target_org: targetOrg
        });
      setNotificationSent(true);
    }
  };

  const handleSubmitAppeal = async () => {
    if (!appealFile) return;
    
    setSubmitting(true);
    try {
      let submittedTo = 'COA';
      if (orgShortName === 'AO') {
        submittedTo = 'LCO';
      } else if (orgShortName === 'LSG') {
        submittedTo = 'USG';
      }

      const fileExt = appealFile.name.split('.').pop();
      const storagePath = `${orgShortName}_appeal_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(storagePath, appealFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('submissions')
        .getPublicUrl(storagePath);

      const { error: insertError } = await supabase
        .from('submissions')
        .insert({
          organization: orgShortName,
          submission_type: 'Letter of Appeal',
          activity_title: eventTitle ? `${eventTitle} - ${reportType} Report` : `Letter of Appeal - ${reportType} Report`,
          activity_duration: 'N/A',
          activity_venue: 'N/A',
          activity_participants: 'N/A',
          activity_funds: 'N/A',
          activity_budget: 'N/A',
          activity_sdg: 'N/A',
          activity_likha: 'N/A',
          file_url: publicUrl,
          file_name: appealFile.name,
          status: 'Pending',
          submitted_to: submittedTo,
          event_id: eventId
        });

      if (insertError) throw insertError;

      await supabase
        .from('notifications')
        .insert({
          event_id: eventId,
          event_title: `Letter of Appeal Submitted`,
          event_description: `${orgShortName} has submitted a Letter of Appeal for ${reportType} Report${eventTitle ? ` (${eventTitle})` : ''}. Please review it.`,
          created_by: orgShortName,
          target_org: submittedTo
        });

      toast({
        title: "Success",
        description: "Letter of Appeal submitted successfully!",
      });
      setShowAppealForm(false);
      setAppealFile(null);
      setAppealSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting appeal:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to submit appeal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Show when target org (AO/LSG/LCO/USG/etc.) has submitted an appeal to LCO/USG/COA (check this first)
  if (targetOrgAppealSubmitted && !isOwnDeadline) {
    return (
      <div className="mt-3 bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
        <div className="flex">
          <div className="w-1 bg-gray-400" />
          
          <div className="flex-1 p-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-300 flex items-center justify-center">
                <FileText className="w-5 h-5 text-gray-700" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold uppercase tracking-wide text-gray-900">
                  Appeal Submitted
                </h4>
                <p className="text-xs text-gray-600">Pending Your Review</p>
              </div>
            </div>
            
            {/* Submitted By Badge */}
            <div className="mb-3">
              <div className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded border border-gray-300">
                <span className="text-xs font-semibold text-gray-700 uppercase">Submitted By:</span>
                <span className="text-xs font-bold text-gray-800">
                  {targetOrg === 'AO' ? 'Accredited Organizations' : targetOrg === 'LSG' ? 'Local Student Government' : targetOrg}
                </span>
              </div>
            </div>

            {/* Message */}
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              A Letter of Appeal has been submitted and requires your review.
            </p>
            
            {/* Review Button */}
            <button
              onClick={() => {
                setActiveSubmissionTab?.("Letter of Appeal");
                setActiveNav?.("Submissions");
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-white font-semibold text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: "#003b27" }}
            >
              <FileText className="w-4 h-4" />
              Review Appeal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show when target org has submitted an actual report
  if (targetOrgReportSubmitted && !isOwnDeadline) {
    return (
      <div className="mt-3 p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 border border-blue-300 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">{reportType} Report Submitted</span>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            <span className="font-bold text-gray-700 bg-blue-100 px-2 py-1 rounded">{reportType} Report</span>
          </p>
          {targetOrg && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Organization:</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-200 text-blue-800">
                {targetOrg === 'AO' ? 'Accredited Organizations' : targetOrg === 'LSG' ? 'Local Student Government' : targetOrg}
              </span>
            </div>
          )}
          <p className="text-xs text-blue-700 mt-2 leading-relaxed">
            An organization has submitted a {reportType} Report. Please check and review it in the Submissions page.
          </p>
        </div>
      </div>
    );
  }

  // Show when own org's appeal was rejected/declined
  if (appealRejected && isOwnDeadline) {
    const handleSubmitReport = () => {
      if (setActiveNav) {
        setActiveNav(deadlineType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report');
        
        // Scroll to and highlight the event if eventTitle is provided
        if (eventTitle) {
          setTimeout(() => {
            // Find the table row that contains the event title
            const tableRows = document.querySelectorAll('tbody tr');
            for (const row of Array.from(tableRows)) {
              const cells = row.querySelectorAll('td');
              // Check the first cell (document name column) for the event title
              if (cells.length > 0 && cells[0].textContent?.includes(eventTitle)) {
                // Scroll to the row
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add a highlight effect
                row.classList.add('bg-yellow-100');
                setTimeout(() => {
                  row.classList.remove('bg-yellow-100');
                }, 3000);
                break;
              }
            }
          }, 300);
        }
      }
    };

    return (
      <div className="mt-3 bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
        <div className="flex">
          <div className="w-1.5 bg-red-500 flex-shrink-0" />
          <div className="flex-1 p-4">
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg border-2 border-red-300 flex items-center justify-center bg-red-50 flex-shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wide text-red-700">
                  Appeal Declined
                </h4>
                <p className="text-xs text-gray-600 mt-0.5">Action required</p>
              </div>
            </div>

            {/* Message */}
            <div className="bg-red-50 rounded-lg p-3 mb-4 border border-red-100">
              <p className="text-sm text-gray-700 leading-relaxed">
                Your appeal for this activity has been declined. <span className="font-semibold text-gray-900">{reportType} report</span> must be submitted on or before the original deadline.
              </p>
            </div>

            {/* Rejection Reason */}
            {appealRejectionReason && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Reason for Decline</span>
                </div>
                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed pl-5.5">{appealRejectionReason}</p>
              </div>
            )}

            {/* Submit Report Button */}
            {canSubmitAppeal && (
              <button
                onClick={onSubmitHere || handleSubmitReport}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-white font-semibold text-sm transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98] bg-red-600 hover:bg-red-700"
              >
                <FileText className="w-4 h-4" />
                Submit {reportType} Report Here
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show when own org has submitted an appeal (not yet approved)
  if (appealSubmitted && isOwnDeadline && !appealApproved) {
    return (
      <div className="mt-3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col items-center py-5 px-4">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <Clock className="h-6 w-6 text-gray-500" />
          </div>
          <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-1">PENDING REVIEW</h4>
          <p className="text-xs text-gray-600 mb-4">Awaiting approval</p>
          <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-600 text-center leading-relaxed">
              Your appeal for this activity has been submitted successfully.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            <p className="text-xs text-gray-600">
              Please wait for updates from your reviewing body.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isOwnDeadline && targetOrgReportSubmitted) {
    return null;
  }

  if (!showAppealForm) {
    const isApprovedAppeal = appealApproved;
    const bgColor = isApprovedAppeal 
      ? "rounded-xl bg-white border-l-4 border-yellow-500 shadow-sm" 
      : "rounded-xl bg-white border-l-4 border-red-500 shadow-sm";
    const badgeColor = isApprovedAppeal ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600";
    const borderColor = isApprovedAppeal ? "border-gray-200" : "border-gray-200";
    
    return (
      <div className={`mt-3 p-4 ${bgColor}`}>
        <div className="flex items-center gap-3 mb-3">
          <span className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${badgeColor} rounded`}>
            {isApprovedAppeal ? "Extended Deadline" : "Deadline Today"}
          </span>
        </div>
        <div className="space-y-2">
          <p className="text-base font-semibold text-gray-900 mb-3">
            {reportType} Report Due
          </p>
          {targetOrg && !isOwnDeadline && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 font-medium">Organization:</span>
              <span className="text-sm text-gray-900 font-medium">
                {targetOrg === 'AO' ? 'Accredited Organizations' : targetOrg === 'LSG' ? 'Local Student Government' : targetOrg}
              </span>
            </div>
          )}
          {canSubmitAppeal && isApprovedAppeal && (
            <p className="text-sm text-gray-600 leading-relaxed pt-2 border-t border-gray-200">
              Your appeal has been approved. You need to submit your {reportType} report today or your account will be on hold.
            </p>
          )}
          {!isApprovedAppeal && !appealRejected && (
            <p className="text-sm text-gray-600 leading-relaxed pt-2 border-t border-gray-200">
              Today is the deadline for the submission of {reportType} report
            </p>
          )}
          {canSubmitAppeal && onSubmitHere && !appealRejected && (
            <Button
              onClick={onSubmitHere}
              className="w-full mt-3 text-sm font-semibold rounded-lg hover:shadow-md transition-all border border-gray-300 text-gray-700 bg-transparent hover:bg-gray-50"
            >
              Submit Here
            </Button>
          )}
        </div>
        <div className={`mt-3 pt-3 border-t ${borderColor}`}>
          {canSubmitAppeal && !isApprovedAppeal && !appealRejected ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700">Want to file Letter of Appeal?</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowAppealForm(true)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-gray-50"
                  style={{ borderColor: "#003b27", color: "#003b27", border: "2px solid #003b27" }}
                >
                  YES
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="px-4 py-1.5 text-xs font-semibold border-2 rounded-lg bg-red-500 hover:bg-red-600 text-white"
                >
                  NO
                </Button>
              </div>
            </div>
          ) : isApprovedAppeal && canSubmitAppeal ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-amber-800">✅ Extended deadline due to approved appeal</p>
            </div>
          ) : (
            notificationSent ? (
              <div className="flex items-center gap-2 text-green-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-medium">Notification sent</span>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleNotifyOrganization}
                className="w-full text-xs font-semibold rounded-lg border-2 hover:shadow-md transition-all"
                style={{ borderColor: "#003b27", color: "#003b27" }}
              >
                <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Notify Organization
              </Button>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-white border rounded-md" style={{ borderColor: "#003b27" }}>
      <h4 className="text-sm font-bold mb-3 pb-2 border-b" style={{ color: "#003b27", borderColor: "#d4af37" }}>
        LETTER OF APPEAL
      </h4>
      <div className="space-y-3">
        <div>
          <Label className="text-xs font-semibold mb-1.5 block" style={{ color: "#003b27" }}>
            Upload Letter of Appeal
          </Label>
          <Input
            type="file"
            accept=".pdf"
            onChange={(e) => setAppealFile(e.target.files?.[0] || null)}
            className="text-xs h-9"
          />
        </div>
        <div className="p-2 bg-yellow-50 border-l-2 rounded" style={{ borderColor: "#d4af37" }}>
          <p className="text-xs text-gray-700">
            <span className="font-semibold">Note:</span> Letter of Appeal is valid for only 3 days, you must submit your {reportType} on or before the deadline.
          </p>
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="px-4 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: "#003b27", color: "#d4af37" }}
            disabled={!appealFile || submitting}
            onClick={handleSubmitAppeal}
          >
            {submitting ? 'Submitting...' : 'Submit Appeal'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="px-4 py-1.5 text-xs font-semibold"
            onClick={() => setShowAppealForm(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
});

export default DeadlineAppealSection;
