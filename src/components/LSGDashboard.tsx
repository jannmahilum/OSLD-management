import { useState, useEffect } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Bell,
  User,
  Menu,
  LogOut,
  Edit2,
  X,
  Eye,
  EyeOff,
  ArrowLeft,
  Download,
  Users,
  Upload,
  ExternalLink,
  Building2,
  Info,
  AlertTriangle,
  FileText,
  Trash2,
  CheckCircle,
  Link2,
  DollarSign,
  MapPin,
  Clock,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import OrganizationsPage from "./OrganizationsPage";
import FileAnnotationViewer from "./FileAnnotationViewer";
import { supabase } from "../lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  venue?: string;
  targetOrganization?: string;
  requireAccomplishment?: boolean;
  requireLiquidation?: boolean;
  isDeadline?: boolean;
  deadlineType?: 'accomplishment' | 'liquidation';
  parentEventId?: string;
  hasOverride?: boolean;
  submissionStatus?: 'no_submission' | 'pending' | 'approved';
}

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

// Helper function to calculate deadline date (single day)
const calculateDeadlineDate = (eventEndDate: string, workingDays: number): string => {
  const endDate = new Date(eventEndDate);
  const deadlineDate = addWorkingDays(endDate, workingDays);
  return deadlineDate.toISOString().split('T')[0];
};

interface Officer {
  id: string;
  name: string;
  position: string;
  image?: string;
}

