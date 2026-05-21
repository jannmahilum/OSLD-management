import { useState, useEffect } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Bell,
  User,
  ArrowLeft,
  X,
  Search,
  CheckCircle,
  Edit2,
  Menu,
  Eye,
  EyeOff,
  LogOut,
  Upload,
  Users,
  Clock,
  MapPin,
  DollarSign,
  Target,
  Sparkles,
  Calendar,
  FileText,
  Download,
  AlertTriangle,
  Image as ImageIcon,
  Building2,
  ExternalLink,
  Trash2,
  Folder,
  Inbox,
  BarChart3,
  TrendingUp,
  Activity,
  List,
  LayoutGrid,
  Filter,
  RefreshCw,
  PieChart,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { format } from "date-fns";
import AccountsPage from "./AccountsPage";
import SubmissionsPage from "./SubmissionsPage";
import CreateAccountPage from "./CreateAccountPage";
import OrganizationsPage from "./OrganizationsPage";
import FileAnnotationViewer from "./FileAnnotationViewer";
import { supabase } from "../lib/supabase";
import { useToast } from "./ui/use-toast";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

// Deadline Notification Component for OSLD
const OSLDDeadlineNotification = ({ 
  deadlineType, 
  eventId, 
  targetOrg,
  onSubmitHere,
  setActiveNav,
  setActiveSubmissionTab
}: { 
  deadlineType: 'accomplishment' | 'liquidation', 
  eventId: string,
  targetOrg?: string,
  onSubmitHere?: () => void,
  setActiveNav?: (nav: string) => void,
  setActiveSubmissionTab?: (tab: string) => void
}) => {
  const [isSending, setIsSending] = useState(false);
  const [notified, setNotified] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const { toast } = useToast();

  const reportType = deadlineType === 'accomplishment' ? 'Accomplishment' : 'Liquidation';

  // Organization name mapping
  const orgNameMap: { [key: string]: string } = {
    "AO": "Accredited Organizations",
    "LSG": "Local Student Government",
    "GSC": "Graduating Student Council",
    "LCO": "League of Campus Organization",
    "USG": "University Student Government",
    "TGP": "The Gold Panicles",
    "ALL": "All Organizations"
  };

  // Check if an appeal was submitted by the target organization for this specific event
  useEffect(() => {
    const checkAppealStatus = async () => {
      if (!targetOrg) return;
      
      const { data } = await supabase
        .from('submissions')
        .select('id, organization')
        .eq('submission_type', 'Letter of Appeal')
        .ilike('activity_title', `%${reportType}%`)
        .eq('submitted_to', 'OSLD')
        .eq('event_id', eventId)
        .limit(1);
      
      setAppealSubmitted(!!data && data.length > 0);
    };
    checkAppealStatus();
  }, [eventId, targetOrg, reportType]);

  const handleNotifyOrg = async () => {
    setIsSending(true);
    try {
      // Create notification in database
      const { error } = await supabase
        .from('notifications')
        .insert({
          event_id: eventId,
          event_title: `${reportType} Report Deadline`,
          event_description: `Today is the deadline for the submission of ${reportType} report`,
          created_by: 'OSLD',
          target_org: targetOrg || 'ALL'
        });

      if (error) throw error;

      setNotified(true);
      toast({
        title: "Notification Sent",
        description: `Notification sent to ${orgNameMap[targetOrg || 'ALL'] || targetOrg || 'all organizations'} successfully!`,
      });
    } catch (error: unknown) {
      console.error('Error sending notification:', error);
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // If appeal was submitted, show clean appeal notification matching pending review style
  if (appealSubmitted) {
    // Different message based on which organization submitted the appeal
    const appealMessage = targetOrg === 'AO' || targetOrg === 'LSG'
      ? 'An organization has submitted a Letter of Appeal. Please wait for further announcement. Thank you.'
      : 'A Letter of Appeal has been submitted and requires your review.';
    
    return (
      <div className="mt-3 bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
        {/* Left border accent */}
        <div className="flex">
          <div className="w-1 bg-gray-400" />
          
          <div className="flex-1 p-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                <FileText className="w-5 h-5 text-gray-700" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold uppercase tracking-wide text-gray-900">
                  Appeal Submitted
                </h4>
                <p className="text-xs text-gray-500">Pending Your Review</p>
              </div>
            </div>
            
            {/* Submitted By Badge */}
            <div className="mb-3">
              <div className="inline-flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded border border-gray-200">
                <span className="text-xs font-semibold text-gray-600 uppercase">Submitted By:</span>
                <span className="text-xs font-bold text-gray-700">
                  {orgNameMap[targetOrg] || targetOrg || 'Organization'}
                </span>
              </div>
            </div>

            {/* Message */}
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {appealMessage}
            </p>
            
            {/* Review Button */}
            {targetOrg !== 'AO' && targetOrg !== 'LSG' && (
              <button
                onClick={() => {
                  // Always navigate to "Letter of Appeal" tab when reviewing appeals
                  setActiveSubmissionTab?.("Letter of Appeal");
                  setActiveNav?.("Submissions");
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-white font-semibold text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: "#003b27" }}
              >
                <FileText className="w-4 h-4" />
                Review Appeal
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

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
        {targetOrg && targetOrg !== 'ALL' && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">Organization:</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
              {orgNameMap[targetOrg] || targetOrg}
            </span>
          </div>
        )}

      </div>
      <div className="mt-3 pt-3 border-t border-red-200">
        {notified ? (
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
            onClick={handleNotifyOrg}
            disabled={isSending}
            className="w-full text-xs font-semibold rounded-lg border-2 hover:shadow-md transition-all"
            style={{ borderColor: "#003b27", color: "#003b27" }}
          >
            {isSending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Notify Organization
              </span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};


interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  color?: string;
  venue?: string;
  targetOrganization?: string;
  requireAccomplishment?: boolean;
  requireLiquidation?: boolean;
  isDeadline?: boolean;
  deadlineType?: 'accomplishment' | 'liquidation';
  parentEventId?: string;
  accomplishmentDeadlineOverride?: string;
  liquidationDeadlineOverride?: string;
  accomplishmentApproved?: boolean;
  liquidationApproved?: boolean;
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

interface Adviser {
  id: string;
  name: string;
  position: string;
  image?: string;
}

interface OrgAccount {
  email: string;
  role: string;
  status: "Active" | "Inactive";
}

export default function OSLDDashboard() {
  const navStorageKey = "osld_activeNav";
  const submissionTabStorageKey = "osld_activeSubmissionTab";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [activeNav, setActiveNav] = useState(() => localStorage.getItem(navStorageKey) || "Dashboard");
  const [activeView, setActiveView] = useState<"TODAY" | "EVENT">("TODAY");
  const [calendarViewMode, setCalendarViewMode] = useState<"calendar" | "list">("calendar");
  const [calendarFilterOrg, setCalendarFilterOrg] = useState<string>("ALL");
  const [calendarFilterEventType, setCalendarFilterEventType] = useState<string>("ALL");
  const [calendarFilterDateFrom, setCalendarFilterDateFrom] = useState<string>("");
  const [calendarFilterDateTo, setCalendarFilterDateTo] = useState<string>("");
  const [showProfile, setShowProfile] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notifications, setNotifications] = useState<Array<{ id: string; eventTitle: string; eventDescription: string; createdBy: string; createdAt: string; isRead: boolean }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedTemplateOrg, setSelectedTemplateOrg] = useState<string | null>(null);
  const [templateFiles, setTemplateFiles] = useState<Record<string, { forms?: File[] }>>({});
  const [showNotificationPopover, setShowNotificationPopover] = useState(false);
  const [uploadedTemplates, setUploadedTemplates] = useState<Record<string, { forms?: { fileName: string; fileUrl: string }[] }>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [templateLinks, setTemplateLinks] = useState<Record<string, { forms?: string }>>({});
  const [isInboxModalOpen, setIsInboxModalOpen] = useState(false);
  const [activeSubmissionTab, setActiveSubmissionTab] = useState<string>(() => localStorage.getItem(submissionTabStorageKey) || "Request to Conduct Activity");

  useEffect(() => {
    localStorage.setItem(navStorageKey, activeNav);
  }, [activeNav]);

  useEffect(() => {
    localStorage.setItem(submissionTabStorageKey, activeSubmissionTab);
  }, [activeSubmissionTab]);
  
  // All Submissions search and filter states
  const [allSubmissionsSearch, setAllSubmissionsSearch] = useState("");
  const [allSubmissionsOrgFilter, setAllSubmissionsOrgFilter] = useState<string>("ALL");
  const [allSubmissionsTypeFilter, setAllSubmissionsTypeFilter] = useState<string>("ALL");
  const [allSubmissionsStatusFilter, setAllSubmissionsStatusFilter] = useState<string>("ALL");


  // Event form state
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventRecurrence, setEventRecurrence] = useState("");
  const [eventRecurrenceDay, setEventRecurrenceDay] = useState(""); // For "Every [Day]" selection
  const [eventTargetOrg, setEventTargetOrg] = useState("");
  const [eventRequireAccomplishment, setEventRequireAccomplishment] = useState(false);
  const [eventVenue, setEventVenue] = useState("");
  const [eventRequireLiquidation, setEventRequireLiquidation] = useState(false);
  const [formError, setFormError] = useState("");
  const [eventErrors, setEventErrors] = useState<{title?: boolean; description?: boolean; startDate?: boolean; endDate?: boolean; venue?: boolean; organization?: boolean}>({});
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Organization list for dropdown
  const organizationsList = [
    { key: "ALL", name: "NONE" },
    { key: "AO", name: "Accredited Organizations" },
    { key: "LSG", name: "Local Student Government" },
    { key: "GSC", name: "Graduating Student Council" },
    { key: "LCO", name: "League of Campus Organization" },
    { key: "USG", name: "University Student Government" },
    { key: "TGP", name: "The Gold Panicles" },
    { key: "USED", name: "University Student Enterprise Development" },
  ];

  // Profile state
  const [accreditationStatus, setAccreditationStatus] =
    useState("Not Accredited");
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [advisers, setAdvisers] = useState<Adviser[]>([]);
  const [resolutionFiles, setResolutionFiles] = useState<File[]>([]);
  const [actionPlanFiles, setActionPlanFiles] = useState<File[]>([]);
  const [functionalChartFiles, setFunctionalChartFiles] = useState<File[]>([]);
  const [uploadedMemorandums, setUploadedMemorandums] = useState<{id: string; file_name: string; file_url: string}[]>([]);
  const [uploadedAnnouncements, setUploadedAnnouncements] = useState<{id: string; file_name: string; file_url: string}[]>([]);
  const [uploadedFunctionalCharts, setUploadedFunctionalCharts] = useState<{id: string; file_name: string; file_url: string}[]>([]);
  const [platforms, setPlatforms] = useState({ facebook: "", other: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [officerImage, setOfficerImage] = useState<string>("");
  const [adviserImage, setAdviserImage] = useState<string>("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  // Load user data from auth
  useEffect(() => {
    const loadUserData = async () => {
      // Load from localStorage first (set during login) - use OSLD-specific keys
      const storedEmail = localStorage.getItem("osld_userEmail");
      const storedPassword = localStorage.getItem("osld_userPassword");
      
      if (storedEmail) {
        setCurrentEmail(storedEmail);
      } else {
        setCurrentEmail("OSLD@carsu.edu.ph");
      }
      if (storedPassword) {
        setCurrentPassword(storedPassword);
      } else {
        setCurrentPassword("OSLDsite");
      }
      
      // Fallback to Supabase auth if no localStorage data
      if (!storedEmail) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentEmail(user.email || "OSLD@carsu.edu.ph");
        }
      }
    };
    loadUserData();
  }, []);

  // Load activity logs function
  const loadActivityLogs = async () => {
    // Fetch ALL submissions from all organizations
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .neq('status', 'Deleted (Previously Approved)')
      .order('submitted_at', { ascending: false });
    
    if (data) {
      setActivityLogs(
        data.map((s) => ({
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
        coaOpinion: s.coa_opinion,
        coaComment: s.coa_comment,
        endorsedToOsld: s.endorsed_to_osld,
        updated_at: s.updated_at,
        ...s
      })));
    }
  };

  // Load activity logs from database - OSLD's own submissions and submissions submitted to OSLD
  useEffect(() => {
    loadActivityLogs();
  }, []);

  // Add/Edit modal state
  const [isOfficerModalOpen, setIsOfficerModalOpen] = useState(false);
  const [isAdviserModalOpen, setIsAdviserModalOpen] = useState(false);
  const [isSocialContactModalOpen, setIsSocialContactModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);
  const [editingAdviser, setEditingAdviser] = useState<Adviser | null>(null);
  const [officerName, setOfficerName] = useState("");
  const [officerRole, setOfficerRole] = useState("");
  const [officerProgram, setOfficerProgram] = useState("");
  const [officerIdNumber, setOfficerIdNumber] = useState("");
  const [officerErrors, setOfficerErrors] = useState<{name?: boolean; role?: boolean; program?: boolean; idNumber?: boolean}>({});
  const [adviserName, setAdviserName] = useState("");
  const [adviserYearsExperience, setAdviserYearsExperience] = useState("");
  const [adviserExpertise, setAdviserExpertise] = useState<string[]>([]);
  const [adviserErrors, setAdviserErrors] = useState<{name?: boolean; yearsExperience?: boolean; expertise?: boolean}>({});
  const [editFacebookLink, setEditFacebookLink] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteOfficerDialogOpen, setIsDeleteOfficerDialogOpen] = useState(false);
  const [deleteOfficerId, setDeleteOfficerId] = useState<string | null>(null);
  const [deleteOfficerName, setDeleteOfficerName] = useState<string>("");
  const [isDeleteAdviserDialogOpen, setIsDeleteAdviserDialogOpen] = useState(false);
  const [deleteAdviserId, setDeleteAdviserId] = useState<string | null>(null);
  const [deleteAdviserName, setDeleteAdviserName] = useState<string>("");
  const [isDeleteDocumentDialogOpen, setIsDeleteDocumentDialogOpen] = useState(false);
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);
  const [deleteDocumentName, setDeleteDocumentName] = useState<string>("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [templateStatusMessage, setTemplateStatusMessage] = useState<{[key: string]: {accomplishment?: string, liquidation?: string}}>({});
  const [selectedOrganization, setSelectedOrganization] = useState(
    "Office of Student Leadership and Development",
  );
  const [orgAccounts, setOrgAccounts] = useState<Record<string, OrgAccount[]>>(
    {},
  );
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [sentVerificationCode, setSentVerificationCode] = useState("");
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  
  // State for COA's Endorsed folder structure
  const [expandedCoaYears, setExpandedCoaYears] = useState<Set<string>>(new Set());
  const [expandedCoaOrgs, setExpandedCoaOrgs] = useState<Set<string>>(new Set());
  const [expandedCoaRemarks, setExpandedCoaRemarks] = useState<Set<string>>(new Set());

  // Analytics state
  interface AnalyticsData {
    received: { RTC: number; AR: number; LR: number; LOA: number };
    approved: { RTC: number; AR: number; LR: number; LOA: number };
    pending: { RTC: number; AR: number; LR: number; LOA: number };
    forRevision: { RTC: number; AR: number; LR: number };
    endorsed: { AR: number; LR: number };
    eventsPerOrg: Record<string, number>;
    activeAccounts: number;
    rejected: { RTC: number; AR: number; LR: number; LOA: number };
    lastUpdated: Date;
  }
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    received: { RTC: 0, AR: 0, LR: 0, LOA: 0 },
    approved: { RTC: 0, AR: 0, LR: 0, LOA: 0 },
    pending: { RTC: 0, AR: 0, LR: 0, LOA: 0 },
    forRevision: { RTC: 0, AR: 0, LR: 0 },
    endorsed: { AR: 0, LR: 0 },
    eventsPerOrg: {},
    activeAccounts: 0,
    rejected: { RTC: 0, AR: 0, LR: 0, LOA: 0 },
    lastUpdated: new Date(),
  });
  const [isRefreshingAnalytics, setIsRefreshingAnalytics] = useState(false);

  // Function to fetch activity logs
  const fetchActivityLogs = async () => {
    // Fetch ALL submissions from all organizations
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .neq('status', 'Deleted (Previously Approved)')
      .order('submitted_at', { ascending: false });
    
    if (data) {
      setActivityLogs(data.map(s => ({
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
        approvedBy: s.approved_by || s.submitted_to,
        updated_at: s.updated_at,
        ...s
      })));
    }
  };
  const [selectedActivityLog, setSelectedActivityLog] = useState<any | null>(null);
  const [isActivityLogDetailOpen, setIsActivityLogDetailOpen] = useState(false);
  const [isDeleteActivityLogDialogOpen, setIsDeleteActivityLogDialogOpen] = useState(false);
  const [activityLogToDelete, setActivityLogToDelete] = useState<{ activityTitle: string; organization: string } | null>(null);
  const [isDeletingActivityLog, setIsDeletingActivityLog] = useState(false);
  const [activityLogAnnotatedKeys, setActivityLogAnnotatedKeys] = useState<Set<string>>(new Set());
  const [previewAnnotation, setPreviewAnnotation] = useState<{ url: string; name: string; submissionId: string; revisionReason?: string } | null>(null);
  const [isPreviewAnnotationOpen, setIsPreviewAnnotationOpen] = useState(false);
  const [orgLogo, setOrgLogo] = useState<string>("");
  const [logFilterType, setLogFilterType] = useState("all");
  const [logFilterAction, setLogFilterAction] = useState("all");
  const [logFilterDate, setLogFilterDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    setIsRefreshingAnalytics(true);
    try {
      // Fetch all submissions (regardless of where they were submitted)
      const { data: allSubmissions } = await supabase
        .from('submissions')
        .select('submission_type, status, organization, endorsed_to_coa, endorsed_to_osld')
        .neq('status', 'Deleted (Previously Approved)');

      // Fetch all events
      const { data: allEvents } = await supabase
        .from('osld_events')
        .select('id, target_organization');

      // Fetch active accounts
      const { data: activeAccountsData } = await supabase
        .from('org_accounts')
        .select('id')
        .eq('status', 'Active');

      if (allSubmissions) {
        // Map submission types to abbreviations
        const typeMap: Record<string, string> = {
          'Request to Conduct Activity': 'RTC',
          'Accomplishment Report': 'AR',
          'Liquidation Report': 'LR',
          'Letter of Appeal': 'LOA',
        };

        const analytics: AnalyticsData = {
          received: { RTC: 0, AR: 0, LR: 0, LOA: 0 },
          approved: { RTC: 0, AR: 0, LR: 0, LOA: 0 },
          pending: { RTC: 0, AR: 0, LR: 0, LOA: 0 },
          forRevision: { RTC: 0, AR: 0, LR: 0 },
          endorsed: { AR: 0, LR: 0 },
          eventsPerOrg: {},
          activeAccounts: activeAccountsData?.length || 0,
          rejected: { RTC: 0, AR: 0, LR: 0, LOA: 0 },
          lastUpdated: new Date(),
        };

        allSubmissions.forEach((sub) => {
          const abbrev = typeMap[sub.submission_type];
          if (abbrev) {
            // Count received
            if (abbrev === 'RTC' || abbrev === 'AR' || abbrev === 'LR' || abbrev === 'LOA') {
              (analytics.received as Record<string, number>)[abbrev]++;
            }

            // Count approved
            if (sub.status === 'Approved') {
              if (abbrev === 'RTC' || abbrev === 'AR' || abbrev === 'LR' || abbrev === 'LOA') {
                (analytics.approved as Record<string, number>)[abbrev]++;
              }
            }

            // Count pending
            if (sub.status === 'Pending') {
              if (abbrev === 'RTC' || abbrev === 'AR' || abbrev === 'LR' || abbrev === 'LOA') {
                (analytics.pending as Record<string, number>)[abbrev]++;
              }
            }

            // Count for revision
            if (sub.status === 'For Revision') {
              if (abbrev === 'RTC' || abbrev === 'AR' || abbrev === 'LR') {
                (analytics.forRevision as Record<string, number>)[abbrev]++;
              }
            }

            // Count rejected
            if (sub.status === 'Rejected') {
              if (abbrev === 'RTC' || abbrev === 'AR' || abbrev === 'LR' || abbrev === 'LOA') {
                (analytics.rejected as Record<string, number>)[abbrev]++;
              }
            }

            // Count endorsed (AR and LR that are endorsed)
            if ((sub.endorsed_to_coa || sub.endorsed_to_osld) && (abbrev === 'AR' || abbrev === 'LR')) {
              (analytics.endorsed as Record<string, number>)[abbrev]++;
            }
          }
        });

        // Count events per organization
        if (allEvents) {
          allEvents.forEach((event) => {
            const org = event.target_organization || 'Unknown';
            analytics.eventsPerOrg[org] = (analytics.eventsPerOrg[org] || 0) + 1;
          });
        }

        setAnalyticsData(analytics);
      }
    } catch (error: unknown) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsRefreshingAnalytics(false);
    }
  };

  // Event color palette
  const eventColors = [
    "#003b27", // Dark green
    "#d4af37", // Gold
    "#2d5f3f", // Medium green
    "#b8941f", // Dark gold
    "#4a7c59", // Light green
    "#8b7355", // Brown
    "#5a6c57", // Sage
    "#3d5a4c", // Forest
  ];

  const getEventColor = (eventId: string) => {
    // Use event ID to consistently assign a color
    const index = parseInt(eventId) % eventColors.length;
    return eventColors[index];
  };

  const organizations = [
    "Office of Student Leadership and Development",
    "Accredited Organizations",
    "Local Student Government",
    "Graduating Student Council",
    "University Student Entreprenuership Development Unit",
    "Commision on Audit",
    "University Student Government",
    "League of Campus Organization",
    "The Gold Panicles",
  ];

  // Load from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      console.log("Loading data from Supabase...");
      
      // Load profile - ALWAYS get or create THE FIRST ROW
      const { data: profileData, error } = await supabase
        .from('osld_profile')
        .select('*')
        .order('id')
        .limit(1)
        .maybeSingle();
      
      console.log("Profile data:", profileData, "Error:", error);
      
      if (profileData) {
        console.log("Setting profile data:", profileData);
        setAccreditationStatus(profileData.accreditation_status || "Not Accredited");
        setOfficers(profileData.officers || []);
        setAdvisers(profileData.advisers || []);
        setPlatforms(profileData.platforms || { facebook: "", other: "" });
        setContactEmail(profileData.contact_email || "");
        setContactPhone(profileData.contact_phone || "");
      } else {
        // No rows exist, create THE FIRST AND ONLY row
        console.log("Creating initial profile row...");
        const { data: newProfile, error: insertError } = await supabase
          .from('osld_profile')
          .insert({
            accreditation_status: "Not Accredited",
            officers: [],
            advisers: [],
            platforms: { facebook: "", other: "" },
            contact_email: "",
            contact_phone: ""
          })
          .select()
          .single();
        
        console.log("Created profile:", newProfile, "Error:", insertError);
      }

      // Load events
      const { data: eventsData } = await supabase
        .from('osld_events')
        .select('*');
      
      console.log("Events data:", eventsData);
      
      if (eventsData) {
        const formattedEvents: Event[] = [];
        
        // Helper function to check if a report has been approved
        const checkReportApprovalStatus = async (eventTitle: string, reportType: 'accomplishment' | 'liquidation', targetOrg: string) => {
          const submissionType = reportType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report';
          
          const { data } = await supabase
            .from('submissions')
            .select('status, organization, submitted_to')
            .eq('activity_title', eventTitle)
            .eq('submission_type', submissionType);
          
          if (!data || data.length === 0) return false;
          
          // Check if the target organization's submission is approved or was previously approved and deleted
          const hasApproved = data.some(s => 
            (s.status === 'Approved' || s.status === 'Deleted (Previously Approved)') && 
            s.organization === targetOrg
          );
          return hasApproved;
        };
        
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
            requireLiquidation: e.require_liquidation,
            accomplishmentDeadlineOverride: e.accomplishment_deadline_override,
            liquidationDeadlineOverride: e.liquidation_deadline_override,
            accomplishmentApproved: e.require_accomplishment ? await checkReportApprovalStatus(e.title, 'accomplishment', e.target_organization) : false,
            liquidationApproved: e.require_liquidation ? await checkReportApprovalStatus(e.title, 'liquidation', e.target_organization) : false
          });
          
          // OSLD does NOT have deadline events in their list - they just see red bg/dot in calendar for dates with deadlines
        }
        
        setEvents(formattedEvents);
      }

      // Load notifications - only notifications targeted to OSLD or ALL
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .or('target_org.eq.OSLD,target_org.eq.ALL')
        .order('created_at', { ascending: false });
      
      // Load read status for OSLD
      const { data: readStatusData } = await supabase
        .from('notification_read_status')
        .select('notification_id')
        .eq('read_by', 'OSLD');
      
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

      // Load org accounts from localStorage (keep this for now)
      const savedOrgAccounts = localStorage.getItem("orgAccounts");
      if (savedOrgAccounts) {
        setOrgAccounts(JSON.parse(savedOrgAccounts));
      }

      // Mark data as loaded - NOW we can start auto-saving
      setIsDataLoaded(true);
    };

    loadData();
    fetchAnalyticsData();

    // Set up real-time subscription for analytics data
    const submissionsChannel = supabase
      .channel('analytics-submissions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'submissions' }, 
        () => {
          console.log('📊 Submissions changed, refreshing analytics...');
          fetchAnalyticsData();
        }
      )
      .subscribe();

    const eventsChannel = supabase
      .channel('analytics-events')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'osld_events' },
        () => {
          console.log('📊 Events changed, refreshing analytics...');
          fetchAnalyticsData();
        }
      )
      .subscribe();

    const accountsChannel = supabase
      .channel('analytics-accounts')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'org_accounts' },
        () => {
          console.log('📊 Accounts changed, refreshing analytics...');
          fetchAnalyticsData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(submissionsChannel);
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(accountsChannel);
    };
  }, []);

  // Save profile to Supabase IMMEDIATELY when data changes
  const saveProfileToSupabase = async (profileData: any) => {
    console.log("💾 Saving profile immediately...", profileData);
    
    // ALWAYS get THE FIRST profile row
    const { data: existingProfile } = await supabase
      .from('osld_profile')
      .select('id')
      .order('id')
      .limit(1)
      .maybeSingle();

    if (existingProfile) {
      // Update THE FIRST profile row
      const { error } = await supabase
        .from('osld_profile')
        .update(profileData)
        .eq('id', existingProfile.id);
      
      console.log("Update result - Error:", error);
      if (!error) {
        console.log("✅ Profile saved successfully!");
      }
    } else {
      // Create THE FIRST profile row
      const { error } = await supabase
        .from('osld_profile')
        .insert(profileData);
      
      console.log("Insert result - Error:", error);
      if (!error) {
        console.log("✅ Profile created successfully!");
      }
    }
  };

  // Watch for changes and save immediately - BUT ONLY AFTER INITIAL LOAD
  useEffect(() => {
    // Don't save until data is loaded from Supabase
    if (!isDataLoaded) {
      console.log("⏳ Skipping save - data not loaded yet");
      return;
    }

    const profileData = {
      accreditation_status: accreditationStatus,
      officers,
      advisers,
      platforms,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      updated_at: new Date().toISOString()
    };

    // Save immediately without debounce
    saveProfileToSupabase(profileData);
  }, [accreditationStatus, officers, advisers, platforms, contactEmail, contactPhone, isDataLoaded]);

  // Auto-save org accounts
  useEffect(() => {
    console.log("Saving org accounts:", orgAccounts);
    localStorage.setItem("orgAccounts", JSON.stringify(orgAccounts));
  }, [orgAccounts]);

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
        const templatesMap: Record<string, { forms?: { fileName: string; fileUrl: string }[] }> = {};
        data.forEach((template: { organization: string; template_type: string; file_name: string; file_url: string }) => {
          if (!templatesMap[template.organization]) {
            templatesMap[template.organization] = { forms: [] };
          }
          if (template.template_type === "forms") {
            if (!templatesMap[template.organization].forms) {
              templatesMap[template.organization].forms = [];
            }
            templatesMap[template.organization].forms!.push({
              fileName: template.file_name,
              fileUrl: template.file_url
            });
          }
        });
        setUploadedTemplates(templatesMap);
      }
    };
    loadTemplates();
  }, []);

  const uploadTemplate = async (org: string, type: "forms", files: File[]) => {
    setIsUploading(true);
    try {
      const uploadedFiles: { fileName: string; fileUrl: string }[] = [];
      
      for (const file of files) {
        // Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${org}_${type}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `templates/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("form-templates")
          .upload(filePath, file);

        if (uploadError) {
          // If bucket doesn't exist, we'll store just the file name
          console.error("Storage upload error:", uploadError);
        }

        // Get public URL or use placeholder
        const { data: urlData } = supabase.storage
          .from("form-templates")
          .getPublicUrl(filePath);

        const fileUrl = urlData?.publicUrl || filePath;

        // Save to database (insert, not upsert to allow multiple files)
        const { error: dbError } = await supabase
          .from("form_templates")
          .insert({
            organization: org,
            template_type: type,
            file_name: file.name,
            file_url: fileUrl,
            uploaded_at: new Date().toISOString()
          });

        if (dbError) {
          console.error("Database error:", dbError);
          showNotif(`Error saving template: ${dbError.message}`);
          continue;
        }

        uploadedFiles.push({ fileName: file.name, fileUrl });
      }

      // Update local state - append to existing templates
      setUploadedTemplates(prev => ({
        ...prev,
        [org]: {
          ...prev[org],
          [type]: [...(prev[org]?.[type] || []), ...uploadedFiles]
        }
      }));

      // Clear the file from templateFiles
      setTemplateFiles(prev => ({
        ...prev,
        [org]: {
          ...prev[org],
          [type]: undefined
        }
      }));

      setTemplateStatusMessage(prev => ({
        ...prev,
        [org]: {
          ...prev[org],
          [type]: `${uploadedFiles.length} template(s) saved successfully`
        }
      }));
      setTimeout(() => {
        setTemplateStatusMessage(prev => ({
          ...prev,
          [org]: {
            ...prev[org],
            [type]: undefined
          }
        }));
      }, 3000);
    } catch (error: unknown) {
      console.error("Upload error:", error);
      showNotif("Error uploading template");
    } finally {
      setIsUploading(false);
    }
  };

  const showNotif = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const getStoragePathFromPublicUrl = (url: string) => {
    const marker = "/storage/v1/object/public/submissions/";
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    const rest = url.slice(idx + marker.length);
    const path = rest.split("?")[0];
    return decodeURIComponent(path);
  };

  const getStoragePathsFromSubmission = (submission: any) => {
    const urls = (submission.file_urls || submission.file_url || "")
      .split(" | ")
      .map((u: string) => u.trim())
      .filter(Boolean);
    return urls
      .map((u: string) => getStoragePathFromPublicUrl(u))
      .filter((p: string | null): p is string => !!p);
  };

  const openDeleteActivityLogDialog = (activityTitle: string, organization: string) => {
    setActivityLogToDelete({ activityTitle, organization });
    setIsDeleteActivityLogDialogOpen(true);
  };

  const handleDeleteActivityLog = async () => {
    if (!activityLogToDelete) return;
    setIsDeletingActivityLog(true);
    try {
      const { data: submissionsToDelete, error: fetchError } = await supabase
        .from("submissions")
        .select("id, file_url, file_urls")
        .eq("activity_title", activityLogToDelete.activityTitle)
        .eq("organization", activityLogToDelete.organization);

      if (fetchError) throw fetchError;

      const storagePaths = Array.from(
        new Set((submissionsToDelete || []).flatMap((s: any) => getStoragePathsFromSubmission(s)))
      );

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("submissions")
          .remove(storagePaths);
        if (storageError) throw storageError;
      }

      const ids = (submissionsToDelete || []).map((s: any) => s.id).filter(Boolean);
      if (ids.length > 0) {
        const { error: updateError } = await supabase
          .from("submissions")
          .update({ status: "Deleted (Previously Approved)" })
          .in("id", ids);
        if (updateError) throw updateError;
      }

      await fetchActivityLogs();
      showNotif("Activity log deleted successfully");
    } catch (error: any) {
      showNotif(error?.message || "Failed to delete activity log");
    } finally {
      setIsDeletingActivityLog(false);
      setIsDeleteActivityLogDialogOpen(false);
      setActivityLogToDelete(null);
    }
  };

  const canonicalizeUrl = (url: string) => url.split("?")[0];

  const loadActivityLogAnnotatedKeys = async (submissions: any[]) => {
    const ids = submissions.map((s) => s.id).filter(Boolean);
    if (ids.length === 0) {
      setActivityLogAnnotatedKeys(new Set());
      return;
    }
    const { data, error } = await supabase
      .from("annotations")
      .select("submission_id,file_url")
      .in("submission_id", ids);
    if (error) {
      setActivityLogAnnotatedKeys(new Set());
      return;
    }
    const keys = new Set<string>();
    (data || []).forEach((row: any) => {
      if (!row.submission_id || !row.file_url) return;
      keys.add(`${row.submission_id}|${row.file_url}`);
      keys.add(`${row.submission_id}|${canonicalizeUrl(row.file_url)}`);
    });
    setActivityLogAnnotatedKeys(keys);
  };

  const openActivityDetails = async (activityTitle: string, organization: string, baseLog: any) => {
    try {
      const { data: allSubmissions } = await supabase
        .from("submissions")
        .select("*")
        .eq("activity_title", activityTitle)
        .eq("organization", organization);

      const groupedData: any = {
        ...baseLog,
        isGroupedView: true,
        allSubmissions: allSubmissions || [],
      };

      (allSubmissions || []).forEach((sub: any) => {
        if (sub.submission_type === "Request to Conduct Activity") groupedData.rtcData = sub;
        else if (sub.submission_type === "Accomplishment Report") groupedData.accomplishmentData = sub;
        else if (sub.submission_type === "Liquidation Report") groupedData.liquidationData = sub;
        else if (sub.submission_type === "Letter of Appeal") groupedData.loaData = sub;
      });

      setSelectedActivityLog(groupedData);
      setIsActivityLogDetailOpen(true);
      await loadActivityLogAnnotatedKeys(allSubmissions || []);
    } catch (error) {
      setSelectedActivityLog(null);
      setIsActivityLogDetailOpen(false);
      setActivityLogAnnotatedKeys(new Set());
      showNotif("Failed to load activity details");
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

  const hasEventOnDate = (day: number) => {
    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.some((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const current = new Date(dateStr);
      
      // Check if the event falls on this date
      if (current >= start && current <= end) {
        return true;
      }
      
      // Check for recurring events
      if (event.recurrenceType && event.recurrenceType !== 'None' && event.recurrenceType !== '') {
        return isRecurringEventOnDate(event, current);
      }
      
      return false;
    });
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    let filteredEvents = events.filter((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const current = new Date(dateStr);
      return current >= start && current <= end;
    });
    
    // Add deadline events for the selected date (only if not approved)
    events.forEach((event) => {
      if (!event.endDate) return;
      
      // Check accomplishment deadline (3 working days after event end or override date)
      if (event.requireAccomplishment && !event.accomplishmentApproved) {
        const accomDeadlineDate = event.accomplishmentDeadlineOverride || calculateDeadlineDate(event.endDate, 3);
        if (dateStr === accomDeadlineDate) {
          filteredEvents.push({
            ...event,
            id: `${event.id}-accom-deadline`,
            title: event.title,
            isDeadline: true,
            deadlineType: 'accomplishment',
            parentEventId: event.id,
            targetOrganization: event.targetOrganization
          });
        }
      }
      
      // Check liquidation deadline (7 working days after event end or override date)
      if (event.requireLiquidation && !event.liquidationApproved) {
        const liqDeadlineDate = event.liquidationDeadlineOverride || calculateDeadlineDate(event.endDate, 7);
        if (dateStr === liqDeadlineDate) {
          filteredEvents.push({
            ...event,
            id: `${event.id}-liq-deadline`,
            title: event.title,
            isDeadline: true,
            deadlineType: 'liquidation',
            parentEventId: event.id,
            targetOrganization: event.targetOrganization
          });
        }
      }
    });
    
    return filteredEvents;
  };

  const getEventsCountForDate = (day: number) => {
    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    let count = 0;
    
    events.forEach((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const current = new Date(dateStr);
      
      // Original event dates
      if (current >= start && current <= end) {
        count++;
      } else if (event.recurrenceType && event.recurrenceType !== 'None' && event.recurrenceType !== '') {
        // Check for recurring events
        if (isRecurringEventOnDate(event, current)) {
          count++;
        }
      }
    });
    
    return count;
  };

  const getEventDotsForDate = (day: number) => {
    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const filteredEvents = [];
    
    events.forEach((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const current = new Date(dateStr);
      
      // Original event dates
      if (current >= start && current <= end) {
        filteredEvents.push(event);
      } else if (event.recurrenceType && event.recurrenceType !== 'None' && event.recurrenceType !== '') {
        // Check for recurring events
        if (isRecurringEventOnDate(event, current)) {
          filteredEvents.push(event);
        }
      }
    });
    
    return filteredEvents;
  };

  const hasDeadlineOnDate = (day: number) => {
    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const checkDate = new Date(dateStr);
    
    // Check if any event has a deadline (accomplishment or liquidation) on this date
    return events.some((event) => {
      if (!event.endDate) return false;
      
      // Check accomplishment deadline (3 working days after event end or override date)
      if (event.requireAccomplishment && !event.accomplishmentApproved) {
        const accomDeadlineDate = event.accomplishmentDeadlineOverride || calculateDeadlineDate(event.endDate, 3);
        if (dateStr === accomDeadlineDate) return true;
      }
      
      // Check liquidation deadline (7 working days after event end or override date)
      if (event.requireLiquidation && !event.liquidationApproved) {
        const liqDeadlineDate = event.liquidationDeadlineOverride || calculateDeadlineDate(event.endDate, 7);
        if (dateStr === liqDeadlineDate) return true;
      }
      
      return false;
    });
  };

  const getEventDayNumber = (event: Event, currentDate: Date) => {
    const start = new Date(event.startDate);
    const current = new Date(currentDate);
    start.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);
    const diffTime = current.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  const openAddEventModal = () => {
    setEditingEvent(null);
    setEventTitle("");
    setEventDescription("");
    setEventStartDate("");
    setEventEndDate("");
    setEventStartTime("");
    setEventEndTime("");
    setEventAllDay(false);
    setEventRecurrence("");
    setEventRecurrenceDay(""); // Reset day selection
    setEventVenue("");
    setEventTargetOrg("ALL");
    setEventRequireAccomplishment(false);
    setEventRequireLiquidation(false);
    setFormError("");
    setIsEventModalOpen(true);
  };

  const openEditEventModal = (event: Event) => {
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventDescription(event.description || "");
    setEventStartDate(event.startDate);
    setEventEndDate(event.endDate);
    setEventStartTime(event.startTime || "");
    setEventEndTime(event.endTime || "");
    setEventAllDay(event.allDay);
    setEventVenue(event.venue || "");
    setEventTargetOrg(event.targetOrganization || "ALL");
    setEventRequireAccomplishment(event.requireAccomplishment || false);
    setEventRequireLiquidation(event.requireLiquidation || false);
    setFormError("");
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async () => {
    const errors: {title?: boolean; description?: boolean; startDate?: boolean; endDate?: boolean; venue?: boolean; organization?: boolean} = {};
    
    if (!eventTitle.trim()) errors.title = true;
    if (!eventDescription.trim()) errors.description = true;
    if (!eventStartDate) errors.startDate = true;
    if (!eventEndDate) errors.endDate = true;
    if (!eventVenue.trim()) errors.venue = true;
    if (!eventTargetOrg.trim()) errors.organization = true;
    
    if (Object.keys(errors).length > 0) {
      setEventErrors(errors);
      setFormError("Please fill in all required fields");
      return;
    }
    
    if (new Date(eventEndDate) < new Date(eventStartDate)) {
      setFormError("End date cannot be before start date");
      return;
    }
    
    setEventErrors({});
    setFormError("");

    if (editingEvent) {
      // Update existing event
      await supabase
        .from('osld_events')
        .update({
          title: eventTitle,
          description: eventDescription,
          start_date: eventStartDate,
          end_date: eventEndDate,
          start_time: eventStartTime,
          end_time: eventEndTime,
          all_day: eventAllDay,
          venue: eventVenue,
          target_organization: eventTargetOrg,
          recurrence_rule: eventRecurrence || null,
          recurrence_day: eventRecurrenceDay || null,
          require_accomplishment: eventRequireAccomplishment,
          require_liquidation: eventRequireLiquidation
        })
        .eq('id', editingEvent.id);

      // Remove old event and its deadline events, then add updated ones
      const filteredEvents = events.filter((e) => 
        e.id !== editingEvent.id && e.parentEventId !== editingEvent.id
      );
      
      const updatedEvent: Event = {
        id: editingEvent.id,
        title: eventTitle,
        description: eventDescription,
        startDate: eventStartDate,
        endDate: eventEndDate,
        startTime: eventStartTime,
        endTime: eventEndTime,
        allDay: eventAllDay,
        venue: eventVenue,
        targetOrganization: eventTargetOrg,
        requireAccomplishment: eventRequireAccomplishment,
        requireLiquidation: eventRequireLiquidation,
      };
      
      setEvents([...filteredEvents, updatedEvent]);
    } else {
      // Create new event
      const newEventId = Date.now().toString();
      const newEventData = {
        id: newEventId,
        title: eventTitle,
        description: eventDescription,
        start_date: eventStartDate,
        end_date: eventEndDate,
        start_time: eventStartTime,
        end_time: eventEndTime,
        all_day: eventAllDay,
        venue: eventVenue,
        target_organization: eventTargetOrg,
        recurrence_rule: eventRecurrence || null,
        recurrence_day: eventRecurrenceDay || null,
        require_accomplishment: eventRequireAccomplishment,
        require_liquidation: eventRequireLiquidation,
      };

      const { data: insertedEvent, error: insertError } = await supabase
        .from('osld_events')
        .insert(newEventData)
        .select()
        .single();
      
      if (insertError) {
        console.error("Error creating event:", insertError);
        setFormError("Failed to create event. Please try again.");
        return;
      }
      
      const newEvent = { ...newEventData, id: insertedEvent.id };

      // Create notification for new event (notify all orgs except OSLD)
      const allOrgs = ['AO', 'LSG', 'GSC', 'LCO', 'USG', 'TGP', 'COA'];
      const notificationPromises = allOrgs.map(org => 
        supabase
          .from('notifications')
          .insert({
            event_id: newEvent.id,
            event_title: newEvent.title,
            event_description: newEvent.description,
            created_by: 'OSLD',
            target_org: org
          })
      );
      await Promise.all(notificationPromises);

      // Send notification about required reports (only to chosen organization)
      if ((eventRequireAccomplishment || eventRequireLiquidation) && eventTargetOrg !== 'ALL') {
        const reportTypes = [];
        if (eventRequireAccomplishment) reportTypes.push('Accomplishment');
        if (eventRequireLiquidation) reportTypes.push('Liquidation');
        
        const accomDeadline = eventRequireAccomplishment ? calculateDeadlineDate(newEvent.end_date, 3) : null;
        const liqDeadline = eventRequireLiquidation ? calculateDeadlineDate(newEvent.end_date, 7) : null;
        
        let deadlineInfo = '';
        if (accomDeadline) deadlineInfo += `Accomplishment Report due: ${accomDeadline}`;
        if (liqDeadline) deadlineInfo += `${accomDeadline ? ' · ' : ''}Liquidation Report due: ${liqDeadline}`;
        
        // Organization name mapping
        const orgNameMap: { [key: string]: string } = {
          "AO": "Accredited Organizations",
          "LSG": "Local Student Government",
          "GSC": "Graduating Student Council",
          "LCO": "Local Council of Organizations",
          "USG": "University Student Government",
          "TGP": "The Guidon Publications",
          "COA": "Commission on Audit",
          "OSLD": "Office of Student Leadership Development"
        };
        
        // Determine who should receive the notification
        const notificationTargets = [eventTargetOrg];
        
        // Add LCO if event is for AO, add USG if event is for LSG
        if (eventTargetOrg === 'AO') {
          notificationTargets.push('LCO');
        } else if (eventTargetOrg === 'LSG') {
          notificationTargets.push('USG');
        }
        
        // Send notification to all targets
        for (const org of notificationTargets) {
          const description = org === eventTargetOrg 
            ? `OSLD requires submission of ${reportTypes.join(' and ')} report for "${newEvent.title}".
${deadlineInfo}`
            : `OSLD requires submission of ${reportTypes.join(' and ')} report for "${newEvent.title}".
Organization: ${orgNameMap[eventTargetOrg] || eventTargetOrg}
${deadlineInfo}`;
          
          await supabase
            .from('notifications')
            .insert({
              event_id: newEvent.id,
              event_title: `${reportTypes.join(' & ')} Report Required: ${newEvent.title}`,
              event_description: description,
              created_by: 'OSLD',
              target_org: org
            });
        }
      }

      // Build new events array including deadline events
      const newEventsToAdd: Event[] = [{
        id: newEvent.id,
        title: newEvent.title,
        description: newEvent.description,
        startDate: newEvent.start_date,
        endDate: newEvent.end_date,
        startTime: newEvent.start_time,
        endTime: newEvent.end_time,
        allDay: newEvent.all_day,
        venue: newEvent.venue,
        targetOrganization: newEvent.target_organization,
        requireAccomplishment: newEvent.require_accomplishment,
        requireLiquidation: newEvent.require_liquidation
      }];

      setEvents([...events, ...newEventsToAdd]);

      // Reload notifications - only notifications targeted to OSLD or ALL
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .or('target_org.eq.OSLD,target_org.eq.ALL')
        .order('created_at', { ascending: false });
      
      // Load read status for OSLD
      const { data: readStatusData } = await supabase
        .from('notification_read_status')
        .select('notification_id')
        .eq('read_by', 'OSLD');
      
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
    }

    setIsEventModalOpen(false);
    setEventTitle("");
    setEventDescription("");
    setEventStartDate("");
    setEventEndDate("");
    setEventAllDay(false);
    setEventRecurrence("");
    setEventRecurrenceDay(""); // Reset day selection
    setEventVenue("");
    setEventTargetOrg("ALL");
    setEventRequireAccomplishment(false);
    setEventRequireLiquidation(false);
    setEditingEvent(null);
  };

  const confirmDeleteEvent = (eventId: string) => {
    setDeleteEventId(eventId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteEvent = async () => {
    if (deleteEventId) {
      await supabase
        .from('osld_events')
        .delete()
        .eq('id', deleteEventId);

      // Remove the event and any associated deadline events
      const updatedEvents = events.filter((e) => e.id !== deleteEventId && e.parentEventId !== deleteEventId);
      setEvents(updatedEvents);
      setIsDeleteDialogOpen(false);
      setDeleteEventId(null);
      showNotif("Event deleted successfully");
    }
  };

  const handleMonthChange = (monthIndex: number, yearValue: number) => {
    setCurrentDate(new Date(yearValue, monthIndex, 1));
    setIsMonthPickerOpen(false);
  };

  const openAddOfficerModal = () => {
    setEditingOfficer(null);
    setOfficerName("");
    setOfficerRole("");
    setOfficerProgram("");
    setOfficerIdNumber("");
    setOfficerImage("");
    setIsOfficerModalOpen(true);
  };

  const openEditOfficerModal = (officer: Officer) => {
    setEditingOfficer(officer);
    setOfficerName(officer.name);
    // Parse position to extract role, program, id_number
    const parts = officer.position.split(" | ");
    setOfficerRole(parts[0] || "");
    setOfficerProgram(parts[1] || "");
    setOfficerIdNumber(parts[2] || "");
    setOfficerImage(officer.image || "");
    setIsOfficerModalOpen(true);
  };

  const handleSaveOfficer = async () => {
    const errors: {name?: boolean; role?: boolean; program?: boolean; idNumber?: boolean} = {};
    
    if (!officerName.trim()) errors.name = true;
    if (!officerRole.trim()) errors.role = true;
    if (!officerProgram.trim()) errors.program = true;
    if (!officerIdNumber.trim()) errors.idNumber = true;
    
    if (Object.keys(errors).length > 0) {
      setOfficerErrors(errors);
      showNotif("Please fill in all required fields");
      return;
    }
    
    setOfficerErrors({});

    // Store role, program, id_number in position field as "Role | Program | ID"
    const position = [officerRole, officerProgram, officerIdNumber].filter(Boolean).join(" | ");

    try {
      if (editingOfficer) {
        // Update existing officer
        const { error } = await supabase
          .from("org_officers")
          .update({
            name: officerName,
            position: position,
            image: officerImage || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingOfficer.id);

        if (error) throw error;

        setOfficers(
          officers.map((o) =>
            o.id === editingOfficer.id
              ? {
                  ...o,
                  name: officerName,
                  position: position,
                  image: officerImage || o.image,
                }
              : o,
          ),
        );
        showNotif("Staff updated successfully");
      } else {
        // Add new officer
        const { data, error } = await supabase
          .from("org_officers")
          .insert({
            organization: "osld",
            name: officerName,
            position: position,
            image: officerImage || null,
          })
          .select()
          .single();

        if (error) throw error;

        const newOfficer: Officer = {
          id: data.id,
          name: officerName,
          position: position,
          image: officerImage,
        };
        setOfficers([...officers, newOfficer]);
        showNotif("Staff added successfully");
      }

      setIsOfficerModalOpen(false);
      setOfficerName("");
      setOfficerRole("");
      setOfficerProgram("");
      setOfficerIdNumber("");
      setOfficerImage("");
      setEditingOfficer(null);
    } catch (error: unknown) {
      console.error("Error saving staff:", error);
      showNotif("Failed to save staff");
    }
  };

  const confirmRemoveOfficer = (id: string, name: string) => {
    setDeleteOfficerId(id);
    setDeleteOfficerName(name);
    setIsDeleteOfficerDialogOpen(true);
  };

  const removeOfficer = async () => {
    if (!deleteOfficerId) return;
    try {
      const { error } = await supabase
        .from("org_officers")
        .delete()
        .eq("id", deleteOfficerId);

      if (error) throw error;

      setOfficers(officers.filter((o) => o.id !== deleteOfficerId));
      showNotif("Staff removed successfully");
      setIsDeleteOfficerDialogOpen(false);
      setDeleteOfficerId(null);
      setDeleteOfficerName("");
    } catch (error: unknown) {
      console.error("Error removing staff:", error);
      showNotif("Failed to remove staff");
    }
  };

  const openAddAdviserModal = () => {
    setEditingAdviser(null);
    setAdviserName("");
    setAdviserYearsExperience("");
    setAdviserExpertise([]);
    setAdviserImage("");
    setIsAdviserModalOpen(true);
  };

  const openEditAdviserModal = (adviser: Adviser) => {
    setEditingAdviser(adviser);
    setAdviserName(adviser.name);
    // Parse position to extract years and expertise
    const parts = adviser.position.replace(/\s*adviser\s*/gi, '').split(" | ");
    setAdviserYearsExperience(parts[0] || "");
    // Split expertise by comma or semicolon
    const expertiseStr = parts[1] || "";
    setAdviserExpertise(expertiseStr ? expertiseStr.split(/[,;]/).map(e => e.trim()).filter(Boolean) : []);
    setAdviserImage(adviser.image || "");
    setIsAdviserModalOpen(true);
  };

  const handleSaveAdviser = async () => {
    const errors: {name?: boolean; yearsExperience?: boolean; expertise?: boolean} = {};
    
    if (!adviserName.trim()) errors.name = true;
    if (!adviserYearsExperience.trim()) errors.yearsExperience = true;
    if (adviserExpertise.length === 0) errors.expertise = true;
    
    if (Object.keys(errors).length > 0) {
      setAdviserErrors(errors);
      showNotif("Please fill in all required fields");
      return;
    }
    
    setAdviserErrors({});

    // Store years and expertise in position field as "Years | Expertise1, Expertise2 Adviser"
    const expertiseStr = adviserExpertise.filter(Boolean).join(", ");
    const positionParts = [adviserYearsExperience, expertiseStr].filter(Boolean).join(" | ");
    const finalPosition = positionParts ? `${positionParts} Adviser` : "Adviser";

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

        setAdvisers(
          advisers.map((a) =>
            a.id === editingAdviser.id
              ? {
                  ...a,
                  name: adviserName,
                  position: finalPosition,
                  image: adviserImage || a.image,
                }
              : a,
          ),
        );
        showNotif("Director updated successfully");
      } else {
        // Add new adviser
        const { data, error } = await supabase
          .from("org_officers")
          .insert({
            organization: "osld",
            name: adviserName,
            position: finalPosition,
            image: adviserImage || null,
          })
          .select()
          .single();

        if (error) throw error;

        const newAdviser: Adviser = {
          id: data.id,
          name: adviserName,
          position: finalPosition,
          image: adviserImage,
        };
        setAdvisers([...advisers, newAdviser]);
        showNotif("Director added successfully");
      }

      setIsAdviserModalOpen(false);
      setAdviserName("");
      setAdviserYearsExperience("");
      setAdviserExpertise([]);
      setAdviserImage("");
      setEditingAdviser(null);
    } catch (error: unknown) {
      console.error("Error saving director:", error);
      showNotif("Failed to save director");
    }
  };

  const confirmRemoveAdviser = (id: string, name: string) => {
    setDeleteAdviserId(id);
    setDeleteAdviserName(name);
    setIsDeleteAdviserDialogOpen(true);
  };

  const removeAdviser = async () => {
    if (!deleteAdviserId) return;
    try {
      const { error } = await supabase
        .from("org_officers")
        .delete()
        .eq("id", deleteAdviserId);

      if (error) throw error;

      setAdvisers(advisers.filter((a) => a.id !== deleteAdviserId));
      showNotif("Director removed successfully");
      setIsDeleteAdviserDialogOpen(false);
      setDeleteAdviserId(null);
      setDeleteAdviserName("");
    } catch (error: unknown) {
      console.error("Error removing director:", error);
      showNotif("Failed to remove director");
    }
  };

  const handleSaveProfile = async () => {
    try {
      // Upload memorandum files
      for (const file of resolutionFiles) {
        const fileName = `osld/memorandum/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("submissions")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("submissions")
          .getPublicUrl(fileName);

        await supabase.from("org_documents").insert({
          organization: "osld",
          document_type: "memorandum",
          file_name: file.name,
          file_url: urlData.publicUrl,
        });
      }

      // Upload announcement files
      for (const file of actionPlanFiles) {
        const fileName = `osld/announcement/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("submissions")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("submissions")
          .getPublicUrl(fileName);

        await supabase.from("org_documents").insert({
          organization: "osld",
          document_type: "announcement",
          file_name: file.name,
          file_url: urlData.publicUrl,
        });
      }

      // Upload functional chart files
      for (const file of functionalChartFiles) {
        const fileName = `osld/functional_chart/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("submissions")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("submissions")
          .getPublicUrl(fileName);

        await supabase.from("org_documents").insert({
          organization: "osld",
          document_type: "functional_chart",
          file_name: file.name,
          file_url: urlData.publicUrl,
        });
      }

      // Clear file states after upload
      setResolutionFiles([]);
      setActionPlanFiles([]);
      setFunctionalChartFiles([]);

      // Reload documents
      await loadDocuments();

      const profileData = {
        accreditationStatus,
        officers,
        advisers,
        platforms,
        contactEmail,
        contactPhone,
      };
      localStorage.setItem("osld_profile", JSON.stringify(profileData));
      showNotif("Profile saved successfully!");
    } catch (error: unknown) {
      console.error("Error saving profile:", error);
      showNotif("Failed to save profile");
    }
  };

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("org_documents")
        .select("*")
        .eq("organization", "osld");

      if (error) throw error;

      if (data) {
        setUploadedMemorandums(data.filter((d) => d.document_type === "memorandum"));
        setUploadedAnnouncements(data.filter((d) => d.document_type === "announcement"));
        setUploadedFunctionalCharts(data.filter((d) => d.document_type === "functional_chart"));
      }
    } catch (error: unknown) {
      console.error("Error loading documents:", error);
    }
  };

  const confirmDeleteDocument = (documentId: string, documentName: string) => {
    setDeleteDocumentId(documentId);
    setDeleteDocumentName(documentName);
    setIsDeleteDocumentDialogOpen(true);
  };

  const handleDeleteDocument = async () => {
    if (!deleteDocumentId) return;
    try {
      const { error } = await supabase
        .from("org_documents")
        .delete()
        .eq("id", deleteDocumentId);

      if (error) throw error;

      await loadDocuments();
      showNotif("Document deleted successfully");
      setIsDeleteDocumentDialogOpen(false);
      setDeleteDocumentId(null);
      setDeleteDocumentName("");
    } catch (error: unknown) {
      console.error("Error deleting document:", error);
      showNotif("Failed to delete document");
    }
  };

  // Load officers, advisers, and social contacts from database on mount
  useEffect(() => {
    const loadOfficersAndAdvisers = async () => {
      try {
        const { data, error } = await supabase
          .from("org_officers")
          .select("*")
          .eq("organization", "osld");

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

    const loadSocialContacts = async () => {
      try {
        const { data } = await supabase
          .from("org_social_contacts")
          .select("*")
          .eq("organization", "osld")
          .maybeSingle();

        if (data) {
          setPlatforms({ facebook: data.facebook_url || "", other: "" });
          setContactEmail(data.contact_email || "");
          setContactPhone(data.contact_phone || "");
        }
      } catch (error: unknown) {
        console.error("Error loading social contacts:", error);
      }
    };

    const loadOrgLogo = async () => {
      try {
        const { data: files } = await supabase.storage
          .from('osld-files')
          .list('logos', {
            search: 'Office_of_Student_Leadership_and_Development_logo'
          });

        if (files && files.length > 0) {
          const { data } = supabase.storage
            .from('osld-files')
            .getPublicUrl(`logos/${files[0].name}`);
          
          setOrgLogo(data.publicUrl);
        }
      } catch (error: unknown) {
        console.error("Error loading logo:", error);
      }
    };

    loadOfficersAndAdvisers();
    loadSocialContacts();
    loadOrgLogo();
    loadDocuments();
  }, []);

  const handleSendVerification = () => {
    if (!newEmail || !newEmail.includes("@")) {
      showNotif("Please enter a valid email address");
      return;
    }

    // Generate a random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentVerificationCode(code);
    setIsVerificationSent(true);

    // In a real app, this would send an email
    showNotif(`Verification code sent to ${newEmail}: ${code}`);
  };

  const handleUpdateAccount = () => {
    if (!verificationCode) {
      showNotif("Please enter the verification code");
      return;
    }

    if (verificationCode !== sentVerificationCode) {
      showNotif("Invalid verification code");
      return;
    }

    if (newEmail) {
      setCurrentEmail(newEmail);
      localStorage.setItem("osld_admin_email", newEmail);
    }

    if (newPassword) {
      setCurrentPassword(newPassword);
      localStorage.setItem("osld_admin_password", newPassword);
    }

    showNotif("Account updated successfully!");
    setIsEditAccountModalOpen(false);
    setNewEmail("");
    setNewPassword("");
    setVerificationCode("");
    setSentVerificationCode("");
    setIsVerificationSent(false);
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "officer" | "adviser",
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (type === "officer") {
          setOfficerImage(base64String);
        } else {
          setAdviserImage(base64String);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Social & Contact functions
  const openSocialContactModal = () => {
    setEditFacebookLink(platforms.facebook || "");
    setEditContactEmail(contactEmail || "");
    setEditContactPhone(contactPhone || "");
    setIsSocialContactModalOpen(true);
  };

  const handleSaveSocialContact = async () => {
    try {
      const { error } = await supabase
        .from("org_social_contacts")
        .upsert({
          organization: "osld",
          facebook_url: editFacebookLink || null,
          contact_email: editContactEmail || null,
          contact_phone: editContactPhone || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'organization' });

      if (error) throw error;

      setPlatforms({ facebook: editFacebookLink, other: "" });
      setContactEmail(editContactEmail);
      setContactPhone(editContactPhone);
      setIsSocialContactModalOpen(false);
      showNotif("Social contacts updated successfully");
    } catch (error: unknown) {
      console.error("Error saving social contacts:", error);
      showNotif("Failed to update social contacts");
    }
  };

  const getAccountsForOrg = (orgName: string): OrgAccount[] => {
    if (orgName === "Office of Student Leadership and Development") {
      const builtInAdmin: OrgAccount = {
        email: "OSLD@carsu.edu.ph",
        role: "Administrator",
        status: "Active",
      };
      const userAccounts = orgAccounts[orgName] || [];
      return [builtInAdmin, ...userAccounts];
    }
    return orgAccounts[orgName] || [];
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

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        day === todayDay &&
        currentDate.getMonth() === todayMonth &&
        currentDate.getFullYear() === todayYear;
      const hasEvent = hasEventOnDate(day);
      const hasDeadline = hasDeadlineOnDate(day);
      const eventCount = getEventsCountForDate(day);
      const dayEvents = getEventDotsForDate(day);
      const dayDate = new Date(year, currentDate.getMonth(), day);

      // Background logic based on active view
      let bgStyle = {};
      
      if (activeView === "TODAY") {
        // TODAY view: yellow for today, red for deadlines
        if (isToday) {
          bgStyle = { backgroundColor: "rgba(212, 175, 55, 0.2)" };
        } else if (hasDeadline) {
          bgStyle = { backgroundColor: "rgba(239, 68, 68, 0.15)" };
        }
      } else {
        // EVENT view: green for event dates, yellow for today, light red for deadlines
        if (isToday) {
          bgStyle = { backgroundColor: "rgba(212, 175, 55, 0.2)" };
        } else if (hasDeadline) {
          bgStyle = { backgroundColor: "rgba(239, 68, 68, 0.15)" };
        } else if (hasEvent) {
          bgStyle = { backgroundColor: "rgba(0, 59, 39, 0.1)" };
        }
      }

      // Filter events to display based on activeView
      const displayEvents = dayEvents;

      // Determine hover class based on view and event status
      const hoverClass = activeView === "EVENT" && hasEvent && !isToday
        ? "hover:bg-[rgba(0,59,39,0.2)]"
        : "hover:bg-gray-100";

      days.push(
        <div
          key={day}
          onClick={() => {
            setSelectedDate(dayDate);
            setActiveView("TODAY");
            setIsInboxModalOpen(true);
          }}
          style={bgStyle}
          className={`p-2 cursor-pointer rounded-lg min-h-[80px] border ${!isToday && !hasEvent ? 'bg-white' : ''} ${hoverClass} relative transition-colors`}
        >
          <div className="text-lg font-semibold text-left">{day}</div>
          {(displayEvents.length > 0 || hasDeadline) && (
            <div className="absolute top-2 right-2 flex gap-1">
              {displayEvents.slice(0, 3).map((event, idx) => (
                <div
                  key={idx}
                  className="w-2 h-2 rounded-full"
                  style={{ 
                    backgroundColor: "#003b27" 
                  }}
                ></div>
              ))}
              {hasDeadline && (
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: '#ef4444' }}
                ></div>
              )}
              {displayEvents.length > 3 && (
                <span
                  className="text-xs font-bold ml-1"
                  style={{ color: "#003b27" }}
                >
                  +{displayEvents.length - 3}
                </span>
              )}
            </div>
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

  const renderMonthPicker = () => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
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

  const formatSelectedDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("osld_userEmail");
    localStorage.removeItem("osld_userPassword");
    localStorage.removeItem("userOrganization");
    localStorage.removeItem("app_lastPath");
    localStorage.removeItem("osld_activeNav");
    localStorage.removeItem("osld_activeSubmissionTab");
    window.location.href = "/";
  };


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

  // Filter controls component
  const FilterControls = () => (
    <div className="flex flex-wrap gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search by activity name, org, type, or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 h-9"
        />
      </div>
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filter:</span>
      </div>
      <Select value={logFilterType} onValueChange={setLogFilterType}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Filter by Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="Request to Conduct Activity">RTC</SelectItem>
          <SelectItem value="Accomplishment Report">AR</SelectItem>
          <SelectItem value="Liquidation Report">LR</SelectItem>
          <SelectItem value="Letter of Appeal">LOA</SelectItem>
        </SelectContent>
      </Select>
      <Select value={logFilterAction} onValueChange={setLogFilterAction}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Filter by Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="Approved">Approved</SelectItem>
          <SelectItem value="Pending">Pending</SelectItem>
          <SelectItem value="For Revision">For Revision</SelectItem>
          <SelectItem value="Rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 w-[180px] justify-start text-left font-normal">
            <Calendar className="mr-2 h-4 w-4" />
            {logFilterDate ? format(logFilterDate, "PPP") : "Filter by Date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={logFilterDate}
            onSelect={setLogFilterDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {(logFilterType !== "all" || logFilterAction !== "all" || logFilterDate || searchTerm) && (
        <Button 
          variant="ghost" 
          size="sm"
          className="h-9 text-gray-500 hover:text-gray-700"
          onClick={() => {
            setLogFilterType("all");
            setLogFilterAction("all");
            setLogFilterDate(undefined);
            setSearchTerm("");
          }}
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );

  // Group logs by activity title and type
  const groupLogsByActivity = (logs: any[]) => {
    const grouped: Record<string, { accomplishment?: any; liquidation?: any; rtc?: any; loa?: any }> = {};
    
    logs.forEach(log => {
      const key = log.documentName;
      if (!grouped[key]) {
        grouped[key] = {};
      }
      
      if (log.type === 'Accomplishment Report') {
        grouped[key].accomplishment = log;
      } else if (log.type === 'Liquidation Report') {
        grouped[key].liquidation = log;
      } else if (log.type === 'Request to Conduct Activity') {
        grouped[key].rtc = log;
      } else if (log.type === 'Letter of Appeal') {
        grouped[key].loa = log;
      }
    });
    
    return grouped;
  };

  // Table component for logs
  const LogsTable = ({ logs }: { logs: any[] }) => {
    const groupedLogs = groupLogsByActivity(logs);
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RTC Status</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AR Status</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR Status</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LOA Status</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.keys(groupedLogs).length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-gray-400 text-sm">
                  No activity logs found.
                </td>
              </tr>
            ) : (
              Object.entries(groupedLogs).map(([activityTitle, docs]) => {
                const log = docs.rtc || docs.accomplishment || docs.liquidation || docs.loa;
                if (!log) return null;
                
                return (
                  <tr key={activityTitle} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3 text-gray-500" />
                        <span className="text-xs font-medium text-gray-900 truncate max-w-[150px]" title={activityTitle}>{activityTitle}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-500">
                      {{
                        "OSLD": "Office of Student Leadership and Development",
                        "AO": "Accredited Organizations",
                        "LSG": "Local Student Government",
                        "GSC": "Graduating Student Council",
                        "LCO": "League of Campus Organization",
                        "USG": "University Student Government",
                        "TGP": "The Gold Panicles",
                        "USED": "University Student Enterprise Development"
                      }[log.organization] || log.organization}
                    </td>
                     <td className="px-2 py-2">
                       {docs.rtc ? (
                         <div className="flex flex-col gap-0.5">
                           <span className={`inline-flex w-fit px-1.5 py-0.5 rounded-full text-[9px] font-medium ${getStatusColor(docs.rtc.status)}`}>
                             {docs.rtc.status === 'Approved' && docs.rtc.approvedBy ? `✓ ${docs.rtc.approvedBy}` :
                              docs.rtc.status === 'For Revision' ? '⚠️ Rev' :
                              docs.rtc.status === 'Pending' ? '⏳ Pending' :
                              docs.rtc.status}
                           </span>
                           <Button
                             size="sm"
                             className="text-[10px] h-6 px-2 bg-[#003b27] text-white hover:bg-[#002a1c] mt-0.5"
                             onClick={() => openActivityDetails(activityTitle, log.organization, log)}
                           ><Eye className="h-3 w-3 mr-0.5" />View</Button>
                         </div>
                       ) : (
                         <span className="text-[10px] text-gray-400">Not Sub.</span>
                       )}
                     </td>
                     <td className="px-2 py-2">
                       {docs.accomplishment ? (
                         <div className="flex flex-col gap-0.5">
                           <span className={`inline-flex w-fit px-1.5 py-0.5 rounded-full text-[9px] font-medium ${getStatusColor(docs.accomplishment.status)}`}>
                             {docs.accomplishment.status === 'Approved' && docs.accomplishment.approvedBy ? `✓ ${docs.accomplishment.approvedBy}` :
                              docs.accomplishment.status === 'For Revision' ? '⚠️ Rev' :
                              docs.accomplishment.status === 'Pending' ? '⏳ Pending' :
                              docs.accomplishment.status}
                           </span>
                           <Button
                             size="sm"
                             className="text-[10px] h-6 px-2 bg-[#003b27] text-white hover:bg-[#002a1c] mt-0.5"
                             onClick={() => openActivityDetails(activityTitle, log.organization, log)}
                           ><Eye className="h-3 w-3 mr-0.5" />View</Button>
                         </div>
                       ) : (
                         <span className="text-[10px] text-gray-400">Not Sub.</span>
                       )}
                     </td>
                     <td className="px-2 py-2">
                       {docs.liquidation ? (
                         <div className="flex flex-col gap-0.5">
                           <span className={`inline-flex w-fit px-1.5 py-0.5 rounded-full text-[9px] font-medium ${getStatusColor(docs.liquidation.status)}`}>
                             {docs.liquidation.status === 'Approved' && docs.liquidation.approvedBy ? `✓ ${docs.liquidation.approvedBy}` :
                              docs.liquidation.status === 'For Revision' ? '⚠️ Rev' :
                              docs.liquidation.status === 'Pending' ? '⏳ Pending' :
                              docs.liquidation.status}
                           </span>
                           <Button
                             size="sm"
                             className="text-[10px] h-6 px-2 bg-[#003b27] text-white hover:bg-[#002a1c] mt-0.5"
                             onClick={() => openActivityDetails(activityTitle, log.organization, log)}
                           ><Eye className="h-3 w-3 mr-0.5" />View</Button>
                         </div>
                       ) : (
                         <span className="text-[10px] text-gray-400">Not Sub.</span>
                       )}
                     </td>
                     <td className="px-2 py-2">
                       {docs.loa ? (
                         <div className="flex flex-col gap-0.5">
                           <span className={`inline-flex w-fit px-1.5 py-0.5 rounded-full text-[9px] font-medium ${getStatusColor(docs.loa.status)}`}>
                             {docs.loa.status === 'Approved' && docs.loa.approvedBy ? `✓ ${docs.loa.approvedBy}` :
                              docs.loa.status === 'For Revision' ? '⚠️ Rev' :
                              docs.loa.status === 'Pending' ? '⏳ Pending' :
                              docs.loa.status}
                           </span>
                           <Button
                             size="sm"
                             className="text-[10px] h-6 px-2 bg-[#003b27] text-white hover:bg-[#002a1c] mt-0.5"
                             onClick={() => openActivityDetails(activityTitle, log.organization, log)}
                           ><Eye className="h-3 w-3 mr-0.5" />View</Button>
                         </div>
                       ) : (
                         <span className="text-[10px] text-gray-400">Not Sub.</span>
                       )}
                     </td>
                    <td className="px-2 py-2 text-[10px] text-gray-500">{log.date}</td>
                    <td className="px-2 py-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px] border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                        onClick={() => openDeleteActivityLogDialog(activityTitle, log.organization)}
                      >
                        <Trash2 className="h-3 w-3 mr-0.5" />
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // Render Activity Logs Section
  if (activeNav === "Activity Logs") {
  // Apply filters
  const filteredLogs = activityLogs.filter(log => {
    // Type filter
    if (logFilterType !== "all" && log.type !== logFilterType) return false;
    
    // Status filter
    if (logFilterAction !== "all" && log.status !== logFilterAction) return false;
    
    // Date filter
    if (logFilterDate) {
      const logDate = new Date(log.date);
      const filterDate = new Date(logFilterDate);
      if (logDate.toDateString() !== filterDate.toDateString()) return false;
    }
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const orgDisplayName = ({
        "OSLD": "Office of Student Leadership and Development",
        "AO": "Accredited Organizations",
        "LSG": "Local Student Government",
        "GSC": "Graduating Student Council",
        "LCO": "League of Campus Organization",
        "USG": "University Student Government",
        "TGP": "The Gold Panicles",
        "USED": "University Student Enterprise Development"
      }[log.organization] || log.organization).toLowerCase();
      return (
        log.documentName.toLowerCase().includes(searchLower) ||
        log.type.toLowerCase().includes(searchLower) ||
        log.status.toLowerCase().includes(searchLower) ||
        orgDisplayName.includes(searchLower)
      );
    }
    
    return true;
  });

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
                OSLD
              </h1>
              <p className="text-xs text-white/60 mt-1">Office of Student Leadership and Development</p>
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
      <div className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          <div className="mb-6">
            <h2
              className="text-3xl font-bold mb-2"
              style={{ color: "#003b27" }}
            >
              Activity Logs
            </h2>
            <p className="text-gray-600">
              View all submission activities from all organizations
            </p>
          </div>

          {/* Filter Controls */}
          {FilterControls()}

          {/* Tabs for different submission types */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="all">All Submissions</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <Card className="p-6">
                <LogsTable logs={filteredLogs} />
              </Card>
            </TabsContent>

            <TabsContent value="stats">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Submissions</p>
                      <p className="text-3xl font-bold text-blue-900 mt-1">{activityLogs.length}</p>
                    </div>
                    <FileText className="h-12 w-12 text-blue-400" />
                  </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Approved</p>
                      <p className="text-3xl font-bold text-green-900 mt-1">
                        {activityLogs.filter(log => log.status === 'Approved').length}
                      </p>
                    </div>
                    <CheckCircle className="h-12 w-12 text-green-400" />
                  </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-600">Pending</p>
                      <p className="text-3xl font-bold text-yellow-900 mt-1">
                        {activityLogs.filter(log => log.status === 'Pending').length}
                      </p>
                    </div>
                    <Clock className="h-12 w-12 text-yellow-400" />
                  </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-600">For Revision</p>
                      <p className="text-3xl font-bold text-red-900 mt-1">
                        {activityLogs.filter(log => log.status === 'For Revision').length}
                      </p>
                    </div>
                    <AlertTriangle className="h-12 w-12 text-red-400" />
                  </div>
                </Card>

                {/* Organizations breakdown */}
                <Card className="p-6 md:col-span-2 lg:col-span-4">
                  <h3 className="text-lg font-bold mb-4" style={{ color: "#003b27" }}>Submissions by Organization</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {["AO", "LSG", "GSC", "LCO", "USG", "TGP", "USED", "OSLD"].map(org => (
                      <div key={org} className="p-4 bg-gray-50 rounded-lg border">
                        <p className="text-xs font-medium text-gray-600">{{
                          "OSLD": "Office of Student Leadership and Development",
                          "AO": "Accredited Organizations",
                          "LSG": "Local Student Government",
                          "GSC": "Graduating Student Council",
                          "LCO": "League of Campus Organization",
                          "USG": "University Student Government",
                          "TGP": "The Gold Panicles",
                          "USED": "University Student Enterprise Development"
                        }[org] || org}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {activityLogs.filter(log => log.organization === org).length}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <DeleteConfirmationDialog
        open={isDeleteActivityLogDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteActivityLogDialogOpen(open);
          if (!open) {
            setActivityLogToDelete(null);
          }
        }}
        title="Delete Activity Log"
        description="Are you sure you want to delete this row and its uploaded file(s)?"
        itemName={activityLogToDelete?.activityTitle}
        onConfirm={handleDeleteActivityLog}
        isLoading={isDeletingActivityLog}
        isDangerous={true}
      />

      <Dialog
        open={isActivityLogDetailOpen}
        onOpenChange={(open) => {
          setIsActivityLogDetailOpen(open);
          if (!open) {
            setSelectedActivityLog(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-black border-0 shadow-lg">
          <DialogHeader className="text-black border-b border-gray-200 pb-4 mb-4">
            <DialogTitle className="text-2xl font-bold text-black" style={{ color: "#003b27" }}>
              Activity Details
            </DialogTitle>
          </DialogHeader>
          {!selectedActivityLog ? (
            <div className="py-8 text-center text-gray-500 font-medium">
              Loading activity details...
            </div>
          ) : (
            <div className="space-y-5 py-2 text-black">
              <div className="p-3 bg-gradient-to-r from-green-50 to-transparent rounded-lg border border-green-100">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Activity Name</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">{selectedActivityLog.documentName}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {({
                    "OSLD": "Office of Student Leadership and Development",
                    "AO": "Accredited Organizations",
                    "LSG": "Local Student Government",
                    "GSC": "Graduating Student Council",
                    "LCO": "League of Campus Organization",
                    "USG": "University Student Government",
                    "TGP": "The Gold Panicles",
                    "USED": "University Student Enterprise Development"
                  } as any)[selectedActivityLog.organization] || selectedActivityLog.organization}
                </p>
              </div>

              {selectedActivityLog.isGroupedView && (
                <div className="space-y-3">
                  {[
                    { data: selectedActivityLog.rtcData, title: "Request to Conduct Activity", label: "📌" },
                    { data: selectedActivityLog.accomplishmentData, title: "Accomplishment Report", label: "📄" },
                    { data: selectedActivityLog.liquidationData, title: "Liquidation Report", label: "💰" },
                    { data: selectedActivityLog.loaData, title: "Letter of Appeal", label: "✉️" },
                  ]
                    .filter((x) => x.data && (x.data.status === "For Revision" || x.data.revision_reason || x.data.revisionReason))
                    .map((x) => (
                      (x.data.status === "For Revision" && (x.data.revisionReason || x.data.revision_reason)) ? (
                        <div key={x.title} className="p-4 bg-gradient-to-br from-orange-50 to-orange-25 border border-orange-200 rounded-lg shadow-sm">
                          <p className="text-orange-900 font-semibold mb-2 flex items-center gap-2">
                            <span className="text-lg">{x.label}</span> {x.title} - Revision Required
                          </p>
                          <div className="mt-2 p-3 bg-white border border-orange-100 rounded">
                            <p className="text-gray-800 text-sm">{x.data.revisionReason || x.data.revision_reason}</p>
                          </div>
                        </div>
                      ) : null
                    ))}
                </div>
              )}

              {!selectedActivityLog.isGroupedView && selectedActivityLog.status === "For Revision" && (selectedActivityLog.revisionReason || selectedActivityLog.revision_reason) && (
                <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-25 border border-orange-200 rounded-lg shadow-sm">
                  <p className="text-orange-900 font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Revision Required
                  </p>
                  <div className="mt-2 p-3 bg-white border border-orange-100 rounded">
                    <p className="text-gray-800 text-sm">{selectedActivityLog.revisionReason || selectedActivityLog.revision_reason}</p>
                  </div>
                </div>
              )}

              {(selectedActivityLog.coaOpinion || selectedActivityLog.coa_opinion || selectedActivityLog.coaComment || selectedActivityLog.coa_comment) && (
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-25 border border-blue-200 rounded-lg shadow-sm">
                  <p className="text-blue-900 font-semibold mb-3 flex items-center gap-2">
                    <span className="text-lg">💭</span> COA's Remarks
                  </p>
                  {(selectedActivityLog.coaOpinion || selectedActivityLog.coa_opinion) && (
                    <p className="text-gray-700 text-sm mb-2">
                      <span className="font-semibold text-gray-900">Opinion:</span>{" "}
                      <span className="text-gray-700">{selectedActivityLog.coaOpinion || selectedActivityLog.coa_opinion}</span>
                    </p>
                  )}
                  {(selectedActivityLog.coaComment || selectedActivityLog.coa_comment) && (
                    <p className="text-gray-700 text-sm">
                      <span className="font-semibold text-gray-900">Comment:</span>{" "}
                      <span className="text-gray-700">{selectedActivityLog.coaComment || selectedActivityLog.coa_comment}</span>
                    </p>
                  )}
                </div>
              )}

              {selectedActivityLog.activity_duration && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Activity Information</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Duration</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedActivityLog.activity_duration}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Venue</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedActivityLog.activity_venue}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Participants</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedActivityLog.activity_participants}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Source of Funds</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">₱{selectedActivityLog.activity_funds}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Budget</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">₱{selectedActivityLog.activity_budget}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">SDG</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedActivityLog.activity_sdg}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200 col-span-2">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">LIKHA Agenda</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedActivityLog.activity_likha}</p>
                    </div>
                  </div>
                </div>
              )}

              {(() => {
                const splitParts = (value?: string | null) =>
                  (value || "")
                    .split("|")
                    .map((p) => p.trim())
                    .filter(Boolean);

                const buildFiles = (sub: any) => {
                  const fileNames = splitParts(sub?.fileName || sub?.file_name);
                  const fileUrls = splitParts(sub?.file_urls || sub?.fileUrl || sub?.file_url);
                  const count = Math.min(fileNames.length, fileUrls.length);
                  return Array.from({ length: count }, (_, i) => ({ name: fileNames[i], url: fileUrls[i] }));
                };

                const renderSubFiles = (subData: any, fileType: string, emoji: string) => {
                  if (!subData) return null;
                  const files = buildFiles(subData);
                  if (files.length === 0) return null;
                  return (
                    <div className="p-4 border border-gray-300 rounded-lg hover:shadow-md transition-all duration-200 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{emoji}</span>
                          <p className="font-semibold text-gray-900">{fileType}</p>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(subData.status)}`}>
                            {subData.status}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {files.map((file: { name: string; url: string }, idx: number) => (
                          <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                            <span className="text-sm text-gray-700 truncate flex-1" title={file.name}>
                              {file.name}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-[#003b27] text-[#003b27] hover:bg-[#003b27] hover:text-white text-xs h-7 px-2"
                              onClick={() => window.open(file.url, "_blank")}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                };

                const rtc = selectedActivityLog.rtcData || (selectedActivityLog.allSubmissions || []).find((s: any) => s.submission_type === "Request to Conduct Activity");
                const ar = selectedActivityLog.accomplishmentData || (selectedActivityLog.allSubmissions || []).find((s: any) => s.submission_type === "Accomplishment Report");
                const lr = selectedActivityLog.liquidationData || (selectedActivityLog.allSubmissions || []).find((s: any) => s.submission_type === "Liquidation Report");
                const loa = selectedActivityLog.loaData || (selectedActivityLog.allSubmissions || []).find((s: any) => s.submission_type === "Letter of Appeal");

                return (
                  <div className="space-y-3">
                    {renderSubFiles(rtc, "Request to Conduct Activity", "📌")}
                    {renderSubFiles(ar, "Accomplishment Report", "📄")}
                    {renderSubFiles(lr, "Liquidation Report", "💰")}
                    {renderSubFiles(loa, "Letter of Appeal", "✉️")}
                  </div>
                );
              })()}
            </div>
          )}
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
  }

  // Render Director & Staff Section
  if (activeNav === "Director & Staff") {
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
                  OSLD
                </h1>
                <p className="text-xs text-white/60 mt-1">Office of Student Leadership and Development</p>
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
              Director & Staff
            </h2>

            <div className="space-y-8">
              {/* Director Section - FIRST */}
              <Card
                className="p-8 shadow-xl border-t-4"
                style={{ borderTopColor: "#d4af37" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3
                    className="text-2xl font-bold"
                    style={{ color: "#003b27" }}
                  >
                    Director
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {advisers.length === 0 ? (
                    <div className="col-span-full">
                      <p className="text-gray-500 text-center py-4 mb-4">
                        No director added yet
                      </p>
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          onClick={openAddAdviserModal}
                          className="font-semibold border-2"
                          style={{ borderColor: "#003b27", color: "#003b27" }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Director
                        </Button>
                      </div>
                    </div>
                  ) : (
                    advisers.slice(0, 1).map((adviser) => {
                      const positionParts = adviser.position.replace(/\s*adviser\s*/gi, '').replace(/\s*director\s*/gi, '').split(" | ");
                      const yearsExp = positionParts[0] || "";
                      const expertise = positionParts[1] || "";
                      return (
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
                        <div className="text-left space-y-2">
                          <p className="text-sm">
                            <span className="font-semibold text-gray-700">Name:</span>{" "}
                            <span className="text-gray-900">{adviser.name}</span>
                          </p>
                          {yearsExp && (
                            <p className="text-sm">
                              <span className="font-semibold text-gray-700">Years of Experience:</span>{" "}
                              <span className="text-gray-900">{yearsExp}</span>
                            </p>
                          )}
                          {expertise && (
                            <div className="text-sm mb-4">
                              <span className="font-semibold text-gray-700">Field of Expertise:</span>{" "}
                              <div className="mt-1">
                                {expertise.split(/[,;]/).map((exp: string, idx: number) => (
                                  <span key={idx} className="inline-block bg-gray-100 px-2 py-1 rounded text-xs mr-1 mb-1">
                                    {exp.trim()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {!expertise && <div className="mb-4" />}
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditAdviserModal(adviser)}
                              className="border-2 font-medium"
                              style={{ borderColor: "#003b27", color: "#003b27" }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => confirmRemoveAdviser(adviser.id, adviser.name)}
                              className="border-2 font-medium border-red-500 text-red-500 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    )})
                  )}
                </div>
              </Card>

              {/* Staff Section - SECOND */}
              <Card
                className="p-8 shadow-xl border-t-4"
                style={{ borderTopColor: "#d4af37" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3
                    className="text-2xl font-bold"
                    style={{ color: "#003b27" }}
                  >
                    Staff
                  </h3>
                  <Button
                    variant="outline"
                    onClick={openAddOfficerModal}
                    className="font-semibold border-2"
                    style={{ borderColor: "#003b27", color: "#003b27" }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Staff
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {officers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 col-span-full">
                      No staff added yet
                    </p>
                  ) : (
                    officers.map((officer) => {
                      const parts = officer.position.split(" | ");
                      const role = parts[0] || "";
                      const program = parts[1] || "";
                      const idNumber = parts[2] || "";
                      return (
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
                        <div className="text-left space-y-2">
                          <p className="text-sm">
                            <span className="font-semibold text-gray-700">Name:</span>{" "}
                            <span className="text-gray-900">{officer.name}</span>
                          </p>
                          {role && (
                            <p className="text-sm">
                              <span className="font-semibold text-gray-700">Role:</span>{" "}
                              <span className="text-gray-900">{role}</span>
                            </p>
                          )}
                          {program && (
                            <p className="text-sm">
                              <span className="font-semibold text-gray-700">Program and Year:</span>{" "}
                              <span className="text-gray-900">{program}</span>
                            </p>
                          )}
                          {idNumber && (
                            <p className="text-sm mb-4">
                              <span className="font-semibold text-gray-700">ID Number:</span>{" "}
                              <span className="text-gray-900">{idNumber}</span>
                            </p>
                          )}
                          {!idNumber && <div className="mb-4" />}
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditOfficerModal(officer)}
                              className="border-2 font-medium"
                              style={{ borderColor: "#003b27", color: "#003b27" }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => confirmRemoveOfficer(officer.id, officer.name)}
                              className="border-2 font-medium border-red-500 text-red-500 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    )})
                  )}
                </div>
              </Card>

              {/* Social Media & Contact - THIRD */}
              <Card
                className="p-8 shadow-xl border-t-4"
                style={{ borderTopColor: "#d4af37" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3
                    className="text-2xl font-bold"
                    style={{ color: "#003b27" }}
                  >
                    Social Media & Contact
                  </h3>
                  <Button
                    variant="outline"
                    onClick={openSocialContactModal}
                    className="font-semibold border-2"
                    style={{ borderColor: "#003b27", color: "#003b27" }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
                <div className="space-y-3">
                  {platforms.facebook && (
                    <p className="text-sm">
                      <span className="font-semibold text-gray-700">Facebook:</span>{" "}
                      <a
                        href={platforms.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-700 hover:underline"
                      >
                        {platforms.facebook}
                      </a>
                    </p>
                  )}
                  {contactEmail && (
                    <p className="text-sm">
                      <span className="font-semibold text-gray-700">Email:</span>{" "}
                      <a
                        href={`mailto:${contactEmail}`}
                        className="text-gray-900 hover:underline"
                      >
                        {contactEmail}
                      </a>
                    </p>
                  )}
                  {contactPhone && (
                    <p className="text-sm">
                      <span className="font-semibold text-gray-700">Contact Number:</span>{" "}
                      <a
                        href={`tel:${contactPhone}`}
                        className="text-gray-900 hover:underline"
                      >
                        {contactPhone}
                      </a>
                    </p>
                  )}
                  {!platforms.facebook && !contactEmail && !contactPhone && (
                    <p className="text-gray-500 text-center py-8">
                      No contact information available
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>

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

        {/* Staff Modal */}
        <Dialog open={isOfficerModalOpen} onOpenChange={setIsOfficerModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
                {editingOfficer ? "Edit Staff" : "Add Staff"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label>Name <span className="text-red-500">*</span></Label>
                <Input
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  placeholder="Enter officer name"
                  className={officerErrors.name ? "border-red-500 bg-red-50" : ""}
                />
              </div>
              <div>
                <Label>Role <span className="text-red-500">*</span></Label>
                <Input
                  value={officerRole}
                  onChange={(e) => setOfficerRole(e.target.value)}
                  placeholder="Enter role (e.g., President, Secretary)"
                  className={officerErrors.role ? "border-red-500 bg-red-50" : ""}
                />
              </div>
              <div>
                <Label>Program and Year <span className="text-red-500">*</span></Label>
                <Input
                  value={officerProgram}
                  onChange={(e) => setOfficerProgram(e.target.value)}
                  placeholder="Enter program and year (e.g., BS Information System - 4)"
                  className={officerErrors.program ? "border-red-500 bg-red-50" : ""}
                />
              </div>
              <div>
                <Label>ID Number <span className="text-red-500">*</span></Label>
                <Input
                  value={officerIdNumber}
                  onChange={(e) => setOfficerIdNumber(e.target.value)}
                  placeholder="Enter ID number"
                  className={officerErrors.idNumber ? "border-red-500 bg-red-50" : ""}
                />
              </div>
              <div>
                <Label>Upload Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "officer")}
                  className="cursor-pointer"
                />
                {officerImage && (
                  <img
                    src={officerImage}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover mt-2 border-2"
                    style={{ borderColor: "#003b27" }}
                  />
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOfficerModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveOfficer}
                className="flex-1"
                style={{ backgroundColor: "#003b27" }}
              >
                {editingOfficer ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Director Modal */}
        <Dialog open={isAdviserModalOpen} onOpenChange={setIsAdviserModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
                {editingAdviser ? "Edit Director" : "Add Director"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label>Name <span className="text-red-500">*</span></Label>
                <Input
                  value={adviserName}
                  onChange={(e) => setAdviserName(e.target.value)}
                  placeholder="Enter director name"
                  className={adviserErrors.name ? "border-red-500 bg-red-50" : ""}
                />
              </div>
              <div>
                <Label>Number of Year/s of Experience <span className="text-red-500">*</span></Label>
                <Input
                  value={adviserYearsExperience}
                  onChange={(e) => setAdviserYearsExperience(e.target.value)}
                  placeholder="Enter number of years (e.g., 3 years)"
                  className={adviserErrors.yearsExperience ? "border-red-500 bg-red-50" : ""}
                />
              </div>
              <div>
                <Label>Field of Expertise <span className="text-red-500">*</span></Label>
                <div className={`space-y-2 p-2 rounded ${adviserErrors.expertise ? "border-2 border-red-500 bg-red-50" : ""}`}>
                  {adviserExpertise.map((expertise, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={expertise}
                        onChange={(e) => {
                          const newExpertise = [...adviserExpertise];
                          newExpertise[index] = e.target.value;
                          setAdviserExpertise(newExpertise);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            setAdviserExpertise([...adviserExpertise, ""]);
                          }
                        }}
                        placeholder="Enter field of expertise"
                      />
                      {adviserExpertise.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAdviserExpertise(adviserExpertise.filter((_, i) => i !== index));
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {adviserExpertise.length === 0 && (
                    <Input
                      value=""
                      onChange={(e) => setAdviserExpertise([e.target.value])}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          setAdviserExpertise([...adviserExpertise, ""]);
                        }
                      }}
                      placeholder="Enter field of expertise"
                    />
                  )}
                  <p className="text-xs text-gray-500">Press Enter to add another expertise</p>
                </div>
              </div>
              <div>
                <Label>Upload Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "adviser")}
                  className="cursor-pointer"
                />
                {adviserImage && (
                  <img
                    src={adviserImage}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover mt-2 border-2"
                    style={{ borderColor: "#003b27" }}
                  />
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAdviserModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAdviser}
                className="flex-1"
                style={{ backgroundColor: "#003b27" }}
              >
                {editingAdviser ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Social & Contact Modal */}
        <Dialog open={isSocialContactModalOpen} onOpenChange={setIsSocialContactModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
                Edit Social Media & Contact
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label>Facebook Page Link</Label>
                <Input
                  value={editFacebookLink}
                  onChange={(e) => setEditFacebookLink(e.target.value)}
                  placeholder="Enter Facebook page URL"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editContactEmail}
                  onChange={(e) => setEditContactEmail(e.target.value)}
                  placeholder="Enter contact email"
                />
              </div>
              <div>
                <Label>Contact Number</Label>
                <Input
                  value={editContactPhone}
                  onChange={(e) => setEditContactPhone(e.target.value)}
                  placeholder="Enter contact number"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsSocialContactModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSocialContact}
                className="flex-1"
                style={{ backgroundColor: "#003b27" }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Render Accounts Section
  if (activeNav === "Accounts") {
    return (
      <AccountsPage
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        sidebarTitle="OSLD"
        sidebarSubtitle="Office of Student Leadership and Development"
        orgLogo={orgLogo}
      />
    );
  }

  // Render Submissions Section
  if (activeNav === "Submissions") {
    return (
      <SubmissionsPage
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        orgShortName="OSLD"
        orgFullName="Office of Student Leadership and Development"
        orgLogo={orgLogo}
        onActivityChange={fetchActivityLogs}
        activeSubmissionTab={activeSubmissionTab}
        setActiveSubmissionTab={setActiveSubmissionTab}
      />
    );
  }

  // Render Create Account Section
  if (activeNav === "Create Account") {
    return (
      <CreateAccountPage
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        sidebarTitle="OSLD"
        sidebarSubtitle="Office of Student Leadership and Development"
        orgLogo={orgLogo}
      />
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
        sidebarTitle="OSLD"
        sidebarSubtitle="Office of Student Leadership and Development"
        orgLogo={orgLogo}
      />
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
                  OSLD
                </h1>
                <p className="text-xs text-white/60 mt-1">Office of Student Leadership and Development</p>
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

            {/* Template Upload Section */}
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
                    <p className="text-sm text-gray-600">Upload GDrive link for all organizations</p>
                  </div>
                </div>
                
                {uploadedTemplates['ALL']?.forms ? (
                  <div className="border-2 border-green-300 bg-green-50 rounded-lg p-6">
                    <div className="text-green-600 mb-4 text-center font-medium">✓ Template Link Uploaded</div>
                    <div className="p-4 bg-white rounded-lg border mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 font-medium mb-1">GDrive Link</p>
                          <p className="text-xs text-gray-500 truncate">{uploadedTemplates['ALL'].forms.fileUrl}</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(uploadedTemplates['ALL'].forms?.fileUrl, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={async () => {
                              try {
                                const { error } = await supabase
                                  .from('form_templates')
                                  .delete()
                                  .eq('organization', 'ALL')
                                  .eq('template_type', 'forms');
                                
                                if (error) throw error;
                                
                                setUploadedTemplates(prev => ({
                                  ...prev,
                                  'ALL': { ...prev['ALL'], forms: undefined }
                                }));
                                showNotif('Template deleted successfully');
                              } catch (error: any) {
                                showNotif(`Error deleting template: ${error.message}`);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 text-center">
                      This link is visible to all organizations in their Form Templates page
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-[#d4af37] transition-colors bg-gray-50">
                      <div className="text-center mb-4">
                        <Upload className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-base text-gray-700 font-medium mb-1">Upload GDrive Link</p>
                        <p className="text-sm text-gray-500">Paste the link to a folder containing all forms</p>
                        <p className="text-xs text-gray-400 mt-2">This will be available to all organizations</p>
                      </div>
                      <Input
                        type="url"
                        placeholder="https://drive.google.com/..."
                        value={templateLinks['ALL']?.forms || ""}
                        onChange={(e) => {
                          setTemplateLinks(prev => ({
                            ...prev,
                            'ALL': {
                              ...prev['ALL'],
                              forms: e.target.value
                            }
                          }));
                        }}
                        className="w-full text-sm"
                      />
                    </div>
                    
                    {templateLinks['ALL']?.forms && (
                      <Button
                        className="w-full mt-4 h-12 text-base font-semibold"
                        style={{ backgroundColor: "#003b27" }}
                        disabled={isUploading}
                        onClick={async () => {
                          const link = templateLinks['ALL']?.forms;
                          if (link) {
                            setIsUploading(true);
                            try {
                              const { error } = await supabase
                                .from("form_templates")
                                .insert({
                                  organization: 'ALL',
                                  template_type: "forms",
                                  file_name: "GDrive Link",
                                  file_url: link,
                                  uploaded_at: new Date().toISOString()
                                });
                              if (error) throw error;
                              setUploadedTemplates(prev => ({
                                ...prev,
                                'ALL': {
                                  ...prev['ALL'],
                                  forms: { fileName: "GDrive Link", fileUrl: link }
                                }
                              }));
                              setTemplateLinks(prev => ({
                                ...prev,
                                'ALL': { ...prev['ALL'], forms: "" }
                              }));
                              showNotif('Template link saved successfully');
                            } catch (error: any) {
                              showNotif(`Error saving link: ${error.message}`);
                            } finally {
                              setIsUploading(false);
                            }
                          }
                        }}
                      >
                        {isUploading ? 'Saving...' : 'Save Template Link'}
                      </Button>
                    )}
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showProfile) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Notification */}
        {showNotification && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
            <div
              className="bg-white border-l-4 shadow-lg rounded-lg p-4 flex items-center gap-3"
              style={{ borderLeftColor: "#003b27" }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#003b27" }}
              ></div>
              <span className="font-medium">{notificationMessage}</span>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <div
          className="w-72 text-white flex flex-col shadow-xl"
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
                  OSLD
                </h1>
                <p className="text-xs text-white/60 mt-1">Office of Student Leadership and Development</p>
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
                  setShowProfile(false);
                }}
                className={`w-full justify-start mb-2 text-left font-semibold transition-all ${
                  activeNav === item
                    ? "text-[#003b27]"
                    : "text-white hover:bg-white/10"
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

        {/* Profile Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProfile(false)}
                  className="hover:bg-gray-200"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </div>

            <div className="max-w-5xl mx-auto">
              <h2
                className="text-4xl font-bold mb-8"
                style={{ color: "#003b27" }}
              >
                Profile
              </h2>

              <div className="space-y-6">
                {/* Logo Upload Card */}
                <Card
                  className="p-8 shadow-xl border-0 bg-gradient-to-br from-white to-gray-50"
                >
                  <div className="flex items-center gap-3 mb-8">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#003b27" }}
                    >
                      <ImageIcon className="h-5 w-5 text-white" />
                    </div>
                    <h3
                      className="text-2xl font-bold"
                      style={{ color: "#003b27" }}
                    >
                      Organization Logo
                    </h3>
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Logo Preview */}
                    <div className="flex-shrink-0">
                      {orgLogo ? (
                        <div className="relative group">
                          <div
                            className="w-40 h-40 rounded-full overflow-hidden shadow-lg ring-4 ring-offset-2"
                            style={{ ringColor: "#d4af37" }}
                          >
                            <img
                              src={orgLogo}
                              alt="Organization Logo"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                          <Button
                            onClick={async () => {
                              try {
                                // Delete the logo from storage
                                const fileName = `${selectedOrganization.replace(/\s+/g, '_')}_logo`;
                                const { data: files } = await supabase.storage
                                  .from('osld-files')
                                  .list('logos', { search: fileName });
                                
                                if (files && files.length > 0) {
                                  await supabase.storage
                                    .from('osld-files')
                                    .remove([`logos/${files[0].name}`]);
                                }
                                setOrgLogo("");
                                showNotif("Logo removed successfully");
                              } catch (error: unknown) {
                                console.error("Error removing logo:", error);
                                setOrgLogo("");
                              }
                            }}
                            variant="destructive"
                            size="icon"
                            className="absolute -top-3 -right-3 rounded-full w-10 h-10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="w-40 h-40 rounded-full border-3 border-dashed flex flex-col items-center justify-center bg-gray-50 transition-all duration-300 hover:bg-gray-100"
                          style={{ borderColor: "#003b27" }}
                        >
                          <ImageIcon className="h-12 w-12 text-gray-300 mb-2" />
                          <span className="text-sm text-gray-400">No logo</span>
                        </div>
                      )}
                    </div>

                    {/* Upload Section */}
                    <div className="flex-1 text-center md:text-left">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-1">
                            Choose File
                          </h4>
                          <p className="text-sm text-gray-500">
                            Supported: PNG, JPG, GIF (Max 5MB)
                          </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <label
                            className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:shadow-lg hover:scale-105"
                            style={{ backgroundColor: "#003b27" }}
                          >
                            <Upload className="h-5 w-5" />
                            Choose File
                            <Input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const fileExt = file.name.split('.').pop();
                                    const fileName = `${selectedOrganization.replace(/\s+/g, '_')}_logo.${fileExt}`;
                                    const filePath = `logos/${fileName}`;

                                    const { error: uploadError } = await supabase.storage
                                      .from('osld-files')
                                      .upload(filePath, file, { upsert: true });

                                    if (uploadError) throw uploadError;

                                    const { data } = supabase.storage
                                      .from('osld-files')
                                      .getPublicUrl(filePath);

                                    setOrgLogo(data.publicUrl + '?t=' + Date.now());
                                    showNotif("Logo uploaded successfully!");
                                  } catch (error: any) {
                                    console.error("Error uploading logo:", error);
                                    showNotif("Failed to upload logo");
                                  }
                                }
                              }}
                            />
                          </label>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                          Supported: PNG, JPG, GIF (Max 5MB)
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Account Settings Card */}
                <Card
                  className="p-8 shadow-lg border-l-4"
                  style={{ borderLeftColor: "#d4af37" }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3
                      className="text-2xl font-bold"
                      style={{ color: "#003b27" }}
                    >
                      Account Settings
                    </h3>
                    <Button
                      onClick={() => setIsEditAccountModalOpen(true)}
                      className="font-semibold"
                      style={{ backgroundColor: "#003b27" }}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Account
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-base font-medium text-gray-600">
                        Email
                      </span>
                      <span className="font-semibold text-lg">
                        {currentEmail}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-base font-medium text-gray-600">
                        Password
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">
                          {showPassword ? currentPassword : "••••••••"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowPassword(!showPassword)}
                          className="h-8 w-8"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Accreditation Plaque */}
                <Card
                  className="p-8 shadow-lg border-l-4"
                  style={{ borderLeftColor: "#d4af37" }}
                >
                  <h3
                    className="text-2xl font-bold mb-6"
                    style={{ color: "#003b27" }}
                  >
                    Accreditation Status
                  </h3>
                  <div className="flex items-center gap-4">
                    <Label className="text-lg font-medium min-w-[100px]">
                      Status:
                    </Label>
                    <span className="text-lg font-semibold text-green-600">
                      Active
                    </span>
                  </div>
                </Card>

                {/* Documents */}
                <div className="grid md:grid-cols-3 gap-6">
                  <Card
                    className="p-8 shadow-lg border-l-4"
                    style={{ borderLeftColor: "#d4af37" }}
                  >
                    <h3
                      className="text-xl font-bold mb-4"
                      style={{ color: "#003b27" }}
                    >
                      Memorandum
                    </h3>
                    <Input
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files) {
                          setResolutionFiles(prev => [...prev, ...Array.from(files)]);
                        }
                      }}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">You can upload multiple PDF files</p>
                    {resolutionFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {resolutionFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                            <span className="text-sm text-gray-600">✓ {file.name}</span>
                            <button
                              type="button"
                              onClick={() => setResolutionFiles(prev => prev.filter((_, i) => i !== index))}
                              className="text-red-500 hover:text-red-700 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {uploadedMemorandums.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium text-gray-700">Uploaded:</p>
                        {uploadedMemorandums.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-700 hover:underline">
                              📄 {doc.file_name}
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
                  </Card>

                  <Card
                    className="p-8 shadow-lg border-l-4"
                    style={{ borderLeftColor: "#d4af37" }}
                  >
                    <h3
                      className="text-xl font-bold mb-4"
                      style={{ color: "#003b27" }}
                    >
                      Announcement
                    </h3>
                    <Input
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files) {
                          setActionPlanFiles(prev => [...prev, ...Array.from(files)]);
                        }
                      }}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">You can upload multiple PDF files</p>
                    {actionPlanFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {actionPlanFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                            <span className="text-sm text-gray-600">✓ {file.name}</span>
                            <button
                              type="button"
                              onClick={() => setActionPlanFiles(prev => prev.filter((_, i) => i !== index))}
                              className="text-red-500 hover:text-red-700 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {uploadedAnnouncements.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium text-gray-700">Uploaded:</p>
                        {uploadedAnnouncements.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-700 hover:underline">
                              📄 {doc.file_name}
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
                  </Card>

                  <Card
                    className="p-8 shadow-lg border-l-4"
                    style={{ borderLeftColor: "#d4af37" }}
                  >
                    <h3
                      className="text-xl font-bold mb-4"
                      style={{ color: "#003b27" }}
                    >
                      Functional Chart
                    </h3>
                    <Input
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files) {
                          setFunctionalChartFiles(prev => [...prev, ...Array.from(files)]);
                        }
                      }}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">You can upload multiple PDF files</p>
                    {functionalChartFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {functionalChartFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                            <span className="text-sm text-gray-600">✓ {file.name}</span>
                            <button
                              type="button"
                              onClick={() => setFunctionalChartFiles(prev => prev.filter((_, i) => i !== index))}
                              className="text-red-500 hover:text-red-700 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {uploadedFunctionalCharts.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium text-gray-700">Uploaded:</p>
                        {uploadedFunctionalCharts.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-700 hover:underline">
                              📄 {doc.file_name}
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
                  </Card>
                </div>

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

        {/* Edit Account Modal */}
        <Dialog
          open={isEditAccountModalOpen}
          onOpenChange={setIsEditAccountModalOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
                Edit Account
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="currentEmail" className="text-base font-medium">
                  Current Email
                </Label>
                <Input
                  id="currentEmail"
                  value={currentEmail}
                  disabled
                  className="text-base bg-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-base font-medium">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="text-base pr-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-sm h-8"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Leave blank to keep current password
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditAccountModalOpen(false);
                  setNewPassword("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (newPassword) {
                    try {
                      // Update password in localStorage (OSLD uses hardcoded credentials)
                      localStorage.setItem("osld_userPassword", newPassword);
                      setCurrentPassword(newPassword);
                      
                      toast({
                        title: "Success",
                        description: "Password updated successfully",
                      });
                      setIsEditAccountModalOpen(false);
                      setNewPassword("");
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: error.message || "Failed to update password",
                        variant: "destructive"
                      });
                    }
                  } else {
                    setIsEditAccountModalOpen(false);
                  }
                }}
                className="flex-1"
                style={{ backgroundColor: "#003b27" }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Staff Modal */}
        <Dialog open={isOfficerModalOpen} onOpenChange={setIsOfficerModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
                {editingOfficer ? "Edit Staff" : "Add Staff"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label>Name <span className="text-red-500">*</span></Label>
                <Input
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  placeholder="Enter officer name"
                  className={officerErrors.name ? "border-red-500 bg-red-50" : ""}
                />
              </div>
              <div>
                <Label>Role <span className="text-red-500">*</span></Label>
                <Input
                  value={officerRole}
                  onChange={(e) => setOfficerRole(e.target.value)}
                  placeholder="Enter role (e.g., President, Secretary)"
                  className={officerErrors.role ? "border-red-500 bg-red-50" : ""}
                />
              </div>
              <div>
                <Label>Program and Year <span className="text-red-500">*</span></Label>
                <Input
                  value={officerProgram}
                  onChange={(e) => setOfficerProgram(e.target.value)}
                  placeholder="Enter program and year (e.g., BS Information System - 4)"
                  className={officerErrors.program ? "border-red-500 bg-red-50" : ""}
                />
              </div>
              <div>
                <Label>ID Number <span className="text-red-500">*</span></Label>
                <Input
                  value={officerIdNumber}
                  onChange={(e) => setOfficerIdNumber(e.target.value)}
                  placeholder="Enter ID number"
                  className={officerErrors.idNumber ? "border-red-500 bg-red-50" : ""}
                />
              </div>
              <div>
                <Label>Upload Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "officer")}
                  className="cursor-pointer"
                />
                {officerImage && (
                  <img
                    src={officerImage}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover mt-2 border-2"
                    style={{ borderColor: "#003b27" }}
                  />
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOfficerModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveOfficer}
                className="flex-1"
                style={{ backgroundColor: "#003b27" }}
              >
                {editingOfficer ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Director Modal */}
        <Dialog open={isAdviserModalOpen} onOpenChange={setIsAdviserModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
                {editingAdviser ? "Edit Director" : "Add Director"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label>Name <span className="text-red-500">*</span></Label>
                <Input
                  value={adviserName}
                  onChange={(e) => setAdviserName(e.target.value)}
                  placeholder="Enter director name"
                  className={adviserErrors.name ? "border-red-500 bg-red-50" : ""}
                />
              </div>
              <div>
                <Label>Number of Year/s of Experience <span className="text-red-500">*</span></Label>
                <Input
                  value={adviserYearsExperience}
                  onChange={(e) => setAdviserYearsExperience(e.target.value)}
                  placeholder="Enter number of years (e.g., 3 years)"
                  className={adviserErrors.yearsExperience ? "border-red-500 bg-red-50" : ""}
                />
              </div>
              <div>
                <Label>Field of Expertise <span className="text-red-500">*</span></Label>
                <div className={`space-y-2 p-2 rounded ${adviserErrors.expertise ? "border-2 border-red-500 bg-red-50" : ""}`}>
                  {adviserExpertise.map((expertise, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={expertise}
                        onChange={(e) => {
                          const newExpertise = [...adviserExpertise];
                          newExpertise[index] = e.target.value;
                          setAdviserExpertise(newExpertise);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            setAdviserExpertise([...adviserExpertise, ""]);
                          }
                        }}
                        placeholder="Enter field of expertise"
                      />
                      {adviserExpertise.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAdviserExpertise(adviserExpertise.filter((_, i) => i !== index));
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {adviserExpertise.length === 0 && (
                    <Input
                      value=""
                      onChange={(e) => setAdviserExpertise([e.target.value])}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          setAdviserExpertise([...adviserExpertise, ""]);
                        }
                      }}
                      placeholder="Enter field of expertise"
                    />
                  )}
                  <p className="text-xs text-gray-500">Press Enter to add another expertise</p>
                </div>
              </div>
              <div>
                <Label>Upload Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "adviser")}
                  className="cursor-pointer"
                />
                {adviserImage && (
                  <img
                    src={adviserImage}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover mt-2 border-2"
                    style={{ borderColor: "#003b27" }}
                  />
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAdviserModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAdviser}
                className="flex-1"
                style={{ backgroundColor: "#003b27" }}
              >
                {editingAdviser ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Social & Contact Modal */}
        <Dialog open={isSocialContactModalOpen} onOpenChange={setIsSocialContactModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
                Edit Social Media & Contact
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label>Facebook Page Link</Label>
                <Input
                  value={editFacebookLink}
                  onChange={(e) => setEditFacebookLink(e.target.value)}
                  placeholder="Enter Facebook page URL"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editContactEmail}
                  onChange={(e) => setEditContactEmail(e.target.value)}
                  placeholder="Enter contact email"
                />
              </div>
              <div>
                <Label>Contact Number</Label>
                <Input
                  value={editContactPhone}
                  onChange={(e) => setEditContactPhone(e.target.value)}
                  placeholder="Enter contact number"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsSocialContactModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSocialContact}
                className="flex-1"
                style={{ backgroundColor: "#003b27" }}
              >
                Save
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
  }

  // DEFAULT DASHBOARD VIEW
  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
          <div
            className="bg-white border-l-4 shadow-lg rounded-lg p-4 flex items-center gap-3"
            style={{ borderLeftColor: "#003b27" }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "#003b27" }}
            ></div>
            <span className="font-medium">{notificationMessage}</span>
          </div>
        </div>
      )}

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
                OSLD
              </h1>
              <p className="text-xs text-white/60 mt-1">Office of Student Leadership and Development</p>
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
      <div className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          {/* Header with icons on the right */}
          <div className="flex items-center justify-end mb-6 lg:mb-8">
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
                          className="text-xs text-gray-700 hover:text-blue-800 h-7 px-2"
                          onClick={async () => {
                            const unreadNotifs = notifications.filter(n => !n.isRead);
                            for (const notif of unreadNotifs) {
                              await supabase
                                .from('notification_read_status')
                                .insert({
                                  notification_id: notif.id,
                                  read_by: 'OSLD'
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
                                .eq('read_by', 'OSLD');
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
                      No notifications yet
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
                                  className="text-xs text-gray-700 hover:text-blue-800 h-6 px-2"
                                  onClick={async () => {
                                    await supabase
                                      .from('notification_read_status')
                                      .insert({
                                        notification_id: notif.id,
                                        read_by: 'OSLD'
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
                                    .eq('read_by', 'OSLD');
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
              
              {/* Inbox Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full w-10 h-10"
                    style={{ borderColor: "#d4af37", color: "#003b27" }}
                  >
                    <Inbox className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-4" align="end">
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: '#d4af37' }}
                    >
                      <Inbox className="w-5 h-5" style={{ color: '#003b27' }} />
                    </div>
                    <div>
                      <h3
                        className="text-lg font-bold"
                        style={{ color: "#003b27" }}
                      >
                        INBOX
                      </h3>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                        {selectedDate && selectedDate.toDateString() === new Date().toDateString() ? "Today" : "Selected Date"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">
                      {selectedDate
                        ? formatSelectedDate(selectedDate)
                        : "Select a date"}
                    </span>
                  </div>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                    {selectedDate && getEventsForDate(selectedDate).length > 0 ? (
                      getEventsForDate(selectedDate).map((event) => {
                        const dayNumber = getEventDayNumber(event, selectedDate);
                        const eventColor = getEventColor(event.id);
                        const isToday = 
                          selectedDate.getDate() === new Date().getDate() &&
                          selectedDate.getMonth() === new Date().getMonth() &&
                          selectedDate.getFullYear() === new Date().getFullYear();
                        
                        // Professional deadline card styling
                        if (event.isDeadline) {
                          return (
                            <div
                              key={event.id}
                              className="rounded-xl overflow-hidden shadow-md border border-red-200 bg-white"
                            >
                              <div className="px-4 py-3 bg-gradient-to-r from-red-600 to-rose-600 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-white font-bold text-sm uppercase tracking-wider">
                                    {event.deadlineType === 'accomplishment' ? 'Accomplishment Report Due' : 'Liquidation Report Due'}
                                  </span>
                                </div>
                                <span className="text-xs text-red-100 font-medium">
                                  Due Today
                                </span>
                              </div>
                              <div className="p-4">
                                <h4 className="font-bold text-gray-800 mb-1">
                                  {event.title}
                                </h4>
                                <OSLDDeadlineNotification 
                                  deadlineType={event.deadlineType}
                                  eventId={event.parentEventId}
                                  targetOrg={event.targetOrganization}
                                  setActiveNav={setActiveNav}
                                  setActiveSubmissionTab={setActiveSubmissionTab}
                                />
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
                                borderBottom: `3px solid ${eventColor}`
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: eventColor }}
                                />
                                <span className="font-bold text-sm" style={{ color: '#003b27' }}>
                                  {isToday ? 'Today' : 'Event'}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-full hover:bg-white/50"
                                  onClick={() => openEditEventModal(event)}
                                >
                                  <Edit2 className="h-3.5 w-3.5" style={{ color: "#003b27" }} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-full hover:bg-red-50"
                                  onClick={() => confirmDeleteEvent(event.id)}
                                >
                                  <X className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </div>
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
                      <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                        <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-gray-400 font-medium">No events</p>
                        <p className="text-gray-300 text-sm mt-1">Select a date with events</p>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button
                onClick={() => setShowProfile(true)}
                variant="ghost"
                size="icon"
                className="rounded-full w-10 h-10"
                style={{ borderColor: "#d4af37", color: "#003b27" }}
              >
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Main Layout: Left side DATA ANALYTICS, Right side Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* DATA ANALYTICS Section - Left side (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Analytics Header with Real-time indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #003b27 0%, #004d35 100%)" }}>
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl lg:text-3xl font-bold" style={{ color: "#003b27" }}>
                      DATA ANALYTICS
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${isRefreshingAnalytics ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
                      <span className="text-xs text-gray-500">
                        {isRefreshingAnalytics ? 'Updating...' : 'Real-time • Last updated: ' + analyticsData.lastUpdated.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAnalyticsData()}
                  disabled={isRefreshingAnalytics}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshingAnalytics ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {/* Summary Cards Row - Enhanced Design */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 shadow-lg border-0 bg-gradient-to-br from-[#003b27] to-[#004d35] text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <Inbox className="h-4 w-4 opacity-80" />
                      <p className="text-xs font-medium opacity-80">Total Received</p>
                    </div>
                    <p className="text-3xl font-bold">
                      {analyticsData.received.RTC + analyticsData.received.AR + analyticsData.received.LR + analyticsData.received.LOA}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
                      <TrendingUp className="h-3 w-3" />
                      <span>All submissions</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 shadow-lg border-0 bg-gradient-to-br from-green-500 to-green-600 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 opacity-80" />
                      <p className="text-xs font-medium opacity-80">Approved</p>
                    </div>
                    <p className="text-3xl font-bold">
                      {analyticsData.approved.RTC + analyticsData.approved.AR + analyticsData.approved.LR + analyticsData.approved.LOA}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
                      <ArrowUp className="h-3 w-3" />
                      <span>Successfully processed</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 shadow-lg border-0 bg-gradient-to-br from-[#d4af37] to-[#c9a42e] text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 opacity-80" />
                      <p className="text-xs font-medium opacity-80">Pending</p>
                    </div>
                    <p className="text-3xl font-bold">
                      {analyticsData.pending.RTC + analyticsData.pending.AR + analyticsData.pending.LR + analyticsData.pending.LOA}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
                      <Activity className="h-3 w-3" />
                      <span>Awaiting review</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 shadow-lg border-0 bg-gradient-to-br from-yellow-600 to-yellow-700 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <ExternalLink className="h-4 w-4 opacity-80" />
                      <p className="text-xs font-medium opacity-80">Endorsed</p>
                    </div>
                    <p className="text-3xl font-bold">
                      {analyticsData.endorsed.AR + analyticsData.endorsed.LR}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
                      <TrendingUp className="h-3 w-3" />
                      <span>Forwarded to COA</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Document Type Legend - Collapsible */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-gray-500" />
                    <p className="text-sm font-semibold text-gray-700">Document Type Reference</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { abbrev: 'RTC', full: 'Request to Conduct Activity', color: '#003b27' },
                    { abbrev: 'AR', full: 'Accomplishment Report', color: '#2563eb' },
                    { abbrev: 'LR', full: 'Liquidation Report', color: '#7c3aed' },
                    { abbrev: 'LOA', full: 'Letter of Appeal', color: '#d4af37' },
                  ].map((item) => (
                    <div key={item.abbrev} className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: item.color }}>
                        {item.abbrev}
                      </div>
                      <span className="text-xs text-gray-600 leading-tight">{item.full}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Analytics Grid - Enhanced 2x2 Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Received Submissions Card */}
                <Card className="p-5 shadow-lg border-0 bg-white rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #003b27 0%, #004d35 100%)" }}>
                      <Inbox className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base" style={{ color: "#003b27" }}>Received Submissions</h4>
                      <p className="text-xs text-gray-500">Total: {analyticsData.received.RTC + analyticsData.received.AR + analyticsData.received.LR + analyticsData.received.LOA}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'RTC', value: analyticsData.received.RTC, color: '#003b27' },
                      { label: 'AR', value: analyticsData.received.AR, color: '#2563eb' },
                      { label: 'LR', value: analyticsData.received.LR, color: '#7c3aed' },
                      { label: 'LOA', value: analyticsData.received.LOA, color: '#d4af37' },
                    ].map((item) => (
                      <div key={item.label} className="text-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <p className="text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
                        <p className="text-[10px] font-semibold text-gray-500 mt-1">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Approved Documents Card */}
                <Card className="p-5 shadow-lg border-0 bg-white rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-green-700">Approved Documents</h4>
                      <p className="text-xs text-gray-500">Total: {analyticsData.approved.RTC + analyticsData.approved.AR + analyticsData.approved.LR + analyticsData.approved.LOA}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'RTC', value: analyticsData.approved.RTC },
                      { label: 'AR', value: analyticsData.approved.AR },
                      { label: 'LR', value: analyticsData.approved.LR },
                      { label: 'LOA', value: analyticsData.approved.LOA },
                    ].map((item) => (
                      <div key={item.label} className="text-center p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                        <p className="text-xl font-bold text-green-600">{item.value}</p>
                        <p className="text-[10px] font-semibold text-gray-500 mt-1">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Pending for Approval Card */}
                <Card className="p-5 shadow-lg border-0 bg-white rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#d4af37] to-[#c9a42e]">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base" style={{ color: "#d4af37" }}>Pending Approval</h4>
                      <p className="text-xs text-gray-500">Total: {analyticsData.pending.RTC + analyticsData.pending.AR + analyticsData.pending.LR + analyticsData.pending.LOA}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'RTC', value: analyticsData.pending.RTC },
                      { label: 'AR', value: analyticsData.pending.AR },
                      { label: 'LR', value: analyticsData.pending.LR },
                      { label: 'LOA', value: analyticsData.pending.LOA },
                    ].map((item) => (
                      <div key={item.label} className="text-center p-3 rounded-lg" style={{ backgroundColor: "rgba(212, 175, 55, 0.1)" }}>
                        <p className="text-xl font-bold" style={{ color: "#d4af37" }}>{item.value}</p>
                        <p className="text-[10px] font-semibold text-gray-500 mt-1">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* For Revision Card */}
                <Card className="p-5 shadow-lg border-0 bg-white rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-orange-600">For Revision</h4>
                      <p className="text-xs text-gray-500">Total: {analyticsData.forRevision.RTC + analyticsData.forRevision.AR + analyticsData.forRevision.LR}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'RTC', value: analyticsData.forRevision.RTC },
                      { label: 'AR', value: analyticsData.forRevision.AR },
                      { label: 'LR', value: analyticsData.forRevision.LR },
                    ].map((item) => (
                      <div key={item.label} className="text-center p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors">
                        <p className="text-xl font-bold text-orange-600">{item.value}</p>
                        <p className="text-[10px] font-semibold text-gray-500 mt-1">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Endorsed & Rejected Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Endorsed Documents Card */}
                <Card className="p-5 shadow-lg border-0 bg-white rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-yellow-600 to-yellow-700">
                      <ExternalLink className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-yellow-700">Endorsed to COA</h4>
                      <p className="text-xs text-gray-500">Total: {analyticsData.endorsed.AR + analyticsData.endorsed.LR}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'AR', value: analyticsData.endorsed.AR },
                      { label: 'LR', value: analyticsData.endorsed.LR },
                    ].map((item) => (
                      <div key={item.label} className="text-center p-4 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors">
                        <p className="text-2xl font-bold text-yellow-700">{item.value}</p>
                        <p className="text-xs font-semibold text-gray-500 mt-1">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Rejected Documents Card */}
                <Card className="p-5 shadow-lg border-0 bg-white rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600">
                      <X className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-red-600">Rejected</h4>
                      <p className="text-xs text-gray-500">Total: {analyticsData.rejected.RTC + analyticsData.rejected.AR + analyticsData.rejected.LR + analyticsData.rejected.LOA}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'RTC', value: analyticsData.rejected.RTC },
                      { label: 'AR', value: analyticsData.rejected.AR },
                      { label: 'LR', value: analyticsData.rejected.LR },
                      { label: 'LOA', value: analyticsData.rejected.LOA },
                    ].map((item) => (
                      <div key={item.label} className="text-center p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
                        <p className="text-xl font-bold text-red-600">{item.value}</p>
                        <p className="text-[10px] font-semibold text-gray-500 mt-1">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Events & Accounts Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Events Per Organization */}
                <Card className="p-5 shadow-lg border-0 bg-white rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-gray-700">Events by Organization</h4>
                      <p className="text-xs text-gray-500">Total: {Object.values(analyticsData.eventsPerOrg).reduce((a, b) => a + b, 0)}</p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {Object.keys(analyticsData.eventsPerOrg).length === 0 ? (
                      <p className="text-sm text-gray-400 italic text-center py-6">No events recorded yet</p>
                    ) : (
                      Object.entries(analyticsData.eventsPerOrg)
                        .sort((a, b) => b[1] - a[1])
                        .map(([org, count], index) => (
                          <div key={org} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                            <div className="w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <span className="flex-1 text-sm font-medium text-gray-700 truncate">{org}</span>
                            <span className="text-lg font-bold text-gray-700">{count}</span>
                          </div>
                        ))
                    )}
                  </div>
                </Card>

                {/* Active Accounts */}
                <Card className="p-5 shadow-lg border-0 bg-gradient-to-br from-[#003b27] to-[#004d35] text-white rounded-xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20" />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base">Active Accounts</h4>
                        <p className="text-xs opacity-70">Currently registered users</p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-5xl font-bold">{analyticsData.activeAccounts}</p>
                        <p className="text-sm opacity-70 mt-2">Active Users</p>
                      </div>
                      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                        <TrendingUp className="h-8 w-8 opacity-50" />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Calendar Section - Right side (1/3 width) */}
            <div className="lg:col-span-1 space-y-4">
              <Card
                className="p-4 shadow-xl border-t-4 sticky top-4"
                style={{ borderTopColor: "#d4af37" }}
              >
                {/* Calendar Header */}
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold" style={{ color: "#003b27" }}>
                      Calendar
                    </h3>
                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 rounded ${calendarViewMode === 'calendar' ? 'bg-white shadow-sm' : ''}`}
                        onClick={() => setCalendarViewMode('calendar')}
                        title="Calendar View"
                      >
                        <LayoutGrid className="h-4 w-4" style={{ color: calendarViewMode === 'calendar' ? '#003b27' : '#6b7280' }} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 rounded ${calendarViewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                        onClick={() => setCalendarViewMode('list')}
                        title="List View"
                      >
                        <List className="h-4 w-4" style={{ color: calendarViewMode === 'list' ? '#003b27' : '#6b7280' }} />
                      </Button>
                    </div>
                  </div>

                  {/* Month Navigation */}
                  <div className="flex items-center justify-center gap-2">
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
                      className="hover:bg-gray-200 h-8 w-8"
                    >
                      <ChevronLeft
                        className="h-4 w-4"
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
                          className="text-lg font-bold hover:bg-gray-100"
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
                      className="hover:bg-gray-200 h-8 w-8"
                    >
                      <ChevronRight
                        className="h-4 w-4"
                        style={{ color: "#003b27" }}
                      />
                    </Button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 w-full">
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveView("TODAY");
                        const today = new Date();
                        setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
                        setSelectedDate(today);
                      }}
                      className="font-semibold flex-1 transition-all hover:scale-105 hover:shadow-md text-xs"
                      style={{
                        backgroundColor: "#d4af37",
                        color: "#003b27",
                      }}
                    >
                      TODAY
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setActiveView("EVENT")}
                      className="font-semibold flex-1 transition-all hover:scale-105 hover:shadow-md text-xs"
                      style={{
                        backgroundColor: "#003b27",
                        color: "#d4af37",
                      }}
                    >
                      EVENT
                    </Button>
                    <Button
                      size="icon"
                      className="rounded-full w-8 h-8 shadow-lg hover:shadow-xl transition-all"
                      style={{ backgroundColor: "#d4af37" }}
                      onClick={openAddEventModal}
                    >
                      <Plus
                        className="h-4 w-4"
                        style={{ color: "#003b27" }}
                      />
                    </Button>
                  </div>
                </div>

                {/* Calendar View */}
                {calendarViewMode === 'calendar' && (
                  <div className="grid grid-cols-7 gap-1 shadow-inner bg-gray-50 p-2 rounded-lg">
                    {renderCalendar()}
                  </div>
                )}

                {/* List View */}
                {calendarViewMode === 'list' && (
                  <div className="space-y-3">
                    {/* Filters */}
                    <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                        <Filter className="h-4 w-4" />
                        Filters
                      </div>
                      
                      {/* Organization Filter */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Organization</label>
                        <select
                          value={calendarFilterOrg}
                          onChange={(e) => setCalendarFilterOrg(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#003b27]"
                        >
                          <option value="ALL">All Organizations</option>
                          <option value="AO">Accredited Organizations</option>
                          <option value="LSG">Local Student Government</option>
                          <option value="GSC">Graduating Student Council</option>
                          <option value="LCO">League of Campus Organization</option>
                          <option value="USG">University Student Government</option>
                          <option value="TGP">The Gold Panicles</option>
                        </select>
                      </div>

                      {/* Event Type Filter */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Event Type</label>
                        <select
                          value={calendarFilterEventType}
                          onChange={(e) => setCalendarFilterEventType(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#003b27]"
                        >
                          <option value="ALL">All Events</option>
                          <option value="event">Regular Events</option>
                          <option value="deadline">Deadlines Only</option>
                        </select>
                      </div>

                      {/* Date Range Filter */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">From</label>
                          <input
                            type="date"
                            value={calendarFilterDateFrom}
                            onChange={(e) => setCalendarFilterDateFrom(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#003b27]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">To</label>
                          <input
                            type="date"
                            value={calendarFilterDateTo}
                            onChange={(e) => setCalendarFilterDateTo(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#003b27]"
                          />
                        </div>
                      </div>

                      {/* Clear Filters */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-gray-500 hover:text-gray-700"
                        onClick={() => {
                          setCalendarFilterOrg("ALL");
                          setCalendarFilterEventType("ALL");
                          setCalendarFilterDateFrom("");
                          setCalendarFilterDateTo("");
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>

                    {/* Events List */}
                    <div className="max-h-[400px] overflow-y-auto space-y-2">
                      {(() => {
                        const filteredEvents = events.filter((event) => {
                          // Filter by organization - "ALL" means show all events, not filter by targetOrganization === "ALL"
                          if (calendarFilterOrg !== "ALL" && event.targetOrganization !== calendarFilterOrg && event.targetOrganization !== "ALL") {
                            return false;
                          }
                          // Filter by event type
                          if (calendarFilterEventType === "deadline" && !event.isDeadline) {
                            return false;
                          }
                          if (calendarFilterEventType === "event" && event.isDeadline) {
                            return false;
                          }
                          // Filter by date range
                          if (calendarFilterDateFrom && new Date(event.startDate) < new Date(calendarFilterDateFrom)) {
                            return false;
                          }
                          if (calendarFilterDateTo && new Date(event.endDate) > new Date(calendarFilterDateTo)) {
                            return false;
                          }
                          return true;
                        }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

                        if (filteredEvents.length === 0) {
                          return (
                            <div className="text-center py-8 text-gray-400">
                              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No events match your filters</p>
                            </div>
                          );
                        }

                        return filteredEvents.map((event) => (
                          <div
                            key={event.id}
                            className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
                            style={{ borderLeftWidth: '4px', borderLeftColor: event.isDeadline ? '#ef4444' : event.color || '#003b27' }}
                            onClick={() => {
                              setSelectedDate(new Date(event.startDate));
                              setCurrentDate(new Date(new Date(event.startDate).getFullYear(), new Date(event.startDate).getMonth(), 1));
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate" style={{ color: "#003b27" }}>
                                  {event.isDeadline && (
                                    <span className="inline-flex items-center gap-1 text-red-500 mr-1">
                                      <AlertTriangle className="h-3 w-3" />
                                    </span>
                                  )}
                                  {event.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  {event.startDate !== event.endDate && ` - ${new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                                </p>
                                {event.targetOrganization && (
                                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 text-gray-600">
                                    {event.targetOrganization}
                                  </span>
                                )}
                              </div>
                              {event.venue && (
                                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate max-w-[60px]">{event.venue}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
              {editingEvent ? "Edit Event" : "Add New Event"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
                {formError}
              </div>
            )}
            <div>
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Event title"
                className={eventErrors.title ? "border-red-500 bg-red-50" : ""}
              />
            </div>
            <div>
              <Label>Description <span className="text-red-500">*</span></Label>
              <Input
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Short description"
                className={eventErrors.description ? "border-red-500 bg-red-50" : ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                  className={eventErrors.startDate ? "border-red-500 bg-red-50" : ""}
                />
              </div>
              <div>
                <Label>End Date <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  className={eventErrors.endDate ? "border-red-500 bg-red-50" : ""}
                />
              </div>
            </div>
            
            {/* Venue */}
            <div>
              <Label>Venue <span className="text-red-500">*</span></Label>
              <Input
                value={eventVenue}
                onChange={(e) => setEventVenue(e.target.value)}
                placeholder="Enter venue or platform"
                className={eventErrors.venue ? "border-red-500 bg-red-50" : ""}
              />
            </div>
            
            {/* Recurrence Type */}
            <div>
              <Label>Recurrence Type (Optional)</Label>
              <select
                value={eventRecurrence}
                onChange={(e) => {
                  setEventRecurrence(e.target.value);
                  setEventRecurrenceDay(""); // Reset day selection when changing type
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#003b27] text-base"
              >
                <option value="">None</option>
                <option value="Day(s)">Day(s)</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Every Year">Every Year</option>
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
              </select>
            </div>

            {/* Day of Week Selection - Only for Weekly recurrence */}
            {eventRecurrence === "Weekly" && (
              <div>
                <Label>Select Day of Week</Label>
                <select
                  value={eventRecurrenceDay}
                  onChange={(e) => setEventRecurrenceDay(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#003b27] text-base"
                >
                  <option value="">-- Select a day --</option>
                  <option value="Monday">Every Monday</option>
                  <option value="Tuesday">Every Tuesday</option>
                  <option value="Wednesday">Every Wednesday</option>
                  <option value="Thursday">Every Thursday</option>
                  <option value="Friday">Every Friday</option>
                  <option value="Saturday">Every Saturday</option>
                  <option value="Sunday">Every Sunday</option>
                </select>
              </div>
            )}
            {!eventAllDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="border-t pt-4 space-y-4">
              <div>
                <Label>Organization <span className="text-red-500">*</span></Label>
                <select
                  value={eventTargetOrg}
                  onChange={(e) => setEventTargetOrg(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#003b27] text-base ${eventErrors.organization ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                >
                  {organizationsList.map((org) => (
                    <option key={org.key} value={org.key}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <Label htmlFor="requireAccomplishment" className="cursor-pointer text-sm font-medium">
                    Set Accomplishment Report
                  </Label>
                  <Checkbox
                    id="requireAccomplishment"
                    checked={eventRequireAccomplishment}
                    onCheckedChange={(checked) =>
                      setEventRequireAccomplishment(checked as boolean)
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <Label htmlFor="requireLiquidation" className="cursor-pointer text-sm font-medium">
                    Set Liquidation Report
                  </Label>
                  <Checkbox
                    id="requireLiquidation"
                    checked={eventRequireLiquidation}
                    onCheckedChange={(checked) =>
                      setEventRequireLiquidation(checked as boolean)
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="allDay"
                  checked={eventAllDay}
                  onCheckedChange={(checked) =>
                    setEventAllDay(checked as boolean)
                  }
                />
                <Label htmlFor="allDay">All Day</Label>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEventModalOpen(false);
                setFormError("");
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEvent}
              className="flex-1"
              style={{ backgroundColor: "#003b27" }}
            >
              {editingEvent ? "Update" : "Save"} Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
              Delete Event
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-base text-gray-700">
              Are you sure you want to delete this event? This action cannot be
              undone.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeleteEventId(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteEvent}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
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

      {/* Inbox Modal - Opens when clicking on calendar dates */}
      <Dialog open={isInboxModalOpen} onOpenChange={setIsInboxModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                style={{ backgroundColor: '#d4af37' }}
              >
                <Inbox className="w-5 h-5" style={{ color: '#003b27' }} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold" style={{ color: "#003b27" }}>
                  INBOX
                </DialogTitle>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                  {selectedDate && selectedDate.toDateString() === new Date().toDateString() ? "Today" : "Selected Date"}
                </p>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">
              {selectedDate
                ? formatSelectedDate(selectedDate)
                : "Select a date"}
            </span>
          </div>
          
          <div className="space-y-4 overflow-y-auto flex-1 pr-1 mt-4">
            {selectedDate && getEventsForDate(selectedDate).length > 0 ? (
              getEventsForDate(selectedDate).map((event) => {
                const dayNumber = getEventDayNumber(event, selectedDate);
                const eventColor = getEventColor(event.id);
                const isToday = 
                  selectedDate.getDate() === new Date().getDate() &&
                  selectedDate.getMonth() === new Date().getMonth() &&
                  selectedDate.getFullYear() === new Date().getFullYear();
                
                // Professional deadline card styling
                if (event.isDeadline) {
                  return (
                    <div
                      key={event.id}
                      className="rounded-xl overflow-hidden shadow-md border border-red-200 bg-white"
                    >
                      <div className="px-4 py-3 bg-gradient-to-r from-red-600 to-rose-600 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-white font-bold text-sm uppercase tracking-wider">
                            {event.deadlineType === 'accomplishment' ? 'Accomplishment Report Due' : 'Liquidation Report Due'}
                          </span>
                        </div>
                        <span className="text-xs text-red-100 font-medium">
                          Due Today
                        </span>
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-gray-800 mb-1">
                          {event.title}
                        </h4>
                        <OSLDDeadlineNotification 
                          deadlineType={event.deadlineType}
                          eventId={event.parentEventId}
                          targetOrg={event.targetOrganization}
                          setActiveNav={setActiveNav}
                          setActiveSubmissionTab={setActiveSubmissionTab}
                        />
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
                        borderBottom: `3px solid ${eventColor}`
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: eventColor }}
                        />
                        <span className="font-bold text-sm" style={{ color: '#003b27' }}>
                          {isToday ? 'Today' : 'Event'}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full hover:bg-white/50"
                          onClick={() => {
                            setIsInboxModalOpen(false);
                            openEditEventModal(event);
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" style={{ color: "#003b27" }} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full hover:bg-red-50"
                          onClick={() => {
                            setIsInboxModalOpen(false);
                            confirmDeleteEvent(event.id);
                          }}
                        >
                          <X className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
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
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-400 font-medium">No events</p>
                <p className="text-gray-300 text-sm mt-1">This date has no scheduled events</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialogs */}
      <DeleteConfirmationDialog
        open={isDeleteOfficerDialogOpen}
        onOpenChange={setIsDeleteOfficerDialogOpen}
        title="Delete Officer"
        description="Are you sure you want to delete this officer? This action cannot be undone."
        itemName={deleteOfficerName}
        onConfirm={removeOfficer}
        isDangerous={true}
      />

      <DeleteConfirmationDialog
        open={isDeleteAdviserDialogOpen}
        onOpenChange={setIsDeleteAdviserDialogOpen}
        title="Delete Director"
        description="Are you sure you want to delete this director? This action cannot be undone."
        itemName={deleteAdviserName}
        onConfirm={removeAdviser}
        isDangerous={true}
      />

      <DeleteConfirmationDialog
        open={isDeleteDocumentDialogOpen}
        onOpenChange={setIsDeleteDocumentDialogOpen}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        itemName={deleteDocumentName}
        onConfirm={handleDeleteDocument}
        isDangerous={true}
      />
    </div>
  );
}
