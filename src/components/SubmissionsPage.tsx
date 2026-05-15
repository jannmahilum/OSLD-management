import { useState, useEffect, useCallback } from "react";
import FileAnnotationViewer from "./FileAnnotationViewer";
import { Menu, LogOut, FileText, Calendar, MapPin, Users, DollarSign, Target, Sparkles, Eye, X, Clock, Building2, CheckCircle, AlertTriangle, MoreHorizontal, Pen, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useToast } from "@/components/ui/use-toast";

interface SubmissionsPageProps {
  activeNav: string;
  setActiveNav: (nav: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  orgShortName?: string;
  orgFullName?: string;
  orgLogo?: string;
  isEmbedded?: boolean;
  hideNavButtons?: boolean;
  onActivityChange?: () => void; // Callback to refresh activity logs in parent
  activeSubmissionTab?: string;
  setActiveSubmissionTab?: (tab: string) => void;
}

interface Submission {
  id: string;
  organization: string;
  submission_type: string;
  activity_title: string;
  activity_duration: string;
  activity_venue: string;
  activity_participants: string;
  activity_funds: string;
  activity_budget: string;
  activity_sdg: string;
  activity_likha: string;
  file_url: string;
  file_urls?: string;
  file_name: string;
  status: string;
  revision_reason?: string;
  submitted_at: string;
  event_id?: string;
  coa_opinion?: string;
  activity_due_title?: string;
  file_revision_status?: Record<string, string> | null; // { [fileUrl]: 'for_revision' | 'approved' }
}

interface FileItem {
  name: string;
  url: string;
}

export default function SubmissionsPage({
  activeNav,
  setActiveNav,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  orgShortName = "OSLD",
  orgFullName = "Office of Student Leadership and Development",
  orgLogo = "",
  isEmbedded = false,
  hideNavButtons = false,
  onActivityChange,
  activeSubmissionTab = "Request to Conduct Activity",
  setActiveSubmissionTab,
}: SubmissionsPageProps) {

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  // previewFile tracks the EXACT file being viewed/annotated; submissionId+url together isolate per-file annotations
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; submissionId?: string; annotateMode?: boolean } | null>(null);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [rejectComment, setRejectComment] = useState("");

  // File-level revision state
  const [isFileRevisionModalOpen, setIsFileRevisionModalOpen] = useState(false);
  // annotatedFileUrls: Set of file URLs that have saved annotations in the DB for current submission
  const [annotatedFileUrls, setAnnotatedFileUrls] = useState<Set<string>>(new Set());
  const [isSubmittingFileRevision, setIsSubmittingFileRevision] = useState(false);

  // Revision upload state for submitter
  const [revisionUploadFile, setRevisionUploadFile] = useState<{ submissionId: string; fileUrl: string; fileName: string } | null>(null);
  const [revisionUploadInput, setRevisionUploadInput] = useState<File | null>(null);
  const [isUploadingRevision, setIsUploadingRevision] = useState(false);
  const [revisionItems, setRevisionItems] = useState({
    // For Request to Conduct Activity
    endorsementLetter: false,
    letterToConduct: false,
    activityDesign: false,
    // For Accomplishment Report
    narrativeReport: false,
    documentation: false,
    attendance: false,
    evaluationReport: false,
    approveLetterToConduct: false,
    // For Liquidation Report
    liquidationReportPerEvent: false,
    breakdownOfExpenses: false,
    dozeDsa: false,
    officialReceipt: false,
    othersOptional: false,
  });
  const { toast } = useToast();

  // Helper: get all files from a submission as FileItem[]
  // STRICT 1:1 mapping — no fallback allowed. Each file gets its own URL.
  const getFilesFromSubmission = useCallback((sub: Submission): FileItem[] => {
    const names = (sub.file_name || '').split(' | ').filter(Boolean);
    const urls = (sub.file_urls || sub.file_url || '').split(' | ').filter(Boolean);

    // Validate alignment
    if (names.length !== urls.length) {
      console.warn(
        `[getFilesFromSubmission] Mismatch for submission ${sub.id}: ` +
        `${names.length} names vs ${urls.length} URLs. ` +
        `Only mapping the first ${Math.min(names.length, urls.length)} files.`
      );
    }

    // Only build entries where BOTH a name and a URL exist at the same index
    const count = Math.min(names.length, urls.length);
    const result: FileItem[] = [];
    for (let i = 0; i < count; i++) {
      result.push({ name: names[i], url: urls[i] });
    }
    return result;
  }, []);

  // Check which files have saved annotations in the DB
  const checkAnnotatedFiles = useCallback(async (sub: Submission) => {
    const files = getFilesFromSubmission(sub);
    if (files.length === 0) return new Set<string>();
    const { data } = await supabase
      .from('annotations')
      .select('file_url, data')
      .eq('submission_id', sub.id);
    // Only count files that have non-empty annotation arrays
    const annotated = new Set<string>(
      (data || [])
        .filter((row: any) => Array.isArray(row.data) && row.data.length > 0)
        .map((row: any) => row.file_url)
    );
    return annotated;
  }, [getFilesFromSubmission]);

  useEffect(() => {
    loadSubmissions();
  }, [orgShortName]);

  const loadSubmissions = async () => {
    // Note: We use select('*') instead of joining osld_events because there's no FK constraint.
    // The activity_due_title is fetched separately in handleViewDetails when needed.
    
    // Filter by submitted_to field to show only submissions directed to this org
    // NEW ROUTING:
    // - Request to Conduct Activity: AO/LSG → LCO/USG → OSLD (stays same)
    // - Accomplishment, Liquidation, Letter of Appeal: USG, LCO, GSC, USED, TGP → COA directly
    // - COA receives Accomplishment, Liquidation, and Letter of Appeal from USG, LCO, GSC, USED, TGP
    // - OSLD receives Request to Conduct Activity from all orgs
    if (orgShortName === 'LCO') {
      // LCO sees only submissions sent TO them (from AOs)
      // LCO should not create their own submissions, only receive from others
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('submitted_to', 'LCO')
        .neq('status', 'Deleted (Previously Approved)')
        .order('submitted_at', { ascending: false });
      if (error) { console.error('Error loading submissions:', error); return; }
      setSubmissions(data || []);
      return;
    } else if (orgShortName === 'USG') {
      // USG sees only submissions sent TO them (from LSG)
      // USG should not create their own submissions, only receive from others
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('submitted_to', 'USG')
        .neq('status', 'Deleted (Previously Approved)')
        .order('submitted_at', { ascending: false });
      if (error) { console.error('Error loading submissions:', error); return; }
      setSubmissions(data || []);
      return;
    } else if (orgShortName === 'OSLD') {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('submitted_to', 'OSLD')
        .neq('status', 'Deleted (Previously Approved)')
        .order('submitted_at', { ascending: false });
      if (error) { console.error('Error loading submissions:', error); return; }
      setSubmissions(data || []);
      return;
    } else if (orgShortName === 'COA') {
      // COA sees all submissions sent to them for stats, but filters by status in tabs
      // Load all statuses: Pending, For Revision, Approved, Rejected
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('submitted_to', 'COA')
        .in('submission_type', ['Accomplishment Report', 'Liquidation Report', 'Letter of Appeal'])
        .neq('status', 'Deleted (Previously Approved)')
        .order('submitted_at', { ascending: false });
      if (error) { console.error('Error loading submissions:', error); return; }
      setSubmissions(data || []);
      return;
    } else {
      // For submitting orgs (AO, LSG, GSC, USED, TGP):
      // Show their OWN submissions so they can see the status of what they submitted
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('organization', orgShortName)
        .neq('status', 'Deleted (Previously Approved)')
        .order('submitted_at', { ascending: false });
      if (error) { console.error('Error loading submissions:', error); return; }
      setSubmissions(data || []);
      return;
    }
  };

  const handleLogout = () => {
    const orgKey = orgShortName.toLowerCase();
    if (orgKey === "osld") {
      localStorage.removeItem("osld_userEmail");
      localStorage.removeItem("osld_userPassword");
      localStorage.removeItem("osld_activeNav");
      localStorage.removeItem("osld_activeSubmissionTab");
    } else {
      localStorage.removeItem(`${orgKey}_userEmail`);
      localStorage.removeItem(`${orgKey}_userPassword`);
      localStorage.removeItem(`${orgKey}_activeNav`);
      localStorage.removeItem(`${orgKey}_activeSubmissionTab`);
    }
    localStorage.removeItem("userOrganization");
    localStorage.removeItem("app_lastPath");
    window.location.href = "/";
  };