// Deadline Appeal Section Component for USG
const DeadlineAppealSection = ({ deadlineType, eventId, targetOrg, appealApproved, onSubmitHere, submissionStatus, eventTitle }: { deadlineType: 'accomplishment' | 'liquidation', eventId: string, targetOrg?: string, appealApproved?: boolean, onSubmitHere?: () => void, submissionStatus?: 'no_submission' | 'pending' | 'pending_review' | 'approved', eventTitle?: string }) => {
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealFile, setAppealFile] = useState<File | null>(null);
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [appealRejected, setAppealRejected] = useState(false);
  const [appealRejectionReason, setAppealRejectionReason] = useState<string | null>(null);
  const [targetOrgAppealSubmitted, setTargetOrgAppealSubmitted] = useState(false);
  const { toast } = useToast();

  const reportType = deadlineType === 'accomplishment' ? 'Accomplishment' : 'Liquidation';

  // Check if appeal was already submitted for this specific event (own org - USG)
  useEffect(() => {
    const checkAppealStatus = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('id, status, revision_reason')
        .eq('organization', 'LSG')
        .eq('submission_type', 'Letter of Appeal')
        .ilike('activity_title', `%${reportType}%`)
        .eq('event_id', eventId)
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
  }, [eventId, reportType]);

  // Check if appeal was submitted by the target org for this specific event
  useEffect(() => {
    const checkTargetOrgAppealStatus = async () => {
      if (!targetOrg || targetOrg === 'USG') return;
      
      // For AO, check if any AO submitted an appeal for this event
      const orgFilter = targetOrg === 'AO' 
        ? ['CAS', 'CBA', 'CCJE', 'CED', 'CNAHS', 'COE', 'CSTE']
        : [targetOrg];
      
      const { data } = await supabase
        .from('submissions')
        .select('id')
        .eq('submission_type', 'Letter of Appeal')
        .ilike('activity_title', `%${reportType}%`)
        .eq('submitted_to', 'USG')
        .eq('event_id', eventId)
        .eq('status', 'Pending')
        .in('organization', orgFilter)
        .limit(1);
      
      setTargetOrgAppealSubmitted(!!data && data.length > 0);
    };
    checkTargetOrgAppealStatus();
  }, [eventId, targetOrg, reportType]);
  
  // USG can submit appeal for USG events, LSG events are just for notification
  const isOwnDeadline = targetOrg === 'USG';
  const canSubmitAppeal = isOwnDeadline;

  const [notificationSent, setNotificationSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleNotifyOrganization = async () => {
    // Send notification to the target organization
    if (targetOrg) {
      await supabase
        .from('notifications')
        .insert({
          event_id: eventId,
          event_title: `Reminder: ${reportType} Report Due Today`,
          event_description: `USG is reminding you that today is the deadline for the submission of ${reportType} report.`,
          created_by: 'USG',
          target_org: targetOrg
        });
      setNotificationSent(true);
    }
  };

  const handleSubmitAppeal = async () => {
    if (!appealFile) return;
    
    setSubmitting(true);
    try {
      // LSG submits to USG (matching AO→LCO pattern)
      const submittedTo = 'USG';

      // Upload file to storage
      const fileExt = appealFile.name.split('.').pop();
      const storagePath = `LSG_appeal_${Date.now()}.${fileExt}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('submissions')
        .upload(storagePath, appealFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('submissions')
        .getPublicUrl(storagePath);

      // Insert submission record
      const { error: insertError } = await supabase
        .from('submissions')
        .insert({
          organization: 'LSG',
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

      // Send notification to the receiving organization (USG)
      await supabase
        .from('notifications')
        .insert({
          event_id: eventId,
          event_title: `Letter of Appeal Submitted`,
          event_description: `LSG has submitted a Letter of Appeal for ${reportType} Report${eventTitle ? ` (${eventTitle})` : ''}. Please review it.`,
          created_by: 'LSG',
          target_org: submittedTo
        });

      toast({
        title: "Success",
        description: "Letter of Appeal submitted successfully!",
      });
      setShowAppealForm(false);
      setAppealFile(null);
      setAppealSubmitted(true);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Failed to submit appeal. Please try again.';
      console.error('Error submitting appeal:', error);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Show when target org (AO or LSG) has submitted an appeal to USG (check this first)
  if (targetOrgAppealSubmitted && !isOwnDeadline) {
    return (
      <div className="mt-2 p-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-300 rounded-md">
        <p className="text-sm font-medium text-gray-800 mb-2">
          <span className="font-bold" style={{ color: "#003b27" }}>{reportType} Report Due:</span>
        </p>
        <p className="text-sm font-medium text-gray-800 mb-2">
          {reportType} Report Deadline
        </p>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Organization: <span className="font-bold">{targetOrg === 'AO' ? 'Accredited Organizations' : targetOrg === 'LSG' ? 'Local Student Government' : targetOrg}</span>
        </p>
        <p className="text-sm font-medium text-orange-600">
          An organization has submitted a Letter of Appeal. Please check and review it in the Submissions page.
        </p>
      </div>
    );
  }

  // Show when target org (AO or LSG) hasn't submitted an appeal to USG (notify format)
  if (!targetOrgAppealSubmitted && !isOwnDeadline && (targetOrg === 'LSG' || targetOrg === 'AO')) {
    return (
      <div className="mt-3 p-4 border border-red-200 rounded-xl shadow-sm" style={{ backgroundColor: "transparent" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-red-600">Deadline Today</span>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            <span className="font-bold" style={{ color: "#003b27" }}>{reportType} Report Due</span>
          </p>
          <p className="text-xs text-gray-600 leading-relaxed">
            Today is the deadline for the submission of {reportType} report
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">Organization:</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
              {targetOrg === 'AO' ? 'Accredited Organizations' : 'Local Student Government'}
            </span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-red-200">
          {notificationSent ? (
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
          )}
        </div>
      </div>
    );
  }

  // Show when own org's appeal was rejected/declined
  if (appealRejected && isOwnDeadline) {
    return (
      <div className="mt-3 p-4 bg-red-50 border border-red-300 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-red-100 text-red-700 rounded">
            Appeal Declined
          </span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          Your appeal for this activity has been declined. {reportType} report must be submitted before the original deadline.
        </p>
        {appealRejectionReason && (
          <div className="bg-white border border-red-200 rounded p-3 mb-3">
            <p className="text-xs font-semibold text-red-700 mb-1">Reason for Decline:</p>
            <p className="text-xs text-gray-700 whitespace-pre-wrap">{appealRejectionReason}</p>
          </div>
        )}
        {isOwnDeadline && (
          <div className="pt-3 border-t border-red-200">
            <Button
              size="sm"
              onClick={() => setShowAppealForm(true)}
              className="w-full px-4 py-1.5 text-xs font-semibold rounded-lg"
              style={{
                borderColor: "#003b27",
                color: "#003b27",
                border: "2px solid #003b27",
                backgroundColor: "white",
              }}
            >
              Submit Another Appeal
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Show when own org (USG) has submitted an appeal (not yet approved)
  if (appealSubmitted && isOwnDeadline && !appealApproved) {
    // If not approved yet, show waiting message
    return (
      <div className="mt-3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col items-center py-5 px-4">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <Clock className="h-6 w-6 text-gray-500" />
          </div>
          <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-1">PENDING REVIEW</h4>
          <p className="text-xs text-gray-500 mb-4">Awaiting approval</p>
          <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-600 text-center leading-relaxed">
              Your appeal for this activity has been submitted successfully.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            <p className="text-xs text-gray-500">
              Please wait for updates from your reviewing body.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!showAppealForm) {
    return (
      <div className="mt-3 p-4 border border-red-200 rounded-xl shadow-sm" style={{ backgroundColor: "transparent" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-red-600">Deadline Today</span>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            <span className="font-bold" style={{ color: "#003b27" }}>{reportType} Report Due</span>
          </p>
          <p className="text-xs text-gray-600 leading-relaxed">
            Today is the deadline for the submission of {reportType} report
          </p>
          {targetOrg && !isOwnDeadline && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">Organization:</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                {targetOrg === 'AO' ? 'Accredited Organizations' : targetOrg === 'LSG' ? 'Local Student Government' : targetOrg}
              </span>
            </div>
          )}
          {canSubmitAppeal && onSubmitHere && submissionStatus !== 'approved' && !appealRejected && (
            <Button
              onClick={onSubmitHere}
              className="w-full mt-3 text-sm font-semibold rounded-lg hover:shadow-md transition-all"
              style={{ backgroundColor: "#003b27", color: "white" }}
            >
              Submit Here
            </Button>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-red-200">
          {canSubmitAppeal && !appealRejected ? (
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
        <div className="p-2 bg-amber-50 border-l-2 rounded" style={{ borderColor: "#d4af37" }}>
          <p className="text-xs text-gray-700">
            <span className="font-semibold">Note:</span> Letter of Appeal is valid for only 3 days, you must submit your {reportType} on or before the deadline.
          </p>
        </div>
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            className="px-4 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: "#003b27", color: "white" }}
            disabled={!appealFile || submitting}
            onClick={handleSubmitAppeal}
          >
            {submitting ? 'Submitting...' : 'Submit Appeal'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAppealForm(false)}
            className="px-4 py-1.5 text-xs font-semibold border"
            style={{ borderColor: "#003b27", color: "#003b27" }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function LSGDashboard() {
  const { toast } = useToast();
  const navStorageKey = "lsg_activeNav";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [activeNav, setActiveNav] = useState(() => localStorage.getItem(navStorageKey) || "Dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotificationPopover, setShowNotificationPopover] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; eventTitle: string; eventDescription: string; createdBy: string; createdAt: string; isRead: boolean }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [selectedTemplateOrg, setSelectedTemplateOrg] = useState<string | null>(null);
  const [uploadedTemplates, setUploadedTemplates] = useState<Record<string, { forms?: { fileName: string; fileUrl: string } }>>({});

  useEffect(() => {
    localStorage.setItem(navStorageKey, activeNav);
  }, [activeNav]);

  // Profile state
  const [showProfile, setShowProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  // Officers and Advisers state
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [advisers, setAdvisers] = useState<Officer[]>([]);
  const [isOfficerModalOpen, setIsOfficerModalOpen] = useState(false);
  const [isAdviserModalOpen, setIsAdviserModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);
  const [editingAdviser, setEditingAdviser] = useState<Officer | null>(null);
  const [officerName, setOfficerName] = useState("");
  const [officerPosition, setOfficerPosition] = useState("");
  const [officerImage, setOfficerImage] = useState("");
  const [adviserName, setAdviserName] = useState("");
  const [adviserPosition, setAdviserPosition] = useState("");
  const [adviserImage, setAdviserImage] = useState("");
  const [platforms, setPlatforms] = useState({ facebook: "" });
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [budgetProposalFiles, setBudgetProposalFiles] = useState<File[]>([]);
  const [coaTransitionalFiles, setCoaTransitionalFiles] = useState<File[]>([]);

  // Saved documents state
  const [savedDocuments, setSavedDocuments] = useState<{
    budget_proposal: Array<{ id: string; file_name: string; file_url: string }>;
    coa_transitional: Array<{ id: string; file_name: string; file_url: string }>;
  }>({
    budget_proposal: [],
    coa_transitional: [],
  });

  // Request to Conduct Activity state
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDuration, setActivityDuration] = useState("");
  const [activityVenue, setActivityVenue] = useState("");
  const [activityParticipants, setActivityParticipants] = useState("");
  const [activityFunds, setActivityFunds] = useState("");
  const [activityBudget, setActivityBudget] = useState("");
  const [activitySDG, setActivitySDG] = useState<string>("");
  const [activityLIKHA, setActivityLIKHA] = useState("");
  const [activityDesignFile, setActivityDesignFile] = useState<File | null>(null);
  const [endorsementLetterFile, setEndorsementLetterFile] = useState<File | null>(null);
  const [letterToConductFile, setLetterToConductFile] = useState<File | null>(null);
  const [budgetaryRequirementsFile, setBudgetaryRequirementsFile] = useState<File | null>(null);
  const [resolutionToCollectFile, setResolutionToCollectFile] = useState<File | null>(null);
  const [budgetaryProposalFile, setBudgetaryProposalFile] = useState<File | null>(null);
  const [minutesOfMeetingFile, setMinutesOfMeetingFile] = useState<File | null>(null);
  const [annualPlanFile, setAnnualPlanFile] = useState<File | null>(null);
  const [activityErrors, setActivityErrors] = useState({
    title: false,
    duration: false,
    venue: false,
    participants: false,
    funds: false,
    budget: false,
    sdg: false,
    likha: false,
    designFile: false
  });
  const [hasPendingSubmission, setHasPendingSubmission] = useState(false);
  const [pendingSubmissionStatus, setPendingSubmissionStatus] = useState<string | null>(null);
  const [showPendingDialog, setShowPendingDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Activity Logs state
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isLogDetailOpen, setIsLogDetailOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<any>(null);
  
  // Document delete confirmation state
  const [isDeleteDocumentDialogOpen, setIsDeleteDocumentDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{ id: string; name: string } | null>(null);
  const [hasMissedDeadline, setHasMissedDeadline] = useState(false);
  const [activityLogsTab, setActivityLogsTab] = useState<"my-logs" | "ar-lr" | "request" | "appeal">("my-logs");
  const [isFileDeleteDialogOpen, setIsFileDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; fileName: string; fileType: string; status: string } | null>(null);

  // Preview annotation state (for submitter "View Annotated" flow)
  const [previewAnnotation, setPreviewAnnotation] = useState<{ url: string; name: string; submissionId: string; revisionReason?: string } | null>(null);
  const [isPreviewAnnotationOpen, setIsPreviewAnnotationOpen] = useState(false);

  // Revision upload state (for submitter "For Revision" flow)
  const [revisionUploadFile, setRevisionUploadFile] = useState<{ submissionId: string; fileUrl: string; fileName: string } | null>(null);
  const [revisionUploadInput, setRevisionUploadInput] = useState<File | null>(null);
  const [isUploadingRevision, setIsUploadingRevision] = useState(false);

  // Accomplishment Report state
  const [accomplishmentActivityTitle, setAccomplishmentActivityTitle] = useState("");
  const [accomplishmentGdriveLink, setAccomplishmentGdriveLink] = useState("");
  const [accomplishmentErrors, setAccomplishmentErrors] = useState({
    title: false,
    link: false
  });
  
  // Liquidation Report state
  const [liquidationActivityTitle, setLiquidationActivityTitle] = useState("");
  const [liquidationGdriveLink, setLiquidationGdriveLink] = useState("");
  const [liquidationErrors, setLiquidationErrors] = useState({
    title: false,
    link: false
  });
  
  // Event linking state for submissions
  const [currentEventIdForSubmission, setCurrentEventIdForSubmission] = useState<string | null>(null);
  const [eventIdToLink, setEventIdToLink] = useState<string | null>(null);

  // Helper function to validate UUID format
  const isValidUUID = (uuid: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
  };

  // Events state
  const [events, setEvents] = useState<Event[]>([]);

  // Load events from database
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const { data: eventsData } = await supabase
          .from('osld_events')
          .select('*, accomplishment_deadline_override, liquidation_deadline_override');
        
        if (eventsData) {
          const formattedEvents: Event[] = [];
          
          // Helper function to check submission status by matching activity_title with event title
          const checkSubmissionStatus = async (eventTitle: string, reportType: 'accomplishment' | 'liquidation', targetOrg?: string) => {
            const submissionType = reportType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
            // Search for submissions from LSG that match the event title
            const { data } = await supabase
              .from('submissions')
              .select('status, organization')
              .eq('activity_title', eventTitle)
              .eq('submission_type', submissionType)
              .eq('organization', 'LSG');
            
            if (!data || data.length === 0) return 'no_submission';
            
            // Check if any submission is approved or was previously approved and deleted
            const hasApproved = data.some(s => s.status === 'Approved' || s.status === 'Deleted (Previously Approved)');
            if (hasApproved) return 'approved';
            
            // Check if there's a pending submission
            const hasPending = data.some(s => s.status === 'Pending' || s.status === 'For Revision');
            if (hasPending) return 'pending';
            
            return 'no_submission';
          };

          // Helper function to check if AO has submitted for LSG's activity
          const checkAOSubmissionForLSG = async (eventTitle: string, reportType: 'accomplishment' | 'liquidation', targetOrg: string) => {
            const submissionType = reportType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
            
            // Determine which org receives submissions based on target org
            // AO → LCO, LSG → USG
            let reviewingOrg = 'LCO'; // Default for AO submissions
            if (targetOrg === 'LSG') {
              reviewingOrg = 'USG';
            }
            
            // Check for submissions from target org submitted to reviewing org
            const { data } = await supabase
              .from('submissions')
              .select('status, organization, submitted_to')
              .eq('activity_title', eventTitle)
              .eq('submission_type', submissionType)
              .eq('submitted_to', reviewingOrg);
            
            if (!data || data.length === 0) return 'no_submission';
            
            // Check if any submission is approved
            const hasApproved = data.some(s => s.status === 'Approved');
            if (hasApproved) return 'approved';
            
            // Check if any submission is pending
            const hasPending = data.some(s => s.status === 'Pending' || s.status === 'For Revision');
            if (hasPending) return 'pending';
            
            return 'no_submission';
          };
          
          // Process events with async/await using for...of
          for (const e of eventsData) {
            // Add the main event
            formattedEvents.push({
              id: e.id,
              title: e.title,
              description: e.description,
              startDate: e.start_date,
              endDate: e.end_date,
              startTime: e.start_time,
              endTime: e.end_time,
              allDay: e.all_day,
              venue: e.venue,
              targetOrganization: e.target_organization,
              requireAccomplishment: e.require_accomplishment,
              requireLiquidation: e.require_liquidation
            });
            
            // LCO sees deadlines for AO events (to monitor their submissions), LSG events (to notify them) and USG events (their own)
            const shouldShowDeadline = e.target_organization === 'AO' || e.target_organization === 'LSG' || e.target_organization === 'USG';
            
            if (shouldShowDeadline && e.end_date) {
              // Add accomplishment report deadline (3 working days after event)
              if (e.require_accomplishment) {
                const accomStatus = await checkSubmissionStatus(e.title, 'accomplishment', e.target_organization);
                const aoSubmissionStatus = await checkAOSubmissionForLSG(e.title, 'accomplishment', e.target_organization);
                
                // Only add deadline if not approved by current org AND not approved from child org
                if (accomStatus !== 'approved' && aoSubmissionStatus !== 'approved') {
                  const accomDeadlineDate = e.accomplishment_deadline_override || calculateDeadlineDate(e.end_date, 3);
                  formattedEvents.push({
                    id: `${e.id}-accom-deadline`,
                    title: e.title,
                    description: e.target_organization === 'AO' && aoSubmissionStatus === 'pending'
                      ? `An organization has submitted an accomplishment report. Please check and review it in the Submissions page.`
                      : e.target_organization === 'AO' && aoSubmissionStatus !== 'pending'
                        ? `Due date for accomplishment report for "${e.title}" (Notify Organization)`
                        : aoSubmissionStatus === 'pending'
                          ? `An organization has submitted an accomplishment report. Please check and review it in the Submissions page.`
                          : accomStatus === 'pending' 
                            ? `You already submitted an accomplishment report, please wait for further updates`
                            : `Due date for accomplishment report for "${e.title}"`,
                    startDate: accomDeadlineDate,
                    endDate: accomDeadlineDate,
                    allDay: true,
                    isDeadline: true,
                    deadlineType: 'accomplishment',
                    parentEventId: e.id,
                    targetOrganization: e.target_organization,
                    hasOverride: !!e.accomplishment_deadline_override,
                    submissionStatus: aoSubmissionStatus === 'pending' ? 'pending_review' : accomStatus
                  });
                }
              }
              
              // Add liquidation report deadline (5 working days after event)
              if (e.require_liquidation) {
                const liqStatus = await checkSubmissionStatus(e.title, 'liquidation', e.target_organization);
                const aoSubmissionStatus = await checkAOSubmissionForLSG(e.title, 'liquidation', e.target_organization);
                
                // Only add deadline if not approved by current org AND not approved from child org
                if (liqStatus !== 'approved' && aoSubmissionStatus !== 'approved') {
                  const liqDeadlineDate = e.liquidation_deadline_override || calculateDeadlineDate(e.end_date, 5);
                  formattedEvents.push({
                    id: `${e.id}-liq-deadline`,
                    title: e.title,
                    description: e.target_organization === 'AO' && aoSubmissionStatus === 'pending'
                      ? `An organization has submitted a liquidation report. Please check and review it in the Submissions page.`
                      : e.target_organization === 'AO' && aoSubmissionStatus !== 'pending'
                        ? `Due date for liquidation report for "${e.title}" (Notify Organization)`
                        : aoSubmissionStatus === 'pending'
                          ? `An organization has submitted a liquidation report. Please check and review it in the Submissions page.`
                          : liqStatus === 'pending'
                            ? `You already submitted a liquidation report, please wait for further updates`
                            : `Due date for liquidation report for "${e.title}"`,
                    startDate: liqDeadlineDate,
                    endDate: liqDeadlineDate,
                    allDay: true,
                    isDeadline: true,
                    deadlineType: 'liquidation',
                    parentEventId: e.id,
                    targetOrganization: e.target_organization,
                    hasOverride: !!e.liquidation_deadline_override,
                    submissionStatus: aoSubmissionStatus === 'pending' ? 'pending_review' : liqStatus
                  });
                }
              }
            }
          }
          
          setEvents(formattedEvents);
        }
      } catch (error: unknown) {
        console.error('Error loading events:', error);
      }
    };
    
    loadEvents();
  }, []);

  // Listen for deadline refresh events from real-time submissions
  useEffect(() => {
    const handleRefresh = () => {
      // Reload events when submissions change
      const loadEvents = async () => {
        try {
          const { data: eventsData } = await supabase
            .from('osld_events')
            .select('*, accomplishment_deadline_override, liquidation_deadline_override');
          
          if (eventsData) {
            const formattedEvents: Event[] = [];
            
            // Helper function to check submission status
            const checkSubmissionStatus = async (eventTitle: string, reportType: 'accomplishment' | 'liquidation', targetOrg?: string) => {
              const submissionType = reportType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
              const { data } = await supabase
                .from('submissions')
                .select('status, organization')
                .eq('activity_title', eventTitle)
                .eq('submission_type', submissionType)
                .eq('organization', 'LSG');
              
              if (!data || data.length === 0) return 'no_submission';
              const hasApproved = data.some(s => s.status === 'Approved' || s.status === 'Deleted (Previously Approved)');
              if (hasApproved) return 'approved';
              const hasPending = data.some(s => s.status === 'Pending' || s.status === 'For Revision');
              if (hasPending) return 'pending';
              return 'no_submission';
            };

            // Helper function to check AO submissions
            const checkAOSubmissionForLSG = async (eventTitle: string, reportType: 'accomplishment' | 'liquidation', targetOrg: string) => {
              const submissionType = reportType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
              let reviewingOrg = 'LCO';
              if (targetOrg === 'LSG') {
                reviewingOrg = 'USG';
              }
              const { data } = await supabase
                .from('submissions')
                .select('status, organization, submitted_to')
                .eq('activity_title', eventTitle)
                .eq('submission_type', submissionType)
                .eq('submitted_to', reviewingOrg);
              
              if (!data || data.length === 0) return 'no_submission';
              const hasApproved = data.some(s => s.status === 'Approved');
              if (hasApproved) return 'approved';
              const hasPending = data.some(s => s.status === 'Pending' || s.status === 'For Revision');
              if (hasPending) return 'pending';
              return 'no_submission';
            };
            
            for (const e of eventsData) {
              formattedEvents.push({
                id: e.id,
                title: e.title,
                description: e.description,
                startDate: e.start_date,
                endDate: e.end_date,
                startTime: e.start_time,
                endTime: e.end_time,
                allDay: e.all_day,
                venue: e.venue,
                targetOrganization: e.target_organization,
                requireAccomplishment: e.require_accomplishment,
                requireLiquidation: e.require_liquidation
              });
              
              const shouldShowDeadline = e.target_organization === 'AO' || e.target_organization === 'LSG' || e.target_organization === 'USG';
              
              if (shouldShowDeadline && e.end_date) {
                if (e.require_accomplishment) {
                  const accomStatus = await checkSubmissionStatus(e.title, 'accomplishment', e.target_organization);
                  const aoSubmissionStatus = await checkAOSubmissionForLSG(e.title, 'accomplishment', e.target_organization);
                  
                  if (accomStatus !== 'approved' && aoSubmissionStatus !== 'approved') {
                    const accomDeadlineDate = e.accomplishment_deadline_override || calculateDeadlineDate(e.end_date, 3);
                    formattedEvents.push({
                      id: `${e.id}-accom-deadline`,
                      title: e.title,
                      description: e.target_organization === 'AO' && aoSubmissionStatus === 'pending'
                        ? `An organization has submitted an accomplishment report. Please check and review it in the Submissions page.`
                        : e.target_organization === 'AO' && aoSubmissionStatus !== 'pending'
                          ? `Due date for accomplishment report for "${e.title}" (Notify Organization)`
                          : aoSubmissionStatus === 'pending'
                            ? `An organization has submitted an accomplishment report. Please check and review it in the Submissions page.`
                            : accomStatus === 'pending' 
                              ? `You already submitted an accomplishment report, please wait for further updates`
                              : `Due date for accomplishment report for "${e.title}"`,
                      startDate: accomDeadlineDate,
                      endDate: accomDeadlineDate,
                      allDay: true,
                      isDeadline: true,
                      deadlineType: 'accomplishment',
                      parentEventId: e.id,
                      targetOrganization: e.target_organization,
                      hasOverride: !!e.accomplishment_deadline_override,
                      submissionStatus: aoSubmissionStatus === 'pending' ? 'pending_review' : accomStatus
                    });
                  }
                }
                
                if (e.require_liquidation) {
                  const liqStatus = await checkSubmissionStatus(e.title, 'liquidation', e.target_organization);
                  const aoSubmissionStatus = await checkAOSubmissionForLSG(e.title, 'liquidation', e.target_organization);
                  
                  if (liqStatus !== 'approved' && aoSubmissionStatus !== 'approved') {
                    const liqDeadlineDate = e.liquidation_deadline_override || calculateDeadlineDate(e.end_date, 5);
                    formattedEvents.push({
                      id: `${e.id}-liq-deadline`,
                      title: e.title,
                      description: e.target_organization === 'AO' && aoSubmissionStatus === 'pending'
                        ? `An organization has submitted a liquidation report. Please check and review it in the Submissions page.`
                        : e.target_organization === 'AO' && aoSubmissionStatus !== 'pending'
                          ? `Due date for liquidation report for "${e.title}" (Notify Organization)`
                          : aoSubmissionStatus === 'pending'
                            ? `An organization has submitted a liquidation report. Please check and review it in the Submissions page.`
                            : liqStatus === 'pending'
                              ? `You already submitted a liquidation report, please wait for further updates`
                              : `Due date for liquidation report for "${e.title}"`,
                      startDate: liqDeadlineDate,
                      endDate: liqDeadlineDate,
                      allDay: true,
                      isDeadline: true,
                      deadlineType: 'liquidation',
                      parentEventId: e.id,
                      targetOrganization: e.target_organization,
                      hasOverride: !!e.liquidation_deadline_override,
                      submissionStatus: aoSubmissionStatus === 'pending' ? 'pending_review' : liqStatus
                    });
                  }
                }
              }
            }
            
            setEvents(formattedEvents);
          }
        } catch (error: unknown) {
          console.error('Error loading events:', error);
        }
      };
      loadEvents();
    };

    window.addEventListener('lsg-deadlines-refresh', handleRefresh);
    return () => window.removeEventListener('lsg-deadlines-refresh', handleRefresh);
  }, []);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      // Load from localStorage first (set during login) - use LSG-specific keys
      const storedEmail = localStorage.getItem("lsg_userEmail");
      const storedPassword = localStorage.getItem("lsg_userPassword");
      
      if (storedEmail) {
        setCurrentEmail(storedEmail);
      }
      if (storedPassword) {
        setCurrentPassword(storedPassword);
      }
      
      // Fallback to Supabase auth if no localStorage data
      if (!storedEmail) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentEmail(user.email || "");
        }
      }
    };
    loadUserData();
  }, []);

  // Listen for deadline refresh events from real-time submissions
  useEffect(() => {
    const handleRefresh = () => {
      // Reload events when submissions change
      const loadEvents = async () => {
        try {
          const { data: eventsData } = await supabase
            .from('osld_events')
            .select('*, accomplishment_deadline_override, liquidation_deadline_override');
          
          if (eventsData) {
            const formattedEvents: Event[] = [];
            
            // Helper function to check submission status
            const checkSubmissionStatus = async (eventTitle: string, reportType: 'accomplishment' | 'liquidation', targetOrg?: string) => {
              const submissionType = reportType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
              const { data } = await supabase
                .from('submissions')
                .select('status, organization')
                .eq('activity_title', eventTitle)
                .eq('submission_type', submissionType)
                .eq('organization', 'LSG');
              
              if (!data || data.length === 0) return 'no_submission';
              const hasApproved = data.some(s => s.status === 'Approved' || s.status === 'Deleted (Previously Approved)');
              if (hasApproved) return 'approved';
              const hasPending = data.some(s => s.status === 'Pending' || s.status === 'For Revision');
              if (hasPending) return 'pending';
              return 'no_submission';
            };

            // Helper function to check AO submissions
            const checkAOSubmissionForLSG = async (eventTitle: string, reportType: 'accomplishment' | 'liquidation', targetOrg: string) => {
              const submissionType = reportType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
              let reviewingOrg = 'LCO';
              if (targetOrg === 'LSG') {
                reviewingOrg = 'USG';
              }
              const { data } = await supabase
                .from('submissions')
                .select('status, organization, submitted_to')
                .eq('activity_title', eventTitle)
                .eq('submission_type', submissionType)
                .eq('submitted_to', reviewingOrg);
              
              if (!data || data.length === 0) return 'no_submission';
              const hasApproved = data.some(s => s.status === 'Approved');
              if (hasApproved) return 'approved';
              const hasPending = data.some(s => s.status === 'Pending' || s.status === 'For Revision');
              if (hasPending) return 'pending';
              return 'no_submission';
            };
            
            for (const e of eventsData) {
              formattedEvents.push({
                id: e.id,
                title: e.title,
                description: e.description,
                startDate: e.start_date,
                endDate: e.end_date,
                startTime: e.start_time,
                endTime: e.end_time,
                allDay: e.all_day,
                venue: e.venue,
                targetOrganization: e.target_organization,
                requireAccomplishment: e.require_accomplishment,
                requireLiquidation: e.require_liquidation
              });
              
              const shouldShowDeadline = e.target_organization === 'AO' || e.target_organization === 'LSG' || e.target_organization === 'USG';
              
              if (shouldShowDeadline && e.end_date) {
                if (e.require_accomplishment) {
                  const accomStatus = await checkSubmissionStatus(e.title, 'accomplishment', e.target_organization);
                  const aoSubmissionStatus = await checkAOSubmissionForLSG(e.title, 'accomplishment', e.target_organization);
                  
                  if (accomStatus !== 'approved' && aoSubmissionStatus !== 'approved') {
                    const accomDeadlineDate = e.accomplishment_deadline_override || calculateDeadlineDate(e.end_date, 3);
                    formattedEvents.push({
                      id: `${e.id}-accom-deadline`,
                      title: e.title,
                      description: e.target_organization === 'AO' && aoSubmissionStatus === 'pending'
                        ? `An organization has submitted an accomplishment report. Please check and review it in the Submissions page.`
                        : e.target_organization === 'AO' && aoSubmissionStatus !== 'pending'
                          ? `Due date for accomplishment report for "${e.title}" (Notify Organization)`
                          : aoSubmissionStatus === 'pending'
                            ? `An organization has submitted an accomplishment report. Please check and review it in the Submissions page.`
                            : accomStatus === 'pending' 
                              ? `You already submitted an accomplishment report, please wait for further updates`
                              : `Due date for accomplishment report for "${e.title}"`,
                      startDate: accomDeadlineDate,
                      endDate: accomDeadlineDate,
                      allDay: true,
                      isDeadline: true,
                      deadlineType: 'accomplishment',
                      parentEventId: e.id,
                      targetOrganization: e.target_organization,
                      hasOverride: !!e.accomplishment_deadline_override,
                      submissionStatus: aoSubmissionStatus === 'pending' ? 'pending_review' : accomStatus
                    });
                  }
                }
                
                if (e.require_liquidation) {
                  const liqStatus = await checkSubmissionStatus(e.title, 'liquidation', e.target_organization);
                  const aoSubmissionStatus = await checkAOSubmissionForLSG(e.title, 'liquidation', e.target_organization);
                  
                  if (liqStatus !== 'approved' && aoSubmissionStatus !== 'approved') {
                    const liqDeadlineDate = e.liquidation_deadline_override || calculateDeadlineDate(e.end_date, 5);
                    formattedEvents.push({
                      id: `${e.id}-liq-deadline`,
                      title: e.title,
                      description: e.target_organization === 'AO' && aoSubmissionStatus === 'pending'
                        ? `An organization has submitted a liquidation report. Please check and review it in the Submissions page.`
                        : e.target_organization === 'AO' && aoSubmissionStatus !== 'pending'
                          ? `Due date for liquidation report for "${e.title}" (Notify Organization)`
                          : aoSubmissionStatus === 'pending'
                            ? `An organization has submitted a liquidation report. Please check and review it in the Submissions page.`
                            : liqStatus === 'pending'
                              ? `You already submitted a liquidation report, please wait for further updates`
                              : `Due date for liquidation report for "${e.title}"`,
                      startDate: liqDeadlineDate,
                      endDate: liqDeadlineDate,
                      allDay: true,
                      isDeadline: true,
                      deadlineType: 'liquidation',
                      parentEventId: e.id,
                      targetOrganization: e.target_organization,
                      hasOverride: !!e.liquidation_deadline_override,
                      submissionStatus: aoSubmissionStatus === 'pending' ? 'pending_review' : liqStatus
                    });
                  }
                }
              }
            }
            
            setEvents(formattedEvents);
          }
        } catch (error: unknown) {
          console.error('Error loading events:', error);
        }
      };
      loadEvents();
    };

    window.addEventListener('lsg-deadlines-refresh', handleRefresh);
    return () => window.removeEventListener('lsg-deadlines-refresh', handleRefresh);
  }, []);

  // Load uploaded templates from Supabase
  useEffect(() => {
    const loadTemplates = async () => {
      const { data, error } = await supabase
        .from("form_templates")
        .select("*");
      
      if (error) {
        console.error("Error loading templates:", error);
        return;
      }

      if (data) {
        const templatesMap: Record<string, { forms?: { fileName: string; fileUrl: string } }> = {};
        data.forEach((template: { organization: string; template_type: string; file_name: string; file_url: string }) => {
          if (!templatesMap[template.organization]) {
            templatesMap[template.organization] = {};
          }
          if (template.template_type === "forms") {
            templatesMap[template.organization].forms = {
              fileName: template.file_name,
              fileUrl: template.file_url
            };
          }
        });
        setUploadedTemplates(templatesMap);
      }

      // Load notifications - only notifications targeted to LSG or ALL
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .or('target_org.eq.LSG,target_org.eq.ALL')
        .order('created_at', { ascending: false });
      
      // Load read status for LSG
      const { data: readStatusData } = await supabase
        .from('notification_read_status')
        .select('notification_id')
        .eq('read_by', 'LSG');
      
      const readNotificationIds = new Set(readStatusData?.map(r => r.notification_id) || []);
      
      if (notificationsData) {
        setNotifications(notificationsData.map(n => ({
          id: n.id,
          eventTitle: n.event_title,
          eventDescription: n.event_description || '',
          createdBy: n.created_by,
          createdAt: n.created_at,
          isRead: readNotificationIds.has(n.id)
        })));
        setUnreadCount(notificationsData.filter(n => !readNotificationIds.has(n.id)).length);
      }
    };
    loadTemplates();
  }, []);

  // Listen for deadline refresh events from real-time submissions
  useEffect(() => {
    const handleRefresh = () => {
      // Reload events when submissions change
      const loadEvents = async () => {
        try {
          const { data: eventsData } = await supabase
            .from('osld_events')
            .select('*, accomplishment_deadline_override, liquidation_deadline_override');
          
          if (eventsData) {
            const formattedEvents: Event[] = [];
            
            // Helper function to check submission status
            const checkSubmissionStatus = async (eventTitle: string, reportType: 'accomplishment' | 'liquidation', targetOrg?: string) => {
              const submissionType = reportType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
              const { data } = await supabase
                .from('submissions')
                .select('status, organization')
                .eq('activity_title', eventTitle)
                .eq('submission_type', submissionType)
                .eq('organization', 'LSG');
              
              if (!data || data.length === 0) return 'no_submission';
              const hasApproved = data.some(s => s.status === 'Approved' || s.status === 'Deleted (Previously Approved)');
              if (hasApproved) return 'approved';
              const hasPending = data.some(s => s.status === 'Pending' || s.status === 'For Revision');
              if (hasPending) return 'pending';
              return 'no_submission';
            };

            // Helper function to check AO submissions
            const checkAOSubmissionForLSG = async (eventTitle: string, reportType: 'accomplishment' | 'liquidation', targetOrg: string) => {
              const submissionType = reportType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
              let reviewingOrg = 'LCO';
              if (targetOrg === 'LSG') {
                reviewingOrg = 'USG';
              }
              const { data } = await supabase
                .from('submissions')
                .select('status, organization, submitted_to')
                .eq('activity_title', eventTitle)
                .eq('submission_type', submissionType)
                .eq('submitted_to', reviewingOrg);
              
              if (!data || data.length === 0) return 'no_submission';
              const hasApproved = data.some(s => s.status === 'Approved');
              if (hasApproved) return 'approved';
              const hasPending = data.some(s => s.status === 'Pending' || s.status === 'For Revision');
              if (hasPending) return 'pending';
              return 'no_submission';
            };
            
            for (const e of eventsData) {
              formattedEvents.push({
                id: e.id,
                title: e.title,
                description: e.description,
                startDate: e.start_date,
                endDate: e.end_date,
                startTime: e.start_time,
                endTime: e.end_time,
                allDay: e.all_day,
                venue: e.venue,
                targetOrganization: e.target_organization,
                requireAccomplishment: e.require_accomplishment,
                requireLiquidation: e.require_liquidation
              });
              
              const shouldShowDeadline = e.target_organization === 'AO' || e.target_organization === 'LSG' || e.target_organization === 'USG';
              
              if (shouldShowDeadline && e.end_date) {
                if (e.require_accomplishment) {
                  const accomStatus = await checkSubmissionStatus(e.title, 'accomplishment', e.target_organization);
                  const aoSubmissionStatus = await checkAOSubmissionForLSG(e.title, 'accomplishment', e.target_organization);
                  
                  if (accomStatus !== 'approved' && aoSubmissionStatus !== 'approved') {
                    const accomDeadlineDate = e.accomplishment_deadline_override || calculateDeadlineDate(e.end_date, 3);
                    formattedEvents.push({
                      id: `${e.id}-accom-deadline`,
                      title: e.title,
                      description: e.target_organization === 'AO' && aoSubmissionStatus === 'pending'
                        ? `An organization has submitted an accomplishment report. Please check and review it in the Submissions page.`
                        : e.target_organization === 'AO' && aoSubmissionStatus !== 'pending'
                          ? `Due date for accomplishment report for "${e.title}" (Notify Organization)`
                          : aoSubmissionStatus === 'pending'
                            ? `An organization has submitted an accomplishment report. Please check and review it in the Submissions page.`
                            : accomStatus === 'pending' 
                              ? `You already submitted an accomplishment report, please wait for further updates`
                              : `Due date for accomplishment report for "${e.title}"`,
                      startDate: accomDeadlineDate,
                      endDate: accomDeadlineDate,
                      allDay: true,
                      isDeadline: true,
                      deadlineType: 'accomplishment',
                      parentEventId: e.id,
                      targetOrganization: e.target_organization,
                      hasOverride: !!e.accomplishment_deadline_override,
                      submissionStatus: aoSubmissionStatus === 'pending' ? 'pending_review' : accomStatus
                    });
                  }
                }
                
                if (e.require_liquidation) {
                  const liqStatus = await checkSubmissionStatus(e.title, 'liquidation', e.target_organization);
                  const aoSubmissionStatus = await checkAOSubmissionForLSG(e.title, 'liquidation', e.target_organization);
                  
                  if (liqStatus !== 'approved' && aoSubmissionStatus !== 'approved') {
                    const liqDeadlineDate = e.liquidation_deadline_override || calculateDeadlineDate(e.end_date, 5);
                    formattedEvents.push({
                      id: `${e.id}-liq-deadline`,
                      title: e.title,
                      description: e.target_organization === 'AO' && aoSubmissionStatus === 'pending'
                        ? `An organization has submitted a liquidation report. Please check and review it in the Submissions page.`
                        : e.target_organization === 'AO' && aoSubmissionStatus !== 'pending'
                          ? `Due date for liquidation report for "${e.title}" (Notify Organization)`
                          : aoSubmissionStatus === 'pending'
                            ? `An organization has submitted a liquidation report. Please check and review it in the Submissions page.`
                            : liqStatus === 'pending'
                              ? `You already submitted a liquidation report, please wait for further updates`
                              : `Due date for liquidation report for "${e.title}"`,
                      startDate: liqDeadlineDate,
                      endDate: liqDeadlineDate,
                      allDay: true,
                      isDeadline: true,
                      deadlineType: 'liquidation',
                      parentEventId: e.id,
                      targetOrganization: e.target_organization,
                      hasOverride: !!e.liquidation_deadline_override,
                      submissionStatus: aoSubmissionStatus === 'pending' ? 'pending_review' : liqStatus
                    });
                  }
                }
              }
            }
            
            setEvents(formattedEvents);
          }
        } catch (error: unknown) {
          console.error('Error loading events:', error);
        }
      };
      loadEvents();
    };

    window.addEventListener('lsg-deadlines-refresh', handleRefresh);
    return () => window.removeEventListener('lsg-deadlines-refresh', handleRefresh);
  }, []);

  // Check for pending submissions
  useEffect(() => {
    const checkPendingSubmission = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('id, status')
        .eq('organization', 'LSG')
        .eq('submission_type', 'Request to Conduct Activity')
        .eq('status', 'Pending')
        .limit(1);
      
      setHasPendingSubmission((data?.length || 0) > 0);
      if (data && data.length > 0) {
        setPendingSubmissionStatus(data[0].status);
      } else {
        setPendingSubmissionStatus(null);
      }
    };
    checkPendingSubmission();
  }, []);

  // Listen for deadline refresh events from real-time submissions
  useEffect(() => {
    const handleRefresh = () => {
      // Reload events when submissions change
      const loadEvents = async () => {
        try {
          const { data: eventsData } = await supabase
            .from('osld_events')
            .select('*, accomplishment_deadline_override, liquidation_deadline_override');
          
          if (eventsData) {
            const formattedEvents: Event[] = [];
            
            // Helper function to check submission status
            const checkSubmissionStatus = async (eventTitle: string, reportType: 'accomplishment' | 'liquidation', targetOrg?: string) => {
              const submissionType = reportType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
              const { data } = await supabase
                .from('submissions')
                .select('status, organization')
                .eq('activity_title', eventTitle)
                .eq('submission_type', submissionType)
                .eq('organization', 'LSG');
              
              if (!data || data.length === 0) return 'no_submission';
              const hasApproved = data.some(s => s.status === 'Approved' || s.status === 'Deleted (Previously Approved)');
              if (hasApproved) return 'approved';
              const hasPending = data.some(s => s.status === 'Pending' || s.status === 'For Revision');
              if (hasPending) return 'pending';
              return 'no_submission';
            };

            // Helper function to check AO submissions
            const checkAOSubmissionForLSG = async (eventTitle: string, reportType: 'accomplishment' | 'liquidation', targetOrg: string) => {
              const submissionType = reportType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
              let reviewingOrg = 'LCO';
              if (targetOrg === 'LSG') {
                reviewingOrg = 'USG';
              }
              const { data } = await supabase
                .from('submissions')
                .select('status, organization, submitted_to')
                .eq('activity_title', eventTitle)
                .eq('submission_type', submissionType)
                .eq('submitted_to', reviewingOrg);
              
              if (!data || data.length === 0) return 'no_submission';
              const hasApproved = data.some(s => s.status === 'Approved');
              if (hasApproved) return 'approved';
              const hasPending = data.some(s => s.status === 'Pending' || s.status === 'For Revision');
              if (hasPending) return 'pending';
              return 'no_submission';
            };
            
            for (const e of eventsData) {
              formattedEvents.push({
                id: e.id,
                title: e.title,
                description: e.description,
                startDate: e.start_date,
                endDate: e.end_date,
                startTime: e.start_time,
                endTime: e.end_time,
                allDay: e.all_day,
                venue: e.venue,
                targetOrganization: e.target_organization,
                requireAccomplishment: e.require_accomplishment,
                requireLiquidation: e.require_liquidation
              });
              
              const shouldShowDeadline = e.target_organization === 'AO' || e.target_organization === 'LSG' || e.target_organization === 'USG';
              
              if (shouldShowDeadline && e.end_date) {
                if (e.require_accomplishment) {
                  const accomStatus = await checkSubmissionStatus(e.title, 'accomplishment', e.target_organization);
                  const aoSubmissionStatus = await checkAOSubmissionForLSG(e.title, 'accomplishment', e.target_organization);
                  
                  if (accomStatus !== 'approved' && aoSubmissionStatus !== 'approved') {
                    const accomDeadlineDate = e.accomplishment_deadline_override || calculateDeadlineDate(e.end_date, 3);
                    formattedEvents.push({
                      id: `${e.id}-accom-deadline`,
                      title: e.title,
                      description: e.target_organization === 'AO' && aoSubmissionStatus === 'pending'
                        ? `An organization has submitted an accomplishment report. Please check and review it in the Submissions page.`
                        : e.target_organization === 'AO' && aoSubmissionStatus !== 'pending'
                          ? `Due date for accomplishment report for "${e.title}" (Notify Organization)`
                          : aoSubmissionStatus === 'pending'
                            ? `An organization has submitted an accomplishment report. Please check and review it in the Submissions page.`
                            : accomStatus === 'pending' 
                              ? `You already submitted an accomplishment report, please wait for further updates`
                              : `Due date for accomplishment report for "${e.title}"`,
                      startDate: accomDeadlineDate,
                      endDate: accomDeadlineDate,
                      allDay: true,
                      isDeadline: true,
                      deadlineType: 'accomplishment',
                      parentEventId: e.id,
                      targetOrganization: e.target_organization,
                      hasOverride: !!e.accomplishment_deadline_override,
                      submissionStatus: aoSubmissionStatus === 'pending' ? 'pending_review' : accomStatus
                    });
                  }
                }
                
                if (e.require_liquidation) {
                  const liqStatus = await checkSubmissionStatus(e.title, 'liquidation', e.target_organization);
                  const aoSubmissionStatus = await checkAOSubmissionForLSG(e.title, 'liquidation', e.target_organization);
                  
                  if (liqStatus !== 'approved' && aoSubmissionStatus !== 'approved') {
                    const liqDeadlineDate = e.liquidation_deadline_override || calculateDeadlineDate(e.end_date, 5);
                    formattedEvents.push({
                      id: `${e.id}-liq-deadline`,
                      title: e.title,
                      description: e.target_organization === 'AO' && aoSubmissionStatus === 'pending'
                        ? `An organization has submitted a liquidation report. Please check and review it in the Submissions page.`
                        : e.target_organization === 'AO' && aoSubmissionStatus !== 'pending'
                          ? `Due date for liquidation report for "${e.title}" (Notify Organization)`
                          : aoSubmissionStatus === 'pending'
                            ? `An organization has submitted a liquidation report. Please check and review it in the Submissions page.`
                            : liqStatus === 'pending'
                              ? `You already submitted a liquidation report, please wait for further updates`
                              : `Due date for liquidation report for "${e.title}"`,
                      startDate: liqDeadlineDate,
                      endDate: liqDeadlineDate,
                      allDay: true,
                      isDeadline: true,
                      deadlineType: 'liquidation',
                      parentEventId: e.id,
                      targetOrganization: e.target_organization,
                      hasOverride: !!e.liquidation_deadline_override,
                      submissionStatus: aoSubmissionStatus === 'pending' ? 'pending_review' : liqStatus
                    });
                  }
                }
              }
            }
            
            setEvents(formattedEvents);
          }
        } catch (error: unknown) {
          console.error('Error loading events:', error);
        }
      };
      loadEvents();
    };

    window.addEventListener('lsg-deadlines-refresh', handleRefresh);
    return () => window.removeEventListener('lsg-deadlines-refresh', handleRefresh);
  }, []);

  // Load activity logs
  useEffect(() => {
    const loadActivityLogs = async () => {
      // Show submissions where: 
      // 1. submitted_to is LSG (submissions received by LSG from other orgs)
      // 2. approved_by is LSG (submissions endorsed by LSG to COA)
      // But NOT LSG's own pending submissions to other orgs (LCO/USG)
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .or('submitted_to.eq.LSG,approved_by.eq.LSG')
        .order('submitted_at', { ascending: false });
      
      if (data) {
        // Remove duplicate submissions per activity/type combination - keep only the latest
        const seen = new Set<string>();
        const uniqueData = data.filter(s => {
          // Filter out deleted submissions
          if (s.status === 'Deleted (Previously Approved)') {
            return false;
          }
          
          const key = `${s.activity_title}|${s.submission_type}`;
          if (seen.has(key)) {
            return false; // Skip duplicate (older submission)
          }
          seen.add(key);
          return true;
        });
        
        setActivityLogs(uniqueData.map(s => ({
          id: s.id,
          documentName: s.activity_title,
          type: s.submission_type,
          organization: s.organization,
          status: s.status,
          date: new Date(s.submitted_at).toLocaleDateString(),
          fileUrl: s.file_url,
          fileName: s.file_name,
          revisionReason: s.revision_reason,
          rejectionReason: s.rejection_reason,
          approvedBy: s.approved_by || s.submitted_to, // Use approved_by field, fallback to submitted_to
          coaAction: s.coa_opinion,
          coaComment: s.coa_comment,
          ...s
        })));
      }
      
      // Check for missed deadlines
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const missedDeadline = events.some((event) => {
        if (!event.isDeadline) return false;
        if (event.targetOrganization !== 'LSG') return false;
        
        const deadlineDate = new Date(event.startDate);
        deadlineDate.setHours(0, 0, 0, 0);
        
        if (deadlineDate < today) {
          const parentEventId = event.parentEventId;
          const reportType = event.deadlineType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
          
          const hasSubmitted = data?.some(log => 
            log.event_id === parentEventId && 
            log.submission_type === reportType && 
            log.status !== 'For Revision'
          );
          
          return !hasSubmitted;
        }
        return false;
      });
      
      setHasMissedDeadline(missedDeadline);
    };
    loadActivityLogs();
  }, [events]);

  // Set up real-time subscription for submissions to refresh deadlines
  useEffect(() => {
    const submissionsChannel = supabase
      .channel('lsg-submissions-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'submissions' }, 
        (payload) => {
          console.log('📝 LSG Submissions changed:', payload);
          reloadActivityLogs();
          // Trigger reload of events to refresh deadlines
          window.dispatchEvent(new Event('lsg-deadlines-refresh'));
        }
      )
      .subscribe();
    
    return () => {
      submissionsChannel.unsubscribe();
    };
  }, []);

  // Listen for deadline refresh events from real-time submissions
  useEffect(() => {
    const handleRefresh = () => {
      // Reload events when submissions change
      const loadEvents = async () => {
        try {
          const { data: eventsData } = await supabase
            .from('osld_events')
            .select('*, accomplishment_deadline_override, liquidation_deadline_override');
          
          if (eventsData) {
            const formattedEvents: Event[] = [];
            
            // Helper function to check submission status
            const checkSubmissionStatus = async (eventTitle: string, reportType: 'accomplishment' | 'liquidation', targetOrg?: string) => {
              const submissionType = reportType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
              const { data } = await supabase
                .from('submissions')
                .select('status, organization')
                .eq('activity_title', eventTitle)
                .eq('submission_type', submissionType)
                .eq('organization', 'LSG');
              
              if (!data || data.length === 0) return 'no_submission';
              const hasApproved = data.some(s => s.status === 'Approved' || s.status === 'Deleted (Previously Approved)');
              if (hasApproved) return 'approved';
              const hasPending = data.some(s => s.status === 'Pending' || s.status === 'For Revision');
              if (hasPending) return 'pending';
              return 'no_submission';
            };

            // Helper function to check AO submissions
            const checkAOSubmissionForLSG = async (eventTitle: string, reportType: 'accomplishment' | 'liquidation', targetOrg: string) => {
              const submissionType = reportType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
              let reviewingOrg = 'LCO';
              if (targetOrg === 'LSG') {
                reviewingOrg = 'USG';
              }
              const { data } = await supabase
                .from('submissions')
                .select('status, organization, submitted_to')
                .eq('activity_title', eventTitle)
                .eq('submission_type', submissionType)
                .eq('submitted_to', reviewingOrg);
              
              if (!data || data.length === 0) return 'no_submission';
              const hasApproved = data.some(s => s.status === 'Approved');
              if (hasApproved) return 'approved';
              const hasPending = data.some(s => s.status === 'Pending' || s.status === 'For Revision');
              if (hasPending) return 'pending';
              return 'no_submission';
            };
            
            for (const e of eventsData) {
              formattedEvents.push({
                id: e.id,
                title: e.title,
                description: e.description,
                startDate: e.start_date,
                endDate: e.end_date,
                startTime: e.start_time,
                endTime: e.end_time,
                allDay: e.all_day,
                venue: e.venue,
                targetOrganization: e.target_organization,
                requireAccomplishment: e.require_accomplishment,
                requireLiquidation: e.require_liquidation
              });
              
              const shouldShowDeadline = e.target_organization === 'AO' || e.target_organization === 'LSG' || e.target_organization === 'USG';
              
              if (shouldShowDeadline && e.end_date) {
                if (e.require_accomplishment) {
                  const accomStatus = await checkSubmissionStatus(e.title, 'accomplishment', e.target_organization);
                  const aoSubmissionStatus = await checkAOSubmissionForLSG(e.title, 'accomplishment', e.target_organization);
                  
                  if (accomStatus !== 'approved' && aoSubmissionStatus !== 'approved') {
                    const accomDeadlineDate = e.accomplishment_deadline_override || calculateDeadlineDate(e.end_date, 3);
                    formattedEvents.push({
                      id: `${e.id}-accom-deadline`,
                      title: e.title,
                      description: e.target_organization === 'AO' && aoSubmissionStatus === 'pending'
                        ? `An organization has submitted an accomplishment report. Please check and review it in the Submissions page.`
                        : e.target_organization === 'AO' && aoSubmissionStatus !== 'pending'
                          ? `Due date for accomplishment report for "${e.title}" (Notify Organization)`
                          : aoSubmissionStatus === 'pending'
                            ? `An organization has submitted an accomplishment report. Please check and review it in the Submissions page.`
                            : accomStatus === 'pending' 
                              ? `You already submitted an accomplishment report, please wait for further updates`
                              : `Due date for accomplishment report for "${e.title}"`,
                      startDate: accomDeadlineDate,
                      endDate: accomDeadlineDate,
                      allDay: true,
                      isDeadline: true,
                      deadlineType: 'accomplishment',
                      parentEventId: e.id,
                      targetOrganization: e.target_organization,
                      hasOverride: !!e.accomplishment_deadline_override,
                      submissionStatus: aoSubmissionStatus === 'pending' ? 'pending_review' : accomStatus
                    });
                  }
                }
                
                if (e.require_liquidation) {
                  const liqStatus = await checkSubmissionStatus(e.title, 'liquidation', e.target_organization);
                  const aoSubmissionStatus = await checkAOSubmissionForLSG(e.title, 'liquidation', e.target_organization);
                  
                  if (liqStatus !== 'approved' && aoSubmissionStatus !== 'approved') {
                    const liqDeadlineDate = e.liquidation_deadline_override || calculateDeadlineDate(e.end_date, 5);
                    formattedEvents.push({
                      id: `${e.id}-liq-deadline`,
                      title: e.title,
                      description: e.target_organization === 'AO' && aoSubmissionStatus === 'pending'
                        ? `An organization has submitted a liquidation report. Please check and review it in the Submissions page.`
                        : e.target_organization === 'AO' && aoSubmissionStatus !== 'pending'
                          ? `Due date for liquidation report for "${e.title}" (Notify Organization)`
                          : aoSubmissionStatus === 'pending'
                            ? `An organization has submitted a liquidation report. Please check and review it in the Submissions page.`
                            : liqStatus === 'pending'
                              ? `You already submitted a liquidation report, please wait for further updates`
                              : `Due date for liquidation report for "${e.title}"`,
                      startDate: liqDeadlineDate,
                      endDate: liqDeadlineDate,
                      allDay: true,
                      isDeadline: true,
                      deadlineType: 'liquidation',
                      parentEventId: e.id,
                      targetOrganization: e.target_organization,
                      hasOverride: !!e.liquidation_deadline_override,
                      submissionStatus: aoSubmissionStatus === 'pending' ? 'pending_review' : liqStatus
                    });
                  }
                }
              }
            }
            
            setEvents(formattedEvents);
          }
        } catch (error: unknown) {
          console.error('Error loading events:', error);
        }
      };
      loadEvents();
    };

    window.addEventListener('lsg-deadlines-refresh', handleRefresh);
    return () => window.removeEventListener('lsg-deadlines-refresh', handleRefresh);
  }, []);

  // Reload activity logs function
  const reloadActivityLogs = async () => {
    // Show submissions where: 
    // 1. submitted_to is LSG (submissions received by LSG from other orgs)
    // 2. approved_by is LSG (submissions endorsed by LSG to COA)
    // But NOT LSG's own pending submissions to other orgs (LCO/USG)
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .or('submitted_to.eq.LSG,approved_by.eq.LSG')
      .neq('status', 'Deleted (Previously Approved)')
      .order('submitted_at', { ascending: false });
    
    if (data) {
      // Remove duplicate submissions per activity/type combination - keep only the latest
      const seen = new Set<string>();
      const uniqueData = data.filter(s => {
        const key = `${s.activity_title}|${s.submission_type}`;
        if (seen.has(key)) {
          return false; // Skip duplicate (older submission)
        }
        seen.add(key);
        return true;
      });
      
      setActivityLogs(uniqueData.map(s => ({
        id: s.id,
        documentName: s.activity_title,
        type: s.submission_type,
        organization: s.organization,
        status: s.status,
        date: new Date(s.submitted_at).toLocaleDateString(),
        fileUrl: s.file_url,
        fileName: s.file_name,
        revisionReason: s.revision_reason,
        rejectionReason: s.rejection_reason,
        coaAction: s.coa_opinion,
        coaComment: s.coa_comment,
        ...s
      })));
    }
  };

  // Handle revision file upload for submitter (LSG)
  const handleRevisionFileUpload = async (submissionData: any) => {
    if (!revisionUploadFile || !revisionUploadInput || !submissionData) return;
    setIsUploadingRevision(true);
    try {
      const file = revisionUploadInput;
      const filePath = `submissions/${submissionData.organization}/${submissionData.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(filePath);
      const newFileUrl = urlData.publicUrl;

      const currentFileUrls = (submissionData.file_urls || submissionData.file_url || '').split(' | ').filter(Boolean);
      const currentFileNames = (submissionData.file_name || '').split(' | ').filter(Boolean);
      const oldUrl = revisionUploadFile.fileUrl;
      const oldName = revisionUploadFile.fileName;

      const urlIndex = currentFileUrls.indexOf(oldUrl);
      if (urlIndex === -1) throw new Error('Could not find the file to replace. Please reload and try again.');

      const newFileUrls = [...currentFileUrls];
      newFileUrls[urlIndex] = newFileUrl;

      const labelPart = oldName.includes(':') ? oldName.split(':')[0].trim() : oldName.split('.')[0];
      const newFileName = `${labelPart}: ${file.name}`;
      const newFileNames = [...currentFileNames];
      const nameIndex = urlIndex < currentFileNames.length ? urlIndex : currentFileNames.indexOf(oldName);
      if (nameIndex !== -1) newFileNames[nameIndex] = newFileName;

      const currentFRS = submissionData.file_revision_status || {};
      const newFRS = { ...currentFRS };
      delete newFRS[oldUrl];
      newFRS[newFileUrl] = 'submitted';

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
        .eq('id', submissionData.id);

      if (updateError) throw updateError;

      await supabase.from('annotations').delete()
        .eq('submission_id', submissionData.id)
        .eq('file_url', oldUrl);

      toast({ title: "Revision Submitted", description: "Your revised file has been uploaded successfully." });
      setRevisionUploadFile(null);
      setRevisionUploadInput(null);
      setIsLogDetailOpen(false);
      reloadActivityLogs();
    } catch (err: any) {
      console.error('Error uploading revision:', err);
      toast({ title: "Upload Failed", description: err.message || "Failed to upload revised file.", variant: "destructive" });
    } finally {
      setIsUploadingRevision(false);
    }
  };

  // Delete activity log
  const handleDeleteLog = async () => {
    if (!logToDelete) return;

    const logId = logToDelete.id;
    const logFileName = logToDelete.fileName;
    const logStatus = logToDelete.status;
    const logSubmissionType = logToDelete.type; // from map: s.submission_type -> type
    const isEndorsedToCOA = logToDelete.endorsed_to_coa;

    // Close dialog and clear state
    setIsDeleteDialogOpen(false);
    setLogToDelete(null);

    // Immediately remove from UI
    setActivityLogs(prev => prev.filter(log => log.id !== logId));

    // If endorsed to COA, don't delete - keep in COA Internal Review
    if (isEndorsedToCOA) {
      toast({
        title: "Cannot Delete",
        description: "This file has been endorsed to COA and cannot be deleted.",
      });
      // Refresh to show the file again
      reloadActivityLogs();
      return;
    }

    // Check if submission was approved - if so, mark as deleted instead of removing
    if (logStatus === 'Approved' && (logSubmissionType === 'Accomplishment Report' || logSubmissionType === 'Liquidation Report')) {
      // Mark as deleted but keep record to prevent deadline reappearance
      await supabase
        .from('submissions')
        .update({
          status: 'Deleted (Previously Approved)',
          file_url: null,
          file_name: null,
          gdrive_link: null
        })
        .eq('id', logId);
    } else {
      // Regular delete for non-approved submissions
      await supabase
        .from('submissions')
        .delete()
        .eq('id', logId);
    }

    // Also try to delete the file from storage if it exists
    if (logFileName) {
      await supabase.storage
        .from('form-templates')
        .remove([logFileName]);
    }
    
    // Refresh pending submission check
    const { data } = await supabase
      .from('submissions')
      .select('id, status')
      .eq('organization', 'LSG')
      .eq('submission_type', 'Request to Conduct Activity')
      .eq('status', 'Pending')
      .limit(1);
    
    setHasPendingSubmission((data?.length || 0) > 0);
    if (data && data.length > 0) {
      setPendingSubmissionStatus(data[0].status);
    } else {
      setPendingSubmissionStatus(null);
    }
  };

  // Handle individual file deletion
  const handleDeleteFile = async () => {
    if (!fileToDelete) return;

    try {
      const isEndorsedToCOA = fileToDelete.status === 'Approved'; // Simplified check
      
      // If endorsed to COA, don't allow deletion
      if (isEndorsedToCOA) {
        toast({
          title: "Cannot Delete",
          description: "This file has been endorsed and cannot be deleted.",
          variant: "destructive"
        });
        setIsFileDeleteDialogOpen(false);
        setFileToDelete(null);
        return;
      }

      // If approved, mark as deleted instead of removing to prevent deadline reappearance
      if (fileToDelete.status === 'Approved' && (fileToDelete.fileType === 'Accomplishment Report' || fileToDelete.fileType === 'Liquidation Report')) {
        const { error } = await supabase
          .from('submissions')
          .update({
            status: 'Deleted (Previously Approved)',
            file_url: null,
            file_name: null,
            gdrive_link: null
          })
          .eq('id', fileToDelete.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('submissions')
          .delete()
          .eq('id', fileToDelete.id);
        
        if (error) throw error;
      }
      
      toast({
        title: "Success",
        description: `${fileToDelete.fileType} deleted successfully.`,
      });
      
      setIsFileDeleteDialogOpen(false);
      setFileToDelete(null);
      setIsLogDetailOpen(false);
      reloadActivityLogs();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: "Failed to delete file.",
        variant: "destructive"
      });
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString("default", { month: "long" });
  const year = currentDate.getFullYear();

  const handleMonthChange = (monthIndex: number, yearValue: number) => {
    setCurrentDate(new Date(yearValue, monthIndex, 1));
    setIsMonthPickerOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("lsg_userEmail");
    localStorage.removeItem("lsg_userPassword");
    localStorage.removeItem("userOrganization");
    localStorage.removeItem("app_lastPath");
    localStorage.removeItem("lsg_activeNav");
    window.location.href = "/";
  };

  // Load saved documents from database
  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("org_documents")
        .select("*")
        .eq("organization", "lsg");

      if (error) throw error;

      if (data) {
        setSavedDocuments({
          budget_proposal: data.filter((d) => d.document_type === "budget_proposal"),
          coa_transitional: data.filter((d) => d.document_type === "coa_transitional"),
        });
      }
    } catch (error: unknown) {
      console.error("Error loading documents:", error);
    }
  };

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  // Listen for deadline refresh events from real-time submissions
  useEffect(() => {
    const handleRefresh = () => {
      // Reload events when submissions change
      const loadEvents = async () => {
        try {
          const { data: eventsData } = await supabase
            .from('osld_events')
            .select('*, accomplishment_deadline_override, liquidation_deadline_override');
          
          if (eventsData) {
            const formattedEvents: Event[] = [];
            
            // Helper function to check submission status
            const checkSubmissionStatus = async (eventTitle: string, reportType: 'accomplishment' | 'liquidation', targetOrg?: string) => {
              const submissionType = reportType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
              const { data } = await supabase
                .from('submissions')
                .select('status, organization')
                .eq('activity_title', eventTitle)
                .eq('submission_type', submissionType)
                .eq('organization', 'LSG');
              
              if (!data || data.length === 0) return 'no_submission';
              const hasApproved = data.some(s => s.status === 'Approved' || s.status === 'Deleted (Previously Approved)');
              if (hasApproved) return 'approved';
              const hasPending = data.some(s => s.status === 'Pending' || s.status === 'For Revision');
              if (hasPending) return 'pending';
              return 'no_submission';
            };

            // Helper function to check AO submissions
            const checkAOSubmissionForLSG = async (eventTitle: string, reportType: 'accomplishment' | 'liquidation', targetOrg: string) => {
              const submissionType = reportType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
              let reviewingOrg = 'LCO';
              if (targetOrg === 'LSG') {
                reviewingOrg = 'USG';
              }
              const { data } = await supabase
                .from('submissions')
                .select('status, organization, submitted_to')
                .eq('activity_title', eventTitle)
                .eq('submission_type', submissionType)
                .eq('submitted_to', reviewingOrg);
              
              if (!data || data.length === 0) return 'no_submission';
              const hasApproved = data.some(s => s.status === 'Approved');
              if (hasApproved) return 'approved';
              const hasPending = data.some(s => s.status === 'Pending' || s.status === 'For Revision');
              if (hasPending) return 'pending';
              return 'no_submission';
            };
            
            for (const e of eventsData) {
              formattedEvents.push({
                id: e.id,
                title: e.title,
                description: e.description,
                startDate: e.start_date,
                endDate: e.end_date,
                startTime: e.start_time,
                endTime: e.end_time,
                allDay: e.all_day,
                venue: e.venue,
                targetOrganization: e.target_organization,
                requireAccomplishment: e.require_accomplishment,
                requireLiquidation: e.require_liquidation
              });
              
              const shouldShowDeadline = e.target_organization === 'AO' || e.target_organization === 'LSG' || e.target_organization === 'USG';
              
              if (shouldShowDeadline && e.end_date) {
                if (e.require_accomplishment) {
                  const accomStatus = await checkSubmissionStatus(e.title, 'accomplishment', e.target_organization);
                  const aoSubmissionStatus = await checkAOSubmissionForLSG(e.title, 'accomplishment', e.target_organization);
                  
                  if (accomStatus !== 'approved' && aoSubmissionStatus !== 'approved') {
                    const accomDeadlineDate = e.accomplishment_deadline_override || calculateDeadlineDate(e.end_date, 3);
                    formattedEvents.push({
                      id: `${e.id}-accom-deadline`,
                      title: e.title,
                      description: e.target_organization === 'AO' && aoSubmissionStatus === 'pending'
                        ? `An organization has submitted an accomplishment report. Please check and review it in the Submissions page.`
                        : e.target_organization === 'AO' && aoSubmissionStatus !== 'pending'
                          ? `Due date for accomplishment report for "${e.title}" (Notify Organization)`
                          : aoSubmissionStatus === 'pending'
                            ? `An organization has submitted an accomplishment report. Please check and review it in the Submissions page.`
                            : accomStatus === 'pending' 
                              ? `You already submitted an accomplishment report, please wait for further updates`
                              : `Due date for accomplishment report for "${e.title}"`,
                      startDate: accomDeadlineDate,
                      endDate: accomDeadlineDate,
                      allDay: true,
                      isDeadline: true,
                      deadlineType: 'accomplishment',
                      parentEventId: e.id,
                      targetOrganization: e.target_organization,
                      hasOverride: !!e.accomplishment_deadline_override,
                      submissionStatus: aoSubmissionStatus === 'pending' ? 'pending_review' : accomStatus
                    });
                  }
                }
                
                if (e.require_liquidation) {
                  const liqStatus = await checkSubmissionStatus(e.title, 'liquidation', e.target_organization);
                  const aoSubmissionStatus = await checkAOSubmissionForLSG(e.title, 'liquidation', e.target_organization);
                  
                  if (liqStatus !== 'approved' && aoSubmissionStatus !== 'approved') {
                    const liqDeadlineDate = e.liquidation_deadline_override || calculateDeadlineDate(e.end_date, 5);
                    formattedEvents.push({
                      id: `${e.id}-liq-deadline`,
                      title: e.title,
                      description: e.target_organization === 'AO' && aoSubmissionStatus === 'pending'
                        ? `An organization has submitted a liquidation report. Please check and review it in the Submissions page.`
                        : e.target_organization === 'AO' && aoSubmissionStatus !== 'pending'
                          ? `Due date for liquidation report for "${e.title}" (Notify Organization)`
                          : aoSubmissionStatus === 'pending'
                            ? `An organization has submitted a liquidation report. Please check and review it in the Submissions page.`
                            : liqStatus === 'pending'
                              ? `You already submitted a liquidation report, please wait for further updates`
                              : `Due date for liquidation report for "${e.title}"`,
                      startDate: liqDeadlineDate,
                      endDate: liqDeadlineDate,
                      allDay: true,
                      isDeadline: true,
                      deadlineType: 'liquidation',
                      parentEventId: e.id,
                      targetOrganization: e.target_organization,
                      hasOverride: !!e.liquidation_deadline_override,
                      submissionStatus: aoSubmissionStatus === 'pending' ? 'pending_review' : liqStatus
                    });
                  }
                }
              }
            }
            
            setEvents(formattedEvents);
          }
        } catch (error: unknown) {
          console.error('Error loading events:', error);
        }
      };
      loadEvents();
    };

    window.addEventListener('lsg-deadlines-refresh', handleRefresh);
    return () => window.removeEventListener('lsg-deadlines-refresh', handleRefresh);
  }, []);

  const handleSaveProfile = async () => {
    try {
      // Upload budget proposal files
      for (const file of budgetProposalFiles) {
        const fileName = `lsg/budget_proposal/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("submissions")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("submissions")
          .getPublicUrl(fileName);

        await supabase.from("org_documents").insert({
          organization: "lsg",
          document_type: "budget_proposal",
          file_name: file.name,
          file_url: urlData.publicUrl,
        });
      }

      // Upload COA transitional files
      for (const file of coaTransitionalFiles) {
        const fileName = `lsg/coa_transitional/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("submissions")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("submissions")
          .getPublicUrl(fileName);

        await supabase.from("org_documents").insert({
          organization: "lsg",
          document_type: "coa_transitional",
          file_name: file.name,
          file_url: urlData.publicUrl,
        });
      }

      // Clear file states after upload
      setBudgetProposalFiles([]);
      setCoaTransitionalFiles([]);

      // Reload documents
      await loadDocuments();

      toast({
        title: "Success",
        description: "Profile saved successfully!",
      });
    } catch (error: unknown) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteDocument = (docId: string, docName: string) => {
    setDocumentToDelete({ id: docId, name: docName });
    setIsDeleteDocumentDialogOpen(true);
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;
    
    try {
      const { error} = await supabase
        .from("org_documents")
        .delete()
        .eq("id", documentToDelete.id);

      if (error) throw error;

      await loadDocuments();
      toast({
        title: "Success",
        description: "Document deleted successfully!",
      });
      setIsDeleteDocumentDialogOpen(false);
      setDocumentToDelete(null);
    } catch (error: unknown) {
      console.error("Error deleting document:", error);
      toast({
        title: "Error",
        description: "Failed to delete document.",
        variant: "destructive",
      });
    }
  };

  const renderCalendar = () => {
    const days = [];
    const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-4"></div>);
    }

    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    // Helper to check if a day has events
    const hasEventsOnDay = (day: number) => {
      const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return events.some(event => {
        const start = event.startDate;
        const end = event.endDate || event.startDate;
        return dateStr >= start && dateStr <= end;
      });
    };

    // Helper to check if a day has deadline events
    const hasDeadlineOnDay = (day: number) => {
      const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return events.some(event => {
        if (!event.isDeadline) return false;
        const start = event.startDate;
        const end = event.endDate || event.startDate;
        return dateStr >= start && dateStr <= end;
      });
    };

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        day === todayDay &&
        currentDate.getMonth() === todayMonth &&
        currentDate.getFullYear() === todayYear;
      const dayDate = new Date(year, currentDate.getMonth(), day);
      const hasEvents = hasEventsOnDay(day);
      const hasDeadline = hasDeadlineOnDay(day);

      const bgStyle = isToday
        ? { backgroundColor: "rgba(212, 175, 55, 0.2)" }
        : {};

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate(dayDate)}
          style={bgStyle}
          className={`p-2 cursor-pointer rounded-lg min-h-[80px] border ${!isToday ? 'bg-white' : ''} hover:bg-gray-100 relative transition-colors`}
        >
          <div className="text-lg font-semibold text-left">{day}</div>
          {hasEvents && (
            <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full" style={{ backgroundColor: "#003b27" }}></div>
          )}
          {hasDeadline && (
            <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-red-500"></div>
          )}
        </div>,
      );
    }

    return (
      <>
        {weekDays.map((day) => (
          <div
            key={day}
            className="p-3 text-center font-bold text-sm bg-gray-200 text-gray-700"
          >
            {day}
          </div>
        ))}
        {days}
      </>
    );
  };

  // Get events for selected date
  const getEventsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return events.filter((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const current = new Date(dateStr);
      return current >= start && current <= end;
    });
  };

  // Format selected date
  const formatSelectedDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Get event day number
  const getEventDayNumber = (event: Event, currentDate: Date) => {
    const start = new Date(event.startDate);
    const current = new Date(currentDate);
    const diffTime = current.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  const renderMonthPicker = () => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    return (
      <div className="p-4 w-80">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setCurrentDate(new Date(year - 1, currentDate.getMonth(), 1))
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-bold">{year}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setCurrentDate(new Date(year + 1, currentDate.getMonth(), 1))
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {months.map((month, index) => (
            <Button
              key={month}
              variant={currentDate.getMonth() === index ? "default" : "outline"}
              size="sm"
              onClick={() => handleMonthChange(index, year)}
              className="text-xs"
            >
              {month.slice(0, 3)}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  // Officer functions
  const openAddOfficerModal = () => {
    setEditingOfficer(null);
    setOfficerName("");
    setOfficerPosition("");
    setOfficerImage("");
    setIsOfficerModalOpen(true);
  };

  const openEditOfficerModal = (officer: Officer) => {
    setEditingOfficer(officer);
    setOfficerName(officer.name);
    setOfficerPosition(officer.position);
    setOfficerImage(officer.image || "");
    setIsOfficerModalOpen(true);
  };

  const handleSaveOfficer = async () => {
    if (!officerName.trim() || !officerPosition.trim()) return;
    
    try {
      if (editingOfficer) {
        // Update existing officer
        const { error } = await supabase
          .from("org_officers")
          .update({
            name: officerName,
            position: officerPosition,
            image: officerImage || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingOfficer.id);

        if (error) throw error;

        const newOfficer: Officer = {
          id: editingOfficer.id,
          name: officerName,
          position: officerPosition,
          image: officerImage,
        };
        setOfficers(officers.map(o => o.id === editingOfficer.id ? newOfficer : o));
      } else {
        // Add new officer
        const { data, error } = await supabase
          .from("org_officers")
          .insert({
            organization: "lsg",
            name: officerName,
            position: officerPosition,
            image: officerImage || null,
          })
          .select()
          .single();

        if (error) throw error;

        const newOfficer: Officer = {
          id: data.id,
          name: officerName,
          position: officerPosition,
          image: officerImage,
        };
        setOfficers([...officers, newOfficer]);
      }

      setIsOfficerModalOpen(false);
      setOfficerName("");
      setOfficerPosition("");
      setOfficerImage("");
      setEditingOfficer(null);
    } catch (error: unknown) {
      console.error("Error saving officer:", error);
    }
  };

  const deleteOfficer = async (id: string) => {
    try {
      const { error } = await supabase
        .from("org_officers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setOfficers(officers.filter(o => o.id !== id));
    } catch (error: unknown) {
      console.error("Error deleting officer:", error);
    }
  };

  // Adviser functions
  const openAddAdviserModal = () => {
    setEditingAdviser(null);
    setAdviserName("");
    setAdviserPosition("");
    setAdviserImage("");
    setIsAdviserModalOpen(true);
  };

  const openEditAdviserModal = (adviser: Officer) => {
    setEditingAdviser(adviser);
    setAdviserName(adviser.name);
    setAdviserPosition(adviser.position);
    setAdviserImage(adviser.image || "");
    setIsAdviserModalOpen(true);
  };

  const handleSaveAdviser = async () => {
    if (!adviserName.trim() || !adviserPosition.trim()) return;
    
    // Ensure position includes "Adviser" for proper categorization
    const finalPosition = adviserPosition.toLowerCase().includes("adviser")
      ? adviserPosition
      : `${adviserPosition} Adviser`;
    
    try {
      if (editingAdviser) {
        // Update existing adviser
        const { error } = await supabase
          .from("org_officers")
          .update({
            name: adviserName,
            position: finalPosition,
            image: adviserImage || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingAdviser.id);

        if (error) throw error;

        const newAdviser: Officer = {
          id: editingAdviser.id,
          name: adviserName,
          position: finalPosition,
          image: adviserImage,
        };
        setAdvisers(advisers.map(a => a.id === editingAdviser.id ? newAdviser : a));
      } else {
        // Add new adviser
        const { data, error } = await supabase
          .from("org_officers")
          .insert({
            organization: "lsg",
            name: adviserName,
            position: finalPosition,
            image: adviserImage || null,
          })
          .select()
          .single();

        if (error) throw error;

        const newAdviser: Officer = {
          id: data.id,
          name: adviserName,
          position: finalPosition,
          image: adviserImage,
        };
        setAdvisers([...advisers, newAdviser]);
      }

      setIsAdviserModalOpen(false);
      setAdviserName("");
      setAdviserPosition("");
      setAdviserImage("");
      setEditingAdviser(null);
    } catch (error: unknown) {
      console.error("Error saving adviser:", error);
    }
  };

  const deleteAdviser = async (id: string) => {
    try {
      const { error } = await supabase
        .from("org_officers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setAdvisers(advisers.filter(a => a.id !== id));
    } catch (error: unknown) {
      console.error("Error deleting adviser:", error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "officer" | "adviser") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === "officer") {
          setOfficerImage(reader.result as string);
        } else {
          setAdviserImage(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Load officers and advisers from database on mount
  useEffect(() => {
    const loadOfficersAndAdvisers = async () => {
      try {
        const { data, error } = await supabase
          .from("org_officers")
          .select("*")
          .eq("organization", "lsg");

        if (error) throw error;

        if (data) {
          // Separate officers and advisers based on position
          const loadedOfficers = data.filter(
            (item) => !item.position.toLowerCase().includes("adviser")
          );
          const loadedAdvisers = data.filter((item) =>
            item.position.toLowerCase().includes("adviser")
          );

          setOfficers(loadedOfficers);
          setAdvisers(loadedAdvisers);
        }
      } catch (error: unknown) {
        console.error("Error loading officers and advisers:", error);
      }
    };

    loadOfficersAndAdvisers();
  }, []);

  // Listen for deadline refresh events from real-time submissions
  useEffect(() => {
    const handleRefresh = () => {
      // Reload events when submissions change
      const loadEvents = async () => {
        try {
          const { data: eventsData } = await supabase
            .from('osld_events')
            .select('*, accomplishment_deadline_override, liquidation_deadline_override');
          
          if (eventsData) {
            const formattedEvents: Event[] = [];
            
            // Helper function to check submission status
            const checkSubmissionStatus = async (eventTitle: string, reportType: 'accomplishment' | 'liquidation', targetOrg?: string) => {
              const submissionType = reportType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
              const { data } = await supabase
                .from('submissions')
                .select('status, organization')
                .eq('activity_title', eventTitle)
                .eq('submission_type', submissionType)
                .eq('organization', 'LSG');
              
              if (!data || data.length === 0) return 'no_submission';
              const hasApproved = data.some(s => s.status === 'Approved' || s.status === 'Deleted (Previously Approved)');
              if (hasApproved) return 'approved';
              const hasPending = data.some(s => s.status === 'Pending' || s.status === 'For Revision');
              if (hasPending) return 'pending';
              return 'no_submission';
            };

            // Helper function to check AO submissions
            const checkAOSubmissionForLSG = async (eventTitle: string, reportType: 'accomplishment' | 'liquidation', targetOrg: string) => {
              const submissionType = reportType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
              let reviewingOrg = 'LCO';
              if (targetOrg === 'LSG') {
                reviewingOrg = 'USG';
              }
              const { data } = await supabase
                .from('submissions')
                .select('status, organization, submitted_to')
                .eq('activity_title', eventTitle)
                .eq('submission_type', submissionType)
                .eq('submitted_to', reviewingOrg);
              
              if (!data || data.length === 0) return 'no_submission';
              const hasApproved = data.some(s => s.status === 'Approved');
              if (hasApproved) return 'approved';
              const hasPending = data.some(s => s.status === 'Pending' || s.status === 'For Revision');
              if (hasPending) return 'pending';
              return 'no_submission';
            };
            
            for (const e of eventsData) {
              formattedEvents.push({
                id: e.id,
                title: e.title,
                description: e.description,
                startDate: e.start_date,
                endDate: e.end_date,
                startTime: e.start_time,
                endTime: e.end_time,
                allDay: e.all_day,
                venue: e.venue,
                targetOrganization: e.target_organization,
                requireAccomplishment: e.require_accomplishment,
                requireLiquidation: e.require_liquidation
              });
              
              const shouldShowDeadline = e.target_organization === 'AO' || e.target_organization === 'LSG' || e.target_organization === 'USG';
              
              if (shouldShowDeadline && e.end_date) {
                if (e.require_accomplishment) {
                  const accomStatus = await checkSubmissionStatus(e.title, 'accomplishment', e.target_organization);
                  const aoSubmissionStatus = await checkAOSubmissionForLSG(e.title, 'accomplishment', e.target_organization);
                  
                  if (accomStatus !== 'approved' && aoSubmissionStatus !== 'approved') {
                    const accomDeadlineDate = e.accomplishment_deadline_override || calculateDeadlineDate(e.end_date, 3);
                    formattedEvents.push({
                      id: `${e.id}-accom-deadline`,
                      title: e.title,
                      description: e.target_organization === 'AO' && aoSubmissionStatus === 'pending'
                        ? `An organization has submitted an accomplishment report. Please check and review it in the Submissions page.`
                        : e.target_organization === 'AO' && aoSubmissionStatus !== 'pending'
                          ? `Due date for accomplishment report for "${e.title}" (Notify Organization)`
                          : aoSubmissionStatus === 'pending'
                            ? `An organization has submitted an accomplishment report. Please check and review it in the Submissions page.`
                            : accomStatus === 'pending' 
                              ? `You already submitted an accomplishment report, please wait for further updates`
                              : `Due date for accomplishment report for "${e.title}"`,
                      startDate: accomDeadlineDate,
                      endDate: accomDeadlineDate,
                      allDay: true,
                      isDeadline: true,
                      deadlineType: 'accomplishment',
                      parentEventId: e.id,
                      targetOrganization: e.target_organization,
                      hasOverride: !!e.accomplishment_deadline_override,
                      submissionStatus: aoSubmissionStatus === 'pending' ? 'pending_review' : accomStatus
                    });
                  }
                }
                
                if (e.require_liquidation) {
                  const liqStatus = await checkSubmissionStatus(e.title, 'liquidation', e.target_organization);
                  const aoSubmissionStatus = await checkAOSubmissionForLSG(e.title, 'liquidation', e.target_organization);
                  
                  if (liqStatus !== 'approved' && aoSubmissionStatus !== 'approved') {
                    const liqDeadlineDate = e.liquidation_deadline_override || calculateDeadlineDate(e.end_date, 5);
                    formattedEvents.push({
                      id: `${e.id}-liq-deadline`,
                      title: e.title,
                      description: e.target_organization === 'AO' && aoSubmissionStatus === 'pending'
                        ? `An organization has submitted a liquidation report. Please check and review it in the Submissions page.`
                        : e.target_organization === 'AO' && aoSubmissionStatus !== 'pending'
                          ? `Due date for liquidation report for "${e.title}" (Notify Organization)`
                          : aoSubmissionStatus === 'pending'
                            ? `An organization has submitted a liquidation report. Please check and review it in the Submissions page.`
                            : liqStatus === 'pending'
                              ? `You already submitted a liquidation report, please wait for further updates`
                              : `Due date for liquidation report for "${e.title}"`,
                      startDate: liqDeadlineDate,
                      endDate: liqDeadlineDate,
                      allDay: true,
                      isDeadline: true,
                      deadlineType: 'liquidation',
                      parentEventId: e.id,
                      targetOrganization: e.target_organization,
                      hasOverride: !!e.liquidation_deadline_override,
                      submissionStatus: aoSubmissionStatus === 'pending' ? 'pending_review' : liqStatus
                    });
                  }
                }
              }
            }
            
            setEvents(formattedEvents);
          }
        } catch (error: unknown) {
          console.error('Error loading events:', error);
        }
      };
      loadEvents();
    };

    window.addEventListener('lsg-deadlines-refresh', handleRefresh);
    return () => window.removeEventListener('lsg-deadlines-refresh', handleRefresh);
  }, []);

  const navItems = [
    "Dashboard",
    "Request to Conduct Activity",
    "Accomplishment Report",
    "Liquidation Report",
    "Form Templates",
    "Activity Logs",
    "Officers",
    "Organizations",
  ];

  // Render Accomplishment Report Section
  if (activeNav === "Accomplishment Report") {
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
                className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10"
                style={{ ringColor: "#d4af37" }}
              >
                <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold leading-tight" style={{ color: "#d4af37" }}>
                  LSG
                </h1>
                <p className="text-xs text-white/60 mt-1">Local Student Government</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            {navItems.map((item) => (
              <Button
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full justify-start mb-2 text-left font-semibold transition-all whitespace-normal text-sm leading-tight py-3 h-auto ${
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
              variant="ghost"
              className="w-full justify-start mb-2 text-white hover:bg-[#d4af37] hover:text-[#003b27]"
              onClick={() => setIsLogoutDialogOpen(true)}
            >
              <LogOut className="mr-2 h-4 w-4" />
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
        <div className="flex-1 overflow-auto pt-16 lg:pt-0">
          <div className="p-4 lg:p-8">
            <div className="max-w-4xl mx-auto">
              {/* Header Section */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-4 shadow-lg">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-2" style={{ color: "#003b27" }}>
                  Accomplishment Report
                </h2>
                <p className="text-gray-600 text-sm lg:text-base">
                  Submit your activity accomplishment report for review
                </p>
              </div>

              {/* Form Card */}
              <Card className="border-t-4 border-[#d4af37] shadow-xl bg-white rounded-xl overflow-hidden">
                <div className="p-8 space-y-8">
                  {/* Activity Title Section */}
                  <div className="space-y-3">
                    <label className={`text-base font-semibold flex items-center gap-2 ${accomplishmentErrors.title ? 'text-red-500' : ''}`} style={accomplishmentErrors.title ? {} : { color: "#003b27" }}>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Activity Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={accomplishmentActivityTitle}
                      onChange={(e) => setAccomplishmentActivityTitle(e.target.value)}
                      className={`w-full h-12 text-base border-2 rounded-md px-4 ${accomplishmentErrors.title ? 'border-red-500' : 'focus:border-[#d4af37] border-gray-300'} transition-colors`}
                      placeholder="Enter the activity title"
                    />
                    {accomplishmentErrors.title && (
                      <p className="text-red-500 text-xs">Please fill up this field</p>
                    )}
                  </div>

                  {/* GDrive Link Section */}
                  <div className="space-y-3">
                    <label className={`text-base font-semibold flex items-center gap-2 ${accomplishmentErrors.link ? 'text-red-500' : ''}`} style={accomplishmentErrors.link ? {} : { color: "#003b27" }}>
                      <Link2 className="h-5 w-5 text-blue-600" />
                      GDrive Link <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={accomplishmentGdriveLink}
                        onChange={(e) => setAccomplishmentGdriveLink(e.target.value)}
                        className={`w-full h-12 text-base border-2 rounded-md pl-10 pr-4 transition-colors ${
                          accomplishmentErrors.link
                            ? "border-red-500"
                            : accomplishmentGdriveLink && isValidGdriveLink(accomplishmentGdriveLink)
                            ? "border-green-400 bg-green-50"
                            : "focus:border-[#d4af37] border-gray-300"
                        }`}
                        placeholder="Paste your GDrive link here"
                      />
                      <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                    {accomplishmentGdriveLink && isValidGdriveLink(accomplishmentGdriveLink) && (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        <span>Valid GDrive link</span>
                      </div>
                    )}
                    {accomplishmentErrors.link && (
                      <p className="text-red-500 text-xs">Please provide a valid GDrive link</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Share a GDrive folder containing your accomplishment report documents
                    </p>
                  </div>

                  {/* Required Documents Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-800 mb-2">Required Documents in GDrive Folder:</p>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-blue-700">
                      <li>Narrative Report</li>
                      <li>Documentation</li>
                      <li>Attendance</li>
                      <li>Evaluation Report</li>
                      <li>Approve Letter to Conduct Activity</li>
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-6">
                    <Button
                      onClick={() => handleAccomplishmentSubmit()}
                      className="flex-1 h-12 text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                      style={{ backgroundColor: "#003b27" }}
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Submit Report
                    </Button>
                    <Button
                      onClick={handleAccomplishmentCancel}
                      className="flex-1 h-12 text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                      style={{ backgroundColor: "#ef4444" }}
                    >
                      <X className="h-5 w-5 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Info Card */}
              <Card className="mt-6 bg-blue-50 border-blue-200">
                <div className="p-4 flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Important Reminder</p>
                    <p>Make sure your accomplishment report includes all required details and is in the proper format before submitting.</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Logout Dialog */}
        <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Logout</DialogTitle>
            </DialogHeader>
            <p className="text-gray-600">Are you sure you want to logout?</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLogoutDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                style={{ backgroundColor: "#003b27" }}
                onClick={() => {
                  handleLogout();
                }}
              >
                Logout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Toaster />
      </div>
    );
  }

  // Render Liquidation Report Section
  if (activeNav === "Liquidation Report") {
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
                className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10"
                style={{ ringColor: "#d4af37" }}
              >
                <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold leading-tight" style={{ color: "#d4af37" }}>
                  LSG
                </h1>
                <p className="text-xs text-white/60 mt-1">Local Student Government</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            {navItems.map((item) => (
              <Button
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full justify-start mb-2 text-left font-semibold transition-all whitespace-normal text-sm leading-tight py-3 h-auto ${
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
              variant="ghost"
              className="w-full justify-start mb-2 text-white hover:bg-[#d4af37] hover:text-[#003b27]"
              onClick={() => setIsLogoutDialogOpen(true)}
            >
              <LogOut className="mr-2 h-4 w-4" />
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
        <div className="flex-1 overflow-auto pt-16 lg:pt-0">
          <div className="p-4 lg:p-8">
            <div className="max-w-4xl mx-auto">
              {/* Header Section */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 mb-4 shadow-lg">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-2" style={{ color: "#003b27" }}>
                  Liquidation Report
                </h2>
                <p className="text-gray-600 text-sm lg:text-base">
                  Submit your activity liquidation report for review
                </p>
              </div>

              {/* Form Card */}
              <Card className="border-t-4 border-[#d4af37] shadow-xl bg-white rounded-xl overflow-hidden">
                <div className="p-8 space-y-8">
                  {/* Activity Title Section */}
                  <div className="space-y-3">
                    <label className={`text-base font-semibold flex items-center gap-2 ${liquidationErrors.title ? 'text-red-500' : ''}`} style={liquidationErrors.title ? {} : { color: "#003b27" }}>
                      <CheckCircle className="h-5 w-5 text-amber-600" />
                      Activity Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={liquidationActivityTitle}
                      onChange={(e) => setLiquidationActivityTitle(e.target.value)}
                      className={`w-full h-12 text-base border-2 rounded-md px-4 ${liquidationErrors.title ? 'border-red-500' : 'focus:border-[#d4af37] border-gray-300'} transition-colors`}
                      placeholder="Enter the activity title"
                    />
                    {liquidationErrors.title && (
                      <p className="text-red-500 text-xs">Please fill up this field</p>
                    )}
                  </div>

                  {/* GDrive Link Section */}
                  <div className="space-y-3">
                    <label className={`text-base font-semibold flex items-center gap-2 ${liquidationErrors.link ? 'text-red-500' : ''}`} style={liquidationErrors.link ? {} : { color: "#003b27" }}>
                      <Link2 className="h-5 w-5 text-blue-600" />
                      GDrive Link <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={liquidationGdriveLink}
                        onChange={(e) => setLiquidationGdriveLink(e.target.value)}
                        className={`w-full h-12 text-base border-2 rounded-md pl-10 pr-4 transition-colors ${
                          liquidationErrors.link
                            ? "border-red-500"
                            : liquidationGdriveLink && isValidGdriveLink(liquidationGdriveLink)
                            ? "border-green-400 bg-green-50"
                            : "focus:border-[#d4af37] border-gray-300"
                        }`}
                        placeholder="Paste your GDrive link here"
                      />
                      <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                    {liquidationGdriveLink && isValidGdriveLink(liquidationGdriveLink) && (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        <span>Valid GDrive link</span>
                      </div>
                    )}
                    {liquidationErrors.link && (
                      <p className="text-red-500 text-xs">Please provide a valid GDrive link</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Share a GDrive folder containing your liquidation report documents
                    </p>
                  </div>

                  {/* Required Documents Info */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-amber-800 mb-2">Required Documents in GDrive Folder:</p>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-amber-700">
                      <li>Liquidation Report Per Event</li>
                      <li>Breakdown of Expenses</li>
                      <li>DoZE & DSA</li>
                      <li>Official Receipt and Needed Fiscal Forms, Procurement Forms</li>
                      <li>Others (Optional)</li>
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-6">
                    <Button
                      onClick={() => handleLiquidationSubmit()}
                      className="flex-1 h-12 text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                      style={{ backgroundColor: "#003b27" }}
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Submit Report
                    </Button>
                    <Button
                      onClick={handleLiquidationCancel}
                      className="flex-1 h-12 text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                      style={{ backgroundColor: "#ef4444" }}
                    >
                      <X className="h-5 w-5 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Info Card */}
              <Card className="mt-6 bg-amber-50 border-amber-200">
                <div className="p-4 flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">Important Reminder</p>
                    <p>Make sure your liquidation report includes all required financial details and is in the proper format before submitting.</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Logout Dialog */}
        <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Logout</DialogTitle>
            </DialogHeader>
            <p className="text-gray-600">Are you sure you want to logout?</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLogoutDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                style={{ backgroundColor: "#003b27" }}
                onClick={() => {
                  handleLogout();
                }}
              >
                Logout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Toaster />
      </div>
    );
  }

  // Render Form Templates Section
  if (activeNav === "Form Templates") {
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
                className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10"
                style={{ ringColor: "#d4af37" }}
              >
                <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold leading-tight" style={{ color: "#d4af37" }}>
                  LSG
                </h1>
                <p className="text-xs text-white/60 mt-1">Local Student Government</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            {navItems.map((item) => (
              <Button
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full justify-start mb-2 text-left font-semibold transition-all whitespace-normal text-sm leading-tight py-3 h-auto ${
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
          </nav>

          <div className="px-4 pb-6 border-t border-white/10 pt-4">
            <Button
              onClick={() => setIsLogoutDialogOpen(true)}
              className="w-full justify-start text-left font-semibold transition-all text-white hover:bg-red-600"
              variant="ghost"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Overlay for mobile */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-auto pt-16 lg:pt-0">
          <div className="p-4 lg:p-8">
            <h2
              className="text-2xl lg:text-4xl font-bold mb-6 lg:mb-8"
              style={{ color: "#003b27" }}
            >
              Form Templates
            </h2>

            {/* Template Download Section */}
            <div className="max-w-3xl mx-auto">
              <Card className="p-8 border-t-4 shadow-xl" style={{ borderTopColor: "#d4af37" }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#003b27" }}>
                    <FileText className="h-6 w-6" style={{ color: "#d4af37" }} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold" style={{ color: "#003b27" }}>
                      Forms Templates
                    </h3>
                    <p className="text-sm text-gray-600">Access templates for all organizations</p>
                  </div>
                </div>
                
                {uploadedTemplates['ALL']?.forms ? (
                  <div className="border-2 border-green-300 bg-green-50 rounded-lg p-6">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                        <Download className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    <p className="text-center text-sm text-gray-700 mb-4 font-medium">
                      Templates are available for download
                    </p>
                    <Button
                      className="w-full h-12 text-base font-semibold"
                      style={{ backgroundColor: "#003b27" }}
                      onClick={() => {
                        const url = uploadedTemplates['ALL']?.forms?.fileUrl;
                        if (url) {
                          window.open(url, "_blank");
                        }
                      }}
                    >
                      <ExternalLink className="h-5 w-5 mr-2" />
                      Open GDrive Link
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <Download className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-base text-gray-600 mb-2 font-medium">
                      No templates available yet
                    </p>
                    <p className="text-sm text-gray-500">
                      OSLD has not uploaded templates yet. Please check back later.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>

        {/* Logout Dialog */}
        <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Logout</DialogTitle>
            </DialogHeader>
            <p className="text-gray-600">Are you sure you want to logout?</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLogoutDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                style={{ backgroundColor: "#003b27" }}
                onClick={() => {
                  handleLogout();
                }}
              >
                Logout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Submission Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-green-600">
                Request Submitted Successfully
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">
                Your activity request has been submitted successfully. Please wait for it to be reviewed.
              </p>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setShowSuccessDialog(false)}
                style={{ backgroundColor: "#003b27" }}
              >
                Okay
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-red-600">
                Delete Activity Log
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">
                Are you sure you want to delete this activity log? This action cannot be undone.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setLogToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteLog}
                style={{ backgroundColor: "#dc2626" }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* File Delete Confirmation Dialog */}
        <Dialog open={isFileDeleteDialogOpen} onOpenChange={setIsFileDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-red-600">
                Delete File
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">
                Are you sure you want to delete this file?
              </p>
              {fileToDelete && (
                <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="text-sm font-semibold text-gray-700">{fileToDelete.fileType}</p>
                  <p className="text-xs text-gray-500 mt-1">{fileToDelete.fileName || 'Untitled'}</p>
                </div>
              )}
              <p className="mt-3 text-sm text-red-500 font-medium">
                This action cannot be undone.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsFileDeleteDialogOpen(false);
                  setFileToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteFile}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Define SDG and LIKHA options
  const sdgOptions = [
    "1. No Poverty",
    "2. Zero Hunger",
    "3. Good Health and Well-being",
    "4. Quality Education",
    "5. Gender Equality",
    "6. Clean Water and Sanitation",
    "7. Affordable and Clean Energy",
    "8. Decent Work and Economic Growth",
    "9. Industry, Innovation and Infrastructure",
    "10. Reduced Inequalities",
    "11. Sustainable Cities and Communities",
    "12. Responsible Consumption and Production",
    "13. Climate Action",
    "14. Life Below Water",
    "15. Life on Land",
    "16. Peace and Justice",
    "17. Partnerships for the Goals",
  ];

  const likhaOptions = [
    "Launchpad of Global Talents and Innovators",
    "Interdependence and High Impact Coalitions",
    "Knowledge Co-creation, and Technopreneurship",
    "Hub for Academic Excellence & Innovation",
    "Accelerated Administrative Systems and Digital Transformation",
  ];

  const handleSubmitActivity = async () => {
    // Check for unsubmitted past-due accomplishment or liquidation reports
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const hasMissedDeadline = events.some((event) => {
      // Only check deadline events for LSG
      if (!event.isDeadline) return false;
      if (event.targetOrganization !== 'LSG') return false;
      
      const deadlineDate = new Date(event.startDate);
      deadlineDate.setHours(0, 0, 0, 0);
      
      // If deadline has passed
      if (deadlineDate < today) {
        // Check if report was submitted for this event
        const parentEventId = event.parentEventId;
        const reportType = event.deadlineType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
        
        // Check activity logs for this submission
        const hasSubmitted = activityLogs.some(log => 
          log.eventId === parentEventId && 
          log.type === reportType && 
          log.status !== 'For Revision'
        );
        
        return !hasSubmitted;
      }
      return false;
    });
    
    if (hasMissedDeadline) {
      return;
    }

    // Validate all required fields
    const errors = {
      title: !activityTitle,
      duration: !activityDuration,
      venue: !activityVenue,
      participants: !activityParticipants,
      funds: !activityFunds,
      budget: !activityBudget,
      sdg: !activitySDG,
      likha: !activityLIKHA,
      designFile: !endorsementLetterFile || !letterToConductFile || !activityDesignFile
    };
    
    setActivityErrors(errors);
    
    if (Object.values(errors).some(error => error)) {
      return;
    }
    
    try {
      // LSG submissions go to USG - insert DB row first to get submission_id
      const { data: submissionData, error: dbError } = await supabase
        .from('submissions')
        .insert({
          organization: 'LSG',
          submission_type: 'Request to Conduct Activity',
          activity_title: activityTitle,
          activity_duration: activityDuration,
          activity_venue: activityVenue,
          activity_participants: activityParticipants,
          activity_funds: activityFunds,
          activity_budget: activityBudget,
          activity_sdg: activitySDG ? [activitySDG] : [],
          activity_likha: activityLIKHA,
          file_url: '',
          file_name: '',
          file_urls: '',
          status: 'Pending'
        })
        .select('id')
        .single();

      if (dbError) throw dbError;

      if (!submissionData?.id) {
        throw new Error('Submission created but no id was returned.');
      }

      const submissionId = submissionData.id;

      // Helper to upload a file and get its public URL, scoped to submission_id
      const uploadFile = async (file: File, folder: string, label: string) => {
        if (!file.name.toLowerCase().endsWith('.pdf')) throw new Error(`Only PDF files are allowed. "${file.name}" is not a PDF.`);
        const fileExt = file.name.split('.').pop();
        const fileName = `LSG_${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
        // Include submission_id in path for strict per-submission isolation
        const filePath = `${folder}/${submissionId}/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('osld-files')
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('osld-files')
          .getPublicUrl(filePath);
        return { url: publicUrl, name: `${label}: ${file.name}` };
      };

      const endorsementResult = await uploadFile(endorsementLetterFile!, 'activity-designs', 'Endorsement Letter');
      const letterToConductResult = await uploadFile(letterToConductFile!, 'activity-designs', 'Letter to Conduct');
      const designResult = await uploadFile(activityDesignFile!, 'activity-designs', 'Activity Design');

      const uploadedFiles = [endorsementResult.name, letterToConductResult.name, designResult.name].join(' | ');
      const allFileUrls = [endorsementResult.url, letterToConductResult.url, designResult.url].join(' | ');

      // Update submission row with actual file URLs
      await supabase
        .from('submissions')
        .update({
          file_url: endorsementResult.url,
          file_name: uploadedFiles,
          file_urls: allFileUrls,
        })
        .eq('id', submissionId);

      // Create notification for USG (LSG -> USG)
      await supabase
        .from('notifications')
        .insert({
          event_id: submissionId,
          event_description: `Local Student Government submitted a Request to Conduct Activity titled "${activityTitle}". Check it out!`,
          created_by: 'LSG',
          target_org: 'USG'
        });

      setShowSuccessDialog(true);
      setHasPendingSubmission(true);
      setPendingSubmissionStatus('Pending');
      handleCancelActivity();
    } catch (error: unknown) {
      console.error('Error submitting activity:', error);
      alert('Failed to submit activity request. Please try again.');
    }
  };

  const handleCancelActivity = () => {
    setActivityTitle("");
    setActivityDuration("");
    setActivityVenue("");
    setActivityParticipants("");
    setActivityFunds("");
    setActivityBudget("");
    setActivitySDG("");
    setActivityLIKHA("");
    setActivityDesignFile(null);
    setEndorsementLetterFile(null);
    setLetterToConductFile(null);
    setBudgetaryRequirementsFile(null);
    setResolutionToCollectFile(null);
    setBudgetaryProposalFile(null);
    setMinutesOfMeetingFile(null);
    setAnnualPlanFile(null);
  };

  // Accomplishment Report handlers
  const isValidGdriveLink = (link: string) => {
    return link.includes('drive.google.com') || link.includes('docs.google.com');
  };

  // Function to update revision status for matching activity titles
  const updateRevisionStatus = async (activityTitle: string, submissionType: 'Accomplishment Report' | 'Liquidation Report') => {
    try {
      // Find all submissions with matching activity title and type that are "For Revision"
      const { data: existingSubmissions, error: fetchError } = await supabase
        .from('submissions')
        .select('*')
        .eq('activity_title', activityTitle)
        .eq('submission_type', submissionType)
        .eq('status', 'For Revision')
        .order('submitted_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching existing submissions:', fetchError);
        return;
      }

      // Update the most recent "For Revision" submission to the new status
      if (existingSubmissions && existingSubmissions.length > 0) {
        const submissionToUpdate = existingSubmissions[0];
        
        // Determine the appropriate status based on USG/COA action
        let finalStatus = 'Pending'; // Default to Pending when resubmitting
        
        // Check if ANY submission for this activity has been approved by USG or COA
        const { data: allSubmissions } = await supabase
          .from('submissions')
          .select('*')
          .eq('activity_title', activityTitle)
          .eq('submission_type', submissionType)
          .order('submitted_at', { ascending: false });
        
        const hasApprovedSubmission = allSubmissions?.some(sub => 
          sub.coa_opinion === 'approved' || sub.status === 'Approved'
        );
        
        if (hasApprovedSubmission) {
          finalStatus = 'Approved';
          console.log(`✓ Setting status to "Approved" - USG/COA has approved a resubmission`);
        } else if (!submissionToUpdate.coa_reviewed && !submissionToUpdate.coa_opinion) {
          // No action yet, set to Pending
          finalStatus = 'Pending';
          console.log(`✓ Setting status to "Pending" - no action taken yet`);
        }
        
        const { error: updateError } = await supabase
          .from('submissions')
          .update({ 
            status: finalStatus,
            revision_reason: finalStatus === 'Pending' ? null : submissionToUpdate.revision_reason // Clear revision reason only if pending
          })
          .eq('id', submissionToUpdate.id);

        if (updateError) {
          console.error('Error updating submission status:', updateError);
        } else {
          console.log(`✓ Updated ${submissionType} for "${activityTitle}" from "For Revision" to "${finalStatus}"`);
        }
      }
    } catch (error) {
      console.error('Error in updateRevisionStatus:', error);
    }
  };


  const handleAccomplishmentSubmit = async (eventIdParam?: string) => {
    console.log('========================================');
    console.log('FUNCTION CALLED: handleAccomplishmentSubmit');
    console.log('========================================');
    console.log('🔍 handleAccomplishmentSubmit called with:', {
      eventIdParam,
      currentEventIdForSubmission,
      willUse: eventIdParam || currentEventIdForSubmission
    });
    
    // Validate required fields
    const errors = {
      title: !accomplishmentActivityTitle,
      link: !accomplishmentGdriveLink || !isValidGdriveLink(accomplishmentGdriveLink)
    };

    setAccomplishmentErrors(errors);

    if (errors.title || errors.link) {
      console.log('❌ Validation failed:', errors);
      return;
    }
    
    try {
      // Use the parameter if provided, otherwise use state
      const eventIdToLink = eventIdParam || currentEventIdForSubmission;
      
      // Validate UUID format - must be a valid UUID or null
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validEventId = eventIdToLink && uuidRegex.test(eventIdToLink) ? eventIdToLink : null;
      
      if (eventIdToLink && !validEventId) {
        console.warn('⚠️ WARNING: Invalid UUID format detected:', eventIdToLink, '- Setting event_id to null');
      }
      
      // LSG submits to USG
      const targetOrg = 'USG';

      // Debug: Log the values being submitted
      console.log('✅ Submitting Accomplishment Report with:', {
        accomplishmentActivityTitle,
        accomplishmentGdriveLink,
        eventIdToLink: validEventId,
        targetOrg,
        originalEventId: eventIdToLink,
        wasValid: validEventId !== null
      });
      
      if (!validEventId) {
        console.warn('⚠️ WARNING: No valid event ID found! Submission will not be linked to any event.');
      }

      // Save submission to database
      const insertData = {
        organization: 'LSG',
        submission_type: 'Accomplishment Report',
        activity_title: accomplishmentActivityTitle.trim(),
        activity_duration: 'N/A',
        activity_venue: 'N/A',
        activity_participants: 'N/A',
        activity_funds: 'N/A',
        activity_budget: 'N/A',
        activity_sdg: 'N/A',
        activity_likha: 'N/A',
        file_url: accomplishmentGdriveLink.trim(),
        file_name: 'GDrive Link',
        gdrive_link: accomplishmentGdriveLink.trim(),
        status: 'Pending',
        submitted_to: targetOrg,
        event_id: validEventId
      };
      
      console.log('Insert data:', insertData);

      const { data: submissionData, error: dbError } = await supabase
        .from('submissions')
        .insert(insertData)
        .select('id')
        .single();

      console.log('📊 Database response:', {
        data: submissionData,
        error: dbError
      });

      if (dbError) {
        console.error('❌ DB Error details:', JSON.stringify(dbError, null, 2));
        throw new Error(dbError.message || 'Database error occurred');
      }
      
      console.log('✅ Submission saved successfully with ID:', submissionData?.id);

      // Check if this is a revision for an existing "For Revision" submission
      // If so, update the old "For Revision" submission status appropriately
      await updateRevisionStatus(accomplishmentActivityTitle.trim(), 'Accomplishment Report');

      // Send notification
      const notificationData = {
        event_id: eventIdToLink || null,
        event_title: 'Accomplishment Report Submitted',
        event_description: `LSG has submitted an Accomplishment Report for "${accomplishmentActivityTitle}". Please review it.`,
        created_by: 'LSG',
        target_org: targetOrg
      };
      
      console.log('📬 Sending notification:', notificationData);
      
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationData);
        
      if (notificationError) {
        console.error('❌ Notification error:', notificationError);
      } else {
        console.log('✅ Notification sent successfully');
      }

      toast({
        title: "Success!",
        description: "Accomplishment Report submitted successfully.",
      });

      // Reset form and go to Dashboard
      setAccomplishmentActivityTitle("");
      setAccomplishmentGdriveLink("");
      setAccomplishmentErrors({ title: false, link: false });
      setCurrentEventIdForSubmission(null);
      setActiveNav("Dashboard");
    } catch (error: unknown) {
      console.error('Full error object:', error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Failed to submit accomplishment report. Please try again.';
      console.error('Error submitting accomplishment report:', message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleAccomplishmentCancel = () => {
    setAccomplishmentActivityTitle("");
    setAccomplishmentGdriveLink("");
    setAccomplishmentErrors({ title: false, link: false });
    setCurrentEventIdForSubmission(null);
    setActiveNav("Dashboard");
  };

  // Liquidation Report handlers
  const handleLiquidationSubmit = async (eventIdParam?: string) => {
    console.log('🔍 handleLiquidationSubmit called with:', {
      eventIdParam,
      currentEventIdForSubmission,
      willUse: eventIdParam || currentEventIdForSubmission
    });
    
    // Validate required fields
    const errors = {
      title: !liquidationActivityTitle,
      link: !liquidationGdriveLink || !isValidGdriveLink(liquidationGdriveLink)
    };

    setLiquidationErrors(errors);

    if (errors.title || errors.link) {
      console.log('❌ Validation failed:', errors);
      return;
    }
    
    try {
      // Use the parameter if provided, otherwise use state
      const eventIdToLink = eventIdParam || currentEventIdForSubmission;
      
      // Validate UUID format - must be a valid UUID or null
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validEventId = eventIdToLink && uuidRegex.test(eventIdToLink) ? eventIdToLink : null;
      
      if (eventIdToLink && !validEventId) {
        console.warn('⚠️ WARNING: Invalid UUID format detected:', eventIdToLink, '- Setting event_id to null');
      }
      
      // LSG submits to USG
      const targetOrg = 'USG';

      // Debug: Log the values being submitted
      console.log('✅ Submitting Liquidation Report with:', {
        liquidationActivityTitle,
        liquidationGdriveLink,
        eventIdToLink: validEventId,
        targetOrg,
        originalEventId: eventIdToLink,
        wasValid: validEventId !== null
      });
      
      if (!validEventId) {
        console.warn('⚠️ WARNING: No valid event ID found! Submission will not be linked to any event.');
      }

      // Save submission to database
      const insertData = {
        organization: 'LSG',
        submission_type: 'Liquidation Report',
        activity_title: liquidationActivityTitle.trim(),
        activity_duration: 'N/A',
        activity_venue: 'N/A',
        activity_participants: 'N/A',
        activity_funds: 'N/A',
        activity_budget: 'N/A',
        activity_sdg: 'N/A',
        activity_likha: 'N/A',
        file_url: liquidationGdriveLink.trim(),
        file_name: 'GDrive Link',
        gdrive_link: liquidationGdriveLink.trim(),
        status: 'Pending',
        submitted_to: targetOrg,
        event_id: validEventId
      };
      
      console.log('Insert data:', insertData);

      const { data: submissionData, error: dbError } = await supabase
        .from('submissions')
        .insert(insertData)
        .select('id')
        .single();

      console.log('📊 Database response:', {
        data: submissionData,
        error: dbError
      });

      if (dbError) {
        console.error('❌ DB Error details:', JSON.stringify(dbError, null, 2));
        throw new Error(dbError.message || 'Database error occurred');
      }
      
      console.log('✅ Submission saved successfully with ID:', submissionData?.id);

      // Check if this is a revision for an existing "For Revision" submission
      // If so, update the old "For Revision" submission status appropriately
      await updateRevisionStatus(liquidationActivityTitle.trim(), 'Liquidation Report');

      // Send notification
      const notificationData = {
        event_id: eventIdToLink || null,
        event_title: 'Liquidation Report Submitted',
        event_description: `LSG has submitted a Liquidation Report for "${liquidationActivityTitle}". Please review it.`,
        created_by: 'LSG',
        target_org: targetOrg
      };
      
      console.log('📬 Sending notification:', notificationData);
      
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationData);
        
      if (notificationError) {
        console.error('❌ Notification error:', notificationError);
      } else {
        console.log('✅ Notification sent successfully');
      }

      toast({
        title: "Success!",
        description: "Liquidation Report submitted successfully.",
      });

      // Reset form and go to Dashboard
      setLiquidationActivityTitle("");
      setLiquidationGdriveLink("");
      setLiquidationErrors({ title: false, link: false });
      setCurrentEventIdForSubmission(null);
      setActiveNav("Dashboard");

    } catch (error: unknown) {
      console.error('Full error object:', error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Failed to submit liquidation report. Please try again.';
      console.error('Error submitting liquidation report:', message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleLiquidationCancel = () => {
    setLiquidationActivityTitle("");
    setLiquidationGdriveLink("");
    setLiquidationErrors({ title: false, link: false });
    setCurrentEventIdForSubmission(null);
    setActiveNav("Dashboard");
  };

  // Render Activity Logs Section
  if (activeNav === "Activity Logs") {
    const getStatusColor = (status: string) => {
      switch (status) {
        case "Submitted":
          return "bg-blue-100 text-blue-800";
        case "Pending":
          return "bg-yellow-100 text-yellow-800";
        case "For Revision":
          return "bg-orange-100 text-orange-800";
        case "Approved":
          return "bg-green-100 text-green-800";
        case "Rejected":
          return "bg-red-100 text-red-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    };

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
          } lg:translate-x-0 fixed lg:relative w-72 h-screen text-white flex flex-col shadow-xl transition-transform duration-300 z-40`}
          style={{ backgroundColor: "#003b27" }}
        >
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div
                className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10"
                style={{ ringColor: "#d4af37" }}
              >
                <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold leading-tight" style={{ color: "#d4af37" }}>
                  LSG
                </h1>
                <p className="text-xs text-white/60 mt-1">Local Student Government</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            {navItems.map((item) => (
              <Button
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full justify-start mb-2 text-left font-semibold transition-all whitespace-normal text-sm leading-tight py-3 h-auto ${
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
          </nav>
          <div className="px-4 pb-6 border-t border-white/10 pt-4">
            <Button
              onClick={() => setIsLogoutDialogOpen(true)}
              className="w-full justify-start text-left font-semibold transition-all text-white hover:bg-red-600"
              variant="ghost"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto pt-16 lg:pt-0">
          <div className="p-4 lg:p-8">
            <div className="flex justify-between items-center mb-6 lg:mb-8">
              <h2
                className="text-2xl lg:text-4xl font-bold"
                style={{ color: "#003b27" }}
              >
                Activity Logs
              </h2>
              {activityLogs.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="text-sm"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Do you want to delete all of your activity logs? This action cannot be undone and will permanently remove all your submitted files.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          try {
                            // Step 1: Soft-delete approved Accomplishment/Liquidation submissions
                            // to prevent deadlines from reappearing in the calendar
                            await supabase
                              .from("submissions")
                              .update({
                                status: 'Deleted (Previously Approved)',
                                file_url: null,
                                file_name: null,
                                gdrive_link: null
                              })
                              .eq("organization", "LSG")
                              .eq("status", "Approved")
                              .in("submission_type", ["Accomplishment Report", "Liquidation Report"]);

                            // Step 2: Hard-delete all remaining non-soft-deleted submissions
                            const { error } = await supabase
                              .from("submissions")
                              .delete()
                              .eq("organization", "LSG")
                              .neq("status", "Deleted (Previously Approved)");

                            if (error) throw error;

                            // Real-time update: Clear the activity logs immediately
                            setActivityLogs([]);

                            toast({
                              title: "Success",
                              description: "All your activity logs have been deleted.",
                            });
                          } catch (err: unknown) {
                            const message =
                              err instanceof Error ? err.message : "Unknown error";
                            console.error("Error deleting logs:", message);
                            toast({
                              title: "Error",
                              description: message,
                              variant: "destructive",
                            });
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            
            {/* Tabs */}
            <div className="mb-6">
              <Tabs value={activityLogsTab} onValueChange={(value) => setActivityLogsTab(value as any)}>
                <TabsList className="grid w-full grid-cols-4 max-w-2xl">
                  <TabsTrigger value="my-logs">My Logs</TabsTrigger>
                  <TabsTrigger value="ar-lr">AR/LR Report</TabsTrigger>
                  <TabsTrigger value="request">Request to Conduct</TabsTrigger>
                  <TabsTrigger value="appeal">Letter of Appeal</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {/* Activity Logs Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: "#003b27" }}>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Document</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Request to Conduct</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Accomplishment</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Liquidation</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Letter of Appeal</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Date Submitted</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">COA Action/Comment</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(() => {
                      // Filter logs based on active tab
                      let filteredLogs = activityLogs;
                      if (activityLogsTab === "ar-lr") {
                        filteredLogs = activityLogs.filter(log => 
                          log.type === 'Accomplishment Report' || log.type === 'Liquidation Report'
                        );
                      } else if (activityLogsTab === "request") {
                        filteredLogs = activityLogs.filter(log => 
                          log.type === 'Request to Conduct Activity'
                        );
                      } else if (activityLogsTab === "appeal") {
                        filteredLogs = activityLogs.filter(log => 
                          log.type === 'Letter of Appeal'
                        );
                      }
                      
                      if (filteredLogs.length === 0) {
                        return (
                          <tr>
                            <td colSpan={9} className="px-6 py-8 text-center text-gray-500 italic">
                              No activity logs yet. Submissions will appear here once they are made.
                            </td>
                          </tr>
                        );
                      }
                      
                      // Group logs by activity title
                      const grouped: Record<string, { 
                        requestToConduct?: any; 
                        accomplishment?: any; 
                        liquidation?: any; 
                        letterOfAppeal?: any 
                      }> = {};
                      filteredLogs.forEach(log => {
                        const key = log.documentName;
                        if (!grouped[key]) grouped[key] = {};
                        if (log.type === 'Request to Conduct Activity') grouped[key].requestToConduct = log;
                        else if (log.type === 'Accomplishment Report') grouped[key].accomplishment = log;
                        else if (log.type === 'Liquidation Report') grouped[key].liquidation = log;
                        else if (log.type === 'Letter of Appeal') grouped[key].letterOfAppeal = log;
                      });

                        return Object.entries(grouped).map(([activityTitle, docs]) => {
                          const log = docs.requestToConduct || docs.accomplishment || docs.liquidation || docs.letterOfAppeal;
                          if (!log) return null;

                          return (
                            <tr key={activityTitle} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm text-gray-900 font-medium">{activityTitle}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {docs.requestToConduct ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className={`inline-flex w-fit px-1.5 py-0.5 rounded-full text-[9px] font-medium ${getStatusColor(docs.requestToConduct.status)}`}>
                                      {docs.requestToConduct.status === 'Approved' && docs.requestToConduct.approvedBy ? `✓ ${docs.requestToConduct.approvedBy}` :
                                       docs.requestToConduct.status === 'Pending' ? '⏳ Pending' :
                                       docs.requestToConduct.status}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-[10px] h-6 px-2 border-[#003b27] text-[#003b27] hover:bg-[#003b27] hover:text-white mt-0.5"
                                      onClick={async () => {
                                         const { data: allSubs } = await supabase.from('submissions').select('*').eq('activity_title', activityTitle).eq('organization', log.organization);
                                         const gd: any = { ...log, isGroupedView: true, allSubmissions: allSubs || [] };
                                         allSubs?.forEach(sub => {
                                           if (sub.submission_type === 'Request to Conduct Activity') gd.rtcData = sub;
                                           else if (sub.submission_type === 'Accomplishment Report') gd.accomplishmentData = sub;
                                           else if (sub.submission_type === 'Liquidation Report') gd.liquidationData = sub;
                                           else if (sub.submission_type === 'Letter of Appeal') gd.loaData = sub;
                                         });
                                         setSelectedLog(gd); setIsLogDetailOpen(true);
                                       }}
                                    ><Eye className="h-3 w-3 mr-0.5" />View</Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {docs.accomplishment ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className={`inline-flex w-fit px-1.5 py-0.5 rounded-full text-[9px] font-medium ${getStatusColor(docs.accomplishment.status)}`}>
                                      {docs.accomplishment.status === 'Approved' && docs.accomplishment.approvedBy ? `✓ ${docs.accomplishment.approvedBy}` :
                                       docs.accomplishment.status === 'Pending' ? '⏳ Pending' :
                                       docs.accomplishment.status}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-[10px] h-6 px-2 border-[#003b27] text-[#003b27] hover:bg-[#003b27] hover:text-white mt-0.5"
                                      onClick={async () => {
                                         const { data: allSubs } = await supabase.from('submissions').select('*').eq('activity_title', activityTitle).eq('organization', log.organization);
                                         const gd: any = { ...log, isGroupedView: true, allSubmissions: allSubs || [] };
                                         allSubs?.forEach(sub => {
                                           if (sub.submission_type === 'Request to Conduct Activity') gd.rtcData = sub;
                                           else if (sub.submission_type === 'Accomplishment Report') gd.accomplishmentData = sub;
                                           else if (sub.submission_type === 'Liquidation Report') gd.liquidationData = sub;
                                           else if (sub.submission_type === 'Letter of Appeal') gd.loaData = sub;
                                         });
                                         setSelectedLog(gd); setIsLogDetailOpen(true);
                                       }}
                                    ><Eye className="h-3 w-3 mr-0.5" />View</Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {docs.liquidation ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className={`inline-flex w-fit px-1.5 py-0.5 rounded-full text-[9px] font-medium ${getStatusColor(docs.liquidation.status)}`}>
                                      {docs.liquidation.status === 'Approved' && docs.liquidation.approvedBy ? `✓ ${docs.liquidation.approvedBy}` :
                                       docs.liquidation.status === 'Pending' ? '⏳ Pending' :
                                       docs.liquidation.status}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-[10px] h-6 px-2 border-[#003b27] text-[#003b27] hover:bg-[#003b27] hover:text-white mt-0.5"
                                      onClick={async () => {
                                         const { data: allSubs } = await supabase.from('submissions').select('*').eq('activity_title', activityTitle).eq('organization', log.organization);
                                         const gd: any = { ...log, isGroupedView: true, allSubmissions: allSubs || [] };
                                         allSubs?.forEach(sub => {
                                           if (sub.submission_type === 'Request to Conduct Activity') gd.rtcData = sub;
                                           else if (sub.submission_type === 'Accomplishment Report') gd.accomplishmentData = sub;
                                           else if (sub.submission_type === 'Liquidation Report') gd.liquidationData = sub;
                                           else if (sub.submission_type === 'Letter of Appeal') gd.loaData = sub;
                                         });
                                         setSelectedLog(gd); setIsLogDetailOpen(true);
                                       }}
                                    ><Eye className="h-3 w-3 mr-0.5" />View</Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {docs.letterOfAppeal ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className={`inline-flex w-fit px-1.5 py-0.5 rounded-full text-[9px] font-medium ${getStatusColor(docs.letterOfAppeal.status)}`}>
                                      {docs.letterOfAppeal.status === 'Approved' && docs.letterOfAppeal.approvedBy ? `✓ ${docs.letterOfAppeal.approvedBy}` :
                                       docs.letterOfAppeal.status === 'Pending' ? '⏳ Pending' :
                                       docs.letterOfAppeal.status}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-[10px] h-6 px-2 border-[#003b27] text-[#003b27] hover:bg-[#003b27] hover:text-white mt-0.5"
                                      onClick={async () => {
                                         const { data: allSubs } = await supabase.from('submissions').select('*').eq('activity_title', activityTitle).eq('organization', log.organization);
                                         const gd: any = { ...log, isGroupedView: true, allSubmissions: allSubs || [] };
                                         allSubs?.forEach(sub => {
                                           if (sub.submission_type === 'Request to Conduct Activity') gd.rtcData = sub;
                                           else if (sub.submission_type === 'Accomplishment Report') gd.accomplishmentData = sub;
                                           else if (sub.submission_type === 'Liquidation Report') gd.liquidationData = sub;
                                           else if (sub.submission_type === 'Letter of Appeal') gd.loaData = sub;
                                         });
                                         setSelectedLog(gd); setIsLogDetailOpen(true);
                                       }}
                                    ><Eye className="h-3 w-3 mr-0.5" />View</Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{log.date}</td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                                  {log.status === 'Approved' && log.approvedBy ? `Approved by ${log.approvedBy}` : log.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                <div className="flex flex-col gap-1 max-w-xs">
                                  {log.coaAction && (
                                    <span className="font-semibold text-[#003b27]">Opinion: {log.coaAction}</span>
                                  )}
                                  {log.coaComment && (
                                    <span className="text-gray-500 text-xs italic break-words whitespace-pre-wrap">{log.coaComment}</span>
                                  )}
                                  {!log.coaAction && !log.coaComment && (
                                    <span className="text-gray-400 italic">No action yet</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                                    onClick={() => {
                                      setLogToDelete(log);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Log Detail Dialog */}
        <Dialog open={isLogDetailOpen} onOpenChange={setIsLogDetailOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold" style={{ color: "#003b27" }}>
                Activity Details
              </DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedLog.status)}`}>
                    {selectedLog.status}
                  </span>
                </div>

                {selectedLog.status === 'For Revision' && selectedLog.revisionReason && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-orange-800 font-medium mb-2">Revision Required</p>
                    <p className="text-gray-700 mb-3">
                      You are advised to revise your {selectedLog.type === 'Accomplishment Report' ? 'accomplishment report' : selectedLog.type === 'Liquidation Report' ? 'liquidation report' : 'request to conduct activity'} due to the following reasons:
                    </p>
                    
                    <div className="mt-2 p-3 bg-white border rounded">
                      <p className="text-gray-800 whitespace-pre-wrap">{selectedLog.revisionReason}</p>
                    </div>
                    
                    <p className="text-sm text-gray-600 italic mt-3">
                      Please stay updated for further announcements.
                    </p>
                  </div>
                )}

                {selectedLog.status === 'Rejected' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium mb-2">Request Rejected</p>
                    <p className="text-gray-700 mb-3">
                      Your {selectedLog.type === 'Accomplishment Report' ? 'accomplishment report' : selectedLog.type === 'Liquidation Report' ? 'liquidation report' : 'request to conduct activity'} has been rejected due to the following reason:
                    </p>
                    
                    <div className="mt-2 p-3 bg-white border rounded">
                      <p className="text-gray-800 whitespace-pre-wrap">{selectedLog.rejectionReason || 'No reason provided.'}</p>
                    </div>
                    
                    <p className="text-sm text-gray-600 italic mt-3">
                      Please contact the reviewing organization for more information.
                    </p>
                  </div>
                )}

                <div className="p-4 bg-[#003b27]/5 rounded-lg">
                  <h3 className="text-lg font-bold text-[#003b27]">{selectedLog.documentName}</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedLog.type}</p>
                </div>

                {selectedLog.type !== 'Accomplishment Report' && selectedLog.type !== 'Liquidation Report' && selectedLog.type !== 'Letter of Appeal' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-gray-500">Duration</p>
                      <p className="font-medium">{selectedLog.activity_duration}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-gray-500">Venue</p>
                      <p className="font-medium">{selectedLog.activity_venue}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-gray-500">Participants</p>
                      <p className="font-medium">{selectedLog.activity_participants}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-gray-500">Source of Funds</p>
                      <p className="font-medium">₱{selectedLog.activity_funds}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-gray-500">Budget</p>
                      <p className="font-medium">₱{selectedLog.activity_budget}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-gray-500">SDG</p>
                      <p className="font-medium">{selectedLog.activity_sdg}</p>
                    </div>
                    <div className="p-3 border rounded-lg col-span-2">
                      <p className="text-xs text-gray-500">LIKHA Agenda</p>
                      <p className="font-medium">{selectedLog.activity_likha}</p>
                    </div>
                  </div>
                )}

                {/* All Submitted Files Section */}
                {selectedLog.isGroupedView && (() => {
                  // Helper: render file list for a sub-submission with For Revision split view
                  const renderSubFiles = (subData: any, fileType: string, onDelete: () => void) => {
                    const splitParts = (value?: string | null) =>
                      (value || '')
                        .split('|')
                        .map(p => p.trim())
                        .filter(Boolean);

                    const fileNames = splitParts(subData?.file_name);
                    const fileUrls = splitParts(subData?.file_urls || subData?.file_url);
                    const count = Math.min(fileNames.length, fileUrls.length);
                    const files = Array.from({ length: count }, (_, i) => ({ name: fileNames[i], url: fileUrls[i] }));
                    if (files.length === 0) return null;

                    const isForRevision = subData.status === 'For Revision';
                    const frs: Record<string, string> = subData.file_revision_status || {};
                    const forRevisionFiles = isForRevision ? files.filter((f: {name: string; url: string}) => frs[f.url] === 'for_revision') : [];
                    const approvedFiles = isForRevision ? files.filter((f: {name: string; url: string}) => frs[f.url] !== 'for_revision') : files;

                    return (
                      <div className="p-4 border-2 border-dashed rounded-lg group hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[#003b27]" />
                            <p className="font-medium text-gray-800">{fileType}</p>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(subData.status)}`}>
                              {subData.status}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={onDelete}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {isForRevision ? (
                          <div className="space-y-3">
                            {/* FOR REVISION files */}
                            {forRevisionFiles.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 px-1">
                                  <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                                  <span className="text-xs font-bold text-red-600 uppercase tracking-wide">For Revision ({forRevisionFiles.length})</span>
                                </div>
                                <div className="space-y-2 border border-red-200 rounded-lg bg-red-50 p-2">
                                  {forRevisionFiles.map((file: {name: string; url: string}, idx: number) => {
                                    const labelPart = file.name.includes(':') ? file.name.split(':')[0].trim() : `File ${idx + 1}`;
                                    const fileNamePart = file.name.includes(':') ? file.name.split(':').slice(1).join(':').trim() : file.name;
                                    const isUploadingThis = revisionUploadFile?.fileUrl === file.url;
                                    return (
                                      <div key={idx} className="rounded-md border border-red-200 bg-white p-2 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="text-xs font-medium text-red-700 shrink-0">{labelPart}:</span>
                                            <span className="text-xs text-gray-600 truncate">{fileNamePart}</span>
                                          </div>
                                          <div className="flex gap-1.5 shrink-0">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="border-purple-400 text-purple-700 hover:bg-purple-50 text-xs h-7 px-2"
                                              onClick={() => { const ann = { url: file.url, name: file.name, submissionId: String(subData.id), revisionReason: subData.revision_reason }; setPreviewAnnotation(ann); setIsLogDetailOpen(false); setIsPreviewAnnotationOpen(true); }}
                                            >
                                              <Eye className="h-3 w-3 mr-1" />
                                              View Annotated
                                            </Button>
                                            {subData.organization === "LSG" && (
                                              <Button
                                                size="sm"
                                                className="bg-[#003b27] hover:bg-[#004d33] text-white text-xs h-7 px-2"
                                                onClick={() => setRevisionUploadFile({ submissionId: subData.id, fileUrl: file.url, fileName: file.name })}
                                              >
                                                <Upload className="h-3 w-3 mr-1" />
                                                Submit Revised
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        {isUploadingThis && (
                                          <div className="space-y-2 border-t border-red-100 pt-2">
                                            <input
                                              type="file"
                                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                              className="text-xs w-full"
                                              onChange={e => setRevisionUploadInput(e.target.files?.[0] || null)}
                                            />
                                            <div className="flex gap-2">
                                              <Button size="sm" variant="outline" onClick={() => { setRevisionUploadFile(null); setRevisionUploadInput(null); }}>
                                                Cancel
                                              </Button>
                                              <Button
                                                size="sm"
                                                className="bg-[#003b27] hover:bg-[#004d33] text-white"
                                                disabled={!revisionUploadInput || isUploadingRevision}
                                                onClick={() => handleRevisionFileUpload(subData)}
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
                              </div>
                            )}

                            {/* APPROVED files */}
                            {approvedFiles.length > 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 px-1">
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                  <span className="text-xs font-bold text-green-600 uppercase tracking-wide">Approved ({approvedFiles.length})</span>
                                </div>
                                <div className="space-y-1.5 border border-green-200 rounded-lg bg-green-50 p-2">
                                  {approvedFiles.map((file: {name: string; url: string}, idx: number) => {
                                    const labelPart = file.name.includes(':') ? file.name.split(':')[0].trim() : `File ${idx + 1}`;
                                    const fileNamePart = file.name.includes(':') ? file.name.split(':').slice(1).join(':').trim() : file.name;
                                    return (
                                      <div key={idx} className="flex items-center justify-between gap-3 p-2 bg-white rounded-md border border-green-200">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                          <span className="text-xs font-medium text-[#003b27] shrink-0">{labelPart}:</span>
                                          <span className="text-xs text-gray-600 truncate">{fileNamePart}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <a href={file.url} target="_blank" rel="noopener noreferrer">
                                            <Button size="sm" variant="outline" className="border-[#003b27] text-[#003b27] hover:bg-[#003b27]/10 text-xs h-7 px-2">
                                              <ExternalLink className="h-3 w-3 mr-1" />
                                              Open
                                            </Button>
                                          </a>
                                          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3" /> Approved
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {files.map((file: {name: string; url: string}, idx: number) => {
                              const labelPart = file.name.includes(':') ? file.name.split(':')[0].trim() : `File ${idx + 1}`;
                              const fileNamePart = file.name.includes(':') ? file.name.split(':').slice(1).join(':').trim() : file.name;
                              return (
                                <div key={idx} className="flex items-center justify-between gap-3 p-2 bg-gray-50 rounded-md border border-gray-200">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-xs font-medium text-[#003b27] shrink-0">{labelPart}:</span>
                                    <span className="text-xs text-gray-600 truncate">{fileNamePart}</span>
                                  </div>
                                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                    <Button size="sm" style={{ backgroundColor: "#003b27" }} className="text-xs h-7 px-2">
                                      Open
                                    </Button>
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  };

                  return (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 text-sm">All Submitted Files</h3>

                    {/* RTC File */}
                    {renderSubFiles(selectedLog.rtcData, 'Request to Conduct Activity', () => {
                      setFileToDelete({ id: selectedLog.rtcData.id, fileName: selectedLog.rtcData.file_name, fileType: 'Request to Conduct Activity', status: selectedLog.rtcData.status });
                      setIsFileDeleteDialogOpen(true);
                    })}

                    {/* Accomplishment Report File */}
                    {renderSubFiles(selectedLog.accomplishmentData, 'Accomplishment Report', () => {
                      setFileToDelete({ id: selectedLog.accomplishmentData.id, fileName: selectedLog.accomplishmentData.file_name, fileType: 'Accomplishment Report', status: selectedLog.accomplishmentData.status });
                      setIsFileDeleteDialogOpen(true);
                    })}

                    {/* Liquidation Report File */}
                    {renderSubFiles(selectedLog.liquidationData, 'Liquidation Report', () => {
                      setFileToDelete({ id: selectedLog.liquidationData.id, fileName: selectedLog.liquidationData.file_name, fileType: 'Liquidation Report', status: selectedLog.liquidationData.status });
                      setIsFileDeleteDialogOpen(true);
                    })}

                    {/* Letter of Appeal File */}
                    {renderSubFiles(selectedLog.loaData, 'Letter of Appeal', async () => {
                      try {
                        const { error } = await supabase.from('submissions').delete().eq('id', selectedLog.loaData.id);
                        if (error) throw error;
                        toast({ title: "Success", description: "File deleted successfully." });
                        setIsLogDetailOpen(false);
                        reloadActivityLogs();
                      } catch (error) {
                        console.error('Error deleting file:', error);
                        toast({ title: "Error", description: "Failed to delete file.", variant: "destructive" });
                      }
                    })}

                    {/* Show message if no files */}
                    {!selectedLog.rtcData?.file_url && 
                     !selectedLog.accomplishmentData?.file_url && 
                     !selectedLog.liquidationData?.file_url && 
                     !selectedLog.loaData?.file_url && (
                      <div className="p-8 text-center text-gray-400 border-2 border-dashed rounded-lg">
                        <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No files submitted yet</p>
                      </div>
                    )}
                  </div>
                  );
                })()}

                {/* Single File View - for non-grouped logs */}
                {!selectedLog.isGroupedView && (
                  <div className="p-4 border-2 border-dashed rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">
                          {selectedLog.type === 'Letter of Appeal' ? 'File for Appeal' : 
                           selectedLog.type === 'Accomplishment Report' ? 'Accomplishment Report File' :
                           selectedLog.type === 'Liquidation Report' ? 'Liquidation Report File' :
                           'Google Drive Folder Link'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {selectedLog.type === 'Request to Conduct Activity' ? 'Contains: Endorsement Letter, Letter to Conduct, Activity Design' : 'View submitted file'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={selectedLog.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" style={{ backgroundColor: "#003b27" }}>
                            Open Link
                          </Button>
                        </a>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setFileToDelete({
                              id: selectedLog.id,
                              fileName: selectedLog.fileName || 'Untitled',
                              fileType: selectedLog.type,
                              status: selectedLog.status
                            });
                            setIsFileDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLogDetailOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Render Officers Section
  if (activeNav === "Officers") {
    return (
      <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Button
          className="lg:hidden fixed top-4 left-4 z-50 rounded-full w-12 h-12 shadow-lg"
          style={{ backgroundColor: "#003b27" }}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="h-6 w-6" style={{ color: "#d4af37" }} />
        </Button>

        <div
          className={`${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:relative w-72 h-full text-white flex flex-col shadow-xl transition-transform duration-300 z-40`}
          style={{ backgroundColor: "#003b27" }}
        >
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div
                className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10"
                style={{ ringColor: "#d4af37" }}
              >
                <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold leading-tight" style={{ color: "#d4af37" }}>
                  LSG
                </h1>
                <p className="text-xs text-white/60 mt-1">Local Student Government</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            {navItems.map((item) => (
              <Button
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full justify-start mb-2 text-left font-semibold transition-all whitespace-normal text-sm leading-tight py-3 h-auto ${
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
          </nav>

          <div className="px-4 pb-6 border-t border-white/10 pt-4">
            <Button
              onClick={() => setIsLogoutDialogOpen(true)}
              className="w-full justify-start text-left font-semibold transition-all text-white hover:bg-red-600"
              variant="ghost"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        <div className="flex-1 overflow-auto pt-16 lg:pt-0">
          <div className="p-4 lg:p-8">
            <h2
              className="text-2xl lg:text-4xl font-bold mb-6 lg:mb-8"
              style={{ color: "#003b27" }}
            >
              Officers & Advisers
            </h2>

            <div className="space-y-8">
              {/* Advisers Section - FIRST */}
              <Card
                className="p-8 shadow-xl border-t-4"
                style={{ borderTopColor: "#d4af37" }}
              >
                <h3
                  className="text-2xl font-bold mb-6"
                  style={{ color: "#003b27" }}
                >
                  Advisers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {advisers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 col-span-full">
                      No advisers added yet
                    </p>
                  ) : (
                    advisers.map((adviser) => (
                      <div
                        key={adviser.id}
                        className="p-6 rounded-lg border-2 bg-white shadow-md hover:shadow-lg transition-all"
                        style={{ borderColor: "#d4af37" }}
                      >
                        {adviser.image && (
                          <img
                            src={adviser.image}
                            alt={adviser.name}
                            className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4"
                            style={{ borderColor: "#003b27" }}
                          />
                        )}
                        <div className="text-center">
                          <h4 className="font-bold text-lg mb-1">
                            {adviser.name}
                          </h4>
                          <p className="text-gray-600 text-sm">
                            {adviser.position}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Officers Section - SECOND */}
              <Card
                className="p-8 shadow-xl border-t-4"
                style={{ borderTopColor: "#d4af37" }}
              >
                <h3
                  className="text-2xl font-bold mb-6"
                  style={{ color: "#003b27" }}
                >
                  Officers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {officers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 col-span-full">
                      No officers added yet
                    </p>
                  ) : (
                    officers.map((officer) => (
                      <div
                        key={officer.id}
                        className="p-6 rounded-lg border-2 bg-white shadow-md hover:shadow-lg transition-all"
                        style={{ borderColor: "#d4af37" }}
                      >
                        {officer.image && (
                          <img
                            src={officer.image}
                            alt={officer.name}
                            className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4"
                            style={{ borderColor: "#003b27" }}
                          />
                        )}
                        <div className="text-center">
                          <h4 className="font-bold text-lg mb-1">
                            {officer.name}
                          </h4>
                          <p className="text-gray-600 text-sm">
                            {officer.position}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Social Media & Contact - THIRD */}
              <Card
                className="p-8 shadow-xl border-t-4"
                style={{ borderTopColor: "#d4af37" }}
              >
                <h3
                  className="text-2xl font-bold mb-6"
                  style={{ color: "#003b27" }}
                >
                  Social Media & Contact
                </h3>
                <div className="space-y-4">
                  {platforms.facebook && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <Label className="text-base font-medium mb-2 block">
                        Facebook Page
                      </Label>
                      <a
                        href={platforms.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        {platforms.facebook}
                      </a>
                    </div>
                  )}
                  {contactEmail && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <Label className="text-base font-medium mb-2 block">
                        Contact Email
                      </Label>
                      <a
                        href={`mailto:${contactEmail}`}
                        className="text-green-600 hover:underline font-semibold"
                      >
                        {contactEmail}
                      </a>
                    </div>
                  )}
                  {contactPhone && (
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <Label className="text-base font-medium mb-2 block">
                        Contact Phone
                      </Label>
                      <a
                        href={`tel:${contactPhone}`}
                        className="text-purple-600 hover:underline font-semibold"
                      >
                        {contactPhone}
                      </a>
                    </div>
                  )}
                  {!platforms.facebook && !contactEmail && !contactPhone && (
                    <p className="text-gray-500 text-center py-8">
                      No contact information added yet
                    </p>
                  )}
                </div>
              </Card>

              {/* Documents Section */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card
                  className="p-8 shadow-lg border-l-4"
                  style={{ borderLeftColor: "#d4af37" }}
                >
                  <h3
                    className="text-xl font-bold mb-4"
                    style={{ color: "#003b27" }}
                  >
                    Budget Proposal
                  </h3>
                  {/* Previously uploaded documents */}
                  {savedDocuments.budget_proposal.length > 0 && (
                    <div className="mb-4 space-y-2">
                      <p className="text-sm font-medium text-gray-700">Uploaded Documents:</p>
                      {savedDocuments.budget_proposal.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <FileText className="h-4 w-4" />
                            {doc.file_name}
                          </a>
                          <button
                            type="button"
                            onClick={() => confirmDeleteDocument(doc.id, doc.file_name)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                        setBudgetProposalFiles(prev => [...prev, ...Array.from(files)]);
                      }
                    }}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">You can upload multiple PDF files</p>
                  {budgetProposalFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium text-gray-600">New files to upload:</p>
                      {budgetProposalFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <span className="text-sm text-gray-600">✓ {file.name}</span>
                          <button
                            type="button"
                            onClick={() => setBudgetProposalFiles(prev => prev.filter((_, i) => i !== index))}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card
                  className="p-8 shadow-lg border-l-4"
                  style={{ borderLeftColor: "#d4af37" }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <h3
                      className="text-xl font-bold"
                      style={{ color: "#003b27" }}
                    >
                      COA Transitional Document
                    </h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-gray-500 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold mb-1">Required Documents:</p>
                          <ul className="list-disc pl-4 space-y-1 text-sm">
                            <li>Financial statement (previous admin)</li>
                            <li>Statement of Account / Certificate of No Bank Account</li>
                            <li>Treasurer's Report</li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {/* Previously uploaded documents */}
                  {savedDocuments.coa_transitional.length > 0 && (
                    <div className="mb-4 space-y-2">
                      <p className="text-sm font-medium text-gray-700">Uploaded Documents:</p>
                      {savedDocuments.coa_transitional.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <FileText className="h-4 w-4" />
                            {doc.file_name}
                          </a>
                          <button
                            type="button"
                            onClick={() => confirmDeleteDocument(doc.id, doc.file_name)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                        setCoaTransitionalFiles(prev => [...prev, ...Array.from(files)]);
                      }
                    }}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">You can upload multiple PDF files</p>
                  {coaTransitionalFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium text-gray-600">New files to upload:</p>
                      {coaTransitionalFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <span className="text-sm text-gray-600">✓ {file.name}</span>
                          <button
                            type="button"
                            onClick={() => setCoaTransitionalFiles(prev => prev.filter((_, i) => i !== index))}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Save Profile Button */}
              <div className="mt-8">
                <Button
                  onClick={handleSaveProfile}
                  className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                  style={{ backgroundColor: "#003b27" }}
                >
                  Save Profile
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle style={{ color: "#003b27" }}>
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
  }

  // Render Organizations Section
  if (activeNav === "Organizations") {
    return (
      <OrganizationsPage
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        sidebarTitle="Local Student Government"
        navItems={navItems}
      />
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Button
        className="lg:hidden fixed top-4 left-4 z-50 rounded-full w-12 h-12 shadow-lg"
        style={{ backgroundColor: "#003b27" }}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-6 w-6" style={{ color: "#d4af37" }} />
      </Button>

      <div
        className={`${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:relative w-72 h-full text-white flex flex-col shadow-xl transition-transform duration-300 z-40`}
        style={{ backgroundColor: "#003b27" }}
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div
              className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10"
              style={{ ringColor: "#d4af37" }}
            >
              <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold leading-tight" style={{ color: "#d4af37" }}>
                Local Student Government
              </h1>
              <p className="text-xs text-white/60 mt-1">Management System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6">
          {navItems.map((item) => (
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
                activeNav === item
                  ? { backgroundColor: "#d4af37" }
                  : undefined
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

      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      <div className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          {activeNav === "Request to Conduct Activity" ? (
            <div className="max-w-4xl mx-auto">
              <h2
                className="text-2xl lg:text-3xl font-bold text-center mb-8"
                style={{ color: "#003b27" }}
              >
                REQUEST TO CONDUCT ACTIVITY
              </h2>



              {hasMissedDeadline && (
                <div className="mb-6 p-4 rounded-lg border bg-red-50 border-red-300">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-800 mb-1">Unsubmitted Reports</p>
                      <p className="text-sm text-red-700">
                        You have unsubmitted accomplishment or liquidation reports past their due date. Please submit all pending reports before your next activity request.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Card className="p-6 lg:p-8 shadow-xl border-t-4" style={{ borderTopColor: "#d4af37" }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Activity Title */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Activity Title :</Label>
                    <Input
                      value={activityTitle}
                      onChange={(e) => setActivityTitle(e.target.value)}
                      className="border-gray-300 focus:border-[#003b27] focus:ring-[#003b27]"
                    />
                    {activityErrors.title && (
                      <p className="text-red-500 text-xs mt-1">Please fill up this field</p>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Duration :</Label>
                    <Input
                      value={activityDuration}
                      onChange={(e) => setActivityDuration(e.target.value)}
                      className="border-gray-300 focus:border-[#003b27] focus:ring-[#003b27]"
                    />
                    {activityErrors.duration && (
                      <p className="text-red-500 text-xs mt-1">Please fill up this field</p>
                    )}
                  </div>

                  {/* Venue/Platform */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Venue/Platform :</Label>
                    <Input
                      value={activityVenue}
                      onChange={(e) => setActivityVenue(e.target.value)}
                      className="border-gray-300 focus:border-[#003b27] focus:ring-[#003b27]"
                    />
                    {activityErrors.venue && (
                      <p className="text-red-500 text-xs mt-1">Please fill up this field</p>
                    )}
                  </div>

                  {/* Target Participants */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Target Participants :</Label>
                    <Select value={activityParticipants} onValueChange={setActivityParticipants}>
                      <SelectTrigger className="border-gray-300 focus:border-[#003b27] focus:ring-[#003b27]">
                        <SelectValue placeholder="Select number of participants" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1 to 50 participants">1 to 50 participants</SelectItem>
                        <SelectItem value="51 to 100 participants">51 to 100 participants</SelectItem>
                        <SelectItem value="100 to 200 participants">100 to 200 participants</SelectItem>
                        <SelectItem value="200 to 500 participants">200 to 500 participants</SelectItem>
                        <SelectItem value="500 to 1000 participants">500 to 1000 participants</SelectItem>
                        <SelectItem value="1000+ participants">1000+ participants</SelectItem>
                      </SelectContent>
                    </Select>
                    {activityErrors.participants && (
                      <p className="text-red-500 text-xs mt-1">Please fill up this field</p>
                    )}
                  </div>

                  {/* Source of Funds */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Source of Funds:</Label>
                    <Input
                      value={activityFunds}
                      onChange={(e) => setActivityFunds(e.target.value)}
                      className="border-gray-300 focus:border-[#003b27] focus:ring-[#003b27]"
                    />
                    {activityErrors.funds && (
                      <p className="text-red-500 text-xs mt-1">Please fill up this field</p>
                    )}
                  </div>

                  {/* Budgetary Requirements */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Budgetary Requirements :</Label>
                    <Input
                      value={activityBudget}
                      onChange={(e) => setActivityBudget(e.target.value)}
                      className="border-gray-300 focus:border-[#003b27] focus:ring-[#003b27]"
                    />
                    {activityErrors.budget && (
                      <p className="text-red-500 text-xs mt-1">Please fill up this field</p>
                    )}
                  </div>

                  {/* SDG's */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">SDG's</Label>
                    <Select value={activitySDG} onValueChange={setActivitySDG}>
                      <SelectTrigger className="border-gray-300 focus:border-[#003b27] focus:ring-[#003b27]">
                        <SelectValue placeholder="Select SDG" />
                      </SelectTrigger>
                      <SelectContent>
                        {sdgOptions.map((sdg) => (
                          <SelectItem key={sdg} value={sdg}>
                            {sdg}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {activityErrors.sdg && (
                      <p className="text-red-500 text-xs mt-1">Please fill up this field</p>
                    )}
                  </div>

                  {/* LIKHA AGENDA */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">LIKHA AGENDA</Label>
                    <Select value={activityLIKHA} onValueChange={setActivityLIKHA}>
                      <SelectTrigger className="border-gray-300 focus:border-[#003b27] focus:ring-[#003b27]">
                        <SelectValue placeholder="Select LIKHA Agenda" />
                      </SelectTrigger>
                      <SelectContent>
                        {likhaOptions.map((likha) => (
                          <SelectItem key={likha} value={likha}>
                            {likha}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {activityErrors.likha && (
                      <p className="text-red-500 text-xs mt-1">Please fill up this field</p>
                    )}
                  </div>
                </div>

                {/* Upload Files Section */}
                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Upload Required Documents</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Endorsement Letter */}
                    <div className="space-y-2">
                      <label className="block cursor-pointer">
                        <div
                          className={`flex flex-col items-center justify-center gap-2 py-6 px-3 rounded-lg border-2 border-dashed transition-all hover:opacity-90 ${
                            endorsementLetterFile ? 'border-[#003b27] bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-[#003b27]'
                          }`}
                        >
                          <Upload className={`h-7 w-7 ${endorsementLetterFile ? 'text-[#003b27]' : 'text-gray-400'}`} />
                          <span className="text-xs font-semibold text-center text-gray-600">ENDORSEMENT LETTER</span>
                          {endorsementLetterFile ? (
                            <span className="text-xs text-[#003b27] text-center break-all line-clamp-2">{endorsementLetterFile.name}</span>
                          ) : (
                            <span className="text-xs text-gray-400">PDF file only</span>
                          )}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && !file.name.toLowerCase().endsWith('.pdf')) {
                              alert('Only PDF files are allowed.');
                              e.target.value = '';
                              return;
                            }
                            if (file) setEndorsementLetterFile(file);
                          }}
                        />
                      </label>
                    </div>

                    {/* Letter to Conduct */}
                    <div className="space-y-2">
                      <label className="block cursor-pointer">
                        <div
                          className={`flex flex-col items-center justify-center gap-2 py-6 px-3 rounded-lg border-2 border-dashed transition-all hover:opacity-90 ${
                            letterToConductFile ? 'border-[#003b27] bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-[#003b27]'
                          }`}
                        >
                          <Upload className={`h-7 w-7 ${letterToConductFile ? 'text-[#003b27]' : 'text-gray-400'}`} />
                          <span className="text-xs font-semibold text-center text-gray-600">LETTER TO CONDUCT</span>
                          {letterToConductFile ? (
                            <span className="text-xs text-[#003b27] text-center break-all line-clamp-2">{letterToConductFile.name}</span>
                          ) : (
                            <span className="text-xs text-gray-400">PDF file only</span>
                          )}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && !file.name.toLowerCase().endsWith('.pdf')) {
                              alert('Only PDF files are allowed.');
                              e.target.value = '';
                              return;
                            }
                            if (file) setLetterToConductFile(file);
                          }}
                        />
                      </label>
                    </div>

                    {/* Activity Design */}
                    <div className="space-y-2">
                      <label className="block cursor-pointer">
                        <div
                          className={`flex flex-col items-center justify-center gap-2 py-6 px-3 rounded-lg border-2 border-dashed transition-all hover:opacity-90 ${
                            activityDesignFile ? 'border-[#003b27] bg-green-50' : activityErrors.designFile ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50 hover:border-[#003b27]'
                          }`}
                        >
                          <Upload className={`h-7 w-7 ${activityDesignFile ? 'text-[#003b27]' : 'text-gray-400'}`} />
                          <span className="text-xs font-semibold text-center text-gray-600">ACTIVITY DESIGN</span>
                          {activityDesignFile ? (
                            <span className="text-xs text-[#003b27] text-center break-all line-clamp-2">{activityDesignFile.name}</span>
                          ) : (
                            <span className="text-xs text-gray-400">PDF file only</span>
                          )}
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && !file.name.toLowerCase().endsWith('.pdf')) {
                              alert('Only PDF files are allowed.');
                              e.target.value = '';
                              return;
                            }
                            if (file) setActivityDesignFile(file);
                          }}
                        />
                      </label>
                      {activityErrors.designFile && (
                        <p className="text-red-500 text-xs text-center">Required</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">* All documents are required.</p>
                  <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-800 mb-1">Required Documents:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-xs text-green-700">
                      <li>Endorsement Letter</li>
                      <li>Letter to Conduct</li>
                      <li>Activity Design</li>
                    </ul>
                  </div>
                </div>

                {/* Submit and Cancel Buttons */}
                <div className="flex gap-4 mt-8">
                  <Button
                    className="flex-1 py-3 text-white font-semibold"
                    style={{ backgroundColor: (hasPendingSubmission || hasMissedDeadline) ? "#9ca3af" : "#003b27" }}
                    onClick={handleSubmitActivity}
                    disabled={hasPendingSubmission || hasMissedDeadline}
                  >
                    SUBMIT
                  </Button>
                  <Button
                    className="flex-1 py-3 text-white font-semibold"
                    style={{ backgroundColor: "#ef4444" }}
                    onClick={handleCancelActivity}
                  >
                    CANCEL
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6 lg:mb-8">
                <h2
                  className="text-2xl lg:text-4xl font-bold"
                  style={{ color: "#003b27" }}
                >
                  Calendar
                </h2>
            <div className="flex items-center gap-3">
              <Popover
                open={showNotificationPopover}
                onOpenChange={setShowNotificationPopover}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full w-10 h-10 relative"
                    style={{ borderColor: "#d4af37", color: "#003b27" }}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-4" align="end">
                  <div className="flex items-center justify-between mb-3">
                    <h3
                      className="font-semibold text-lg"
                      style={{ color: "#003b27" }}
                    >
                      Notifications
                    </h3>
                    {notifications.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-blue-600 hover:text-blue-800 h-7 px-2"
                          onClick={async () => {
                            const unreadNotifs = notifications.filter(n => !n.isRead);
                            for (const notif of unreadNotifs) {
                              await supabase
                                .from('notification_read_status')
                                .insert({
                                  notification_id: notif.id,
                                  read_by: 'LSG'
                                });
                            }
                            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                            setUnreadCount(0);
                          }}
                        >
                          Mark all read
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-600 hover:text-red-800 h-7 px-2"
                          onClick={async () => {
                            for (const notif of notifications) {
                              await supabase
                                .from('notification_read_status')
                                .delete()
                                .eq('notification_id', notif.id)
                                .eq('read_by', 'LSG');
                            }
                            await supabase
                              .from('notifications')
                              .delete()
                              .in('id', notifications.map(n => n.id));
                            setNotifications([]);
                            setUnreadCount(0);
                          }}
                        >
                          Delete all
                        </Button>
                      </div>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No messages.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3 rounded-lg border ${notif.isRead ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="font-semibold text-sm" style={{ color: "#003b27" }}>
                                {notif.eventTitle}
                              </div>
                              {notif.eventDescription && (
                                <div className="text-xs text-gray-600 mt-1 whitespace-pre-line">
                                  {notif.eventDescription}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                Added by {notif.createdBy} on {new Date(notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              {!notif.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-blue-600 hover:text-blue-800 h-6 px-2"
                                  onClick={async () => {
                                    await supabase
                                      .from('notification_read_status')
                                      .insert({
                                        notification_id: notif.id,
                                        read_by: 'LSG'
                                      });
                                    setNotifications(prev => 
                                      prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n)
                                    );
                                    setUnreadCount(prev => Math.max(0, prev - 1));
                                  }}
                                >
                                  Read
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-red-600 hover:text-red-800 h-6 px-2"
                                onClick={async () => {
                                  await supabase
                                    .from('notification_read_status')
                                    .delete()
                                    .eq('notification_id', notif.id)
                                    .eq('read_by', 'LSG');
                                  await supabase
                                    .from('notifications')
                                    .delete()
                                    .eq('id', notif.id);
                                  setNotifications(prev => prev.filter(n => n.id !== notif.id));
                                  if (!notif.isRead) {
                                    setUnreadCount(prev => Math.max(0, prev - 1));
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-10 h-10"
                style={{ borderColor: "#d4af37", color: "#003b27" }}
              >
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Missed Deadline Warning */}
          {hasMissedDeadline && (
            <div className="mb-6 p-4 rounded-lg border bg-red-50 border-red-300">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-800 mb-1">Unsubmitted Reports</p>
                  <p className="text-sm text-red-700">
                    You have unsubmitted accomplishment or liquidation reports past their due date. Please submit all pending reports before your next activity request.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            <Card
              className="flex-1 p-4 lg:p-8 shadow-xl border-t-4"
              style={{ borderTopColor: "#d4af37" }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 lg:mb-6 gap-3">
                <div className="flex items-center gap-2 lg:gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setCurrentDate(
                        new Date(
                          currentDate.getFullYear(),
                          currentDate.getMonth() - 1,
                          1,
                        ),
                      )
                    }
                    className="hover:bg-gray-200"
                  >
                    <ChevronLeft
                      className="h-5 w-5"
                      style={{ color: "#003b27" }}
                    />
                  </Button>

                  <Popover
                    open={isMonthPickerOpen}
                    onOpenChange={setIsMonthPickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className="text-xl lg:text-3xl font-bold hover:bg-gray-100"
                        style={{ color: "#003b27" }}
                      >
                        {monthName} {year}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      {renderMonthPicker()}
                    </PopoverContent>
                  </Popover>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setCurrentDate(
                        new Date(
                          currentDate.getFullYear(),
                          currentDate.getMonth() + 1,
                          1,
                        ),
                      )
                    }
                    className="hover:bg-gray-200"
                  >
                    <ChevronRight
                      className="h-5 w-5"
                      style={{ color: "#003b27" }}
                    />
                  </Button>
                </div>

                <div className="flex gap-2 lg:gap-3">
                  <Button
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
                      setSelectedDate(today);
                    }}
                    className="font-semibold px-3 lg:px-6 transition-all hover:scale-105 hover:shadow-md text-xs lg:text-sm"
                    style={{
                      backgroundColor: "#d4af37",
                      color: "#003b27",
                    }}
                  >
                    INBOX
                  </Button>
                  <Button
                    size="sm"
                    className="font-semibold px-3 lg:px-6 transition-all hover:scale-105 hover:shadow-md text-xs lg:text-sm"
                    style={{
                      backgroundColor: "#003b27",
                      color: "#d4af37",
                    }}
                  >
                    EVENT
                  </Button>
                  <Button
                    size="icon"
                    className="rounded-full w-8 h-8 lg:w-10 lg:h-10 shadow-lg hover:shadow-xl transition-all"
                    style={{ backgroundColor: "#d4af37" }}
                  >
                    <Plus
                      className="h-4 w-4 lg:h-5 lg:w-5"
                      style={{ color: "#003b27" }}
                    />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 lg:gap-2 shadow-inner bg-gray-50 p-2 lg:p-4 rounded-lg overflow-x-auto">
                {renderCalendar()}
              </div>
            </Card>

            <Card
              className="w-full lg:w-80 p-4 lg:p-6 shadow-xl border-t-4"
              style={{ borderTopColor: "#d4af37" }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: '#d4af37' }}
                >
                  <svg className="w-5 h-5" style={{ color: '#003b27' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
                <div>
                  <h3
                    className="text-lg lg:text-xl font-bold"
                    style={{ color: "#003b27" }}
                  >
                    INBOX
                  </h3>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                    {selectedDate && selectedDate.toDateString() === new Date().toDateString() ? "Today" : "Selected Date"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-4 lg:mb-6 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-semibold text-gray-700">
                  {selectedDate
                    ? formatSelectedDate(selectedDate)
                    : "Select a date"}
                </span>
              </div>
              <div className="space-y-4 max-h-[400px] lg:max-h-none overflow-y-auto pr-1">
                {selectedDate && getEventsForDate(selectedDate).length > 0 ? (
                  getEventsForDate(selectedDate).map((event) => {
                    const dayNumber = getEventDayNumber(event, selectedDate);
                    const today = new Date();
                    const isToday = selectedDate.toDateString() === today.toDateString();
                    
                    // Professional deadline card styling
                    if (event.isDeadline) {
                      // Check if AO has submitted (submissionStatus is 'pending_review' from AO)
                      const aoHasSubmitted = event.submissionStatus === 'pending_review' || event.description?.includes('An organization has submitted');
                      
                      return (
                        <div
                          key={event.id}
                          className="rounded-xl overflow-hidden shadow-md bg-white"
                        >
                          {/* Header with orange gradient */}
                          <div 
                            className="px-4 py-3 flex items-center justify-between"
                            style={{ 
                              background: 'linear-gradient(to right, #ea580c, #fb923c)',
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-white font-bold text-sm uppercase tracking-wide">
                                {event.deadlineType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report'}
                              </span>
                            </div>
                            {aoHasSubmitted && (
                              <span className="text-white text-xs font-medium">Submitted</span>
                            )}
                          </div>
                          {/* Body content */}
                          <div className="p-4 bg-white">
                            <p className="font-semibold text-gray-800 mb-3">
                              {event.title}
                            </p>
                            
                            {aoHasSubmitted ? (
                              <div 
                                className="rounded-lg border-2 p-4"
                                style={{ 
                                  backgroundColor: '#fef3c7',
                                  borderColor: '#f59e0b'
                                }}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                                  <span className="text-sm font-bold uppercase tracking-wide text-orange-700">
                                    Pending Review
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 mb-1">
                                  You already submitted a {event.deadlineType} report for this activity.
                                </p>
                                <p className="text-sm text-orange-600">
                                  Please wait for further updates from your reviewing body.
                                </p>
                              </div>
                            ) : (
                              <div className="mt-3 p-4 border border-red-200 rounded-xl shadow-sm" style={{ backgroundColor: "transparent" }}>
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                  <span className="text-xs font-semibold uppercase tracking-wider text-red-600">Deadline Today</span>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-gray-700">
                                    <span className="font-bold" style={{ color: "#003b27" }}>{event.deadlineType === 'accomplishment' ? 'Accomplishment' : 'Liquidation'} Report Due</span>
                                  </p>
                                  <p className="text-xs text-gray-600 leading-relaxed">
                                    Today is the deadline for the submission of {event.deadlineType === 'accomplishment' ? 'Accomplishment' : 'Liquidation'} report
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs text-gray-500">Organization:</span>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                                      {event.targetOrganization === 'AO' ? 'Accredited Organizations' : event.targetOrganization === 'LSG' ? 'Local Student Government' : event.targetOrganization}
                                    </span>
                                  </div>
                                  {event.targetOrganization === 'LSG' && event.submissionStatus !== 'approved' && (
                                    <Button
                                      onClick={() => {
                                        console.log('🎯 Submit Here clicked for event:', {
                                          eventId: event.id,
                                          parentEventId: event.parentEventId,
                                          deadlineType: event.deadlineType,
                                          title: event.title
                                        });
                                        
                                        // Set the event ID for linking the submission
                                        setEventIdToLink(event.id);
                                        setCurrentEventIdForSubmission(event.id);
                                        
                                        // Pre-populate the activity title with the event title and navigate to the form
                                        if (event.deadlineType === 'accomplishment') {
                                          setAccomplishmentActivityTitle(event.title);
                                          setActiveNav('Accomplishment Report');
                                        } else if (event.deadlineType === 'liquidation') {
                                          setLiquidationActivityTitle(event.title);
                                          setActiveNav('Liquidation Report');
                                        }
                                      }}
                                      className="w-full mt-3 text-sm font-semibold rounded-lg hover:shadow-md transition-all"
                                      style={{ backgroundColor: "#003b27", color: "white" }}
                                    >
                                      Submit Here
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    // Regular event card styling
                    return (
                      <div
                        key={event.id}
                        className="rounded-xl overflow-hidden shadow-md border bg-white hover:shadow-lg transition-all"
                        style={{ borderColor: isToday ? '#d4af37' : '#e5e7eb' }}
                      >
                        <div 
                          className="px-4 py-3 flex items-center justify-between"
                          style={{ 
                            backgroundColor: isToday ? 'rgba(212, 175, 55, 0.15)' : 'rgba(0, 59, 39, 0.05)',
                            borderBottom: '3px solid #003b27'
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: '#003b27' }}
                            />
                            <span className="font-bold text-sm" style={{ color: '#003b27' }}>
                              {isToday ? 'Today' : 'Event'}
                            </span>
                          </div>
                          <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: "#d4af37", color: "#003b27" }}>
                            Day {dayNumber}
                          </span>
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-gray-800 text-base mb-2">
                            {event.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>
                              {event.startDate === event.endDate ? event.startDate : `${event.startDate} — ${event.endDate}`}
                            </span>
                          </div>
                          {!event.allDay && event.startTime && event.endTime && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{event.startTime} — {event.endTime}</span>
                            </div>
                          )}
                          {event.venue && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{event.venue}</span>
                            </div>
                          )}
                          {event.description && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-sm text-gray-600 leading-relaxed break-words whitespace-pre-wrap">
                                {event.description}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 lg:py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-400 font-medium">No events</p>
                    <p className="text-gray-300 text-sm mt-1">Select a date with events</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
            </>
          )}
        </div>
      </div>

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

      {/* Delete Document Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={isDeleteDocumentDialogOpen}
        onOpenChange={setIsDeleteDocumentDialogOpen}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        itemName={documentToDelete?.name}
        onConfirm={handleDeleteDocument}
      />

      {/* Annotation Viewer Dialog (read-only for submitter) */}
      <Dialog open={isPreviewAnnotationOpen} onOpenChange={(open) => { setIsPreviewAnnotationOpen(open); if (!open) setPreviewAnnotation(null); }}>
        <DialogContent className="max-w-5xl w-full h-[92vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b shrink-0">
            <DialogTitle className="text-sm font-medium truncate">
              {previewAnnotation?.name.includes(':') ? previewAnnotation.name.split(':')[0].trim() : previewAnnotation?.name}
            </DialogTitle>
            {previewAnnotation?.revisionReason && (
              <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1 mt-1">
                <span className="font-semibold">Revision note:</span> {previewAnnotation.revisionReason}
              </p>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {previewAnnotation && (
              <FileAnnotationViewer
                key={`${previewAnnotation.submissionId}-${previewAnnotation.url}`}
                url={previewAnnotation.url}
                fileName={previewAnnotation.name}
                submissionId={previewAnnotation.submissionId}
                initialAnnotateMode={false}
                readOnly={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