  const handleViewDetails = async (submission: Submission) => {
    // CRITICAL: Reset ALL file-related state immediately before async fetch
    // This prevents stale files from a previous submission showing while loading
    setSelectedSubmission(null);
    setAnnotatedFileUrls(new Set());
    setRevisionUploadFile(null);
    setRevisionUploadInput(null);
    setIsDetailDialogOpen(true); // Open dialog early to show loading state

    // Always re-fetch fresh submission data from DB to get latest file_revision_status
    // Filter strictly by submission id — never by submission_type alone
    const { data: freshData } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submission.id)
      .single();
    
    if (freshData) {
      submission = { ...submission, ...freshData };
    }

    // For Letter of Appeal, fetch the activity due title from osld_events
    if (submission.submission_type === 'Letter of Appeal' && submission.event_id) {
      const { data: eventData } = await supabase
        .from('osld_events')
        .select('title')
        .eq('id', submission.event_id)
        .single();
      
      if (eventData) {
        submission.activity_due_title = eventData.title;
      }
    }

    // Pre-load annotated file URLs for THIS specific submission only (filtered by submission_id)
    const annotated = await checkAnnotatedFiles(submission);
    setAnnotatedFileUrls(annotated);
    
    // Set the fresh submission data — files come from this row's file_urls column (per-submission)
    setSelectedSubmission({...submission});
  };

  const submissionTypes = orgShortName === 'COA' 
    ? ["Accomplishment Report", "Liquidation Report", "Letter of Appeal"]
    : ["Request to Conduct Activity", "Accomplishment Report", "Liquidation Report", "Letter of Appeal"];

  const getSubmissionsByType = (type: string) => {
    // For Letter of Appeal: show all statuses so orgs can track their appeal status
    // COA sees appeals sent to them; submitting orgs see their own appeals
    if (type === 'Letter of Appeal') {
      return submissions.filter(s => s.submission_type === type);
    }
    // For reviewing orgs (LCO, USG, OSLD, COA): show only Pending submissions
    // For submitting orgs: show only Pending to avoid showing already-processed items
    if (['LCO', 'USG', 'OSLD', 'COA'].includes(orgShortName)) {
      return submissions.filter(s => s.submission_type === type && s.status === 'Pending');
    }
    // For submitting orgs (AO, LSG, GSC, USED, TGP): show all their own submissions
    return submissions.filter(s => s.submission_type === type);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return (
          <Badge className="bg-gradient-to-r from-emerald-50 to-green-100 text-emerald-800 border border-emerald-300 hover:bg-green-100 font-semibold px-3 py-1 shadow-sm">
            <CheckCircle className="h-3.5 w-3.5 mr-1.5 inline-block" />
            Approved
          </Badge>
        );
      case 'For Revision':
        return (
          <Badge className="bg-gradient-to-r from-orange-50 to-amber-100 text-orange-800 border border-orange-300 hover:bg-orange-100 font-semibold px-3 py-1 shadow-sm">
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5 inline-block" />
            For Revision
          </Badge>
        );
      case 'Rejected':
        return (
          <Badge className="bg-gradient-to-r from-red-50 to-rose-100 text-red-800 border border-red-300 hover:bg-red-100 font-semibold px-3 py-1 shadow-sm">
            <X className="h-3.5 w-3.5 mr-1.5 inline-block" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gradient-to-r from-amber-50 to-yellow-100 text-amber-800 border border-amber-300 hover:bg-amber-50 font-semibold px-3 py-1 shadow-sm animate-pulse">
            <Clock className="h-3.5 w-3.5 mr-1.5 inline-block" />
            Pending Review
          </Badge>
        );
    }
  };

  const handleApprove = async () => {
    if (!selectedSubmission) return;

    const orgFullNames: Record<string, string> = {
      OSLD: 'Office of Student Leadership and Development',
      AO: 'Accredited Organizations',
      LSG: 'Local Student Government',
      GSC: 'Graduating Student Council',
      LCO: 'League of Campus Organization',
      USG: 'University Student Government',
      TGP: 'The Gold Panicles',
      USED: 'University Student Enterprise Development',
    };

    try {
      if (selectedSubmission.submission_type === 'Letter of Appeal' && selectedSubmission.event_id) {
        const { data: eventData, error: eventError } = await supabase
          .from('osld_events')
          .select('*')
          .eq('id', selectedSubmission.event_id)
          .single();

        if (!eventError && eventData) {
          const addWorkingDays = (startDate: Date, days: number): Date => {
            const result = new Date(startDate);
            let addedDays = 0;
            while (addedDays < days) {
              result.setDate(result.getDate() + 1);
              if (result.getDay() !== 0 && result.getDay() !== 6) addedDays++;
            }
            return result;
          };

          // Determine if this appeal is for accomplishment or liquidation
          // PRIMARY: Parse from the appeal's activity_title (e.g., "Event Title - Accomplishment Report")
          // FALLBACK: Check if a matching submission exists in the list
          const appealTitle = (selectedSubmission.activity_title || '').toLowerCase();
          let isAccomplishment = appealTitle.includes('accomplishment');
          let isLiquidation = appealTitle.includes('liquidation');

          // Fallback: If the activity_title doesn't contain the type, check existing submissions
          if (!isAccomplishment && !isLiquidation) {
            const accomSubmission = submissions.find(s => 
              (s.event_id === selectedSubmission.event_id || s.activity_title === selectedSubmission.activity_title) &&
              s.submission_type === 'Accomplishment Report'
            );
            const liqSubmission = submissions.find(s => 
              (s.event_id === selectedSubmission.event_id || s.activity_title === selectedSubmission.activity_title) &&
              s.submission_type === 'Liquidation Report'
            );
            isAccomplishment = !!accomSubmission;
            isLiquidation = !!liqSubmission;
          }

          // Last resort fallback: check which deadline fields exist on the event
          if (!isAccomplishment && !isLiquidation) {
            if (eventData.accomplishment_deadline && !eventData.accomplishment_deadline_override) {
              isAccomplishment = true;
            } else if (eventData.liquidation_deadline && !eventData.liquidation_deadline_override) {
              isLiquidation = true;
            } else if (eventData.accomplishment_deadline) {
              isAccomplishment = true;
            } else {
              isLiquidation = true;
            }
            console.warn('Could not determine appeal type from title or submissions, fell back to event deadline fields. isAccomplishment:', isAccomplishment, 'isLiquidation:', isLiquidation);
          }

          // Extend deadline by 3 calendar days from the ORIGINAL deadline
          const deadlineField = isAccomplishment ? 'accomplishment_deadline' : 'liquidation_deadline';
          const overrideField = isAccomplishment ? 'accomplishment_deadline_override' : 'liquidation_deadline_override';
          const originalDeadlineStr = eventData[deadlineField];

          let resolvedDeadlineStr = originalDeadlineStr;

          // If the deadline field is null, compute it on-the-fly from end_date
          if (!resolvedDeadlineStr && eventData.end_date) {
            console.warn('Deadline field is null, computing from end_date:', {
              deadlineField,
              end_date: eventData.end_date,
              isAccomplishment,
              isLiquidation,
            });
            const endDate = new Date(eventData.end_date);
            // Accomplishment: 3 working days after end_date
            // Liquidation: 7 working days after end_date
            const workingDaysToAdd = isAccomplishment ? 3 : 7;
            const computedDeadline = addWorkingDays(endDate, workingDaysToAdd);
            resolvedDeadlineStr = computedDeadline.toISOString().split('T')[0];

            // Also backfill the missing deadline in the database so it's set for next time
            const backfillData: Record<string, string> = {};
            backfillData[deadlineField] = resolvedDeadlineStr;
            await supabase
              .from('osld_events')
              .update(backfillData)
              .eq('id', selectedSubmission.event_id);
            console.log('Backfilled missing deadline:', backfillData);
          }

          if (!resolvedDeadlineStr) {
            console.error('Cannot extend deadline - original deadline is null and end_date is missing:', {
              deadlineField,
              isAccomplishment,
              isLiquidation,
              eventData,
            });
            alert('Error: Could not find original deadline for this appeal. The event may be missing its end date.');
            return;
          }

          // Add 3 working days to the original deadline (skip weekends)
          const originalDeadline = new Date(resolvedDeadlineStr);
          const newDeadline = new Date(originalDeadline);
          
          let workingDaysAdded = 0;
          while (workingDaysAdded < 3) {
            newDeadline.setDate(newDeadline.getDate() + 1);
            const dayOfWeek = newDeadline.getDay();
            // Skip Saturdays (6) and Sundays (0)
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
              workingDaysAdded++;
            }
          }
          
          const newDeadlineString = newDeadline.toISOString().split('T')[0];

          // Always write the override - isAccomplishment or isLiquidation is guaranteed true by fallback logic above
          const updateData: Record<string, string> = {};
          if (isAccomplishment) updateData.accomplishment_deadline_override = newDeadlineString;
          else if (isLiquidation) updateData.liquidation_deadline_override = newDeadlineString;

          console.log('Appeal approval - writing deadline override:', {
            eventId: selectedSubmission.event_id,
            isAccomplishment,
            isLiquidation,
            originalDeadline: resolvedDeadlineStr,
            wasComputed: !originalDeadlineStr,
            newDeadline: newDeadlineString,
            workingDaysExtended: 3,
            updateData,
          });

          if (Object.keys(updateData).length > 0) {
            const { error: overrideError } = await supabase
              .from('osld_events')
              .update(updateData)
              .eq('id', selectedSubmission.event_id);
            
            if (overrideError) {
              console.error('Failed to write deadline override:', overrideError);
              throw overrideError;
            }
          } else {
            console.error('WARNING: updateData is empty - no deadline override written! This should not happen.');
          }

          // UPDATE the Letter of Appeal submission status to 'Approved'
          const { error: appealUpdateError } = await supabase
            .from('submissions')
            .update({
              status: 'Approved',
              approved_by: orgShortName,
            })
            .eq('id', selectedSubmission.id);

          if (appealUpdateError) throw appealUpdateError;

          const reportType = isAccomplishment ? 'accomplishment' : 'liquidation';

          await supabase.from('notifications').insert({
            event_id: selectedSubmission.id,
            event_title: `Letter of Appeal Approved`,
            event_description: `Your Letter of Appeal for "${selectedSubmission.activity_title}" has been approved by ${orgFullNames[orgShortName] || orgShortName}. You can now submit the ${reportType} report on or before ${newDeadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (3 days extension). If not submitted by then, your account will be placed on hold.`,
            created_by: orgShortName,
            target_org: selectedSubmission.organization,
          });


          // Log Letter of Appeal Approval to activity_logs
          await supabase.from('activity_logs').insert({
            organization: selectedSubmission.organization,
            action_type: 'Letter of Appeal',
            action_description: `Approved`,
            coa_action: 'Approved',
            performed_by: orgShortName,
            submission_id: selectedSubmission.id.toString(),
          });

        }

        toast({
          title: 'Appeal Approved',
          description: `Letter of Appeal for "${selectedSubmission.activity_title}" has been approved. Deadline extended by 3 working days.`,
        });

        setIsDetailDialogOpen(false);
        loadSubmissions();
        onActivityChange?.();
        return;
      } else {
        // Send notification to the submitting organization
        await supabase.from('notifications').insert({
          event_id: selectedSubmission.id,
          event_title: `${selectedSubmission.submission_type} Approved`,
          event_description: `Your ${selectedSubmission.submission_type} titled "${selectedSubmission.activity_title}" has been approved by ${orgFullNames[orgShortName] || orgShortName}. Check it out!`,
          created_by: orgShortName,
          target_org: selectedSubmission.organization,
        });

        // LCO/USG: Endorse Accomplishment/Liquidation Reports to COA
        if (orgShortName === 'LCO' || orgShortName === 'USG') {
          if (
            selectedSubmission.submission_type === 'Accomplishment Report' ||
            selectedSubmission.submission_type === 'Liquidation Report'
          ) {
            const { error: endorseError } = await supabase
              .from('submissions')
              .update({
                status: 'Approved',
                submitted_to: 'COA',
                endorsed_to_coa: true,
                approved_by: orgShortName,
              })
              .eq('id', selectedSubmission.id);

            if (endorseError) throw endorseError;

            await supabase.from('notifications').insert({
              event_id: selectedSubmission.id,
              event_title: `${selectedSubmission.submission_type} Endorsed from ${orgShortName}`,
              event_description: `${orgShortName} has endorsed a ${selectedSubmission.submission_type} titled "${selectedSubmission.activity_title}" from ${selectedSubmission.organization} to COA for review.`,
              created_by: orgShortName,
              target_org: 'COA',
            });

            toast({
              title: 'Submission Endorsed',
              description: `"${selectedSubmission.activity_title}" has been approved and endorsed to COA.`,
            });

            setIsDetailDialogOpen(false);
            loadSubmissions();
            onActivityChange?.();
            return;
          }
        }

        // COA: Approve and move to Audit Files
        if (orgShortName === 'COA') {
          const { error } = await supabase
            .from('submissions')
            .update({
              status: 'Approved',
              approved_by: orgShortName,
              submitted_to: orgShortName,
              coa_reviewed: false,
            })
            .eq('id', selectedSubmission.id);

          if (error) throw error;

          toast({
            title: 'Submission Approved',
            description: `"${selectedSubmission.activity_title}" has been approved and moved to Audit Files.`,
          });

          setIsDetailDialogOpen(false);
          loadSubmissions();
          onActivityChange?.();
          return;
        }

        // Generic approval for other orgs (OSLD, etc.)
        const { error } = await supabase
          .from('submissions')
          .update({
            status: 'Approved',
            approved_by: orgShortName,
            submitted_to: orgShortName,
          })
          .eq('id', selectedSubmission.id);

        if (error) throw error;

        toast({
          title: 'Submission Approved',
          description: `"${selectedSubmission.activity_title}" has been approved successfully.`,
        });

        setIsDetailDialogOpen(false);
        loadSubmissions();
        onActivityChange?.();
      }
    } catch (err: unknown) {
      console.error('Error approving submission:', err);
      const errorMessage = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err) ? String((err as Record<string, unknown>).message) : 'Unknown error';
      toast({
        title: 'Error',
        description: `Failed to approve submission: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  };

  const handleForRevision = async () => {
    if (!selectedSubmission) return;

    // Always re-fetch from DB to get the latest annotation state
    const annotated = await checkAnnotatedFiles(selectedSubmission);
    setAnnotatedFileUrls(annotated);

    if (annotated.size === 0) {
      toast({
        title: "No Annotated Files",
        description: "Annotate at least one file before requesting revision. Only annotated files can be marked for revision.",
        variant: "destructive",
      });
      return;
    }

    // Open confirmation modal showing which files will be marked for_revision vs approved
    setIsFileRevisionModalOpen(true);
  };

  const handleRejectClick = () => {
    setIsRejectDialogOpen(true);
  };

  // Confirm file-level revision: save file_revision_status and mark submission as 'For Revision'
  // Annotated files → for_revision, all others → approved. No manual selection needed.
  const handleConfirmFileRevision = async () => {
    if (!selectedSubmission) return;
    const files = getFilesFromSubmission(selectedSubmission);
    // Use annotatedFileUrls as the single source of truth for which files are for_revision
    const checkedFiles = files.filter(f => annotatedFileUrls.has(f.url));
    if (checkedFiles.length === 0) {
      toast({ title: "No annotated files", description: "Annotate at least one file before requesting revision.", variant: "destructive" });
      return;
    }
    setIsSubmittingFileRevision(true);
    try {
      // Build file_revision_status: annotated = 'for_revision', others = 'approved'
      const fileRevStatus: Record<string, string> = {};
      files.forEach(f => {
        fileRevStatus[f.url] = annotatedFileUrls.has(f.url) ? 'for_revision' : 'approved';
      });

      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'For Revision',
          file_revision_status: fileRevStatus,
          ...(revisionReason.trim() ? { revision_reason: revisionReason.trim() } : {}),
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      // Build revision reason from file names
      const revisionFileNames = checkedFiles.map(f => {
        const label = f.name.includes(':') ? f.name.split(':')[0].trim() : f.name;
        return label;
      });

      const orgFullNames: Record<string, string> = {
        "OSLD": "Office of Student Leadership and Development",
        "AO": "Accredited Organizations",
        "LSG": "Local Student Government",
        "GSC": "Graduating Student Council",
        "LCO": "League of Campus Organization",
        "USG": "University Student Government",
        "TGP": "The Gold Panicles",
        "USED": "University Student Enterprise Development"
      };

      await supabase.from('notifications').insert({
        event_id: selectedSubmission.id,
        event_title: `${selectedSubmission.submission_type} Requires Revision`,
        event_description: `Your ${selectedSubmission.submission_type} titled "${selectedSubmission.activity_title}" requires revision for the following file(s): ${revisionFileNames.join(', ')}. Requested by ${orgFullNames[orgShortName] || orgShortName}.`,
        created_by: orgShortName,
        target_org: selectedSubmission.organization,
      });

      toast({ title: "Revision Requested", description: `${checkedFiles.length} file(s) marked for revision.` });
      setIsFileRevisionModalOpen(false);
      setIsDetailDialogOpen(false);
      setRevisionReason("");
      loadSubmissions();
      onActivityChange?.();
    } catch (err) {
      console.error('Error saving file revision:', err);
      toast({ title: "Error", description: "Failed to save revision request.", variant: "destructive" });
    } finally {
      setIsSubmittingFileRevision(false);
    }
  };

  // Submitter: handle revision file upload for a specific file
  const handleRevisionFileUpload = async () => {
    if (!revisionUploadFile || !revisionUploadInput || !selectedSubmission) return;
    setIsUploadingRevision(true);
    try {
      const file = revisionUploadInput;
      const fileExt = file.name.split('.').pop();
      // Include submission_id in path to ensure files are isolated per submission
      const filePath = `submissions/${selectedSubmission.organization}/${selectedSubmission.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(filePath);
      const newFileUrl = urlData.publicUrl;

      // Replace the old file URL at its exact index — strict 1:1 mapping preserved
      const currentFileUrls = (selectedSubmission.file_urls || selectedSubmission.file_url || '').split(' | ').filter(Boolean);
      const currentFileNames = (selectedSubmission.file_name || '').split(' | ').filter(Boolean);
      const oldUrl = revisionUploadFile.fileUrl;
      const oldName = revisionUploadFile.fileName;

      // Find the index by exact URL match
      const urlIndex = currentFileUrls.indexOf(oldUrl);
      if (urlIndex === -1) {
        console.warn(`[handleRevisionFileUpload] Could not find oldUrl in currentFileUrls. oldUrl: ${oldUrl}`);
        throw new Error('Could not find the file to replace. Please reload and try again.');
      }

      // Replace at the exact same index so name[i] and url[i] stay aligned
      const newFileUrls = [...currentFileUrls];
      newFileUrls[urlIndex] = newFileUrl;

      const labelPart = oldName.includes(':') ? oldName.split(':')[0].trim() : oldName.split('.')[0];
      const newFileName = `${labelPart}: ${file.name}`;
      const newFileNames = [...currentFileNames];
      // Find name index — prefer matching index, fall back to name match
      const nameIndex = urlIndex < currentFileNames.length ? urlIndex : currentFileNames.indexOf(oldName);
      if (nameIndex !== -1) {
        newFileNames[nameIndex] = newFileName;
      } else {
        console.warn(`[handleRevisionFileUpload] Could not find oldName in currentFileNames. oldName: ${oldName}`);
      }

      // Validate that counts still match after update
      if (newFileUrls.length !== newFileNames.length) {
        console.warn(
          `[handleRevisionFileUpload] Count mismatch after update: ${newFileNames.length} names vs ${newFileUrls.length} URLs`
        );
      }

      // Update file_revision_status: remove 'for_revision' for this file URL
      const currentFRS = selectedSubmission.file_revision_status || {};
      const newFRS = { ...currentFRS };
      delete newFRS[oldUrl];
      // Also mark the new url as 'submitted'
      newFRS[newFileUrl] = 'submitted';

      // Check if all for_revision files are now submitted
      const stillForRevision = Object.values(newFRS).some(v => v === 'for_revision');

      const { error: updateError } = await supabase
        .from('submissions')
        .update({
          file_url: newFileUrls[0],
          file_urls: newFileUrls.join(' | '),
          file_name: newFileNames.join(' | '),
          file_revision_status: newFRS,
          status: stillForRevision ? 'For Revision' : 'Pending',
        })
        .eq('id', selectedSubmission.id);

      if (updateError) throw updateError;

      // Clear saved annotations for the old file
      await supabase.from('annotations').delete()
        .eq('submission_id', selectedSubmission.id)
        .eq('file_url', oldUrl);

      toast({ title: "Revision Submitted", description: "Your revised file has been uploaded successfully." });
      setRevisionUploadFile(null);
      setRevisionUploadInput(null);
      setIsDetailDialogOpen(false);
      loadSubmissions();
      onActivityChange?.();
    } catch (err) {
      console.error('Error uploading revision:', err);
      toast({ title: "Error", description: "Failed to upload revision file.", variant: "destructive" });
    } finally {
      setIsUploadingRevision(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;
    
    const { error } = await supabase
      .from('submissions')
      .update({ 
        status: 'Rejected',
        rejection_reason: rejectComment || null,
        approved_by: orgShortName
      })
      .eq('id', selectedSubmission.id);

    if (error) {
      console.error('Error rejecting submission:', error);
      toast({
        title: "Error",
        description: "Failed to reject submission. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Create notification for the submitting organization
    const orgFullNames: Record<string, string> = {
      "OSLD": "Office of Student Leadership and Development",
      "AO": "Accredited Organizations",
      "LSG": "Local Student Government",
      "GSC": "Graduating Student Council",
      "LCO": "League of Campus Organization",
      "USG": "University Student Government",
      "TGP": "The Gold Panicles",
      "USED": "University Student Enterprise Development"
    };
    
    const rejectMessage = rejectComment 
      ? `Your ${selectedSubmission.submission_type} titled "${selectedSubmission.activity_title}" has been rejected by ${orgFullNames[orgShortName] || orgShortName}. Reason: ${rejectComment}`
      : `Your ${selectedSubmission.submission_type} titled "${selectedSubmission.activity_title}" has been rejected by ${orgFullNames[orgShortName] || orgShortName}.`;
    
    await supabase
      .from('notifications')
      .insert({
        event_id: selectedSubmission.id,
        event_title: `${selectedSubmission.submission_type} Rejected`,
        event_description: rejectMessage,
        created_by: orgShortName,
        target_org: selectedSubmission.organization
      });


    toast({
      title: "Submission Rejected",
      description: `"${selectedSubmission.activity_title}" has been rejected.`,
    });
    setIsRejectDialogOpen(false);
    setIsDetailDialogOpen(false);
    setRejectComment("");
    loadSubmissions();
    // Trigger activity logs refresh in parent
    onActivityChange?.();
  };

  const handleDecline = async () => {
    if (!selectedSubmission) return;
    
    const { error } = await supabase
      .from('submissions')
      .update({ status: 'Rejected' })
      .eq('id', selectedSubmission.id);

    if (error) {
      console.error('Error declining submission:', error);
      toast({
        title: "Error",
        description: "Failed to decline submission. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Create notification for the submitting organization
    const orgFullNames: Record<string, string> = {
      "OSLD": "Office of Student Leadership and Development",
      "AO": "Accredited Organizations",
      "LSG": "Local Student Government",
      "GSC": "Graduating Student Council",
      "LCO": "League of Campus Organization",
      "USG": "University Student Government",
      "TGP": "The Gold Panicles",
      "USED": "University Student Enterprise Development"
    };
    
    // Get today's date formatted
    const today = new Date();
    const todayFormatted = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    await supabase
      .from('notifications')
      .insert({
        event_id: selectedSubmission.id,
        event_title: `Letter of Appeal Declined`,
        event_description: `Your Letter of Appeal for "${selectedSubmission.activity_title}" has been declined by ${orgFullNames[orgShortName] || orgShortName}. You must submit the required liquidation/accomplishment report today (${todayFormatted}) or your account will be placed on hold.`,
        created_by: orgShortName,
        target_org: selectedSubmission.organization
      });


    toast({
      title: "Submission Declined",
      description: `"${selectedSubmission.activity_title}" has been declined.`,
    });
    setIsDetailDialogOpen(false);
    loadSubmissions();
  };

  const handleSubmitRevision = async () => {
    if (!selectedSubmission) {
      return;
    }

    // Build revision reason from checkboxes and additional comments
    const selectedItems = [];
    // Request to Conduct Activity items
    if (revisionItems.endorsementLetter) selectedItems.push("Endorsement Letter");
    if (revisionItems.letterToConduct) selectedItems.push("Letter to Conduct");
    if (revisionItems.activityDesign) selectedItems.push("Activity Design");
    
    // Accomplishment Report items
    if (revisionItems.narrativeReport) selectedItems.push("Narrative Report");
    if (revisionItems.documentation) selectedItems.push("Documentation");
    if (revisionItems.attendance) selectedItems.push("Attendance");
    if (revisionItems.evaluationReport) selectedItems.push("Evaluation Report");
    if (revisionItems.approveLetterToConduct) selectedItems.push("Approve Letter to Conduct Activity");
    
    // Liquidation Report items
    if (revisionItems.liquidationReportPerEvent) selectedItems.push("Liquidation Report Per Event");
    if (revisionItems.breakdownOfExpenses) selectedItems.push("Breakdown of Expenses");
    if (revisionItems.dozeDsa) selectedItems.push("DoZE & DSA");
    if (revisionItems.officialReceipt) selectedItems.push("Official Receipt and Needed Fiscal Forms, Procurement Forms");
    if (revisionItems.othersOptional) selectedItems.push("Others (Optional)");

    if (selectedItems.length === 0 && !revisionReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select at least one item or provide additional comments.",
        variant: "destructive",
      });

      return;
    }

    let fullRevisionReason = "";
    if (selectedItems.length > 0) {
      fullRevisionReason = `Items requiring revision:\n• ${selectedItems.join("\n• ")}`;
    }
    if (revisionReason.trim()) {
      fullRevisionReason += fullRevisionReason ? `\n\nAdditional Comments:\n${revisionReason}` : revisionReason;
    }
    
    const { error } = await supabase
      .from('submissions')
      .update({ 
        status: 'For Revision',
        revision_reason: fullRevisionReason 
      })
      .eq('id', selectedSubmission.id);

    if (error) {
      console.error('Error updating submission:', error);
      toast({
        title: "Error",
        description: "Failed to update submission. Please try again.",
        variant: "destructive",
      });

      return;
    }

    // Create notification for the submitting organization
    const orgFullNames: Record<string, string> = {
      "OSLD": "Office of Student Leadership and Development",
      "AO": "Accredited Organizations",
      "LSG": "Local Student Government",
      "GSC": "Graduating Student Council",
      "LCO": "League of Campus Organization",
      "USG": "University Student Government",
      "TGP": "The Gold Panicles",
      "USED": "University Student Enterprise Development"
    };
    
    await supabase
      .from('notifications')
      .insert({
        event_id: selectedSubmission.id,
        event_title: `${selectedSubmission.submission_type} Requires Revision`,
        event_description: `Your ${selectedSubmission.submission_type} titled "${selectedSubmission.activity_title}" requires revision by ${orgFullNames[orgShortName] || orgShortName}. Check it out!`,
        created_by: orgShortName,
        target_org: selectedSubmission.organization
      });


    toast({
      title: "Revision Required",
      description: `"${selectedSubmission.activity_title}" has been marked for revision.`,
    });
    setIsRevisionDialogOpen(false);
    setIsDetailDialogOpen(false);
    setRevisionReason("");
    setRevisionItems({
      endorsementLetter: false,
      letterToConduct: false,
      activityDesign: false,
      narrativeReport: false,
      documentation: false,
      attendance: false,
      evaluationReport: false,
      approveLetterToConduct: false,
      liquidationReportPerEvent: false,
      breakdownOfExpenses: false,
      dozeDsa: false,
      officialReceipt: false,
      othersOptional: false,
    });
    loadSubmissions();
    // Trigger activity logs refresh in parent
    onActivityChange?.();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderDialogs = () => (
    <div>
      {/* Submission Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={(open) => {
          setIsDetailDialogOpen(open);
          if (!open) {
            // Reset all file-related state when dialog closes to prevent stale data
            setSelectedSubmission(null);
            setAnnotatedFileUrls(new Set());
            setRevisionUploadFile(null);
            setRevisionUploadInput(null);
          }
        }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold" style={{ color: "#003b27" }}>
              Submission Details
            </DialogTitle>
          </DialogHeader>
          
          {!selectedSubmission && (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <div className="animate-spin h-6 w-6 border-2 border-[#003b27] border-t-transparent rounded-full mr-3" />
              Loading submission...
            </div>
          )}

          {selectedSubmission && (
            <div className="space-y-6 py-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                {getStatusBadge(selectedSubmission.status)}
              </div>

              {/* Revision Reason - Show when status is For Revision */}
              {selectedSubmission.status === 'For Revision' && selectedSubmission.revision_reason && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-600 mb-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-semibold">Revision Required</span>
                  </div>
                  <p className="text-gray-700 mb-3">
                    You are advised to revise your request to conduct activity due to the following reasons:
                  </p>
                  <div className="p-3 bg-white border border-orange-100 rounded-lg">
                    <p className="text-gray-800">{selectedSubmission.revision_reason}</p>
                  </div>
                  <p className="text-sm text-gray-600 italic mt-3">
                    Please stay updated for further announcements.
                  </p>
                </div>
              )}

              {/* Activity Title */}
              <div className="p-4 bg-[#003b27]/5 rounded-lg">
                <h3 className="text-xl font-bold text-[#003b27]">
                  {selectedSubmission.activity_title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Submitted by {{
                    "OSLD": "Office of Student Leadership and Development",
                    "AO": "Accredited Organizations",
                    "LSG": "Local Student Government",
                    "GSC": "Graduating Student Council",
                    "LCO": "League of Campus Organization",
                    "USG": "University Student Government",
                    "TGP": "The Gold Panicles",
                    "USED": "University Student Enterprise Development"
                  }[selectedSubmission.organization] || selectedSubmission.organization}
                </p>
              </div>

              {/* Details Grid - Only show for Request Activity submissions */}
              {selectedSubmission.submission_type === 'Request to Conduct Activity' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">Duration</span>
                    </div>
                    <p className="text-gray-800 font-semibold">{selectedSubmission.activity_duration}</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm font-medium">Venue/Platform</span>
                    </div>
                    <p className="text-gray-800 font-semibold">{selectedSubmission.activity_venue}</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">Target Participants</span>
                    </div>
                    <p className="text-gray-800 font-semibold">{selectedSubmission.activity_participants}</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <span className="text-lg font-bold">₱</span>
                      <span className="text-sm font-medium">Source of Funds</span>
                    </div>
                    <p className="text-gray-800 font-semibold">{selectedSubmission.activity_funds}</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <span className="text-lg font-bold">₱</span>
                      <span className="text-sm font-medium">Budgetary Requirements</span>
                    </div>
                    <p className="text-gray-800 font-semibold">{selectedSubmission.activity_budget}</p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Target className="h-4 w-4" />
                      <span className="text-sm font-medium">SDG</span>
                    </div>
                    <p className="text-gray-800 font-semibold">{selectedSubmission.activity_sdg}</p>
                  </div>

                  <div className="p-4 border rounded-lg md:col-span-2">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-sm font-medium">LIKHA Agenda</span>
                    </div>
                    <p className="text-gray-800 font-semibold">{selectedSubmission.activity_likha}</p>
                  </div>
                </div>
              )}

              {/* Activity Name Title - Only show for Letter of Appeal submissions */}
              {selectedSubmission.submission_type === 'Letter of Appeal' && (
                <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Calendar className="h-5 w-5" />
                    <span className="font-semibold">Activity Name</span>
                  </div>
                  <p className="text-gray-800 font-medium">{selectedSubmission.activity_due_title || selectedSubmission.activity_title || 'Not specified'}</p>
                </div>
              )}

              {/* Submission Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Submitted On</span>
                </div>
                <p className="text-gray-800">{formatDate(selectedSubmission.submitted_at)}</p>
              </div>

              {/* File Attachment */}
              {(() => {
                const files = getFilesFromSubmission(selectedSubmission);
                if (files.length === 0) return null;

                const isApprover = ['LCO', 'USG', 'OSLD', 'COA'].includes(orgShortName);
                const isSubmitter = !isApprover;
                const frs = selectedSubmission.file_revision_status || {};
                // Files explicitly marked for_revision
                const forRevisionFiles = files.filter(f => frs[f.url] === 'for_revision');
                // All other files (not for_revision) are approved — includes files with no frs entry
                const approvedFiles = files.filter(f => frs[f.url] !== 'for_revision');

                // For submitter with For Revision status: ALWAYS show split view (🔴/🟢)
                if (isSubmitter && selectedSubmission.status === 'For Revision') {
                  return (
                    <div className="space-y-4 w-full">
                      {/* 🔴 For Revision Files */}
                      {forRevisionFiles.length > 0 && (
                        <div className="space-y-2">
                          <p className="font-semibold text-orange-700 text-sm flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            🔴 For Revision
                          </p>
                          {forRevisionFiles.map((file, idx) => {
                            const label = file.name.includes(':') ? file.name.split(':')[0].trim() : file.name;
                            const isUploadingThis = revisionUploadFile?.fileUrl === file.url;
                            return (
                              <div key={idx} className="p-3 border-2 border-orange-300 rounded-lg bg-orange-50 space-y-2">
                                <div className="flex items-center gap-3">
                                  <div className="p-1.5 bg-orange-100 rounded shrink-0">
                                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                                  </div>
                                  <span className="text-sm font-medium text-orange-800 truncate flex-1">{label}</span>
                                  <div className="flex gap-2 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-orange-400 text-orange-700 hover:bg-orange-100"
                                      onClick={() => setPreviewFile({ ...file, submissionId: selectedSubmission.id.toString(), annotateMode: false })}
                                    >
                                      <Eye className="h-3.5 w-3.5 mr-1" />
                                      View Annotated
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-orange-500 hover:bg-orange-600 text-white"
                                      onClick={() => setRevisionUploadFile({ submissionId: selectedSubmission.id.toString(), fileUrl: file.url, fileName: file.name })}
                                    >
                                      <Upload className="h-3.5 w-3.5 mr-1" />
                                      Submit Revision
                                    </Button>
                                  </div>
                                </div>
                                {isUploadingThis && (
                                  <div className="space-y-2 border-t border-orange-200 pt-2">
                                    <input
                                      type="file"
                                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                      className="text-xs w-full"
                                      onChange={e => setRevisionUploadInput(e.target.files?.[0] || null)}
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => { setRevisionUploadFile(null); setRevisionUploadInput(null); }}
                                      >Cancel</Button>
                                      <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        disabled={!revisionUploadInput || isUploadingRevision}
                                        onClick={handleRevisionFileUpload}
                                      >
                                        {isUploadingRevision ? 'Uploading...' : 'Upload'}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 🟢 Approved Files */}
                      {approvedFiles.length > 0 && (
                        <div className="space-y-2">
                          <p className="font-semibold text-green-700 text-sm flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            🟢 Approved
                          </p>
                          {approvedFiles.map((file, idx) => {
                            const label = file.name.includes(':') ? file.name.split(':')[0].trim() : file.name;
                            return (
                              <div key={idx} className="p-3 border-2 border-green-200 rounded-lg flex items-center justify-between gap-3 bg-green-50">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="p-1.5 bg-green-100 rounded shrink-0">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  </div>
                                  <span className="text-sm text-green-800 truncate font-medium">{label}</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-green-500 text-green-700 hover:bg-green-100 shrink-0"
                                  onClick={() => setPreviewFile({ ...file, submissionId: selectedSubmission.id.toString(), annotateMode: false })}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // Approver view OR submitter with no file-level revision: show all files with annotate button for approver
                return (
                  <div className="space-y-2 w-full overflow-hidden">
                    <p className="font-medium text-gray-800 text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#003b27]" />
                      Submitted Files
                    </p>
                    {files.map((file, idx) => {
                      const label = file.name.includes(':') ? file.name.split(':')[0].trim() : file.name;
                      const hasAnnotations = annotatedFileUrls.has(file.url);
                      return (
                        <div key={idx} className="p-3 border border-gray-200 rounded-lg flex items-center justify-between gap-3 bg-gray-50 overflow-hidden w-full">
                          <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                            <div className="p-1.5 bg-[#003b27]/10 rounded shrink-0">
                              <FileText className="h-4 w-4 text-[#003b27]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-sm text-gray-700 truncate block min-w-0">{label}</span>
                              {isApprover && hasAnnotations && (
                                <span className="text-xs text-purple-600 font-medium flex items-center gap-1 mt-0.5">
                                  <Pen className="h-3 w-3" /> Annotated
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {isApprover && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-[#003b27] text-[#003b27] hover:bg-[#003b27]/10"
                                onClick={() => setPreviewFile({ ...file, submissionId: selectedSubmission.id.toString(), annotateMode: true })}
                              >
                                <Pen className="h-3.5 w-3.5 mr-1" />
                                Annotate
                              </Button>
                            )}
                            <Button
                              size="sm"
                              style={{ backgroundColor: "#003b27" }}
                              onClick={() => setPreviewFile({ ...file, submissionId: selectedSubmission.id.toString(), annotateMode: false })}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDetailDialogOpen(false)}
            >
              Close
            </Button>
            {selectedSubmission && selectedSubmission.status === 'Pending' && (
              <>
                {selectedSubmission.submission_type === 'Request to Conduct Activity' && (
                  <>
                    <Button
                      onClick={handleRejectClick}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      onClick={handleForRevision}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      For Revision
                    </Button>
                  </>
                )}
                {selectedSubmission.submission_type !== 'Letter of Appeal' && 
                 selectedSubmission.submission_type !== 'Request to Conduct Activity' && (
                  <Button
                    onClick={handleForRevision}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    For Revision
                  </Button>
                )}
                <Button
                  onClick={handleApprove}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                {selectedSubmission.submission_type === 'Letter of Appeal' && (
                  <Button
                    onClick={handleDecline}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Modal with Annotation */}
      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent className="max-w-5xl w-full h-[92vh] flex flex-col p-0 gap-0">
            <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between shrink-0">
              <DialogTitle className="text-base font-semibold text-[#003b27] truncate pr-4">
                {previewFile.name.includes(':') ? previewFile.name.split(':')[0].trim() : previewFile.name}
              </DialogTitle>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#003b27] underline hover:text-[#005a3c]"
                >
                  Open in new tab
                </a>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              {/* Key uses both submissionId AND url to ensure annotations are never shared across files */}
              <FileAnnotationViewer
                key={`${previewFile.submissionId}-${previewFile.url}`}
                url={previewFile.url}
                fileName={previewFile.name}
                submissionId={previewFile.submissionId}
                initialAnnotateMode={previewFile.annotateMode}
                onAnnotationSaved={() => {
                  // Refresh annotated file urls after saving so badge updates
                  if (selectedSubmission) {
                    checkAnnotatedFiles(selectedSubmission).then(setAnnotatedFileUrls);
                  }
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* For Revision Dialog */}
      <Dialog open={isRevisionDialogOpen} onOpenChange={setIsRevisionDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-orange-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Request For Revision
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-gray-700 font-medium">
                Please select the items that need revision:
              </p>
            </div>

            {/* Checkboxes for revision items - conditionally render based on submission type */}
            {selectedSubmission?.submission_type === 'Accomplishment Report' ? (
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'narrativeReport' as const, label: 'Narrative Report' },
                  { key: 'documentation' as const, label: 'Documentation' },
                  { key: 'attendance' as const, label: 'Attendance' },
                  { key: 'evaluationReport' as const, label: 'Evaluation Report' },
                  { key: 'approveLetterToConduct' as const, label: 'Approve Letter to Conduct Activity' },
                ] as { key: keyof typeof revisionItems; label: string }[]).map(({ key, label }) => (
                  <div
                    key={key}
                    onClick={() => setRevisionItems({ ...revisionItems, [key]: !revisionItems[key] })}
                    className={`border-2 rounded-lg p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors min-h-[80px] text-center ${
                      revisionItems[key]
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {revisionItems[key] ? (
                      <CheckCircle className="h-6 w-6 text-orange-500" />
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-gray-300" />
                    )}
                    <p className={`text-xs font-medium ${revisionItems[key] ? 'text-orange-700' : 'text-gray-500'}`}>{label}</p>
                  </div>
                ))}
              </div>
            ) : selectedSubmission?.submission_type === 'Liquidation Report' ? (
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'liquidationReportPerEvent' as const, label: 'Liquidation Report Per Event' },
                  { key: 'breakdownOfExpenses' as const, label: 'Breakdown of Expenses' },
                  { key: 'dozeDsa' as const, label: 'DoZE & DSA' },
                  { key: 'officialReceipt' as const, label: 'Official Receipt and Needed Fiscal Forms, Procurement Forms' },
                  { key: 'othersOptional' as const, label: 'Others (Optional)' },
                ] as { key: keyof typeof revisionItems; label: string }[]).map(({ key, label }) => (
                  <div
                    key={key}
                    onClick={() => setRevisionItems({ ...revisionItems, [key]: !revisionItems[key] })}
                    className={`border-2 rounded-lg p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors min-h-[80px] text-center ${
                      revisionItems[key]
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {revisionItems[key] ? (
                      <CheckCircle className="h-6 w-6 text-orange-500" />
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-gray-300" />
                    )}
                    <p className={`text-xs font-medium ${revisionItems[key] ? 'text-orange-700' : 'text-gray-500'}`}>{label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'endorsementLetter' as const, label: 'Endorsement Letter' },
                  { key: 'letterToConduct' as const, label: 'Letter to Conduct' },
                  { key: 'activityDesign' as const, label: 'Activity Design' },
                ] as { key: keyof typeof revisionItems; label: string }[]).map(({ key, label }) => (
                  <div
                    key={key}
                    onClick={() => setRevisionItems({ ...revisionItems, [key]: !revisionItems[key] })}
                    className={`border-2 rounded-lg p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors min-h-[80px] text-center ${
                      revisionItems[key]
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {revisionItems[key] ? (
                      <CheckCircle className="h-6 w-6 text-orange-500" />
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-gray-300" />
                    )}
                    <p className={`text-xs font-medium ${revisionItems[key] ? 'text-orange-700' : 'text-gray-500'}`}>{label}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                Additional Comments
                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Optional</span>
              </label>
              <Textarea
                placeholder="Enter additional comments or reasons for revision..."
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                className="min-h-[100px] border-gray-300 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
            <div className="p-3 bg-gray-50 border rounded-lg">
              <p className="text-sm text-gray-600 italic">
                Please stay updated for further announcements.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsRevisionDialogOpen(false);
                setRevisionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitRevision}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Submit Revision Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File-Level Revision Modal — read-only confirmation, no manual selection */}
      <Dialog open={isFileRevisionModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsFileRevisionModalOpen(false);
          // Re-fetch annotated files from DB to keep badge state accurate
          if (selectedSubmission) {
            checkAnnotatedFiles(selectedSubmission).then(setAnnotatedFileUrls);
          }
        }
      }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-xl font-bold text-orange-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Request File Revision
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1 -mr-1">
          <div className="py-2 space-y-3">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-gray-700">
                The system automatically determines revision status based on annotations. Only annotated files will be marked for revision — all other files will be marked as approved.
              </p>
            </div>

            {/* 🔴 For Revision (annotated) */}
            {selectedSubmission && (() => {
              const files = getFilesFromSubmission(selectedSubmission);
              const forRevision = files.filter(f => annotatedFileUrls.has(f.url));
              const approved = files.filter(f => !annotatedFileUrls.has(f.url));
              return (
                <div className="space-y-3">
                  {forRevision.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-orange-700 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" /> 🔴 For Revision ({forRevision.length} file{forRevision.length !== 1 ? 's' : ''})
                      </p>
                      {forRevision.map(file => {
                        const label = file.name.includes(':') ? file.name.split(':')[0].trim() : file.name;
                        return (
                          <div key={file.url} className="flex items-center gap-2.5 p-2.5 rounded-lg border-2 border-orange-400 bg-orange-50">
                            <div className="p-1 bg-orange-100 rounded shrink-0">
                              <Pen className="h-3.5 w-3.5 text-orange-700" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-orange-800 truncate">{label}</p>
                              <p className="text-xs text-purple-600 flex items-center gap-1 mt-0.5">
                                <Pen className="h-3 w-3" /> Annotated
                              </p>
                            </div>
                            <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 🟢 Approved (not annotated) */}
                  {approved.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-green-700 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" /> 🟢 Approved ({approved.length} file{approved.length !== 1 ? 's' : ''})
                      </p>
                      {approved.map(file => {
                        const label = file.name.includes(':') ? file.name.split(':')[0].trim() : file.name;
                        return (
                          <div key={file.url} className="flex items-center gap-2.5 p-2.5 rounded-lg border-2 border-green-200 bg-green-50">
                            <div className="p-1 bg-green-100 rounded shrink-0">
                              <CheckCircle className="h-3.5 w-3.5 text-green-700" />
                            </div>
                            <p className="text-sm font-medium text-green-800 truncate flex-1">{label}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="pt-1 border-t border-gray-100 space-y-1.5">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                Additional Comments
                <span className="text-xs font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Optional</span>
              </label>
              <Textarea
                placeholder="Enter additional comments or reasons for revision..."
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                className="min-h-[80px] text-sm border-gray-200 focus:border-orange-500 focus:ring-orange-500 resize-none"
              />
            </div>
          </div>
          </div>
          <DialogFooter className="gap-2 shrink-0 pt-3 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => {
                setIsFileRevisionModalOpen(false);
                setRevisionReason("");
                if (selectedSubmission) {
                  checkAnnotatedFiles(selectedSubmission).then(setAnnotatedFileUrls);
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmFileRevision}
              disabled={isSubmittingFileRevision || annotatedFileUrls.size === 0}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isSubmittingFileRevision ? 'Submitting...' : 'Confirm Revision Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
              <X className="h-5 w-5" />
              Reject Submission
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Reason for Rejection (Optional)
              </label>
              <Textarea
                placeholder="Please provide a reason for rejecting this submission..."
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectComment("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
              Confirm Logout
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-base text-gray-700">
              Are you sure you want to logout?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsLogoutDialogOpen(false)}
              className="flex-1"
            >
              No
            </Button>
            <Button
              onClick={handleLogout}
              className="flex-1"
              style={{ backgroundColor: "#003b27" }}
            >
              Yes, Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );

  const renderContent = () => {
    return (
      <div>
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl lg:text-4xl font-bold" style={{ color: "#0c3b2e" }}>
            Submissions
          </h2>
          <p className="text-gray-600 mt-2">
            {orgShortName === "COA"
              ? "Review and manage all submitted Accomplishment and Liquidation Reports"
              : "Review and manage all submitted requests"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="p-4 border-l-4 border-l-[#003b27]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Submissions</p>
                <p className="text-2xl font-bold text-[#003b27]">{submissions.length}</p>
              </div>
              <FileText className="h-8 w-8 text-[#003b27] opacity-50" />
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Declined</p>
                <p className="text-2xl font-bold text-red-600">
                  {submissions.filter((s) => s.status === "Rejected").length}
                </p>
              </div>
              <X className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {submissions.filter((s) => s.status === "Pending").length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {submissions.filter((s) => s.status === "Approved").length}
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">For Revision</p>
                <p className="text-2xl font-bold text-orange-600">
                  {submissions.filter((s) => s.status === "For Revision").length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Tabs for Submission Types */}
        {!hideNavButtons && (
          <Tabs value={activeSubmissionTab || "Request to Conduct Activity"} onValueChange={setActiveSubmissionTab} className="w-full">
        <TabsList className={`grid w-full ${orgShortName === 'COA' ? 'grid-cols-3' : 'grid-cols-4'} mb-6 bg-gray-100`}>
          {submissionTypes.map((type) => (
            <TabsTrigger 
              key={type} 
              value={type}
              className="data-[state=active]:bg-[#003b27] data-[state=active]:text-white text-xs lg:text-sm"
            >
              {type}
            </TabsTrigger>
          ))}
        </TabsList>

        {submissionTypes.map((type) => {
          const typeSubmissions = getSubmissionsByType(type);
          return (
            <TabsContent key={type} value={type}>
              {typeSubmissions.length === 0 ? (
                <Card className="p-12 text-center">
                  <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">No submissions found</p>
                  <p className="text-gray-400 text-sm mt-2">
                    {['LCO', 'USG', 'OSLD', 'COA'].includes(orgShortName) 
                      ? `Pending submissions for ${type} will appear here`
                      : `Your ${type} submissions will appear here`}
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {typeSubmissions.map((submission) => {
                    const isLetterOfAppeal = submission.submission_type === 'Letter of Appeal';
                    const isApproved = submission.status === 'Approved';
                    
                    return (
                    <Card 
                      key={submission.id} 
                      className={`p-6 hover:shadow-xl transition-all duration-300 border-l-4 ${
                        isLetterOfAppeal && isApproved 
                          ? 'border-l-emerald-500 bg-gradient-to-r from-emerald-50/30 via-white to-white' 
                          : 'border-l-[#003b27]'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left Section - Main Info */}
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              isLetterOfAppeal && isApproved 
                                ? 'bg-emerald-100' 
                                : 'bg-[#003b27]/10'
                            }`}>
                              <FileText className={`h-5 w-5 ${
                                isLetterOfAppeal && isApproved 
                                  ? 'text-emerald-700' 
                                  : 'text-[#003b27]'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-lg text-gray-800">
                                {submission.submission_type === 'Letter of Appeal' 
                                  ? (() => {
                                      const dueTitle = submission.activity_due_title;
                                      const reportType = submission.activity_title.includes('Liquidation') 
                                        ? 'Liquidation Report' 
                                        : 'Accomplishment Report';
                                      return dueTitle 
                                        ? `${dueTitle} - ${reportType}`
                                        : submission.activity_title;
                                    })()
                                  : submission.activity_title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-4 w-4" />
                                  {{
                                    "OSLD": "Office of Student Leadership and Development",
                                    "AO": "Accredited Organizations",
                                    "LSG": "Local Student Government",
                                    "GSC": "Graduating Student Council",
                                    "LCO": "League of Campus Organization",
                                    "USG": "University Student Government",
                                    "TGP": "The Gold Panicles",
                                    "USED": "University Student Enterprise Development"
                                  }[submission.organization] || submission.organization}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(submission.submitted_at).toLocaleDateString()}
                                </span>
                                {submission.submission_type === 'Request to Conduct Activity' && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {submission.activity_venue}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Section - Status & Actions */}
                        <div className="flex items-center gap-3">
                          {getStatusBadge(submission.status)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(submission)}
                            className={`border-[#003b27] hover:bg-[#003b27] hover:text-white transition-all ${
                              isLetterOfAppeal && isApproved
                                ? 'text-emerald-700 border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700'
                                : 'text-[#003b27]'
                            }`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {submission.submission_type === 'Letter of Appeal' && submission.status === 'Pending' 
                              ? 'Review Appeal' 
                              : 'View Details'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
      )}

      {/* Direct View for COA - Table View for Accomplishment and Liquidation */}
      {hideNavButtons && orgShortName === "COA" && (
        <Tabs defaultValue="Accomplishment Report" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100">
            <TabsTrigger 
              value="Accomplishment Report"
              className="data-[state=active]:bg-[#003b27] data-[state=active]:text-white"
            >
              Accomplishment Report
            </TabsTrigger>
            <TabsTrigger 
              value="Liquidation Report"
              className="data-[state=active]:bg-[#003b27] data-[state=active]:text-white"
            >
              Liquidation Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="Accomplishment Report">
            {getSubmissionsByType("Accomplishment Report").length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">No accomplishment reports</p>
                <p className="text-gray-400 text-sm mt-2">
                  Accomplishment reports will appear here
                </p>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#003b27]">
                      <TableHead className="text-white font-semibold">Approved by</TableHead>
                      <TableHead className="text-white font-semibold">File Name</TableHead>
                      <TableHead className="text-white font-semibold">Date Submitted</TableHead>
                      <TableHead className="text-white font-semibold">Action</TableHead>
                      <TableHead className="text-white font-semibold">Comment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getSubmissionsByType("Accomplishment Report").map((submission) => (
                      <TableRow key={submission.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-500" />
                            {submission.organization}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="truncate max-w-[200px]" title={submission.file_name}>
                              {submission.file_name || "Accomplishment Report"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="h-4 w-4" />
                            {new Date(submission.submitted_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={submission.coa_opinion || ""}
                            onValueChange={async (value) => {
                              try {
                                const { error } = await supabase
                                  .from('submissions')
                                  .update({ coa_opinion: value })
                                  .eq('id', submission.id);
                                
                                if (error) throw error;
                                
                                loadSubmissions();
                                toast({
                                  title: "Opinion saved",
                                  description: `Marked as ${value}`,
                                });

                              } catch (error: any) {
                                toast({
                                  title: "Error",
                                  description: error.message,
                                  variant: "destructive",
                                });

                              }
                            }}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select Opinion" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Qualified">Qualified</SelectItem>
                              <SelectItem value="Unqualified">Unqualified</SelectItem>
                              <SelectItem value="Adverse">Adverse</SelectItem>
                              <SelectItem value="Disclaimer of Opinion">Disclaimer of Opinion</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(submission)}
                          >
                            Comment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="Liquidation Report">
            {getSubmissionsByType("Liquidation Report").length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">No liquidation reports</p>
                <p className="text-gray-400 text-sm mt-2">
                  Liquidation reports will appear here
                </p>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#003b27]">
                      <TableHead className="text-white font-semibold">Approved by</TableHead>
                      <TableHead className="text-white font-semibold">File Name</TableHead>
                      <TableHead className="text-white font-semibold">Date Submitted</TableHead>
                      <TableHead className="text-white font-semibold">Action</TableHead>
                      <TableHead className="text-white font-semibold">Comment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getSubmissionsByType("Liquidation Report").map((submission) => (
                      <TableRow key={submission.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-500" />
                            {submission.organization}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="truncate max-w-[200px]" title={submission.file_name}>
                              {submission.file_name || "Liquidation Report"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="h-4 w-4" />
                            {new Date(submission.submitted_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={submission.coa_opinion || ""}
                            onValueChange={async (value) => {
                              try {
                                const { error } = await supabase
                                  .from('submissions')
                                  .update({ coa_opinion: value })
                                  .eq('id', submission.id);
                                
                                if (error) throw error;
                                
                                loadSubmissions();
                                toast({
                                  title: "Opinion saved",
                                  description: `Marked as ${value}`,
                                });

                              } catch (error: any) {
                                toast({
                                  title: "Error",
                                  description: error.message,
                                  variant: "destructive",
                                });

                              }
                            }}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select Opinion" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Qualified">Qualified</SelectItem>
                              <SelectItem value="Unqualified">Unqualified</SelectItem>
                              <SelectItem value="Adverse">Adverse</SelectItem>
                              <SelectItem value="Disclaimer of Opinion">Disclaimer of Opinion</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(submission)}
                          >
                            Comment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Old Direct Liquidation Report View for non-COA */}
      {hideNavButtons && orgShortName !== "COA" && (
        <div className="space-y-4">
          {getSubmissionsByType("Liquidation Report").length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No liquidation reports</p>
              <p className="text-gray-400 text-sm mt-2">
                Liquidation reports will appear here
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#003b27]">
                    <TableHead className="text-white font-semibold">Accredited Org</TableHead>
                    <TableHead className="text-white font-semibold">File Name</TableHead>
                    <TableHead className="text-white font-semibold">Date Submitted</TableHead>
                    <TableHead className="text-white font-semibold">Status</TableHead>
                    <TableHead className="text-white font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSubmissionsByType("Liquidation Report").map((submission) => (
                    <TableRow key={submission.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-500" />
                          {submission.organization}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="truncate max-w-[200px]" title={submission.file_name}>
                            {submission.file_name || "Liquidation Report"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="h-4 w-4" />
                          {new Date(submission.submitted_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${
                          submission.status === "Approved" 
                            ? "bg-green-100 text-green-800" 
                            : submission.status === "For Revision"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {submission.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={submission.coa_opinion || ""}
                            onValueChange={async (value) => {
                              try {
                                const { error } = await supabase
                                  .from('submissions')
                                  .update({ coa_opinion: value })
                                  .eq('id', submission.id);
                                
                                if (error) throw error;
                                
                                // Reload submissions to reflect the change
                                loadSubmissions();
                                toast({
                                  title: "Opinion saved",
                                  description: `Marked as ${value}`,
                                });

                              } catch (error: any) {
                                toast({
                                  title: "Error",
                                  description: error.message,
                                  variant: "destructive",
                                });

                              }
                            }}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue placeholder="Select Opinion" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Qualified">Qualified</SelectItem>
                              <SelectItem value="Unqualified">Unqualified</SelectItem>
                              <SelectItem value="Adverse">Adverse</SelectItem>
                              <SelectItem value="Disclaimer of Opinion">Disclaimer of Opinion</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={() => openViewDialog(submission)}
                            variant="outline"
                            size="sm"
                            className="border-[#003b27] text-[#003b27] hover:bg-[#003b27] hover:text-white"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      )}


    </div>
    );
  };

  // If embedded (used inside another dashboard), just return the content
  if (isEmbedded) {
    return (
      <>
        {renderDialogs()}
        {renderContent()}
      </>
    );
  }

  // Full page layout with sidebar for OSLD
  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile Menu Button */}
      <Button
        className="lg:hidden fixed top-4 left-4 z-50 rounded-full w-12 h-12 shadow-lg"
        style={{ backgroundColor: "#003b27" }}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-6 w-6" style={{ color: "#d4af37" }} />
      </Button>

      {/* Sidebar */}
      <div
        className={`${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:relative w-72 h-full text-white flex flex-col shadow-xl transition-transform duration-300 z-40`}
        style={{ backgroundColor: "#003b27" }}
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div
              className={`flex-shrink-0 ${orgLogo ? 'w-14 h-14' : 'w-12 h-12'} rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10`}
              style={{ ringColor: "#d4af37" }}
            >
              {orgLogo ? (
                <img
                  src={orgLogo}
                  alt="Organization Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold leading-tight" style={{ color: "#d4af37" }}>
                {orgShortName}
              </h1>
              <p className="text-xs text-white/60 mt-1">{orgFullName}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6">
          {[
            "Dashboard",
            "Accounts",
            "Submissions",
            "Form Templates",
            "Create Account",
            "Activity Logs",
            "Director & Staff",
            "Organizations",
          ].map((item) => (
            <Button
              key={item}
              onClick={() => {
                setActiveNav(item);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full justify-start mb-2 text-left font-semibold transition-all ${
                activeNav === item
                  ? "text-[#003b27]"
                  : "text-white hover:bg-[#d4af37] hover:text-[#003b27]"
              }`}
              style={
                activeNav === item ? { backgroundColor: "#d4af37" } : undefined
              }
              variant={activeNav === item ? "default" : "ghost"}
            >
              {item}
            </Button>
          ))}
          <Button
            onClick={() => setIsLogoutDialogOpen(true)}
            className="w-full justify-start mb-2 text-left font-semibold transition-all text-white hover:bg-red-600"
            variant="ghost"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </nav>
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto pt-16 lg:pt-0 bg-white">
        <div className="p-4 lg:p-8">
          {renderContent()}
        </div>
      </div>

      {renderDialogs()}
    </div>
  );
}
