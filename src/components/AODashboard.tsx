import React, { useState, useEffect, memo, useCallback, useMemo } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Bell,
  User,
  Menu,
  LogOut,
  ArrowLeft,
  Eye,
  EyeOff,
  Edit2,
  X,
  Download,
  Users,
  Upload,
  AlertTriangle,
  FileText,
  CheckCircle,
  DollarSign,
  Link2,
  Calendar as CalendarIcon,
  ExternalLink,
  Image as ImageIcon,
  Building2,
  Info,
  Folder,
  ChevronDown,
  ChevronUp,
  MapPin,
  Trash2,
  Clock,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import OrganizationsPage from "@/components/OrganizationsPage";
import FileAnnotationViewer from "@/components/FileAnnotationViewer";
import SubmissionsPage from "@/components/SubmissionsPage";
import { COASubmissionsPage } from "@/components/COASubmissionsPage";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

import DeadlineAppealSection from "@/components/DeadlineAppealSection";

/* DeadlineAppealSection moved to separate file */

interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  targetOrganization?: string;
  requireAccomplishment?: boolean;
  requireLiquidation?: boolean;
  isDeadline?: boolean;
  deadlineType?: 'accomplishment' | 'liquidation';
  parentEventId?: string;
  isPending?: boolean;
  submittingOrganization?: string;
  isReviewingOrg?: boolean;
  isMonitoringOrg?: boolean;
  isSubmittingOrg?: boolean;
  submittedTo?: string;
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

interface AODashboardProps {
  orgName?: string;
  orgShortName?: string;
  showDeadline?: boolean;
  showAddButton?: boolean;
}

function AODashboard({ 
  orgName = "Accredited Organization", 
  orgShortName = "AO",
  showDeadline = true,
  showAddButton = false 
}: AODashboardProps) {
  const navStorageKey = `${orgShortName.toLowerCase()}_activeNav`;
  const submissionTabStorageKey = `${orgShortName.toLowerCase()}_activeSubmissionTab`;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [activeNav, setActiveNav] = useState(() => localStorage.getItem(navStorageKey) || "Dashboard");
  const [activeSubmissionTab, setActiveSubmissionTab] = useState(() => localStorage.getItem(submissionTabStorageKey) || "Request to Conduct Activity");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotificationPopover, setShowNotificationPopover] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; eventTitle: string; eventDescription: string; createdBy: string; createdAt: string; isRead: boolean }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isAuditFilesExpanded, setIsAuditFilesExpanded] = useState(false);
  const [selectedTemplateOrg, setSelectedTemplateOrg] = useState<string | null>(null);
  const [uploadedTemplates, setUploadedTemplates] = useState<Record<string, { fiscal?: { fileName: string; fileUrl: string } }>>({});

  useEffect(() => {
    localStorage.setItem(navStorageKey, activeNav);
  }, [activeNav, navStorageKey]);

  useEffect(() => {
    localStorage.setItem(submissionTabStorageKey, activeSubmissionTab);
  }, [activeSubmissionTab, submissionTabStorageKey]);
  
  // Profile state
  const [showProfile, setShowProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [orgLogo, setOrgLogo] = useState<string>("");
  
  // Accomplishment Report state
  const [accomplishmentActivityTitle, setAccomplishmentActivityTitle] = useState("");
  const [accomplishmentFiles, setAccomplishmentFiles] = useState<{
    narrativeReport: File | null;
    documentation: File | null;
    attendance: File | null;
    evaluationReport: File | null;
    approveLetterToConduct: File | null;
  }>({
    narrativeReport: null,
    documentation: null,
    attendance: null,
    evaluationReport: null,
    approveLetterToConduct: null,
  });
  const [accomplishmentErrors, setAccomplishmentErrors] = useState({
    title: false,
    files: false,
  });
  
  // Liquidation Report state
  const [liquidationActivityTitle, setLiquidationActivityTitle] = useState("");
  const [liquidationFiles, setLiquidationFiles] = useState<{
    liquidationReportPerEvent: File | null;
    breakdownOfExpenses: File | null;
    dozeDsa: File | null;
    officialReceipt: File | null;
    others: File | null;
  }>({
    liquidationReportPerEvent: null,
    breakdownOfExpenses: null,
    dozeDsa: null,
    officialReceipt: null,
    others: null,
  });
  const [liquidationErrors, setLiquidationErrors] = useState({
    title: false,
    files: false,
  });
  
  // Event linking state for submissions
  const [currentEventIdForSubmission, setCurrentEventIdForSubmission] = useState<string | null>(null);
  
  // Helper function to validate UUID format
  const isValidUUID = (uuid: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
  };
  
  // Accomplishment Report handlers
  const isValidGdriveLink = (link: string) => {
    return link.includes('drive.google.com') || link.includes('docs.google.com') || link.includes('drive') || link.includes('google');
  };

  const uploadAccomplishmentFile = async (file: File, label: string, submissionId: string) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) throw new Error(`Only PDF files are allowed. "${file.name}" is not a PDF.`);
    const fileExt = file.name.split('.').pop();
    const fileName = `${orgShortName}_${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    // Include submission_id in path to ensure files are strictly isolated per submission
    const filePath = `accomplishment-reports/${submissionId}/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('osld-files')
      .upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage
      .from('osld-files')
      .getPublicUrl(filePath);
    return { url: publicUrl, name: `${label}: ${file.name}` };
  };

  const handleAccomplishmentSubmit = async (eventIdToLink?: string) => {
    const allFilesPresent =
      accomplishmentFiles.narrativeReport &&
      accomplishmentFiles.documentation &&
      accomplishmentFiles.attendance &&
      accomplishmentFiles.evaluationReport &&
      accomplishmentFiles.approveLetterToConduct;

    const errors = {
      title: !accomplishmentActivityTitle,
      files: !allFilesPresent,
    };

    setAccomplishmentErrors(errors);

    if (errors.title || errors.files) {
      return;
    }
    
    try {
      // Determine target organization based on current org
      // NEW ROUTING: USED, LCO, USG, GSC, TGP → COA
      // LSG → USG, AO → LCO
      let targetOrg = 'LCO'; // Default for AO (Accredited Orgs)
      if (orgShortName === 'LSG') {
        targetOrg = 'USG';
      } else if (['LCO', 'USG', 'GSC', 'USED', 'TGP'].includes(orgShortName)) {
        targetOrg = 'COA';
      }

      // Step 1: Insert DB row first to get submission_id BEFORE uploading files
      // This ensures files are stored under the correct submission_id path
      const { data: submissionData, error: dbError } = await supabase
        .from('submissions')
        .insert({
          organization: orgShortName,
          submission_type: 'Accomplishment Report',
          activity_title: accomplishmentActivityTitle,
          activity_duration: 'N/A',
          activity_venue: 'N/A',
          activity_participants: 'N/A',
          activity_funds: 'N/A',
          activity_budget: 'N/A',
          activity_sdg: 'N/A',
          activity_likha: 'N/A',
          file_url: '',
          file_name: '',
          file_urls: '',
          status: 'Pending',
          submitted_to: targetOrg,
          event_id: eventIdToLink && isValidUUID(eventIdToLink) ? eventIdToLink : null,
        })
        .select('id')
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw dbError;
      }

      if (!submissionData?.id) {
        throw new Error('Submission created but no id was returned.');
      }

      const submissionId = submissionData.id;

      // Step 2: Upload all files with submission_id in path (strict per-submission isolation)
      const uploads = await Promise.all([
        uploadAccomplishmentFile(accomplishmentFiles.narrativeReport!, 'Narrative Report', submissionId),
        uploadAccomplishmentFile(accomplishmentFiles.documentation!, 'Documentation', submissionId),
        uploadAccomplishmentFile(accomplishmentFiles.attendance!, 'Attendance', submissionId),
        uploadAccomplishmentFile(accomplishmentFiles.evaluationReport!, 'Evaluation Report', submissionId),
        uploadAccomplishmentFile(accomplishmentFiles.approveLetterToConduct!, 'Approve Letter to Conduct Activity', submissionId),
      ]);

      const primaryUrl = uploads[0].url;
      const allFileNames = uploads.map(u => u.name).join(' | ');
      const allFileUrls = uploads.map(u => u.url).join(' | ');

      // Step 3: Update submission row with actual file URLs
      await supabase
        .from('submissions')
        .update({
          file_url: primaryUrl,
          file_name: allFileNames,
          file_urls: allFileUrls,
        })
        .eq('id', submissionId);

      // Check if this is a revision for an existing "For Revision" submission
      // If so, update the old "For Revision" submission to "Pending"
      await updateRevisionStatus(accomplishmentActivityTitle, 'Accomplishment Report', 'Pending');


      // Create notification for target organization
      const orgFullNames: Record<string, string> = {
        "OSLD": "Office of Student Life and Development",
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
          event_id: submissionId,
          event_description: `${orgFullNames[orgShortName] || orgShortName} submitted an Accomplishment Report for "${accomplishmentActivityTitle}". Check it out!`,
          created_by: orgShortName,
          target_org: targetOrg
        });

      handleAccomplishmentCancel();
      setSuccessSubmissionType("Accomplishment Report");
      setShowSuccessDialog(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Please try again.';

      console.error('Error submitting accomplishment report:', error);
      alert(`Failed to submit accomplishment report: ${message}`);
    }
  };

  const handleAccomplishmentCancel = () => {
    setAccomplishmentActivityTitle("");
    setAccomplishmentFiles({
      narrativeReport: null,
      documentation: null,
      attendance: null,
      evaluationReport: null,
      approveLetterToConduct: null,
    });
    setAccomplishmentErrors({ title: false, files: false });
    setCurrentEventIdForSubmission(null);
  };

  // Liquidation Report handlers
  const uploadLiquidationFile = async (file: File, label: string, submissionId: string) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) throw new Error(`Only PDF files are allowed. "${file.name}" is not a PDF.`);
    const fileExt = file.name.split('.').pop();
    const fileName = `${orgShortName}_${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    // Include submission_id in path to ensure strict per-submission isolation
    const filePath = `liquidation-reports/${submissionId}/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('osld-files')
      .upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage
      .from('osld-files')
      .getPublicUrl(filePath);
    return { url: publicUrl, name: `${label}: ${file.name}` };
  };

  const handleLiquidationSubmit = async (eventIdToLink?: string) => {
    const allFilesPresent =
      liquidationFiles.liquidationReportPerEvent &&
      liquidationFiles.breakdownOfExpenses &&
      liquidationFiles.dozeDsa &&
      liquidationFiles.officialReceipt;

    const errors = {
      title: !liquidationActivityTitle,
      files: !allFilesPresent,
    };

    setLiquidationErrors(errors);

    if (errors.title || errors.files) {
      return;
    }
    
    try {
      // Determine target organization based on current org
      // LIQUIDATION ROUTING:
      // NEW ROUTING: USED, LCO, USG, GSC, TGP → COA
      // AO → LCO (then can be endorsed to COA by LCO)
      // LSG → USG (then can be endorsed to COA by USG)
      let targetOrg = 'LCO'; // Default for AO (Accredited Orgs)
      if (orgShortName === 'LSG') {
        targetOrg = 'USG';
      } else if (['LCO', 'USG', 'GSC', 'USED', 'TGP'].includes(orgShortName)) {
        targetOrg = 'COA';
      }

      // Step 1: Insert DB row first to get submission_id BEFORE uploading files
      const { data: submissionData, error: dbError } = await supabase
        .from('submissions')
        .insert({
          organization: orgShortName,
          submission_type: 'Liquidation Report',
          activity_title: liquidationActivityTitle,
          activity_duration: 'N/A',
          activity_venue: 'N/A',
          activity_participants: 'N/A',
          activity_funds: 'N/A',
          activity_budget: 'N/A',
          activity_sdg: 'N/A',
          activity_likha: 'N/A',
          file_url: '',
          file_name: '',
          file_urls: '',
          status: 'Pending',
          submitted_to: targetOrg,
          event_id: eventIdToLink && isValidUUID(eventIdToLink) ? eventIdToLink : null,
        })
        .select('id')
        .single();

      if (dbError) throw dbError;

      if (!submissionData?.id) {
        throw new Error('Submission created but no id was returned.');
      }

      const submissionId = submissionData.id;

      // Step 2: Upload all files with submission_id in path for strict isolation
      const requiredUploads = await Promise.all([
        uploadLiquidationFile(liquidationFiles.liquidationReportPerEvent!, 'Liquidation Report Per Event', submissionId),
        uploadLiquidationFile(liquidationFiles.breakdownOfExpenses!, 'Breakdown of Expenses', submissionId),
        uploadLiquidationFile(liquidationFiles.dozeDsa!, 'DoZE & DSA', submissionId),
        uploadLiquidationFile(liquidationFiles.officialReceipt!, 'Official Receipt and Needed Fiscal Forms, Procurement Forms', submissionId),
      ]);

      const optionalUploads = liquidationFiles.others
        ? [await uploadLiquidationFile(liquidationFiles.others, 'Others', submissionId)]
        : [];

      const uploads = [...requiredUploads, ...optionalUploads];
      const primaryUrl = uploads[0].url;
      const allFileNames = uploads.map(u => u.name).join(' | ');
      const allFileUrls = uploads.map(u => u.url).join(' | ');

      // Step 3: Update submission row with actual file URLs
      await supabase
        .from('submissions')
        .update({
          file_url: primaryUrl,
          file_name: allFileNames,
          file_urls: allFileUrls,
        })
        .eq('id', submissionId);

      // Check if this is a revision for an existing "For Revision" submission
      // If so, update the old "For Revision" submission to "Pending"
      await updateRevisionStatus(liquidationActivityTitle, 'Liquidation Report', 'Pending');

      // Create notification for target organization
      const orgFullNames: Record<string, string> = {
        "OSLD": "Office of Student Life and Development",
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
          event_id: submissionId,
          event_title: `New Liquidation Report from ${orgFullNames[orgShortName] || orgShortName}`,
          event_description: `${orgFullNames[orgShortName] || orgShortName} submitted a Liquidation Report for "${liquidationActivityTitle}". Check it out!`,
          created_by: orgShortName,
          target_org: targetOrg
        });

      handleLiquidationCancel();
      setSuccessSubmissionType("Liquidation Report");
      setShowSuccessDialog(true);
    } catch (error: unknown) {
      console.error('Error submitting liquidation report:', error);
      alert('Failed to submit liquidation report. Please try again.');
    }
  };

  const handleLiquidationCancel = () => {
    setLiquidationActivityTitle("");
    setLiquidationFiles({
      liquidationReportPerEvent: null,
      breakdownOfExpenses: null,
      dozeDsa: null,
      officialReceipt: null,
      others: null,
    });
    setLiquidationErrors({ title: false, files: false });
    setCurrentEventIdForSubmission(null);
  };
  
  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      // Load from localStorage first (set during login) - use organization-specific keys
      const orgKey = orgShortName.toLowerCase();
      const storedEmail = localStorage.getItem(`${orgKey}_userEmail`);
      const storedPassword = localStorage.getItem(`${orgKey}_userPassword`);
      
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
  
  // Check account status
  useEffect(() => {
    const checkAccountStatus = async () => {
      const orgKey = orgShortName.toLowerCase();
      const storedEmail = localStorage.getItem(`${orgKey}_userEmail`);
      
      if (storedEmail) {
        const { data, error } = await supabase
          .from('org_accounts')
          .select('status')
          .eq('email', storedEmail)
          .single();
        
        if (data && !error) {
          setAccountStatus(data.status);
          setIsOnHold(data.status === 'On Hold');
        }
      }
    };
    checkAccountStatus();
    
    // Check status periodically
    const interval = setInterval(checkAccountStatus, 30000);
    return () => clearInterval(interval);
  }, [orgShortName]);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  
  // Account status state
  const [accountStatus, setAccountStatus] = useState<string>("Active");
  const [isOnHold, setIsOnHold] = useState(false);
  const [isOnHoldDialogOpen, setIsOnHoldDialogOpen] = useState(false);
  
  // Profile sections state
  const [accreditationStatus, setAccreditationStatus] = useState("Active");
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [advisers, setAdvisers] = useState<Officer[]>([]);
  const [resolutionFiles, setResolutionFiles] = useState<File[]>([]);
  const [actionPlanFiles, setActionPlanFiles] = useState<File[]>([]);
  const [budgetProposalFiles, setBudgetProposalFiles] = useState<File[]>([]);
  const [coaTransitionalFiles, setCoaTransitionalFiles] = useState<File[]>([]);
  const [platforms, setPlatforms] = useState({ facebook: "" });
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  
  // Officer/Adviser modal state
  const [isOfficerModalOpen, setIsOfficerModalOpen] = useState(false);
  const [isAdviserModalOpen, setIsAdviserModalOpen] = useState(false);
  const [isSocialContactModalOpen, setIsSocialContactModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);
  const [editingAdviser, setEditingAdviser] = useState<Officer | null>(null);
  const [officerName, setOfficerName] = useState("");
  const [officerRole, setOfficerRole] = useState("");
  const [officerProgram, setOfficerProgram] = useState("");
  const [officerIdNumber, setOfficerIdNumber] = useState("");
  const [officerImage, setOfficerImage] = useState("");
  const [adviserName, setAdviserName] = useState("");
  const [adviserYearsExperience, setAdviserYearsExperience] = useState("");
  const [adviserExpertise, setAdviserExpertise] = useState<string[]>([]);
  const [adviserImage, setAdviserImage] = useState("");
  const [editFacebookLink, setEditFacebookLink] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  
  // Officer delete confirmation state
  const [officerToDelete, setOfficerToDelete] = useState<Officer | null>(null);
  const [isOfficerDeleteDialogOpen, setIsOfficerDeleteDialogOpen] = useState(false);
  const [officerErrors, setOfficerErrors] = useState({
    name: false,
    role: false,
    program: false,
    idNumber: false
  });
  
  // Adviser delete confirmation state
  const [adviserToDelete, setAdviserToDelete] = useState<Officer | null>(null);
  const [isAdviserDeleteDialogOpen, setIsAdviserDeleteDialogOpen] = useState(false);
  const [adviserErrors, setAdviserErrors] = useState({
    name: false
  });
  
  // Activity Logs filter state
  const [logFilterType, setLogFilterType] = useState<string>("all");
  const [logFilterAction, setLogFilterAction] = useState<string>("all");
  const [logFilterDate, setLogFilterDate] = useState<Date | undefined>(undefined);
  const [activeLogTab, setActiveLogTab] = useState<"my-logs" | "other-logs" | "coa-remarks">("my-logs");
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  // Event modal state (for COA add button)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventTargetOrg, setEventTargetOrg] = useState("ALL");
  const [eventRequireAccomplishment, setEventRequireAccomplishment] = useState(false);
  const [eventRequireLiquidation, setEventRequireLiquidation] = useState(false);
  const [formError, setFormError] = useState("");
  const [eventErrors, setEventErrors] = useState<{title?: boolean; description?: boolean; startDate?: boolean}>({});
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [activeView, setActiveView] = useState<"TODAY" | "EVENT" | "DEADLINE">("TODAY");

  // Organization list for dropdown
  const organizationsList = [
    { key: "ALL", name: "All Organizations" },
    { key: "AO", name: "Accredited Organizations" },
    { key: "LSG", name: "Local Student Government" },
    { key: "GSC", name: "Graduating Student Council" },
    { key: "LCO", name: "League of Campus Organization" },
    { key: "USG", name: "University Student Government" },
    { key: "TGP", name: "The Gold Panicles" },
    { key: "USED", name: "University Student Enterprise Development" },
  ];

  // Request to Conduct Activity state
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDate, setActivityDate] = useState<Date>();
  const [activityEndDate, setActivityEndDate] = useState<Date>();
  const [activityRecurrenceType, setActivityRecurrenceType] = useState("");
  const [activityVenue, setActivityVenue] = useState("");
  const [activityParticipants, setActivityParticipants] = useState("");
  const [activityFunds, setActivityFunds] = useState("");
  const [activityBudget, setActivityBudget] = useState("");
  const [activitySDG, setActivitySDG] = useState<string[]>([]);
  const [activityLIKHA, setActivityLIKHA] = useState("");
  const [activityFiles, setActivityFiles] = useState<{
    endorsementLetter: File | null;
    letterToConduct: File | null;
    activityDesign: File | null;
  }>({
    endorsementLetter: null,
    letterToConduct: null,
    activityDesign: null,
  });
  const [activityErrors, setActivityErrors] = useState({
    title: false,
    date: false,
    recurrenceType: false,
    venue: false,
    participants: false,
    funds: false,
    budget: false,
    sdg: false,
    likha: false,
    files: false
  });
  const [hasPendingSubmission, setHasPendingSubmission] = useState(false);
  const [pendingSubmissionStatus, setPendingSubmissionStatus] = useState<string | null>(null);
  const [showPendingDialog, setShowPendingDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successSubmissionType, setSuccessSubmissionType] = useState<string>("");

  // Activity Logs state
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isLogDetailOpen, setIsLogDetailOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<any>(null);
  const [hasMissedDeadline, setHasMissedDeadline] = useState(false);

  // Preview annotation state (for submitter "View Annotated" flow)
  const [previewAnnotation, setPreviewAnnotation] = useState<{ url: string; name: string; submissionId: string; revisionReason?: string } | null>(null);
  const [isPreviewAnnotationOpen, setIsPreviewAnnotationOpen] = useState(false);

  // Revision upload state (for submitter "For Revision" flow)
  const [revisionUploadFile, setRevisionUploadFile] = useState<{ submissionId: string; fileUrl: string; fileName: string } | null>(null);
  const [revisionUploadInput, setRevisionUploadInput] = useState<File | null>(null);
  const [isUploadingRevision, setIsUploadingRevision] = useState(false);

  // Activity Logs filtering logic (must be at top level for hooks)
  const filterLogs = useCallback((logs: any[]) => {
    return logs.filter(log => {
      // Filter by type
      if (logFilterType !== "all" && log.type !== logFilterType) return false;
      // Filter by action/status
      if (logFilterAction !== "all" && log.status !== logFilterAction) return false;
      // Filter by date
      if (logFilterDate) {
        const logDate = new Date(log.submitted_at || log.date);
        const filterDate = new Date(logFilterDate);
        if (logDate.toDateString() !== filterDate.toDateString()) return false;
      }
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const titleMatch = log.activity_title?.toLowerCase().includes(searchLower);
        const orgMatch = log.organization?.toLowerCase().includes(searchLower);
        const typeMatch = log.type?.toLowerCase().includes(searchLower);
        const statusMatch = log.status?.toLowerCase().includes(searchLower);
        if (!titleMatch && !orgMatch && !typeMatch && !statusMatch) return false;
      }
      return true;
    });
  }, [logFilterType, logFilterAction, logFilterDate, searchTerm]);

  // Get filtered my logs with useMemo for performance
  const myLogs = useMemo(() => 
    filterLogs(activityLogs.filter(log => log.organization === orgShortName)),
    [filterLogs, activityLogs, orgShortName]
  );
  
  // Get filtered other org logs (for LCO/USG)
  const otherOrgLogs = useMemo(() => 
    filterLogs(activityLogs.filter(log => 
      log.organization !== orgShortName && 
      (log.submitted_to === orgShortName || log.approvedBy === orgShortName || log.approved_by === orgShortName) && 
      (log.status === 'Approved' || log.status === 'For Revision')
    )),
    [filterLogs, activityLogs, orgShortName]
  );
  
  // Get COA remarks logs
  const coaRemarksLogs = useMemo(() => 
    filterLogs(activityLogs.filter(log => 
      log.organization === orgShortName && (log.coaAction || log.coaComment)
    )),
    [filterLogs, activityLogs, orgShortName]
  );

  // For COA: Get all org activity logs (filter by AR, LR, LOA types and specific statuses - NO PENDING)
  const coaOrgActivityLogs = useMemo(() => 
    filterLogs(activityLogs.filter(log => 
      ['Accomplishment Report', 'Liquidation Report', 'Letter of Appeal'].includes(log.type) &&
      ['For Revision', 'Rejected'].includes(log.status)
    )),
    [filterLogs, activityLogs]
  );

  // Determine which tabs to show based on org
  const showOtherOrgTab = orgShortName === 'LCO' || orgShortName === 'USG';

  // Load events from database
  const loadEvents = async () => {
    try {
      const { data: eventsData } = await supabase
        .from('osld_events')
        .select('*, accomplishment_deadline_override, liquidation_deadline_override');

      // Fetch submissions - for LCO/USG also fetch from their target orgs
      let submissionsQuery = supabase
        .from('submissions')
        .select('event_id, submission_type, status, activity_title, organization, submitted_to');
      
      if (orgShortName === 'LCO') {
        // LCO monitors AO and LCO submissions
        submissionsQuery = submissionsQuery
          .in('submission_type', ['Accomplishment Report', 'Liquidation Report'])
          .in('organization', ['LCO', 'AO']);
      } else if (orgShortName === 'USG') {
        // USG monitors LSG and USG submissions
        submissionsQuery = submissionsQuery
          .in('submission_type', ['Accomplishment Report', 'Liquidation Report'])
          .in('organization', ['USG', 'LSG']);
      } else if (orgShortName === 'COA' || orgShortName === 'OSLD') {
        // COA and OSLD monitor ALL submissions
        submissionsQuery = submissionsQuery
          .in('submission_type', ['Accomplishment Report', 'Liquidation Report']);
      } else {
        // Other orgs only see their own submissions
        submissionsQuery = submissionsQuery
          .in('submission_type', ['Accomplishment Report', 'Liquidation Report'])
          .eq('organization', orgShortName);
      }
      
      const { data: submissionsData } = await submissionsQuery;

      if (eventsData) {
        const formattedEvents: Event[] = [];

        eventsData.forEach((e) => {
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
          });

          let shouldShowDeadline = false;

          if (orgShortName === 'LCO') {
            shouldShowDeadline =
              e.target_organization === 'AO' || e.target_organization === 'LCO';
          } else if (orgShortName === 'USG') {
            shouldShowDeadline =
              e.target_organization === 'LSG' || e.target_organization === 'USG';
          } else if (orgShortName === 'COA') {
            // COA sees all deadlines
            shouldShowDeadline = true;
          } else {
            // Show deadline if target_organization matches current org OR is set to 'ALL'
            shouldShowDeadline = e.target_organization === orgShortName || e.target_organization === 'ALL';
          }

          if (shouldShowDeadline && e.end_date) {
            const accomSubmission = submissionsData?.find(
              (s) =>
                (s.event_id === e.id || s.activity_title === e.title) &&
                s.submission_type === 'Accomplishment Report',
            );
            // Only hide deadline if the CORRECT org's submission is approved
            const hasApprovedAccom = (accomSubmission?.status === 'Approved' || accomSubmission?.status === 'Deleted (Previously Approved)') &&
              accomSubmission?.organization === e.target_organization;
            // Mark as pending if:
            // - It's the current org's OWN submission (Pending status)
            // - OR it's a submission by the target org that this org monitors (LCO monitors AO, USG monitors LSG)
            // - OR for COA/OSLD: submission is from the event's target org (AO/LSG)
            const hasPendingAccom = accomSubmission?.status === 'Pending' && 
              (accomSubmission?.organization === orgShortName || 
               accomSubmission?.organization === e.target_organization ||
               ((orgShortName === 'COA' || orgShortName === 'OSLD') && accomSubmission?.organization === e.target_organization));

            const liqSubmission = submissionsData?.find(
              (s) =>
                (s.event_id === e.id || s.activity_title === e.title) &&
                s.submission_type === 'Liquidation Report',
            );
            // Only hide deadline if the CORRECT org's submission is approved
            const hasApprovedLiq = (liqSubmission?.status === 'Approved' || liqSubmission?.status === 'Deleted (Previously Approved)') &&
              liqSubmission?.organization === e.target_organization;
            // Mark as pending if:
            // - It's the current org's OWN submission (Pending status)
            // - OR it's a submission by the target org that this org monitors (LCO monitors AO, USG monitors LSG)
            // - OR for COA/OSLD: submission is from the event's target org (AO/LSG)
            const hasPendingLiq = liqSubmission?.status === 'Pending' && 
              (liqSubmission?.organization === orgShortName || 
               liqSubmission?.organization === e.target_organization ||
               ((orgShortName === 'COA' || orgShortName === 'OSLD') && liqSubmission?.organization === e.target_organization));

            if (e.require_accomplishment && !hasApprovedAccom) {
              const accomDeadlineDate =
                e.accomplishment_deadline_override ||
                calculateDeadlineDate(e.end_date, 3);
              formattedEvents.push({
                id: `${e.id}-accom-deadline`,
                title: e.title,
                description: `Due date for accomplishment report for "${e.title}"`,
                startDate: accomDeadlineDate,
                endDate: accomDeadlineDate,
                allDay: true,
                isDeadline: true,
                deadlineType: 'accomplishment',
                parentEventId: e.id,
                targetOrganization: e.target_organization,
                hasOverride: !!e.accomplishment_deadline_override,
                isPending: hasPendingAccom,
                submittingOrganization: accomSubmission?.organization,
                isReviewingOrg:
                  hasPendingAccom &&
                  accomSubmission?.organization !== orgShortName &&
                  accomSubmission?.submitted_to === orgShortName,
                isMonitoringOrg:
                  hasPendingAccom &&
                  (orgShortName === 'COA' || orgShortName === 'OSLD') &&
                  accomSubmission?.organization !== orgShortName &&
                  (accomSubmission?.submitted_to === 'LCO' || accomSubmission?.submitted_to === 'USG'),
                isSubmittingOrg:
                  hasPendingAccom &&
                  accomSubmission?.organization === orgShortName,
                submittedTo: accomSubmission?.submitted_to,
              });
            }

            if (e.require_liquidation && !hasApprovedLiq) {
              const liqDeadlineDate =
                e.liquidation_deadline_override ||
                calculateDeadlineDate(e.end_date, 7);
              formattedEvents.push({
                id: `${e.id}-liq-deadline`,
                title: e.title,
                description: `Due date for liquidation report for "${e.title}"`,
                startDate: liqDeadlineDate,
                endDate: liqDeadlineDate,
                allDay: true,
                isDeadline: true,
                deadlineType: 'liquidation',
                parentEventId: e.id,
                targetOrganization: e.target_organization,
                hasOverride: !!e.liquidation_deadline_override,
                isPending: hasPendingLiq,
                submittingOrganization: liqSubmission?.organization,
                isReviewingOrg:
                  hasPendingLiq &&
                  liqSubmission?.organization !== orgShortName &&
                  liqSubmission?.submitted_to === orgShortName,
                isMonitoringOrg:
                  hasPendingLiq &&
                  (orgShortName === 'COA' || orgShortName === 'OSLD') &&
                  liqSubmission?.organization !== orgShortName &&
                  (liqSubmission?.submitted_to === 'LCO' || liqSubmission?.submitted_to === 'USG'),
                isSubmittingOrg:
                  hasPendingLiq &&
                  liqSubmission?.organization === orgShortName,
                submittedTo: liqSubmission?.submitted_to,
              });
            }
          }
        });

        setEvents(formattedEvents);
      }

      // Load notifications - only notifications targeted to this org or ALL
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .or(`target_org.eq.${orgShortName},target_org.eq.ALL`)
        .order('created_at', { ascending: false });
      
      // Load read status for this organization
      const { data: readStatusData } = await supabase
        .from('notification_read_status')
        .select('notification_id')
        .eq('read_by', orgShortName);
      
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error loading events:', message);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [orgShortName]);

  // Auto-populate activity title when coming from a deadline
  useEffect(() => {
    const populateTitleFromEvent = async () => {
      if (currentEventIdForSubmission && (activeNav === 'Accomplishment Report' || activeNav === 'Liquidation Report')) {
        const { data: eventData } = await supabase
          .from('osld_events')
          .select('title')
          .eq('id', currentEventIdForSubmission)
          .single();
        
        if (eventData) {
          if (activeNav === 'Accomplishment Report') {
            setAccomplishmentActivityTitle(eventData.title);
          } else if (activeNav === 'Liquidation Report') {
            setLiquidationActivityTitle(eventData.title);
          }
        }
      }
    };
    populateTitleFromEvent();
  }, [currentEventIdForSubmission, activeNav]);

  // Load organization logo on mount
  useEffect(() => {
    const loadOrgLogo = async () => {
      try {
        const { data: files } = await supabase.storage
          .from('osld-files')
          .list('logos', {
            search: `${orgShortName}_logo`
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
    loadOrgLogo();
  }, [orgShortName]);

  // Check for pending submissions
  useEffect(() => {
    const checkPendingSubmission = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('id, status')
        .eq('organization', orgShortName)
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
  }, [orgShortName]);

  // Load activity logs
  useEffect(() => {
    const loadActivityLogs = async () => {
      let data;
      
      // For COA: Load all AR, LR, LOA submissions that are For Revision or Rejected
      if (orgShortName === 'COA') {
        const { data: coaData } = await supabase
          .from('submissions')
          .select('*')
          .in('submission_type', ['Accomplishment Report', 'Liquidation Report', 'Letter of Appeal', 'Request to Conduct Activity'])
          .order('submitted_at', { ascending: false });
        data = coaData;
      } else {
        // Fetch submissions: own org submissions OR submitted to this org OR approved by this org (endorsed to COA)
        const { data: orgData } = await supabase
          .from('submissions')
          .select('*')
          .or(`organization.eq.${orgShortName},submitted_to.eq.${orgShortName},approved_by.eq.${orgShortName}`)
          .order('submitted_at', { ascending: false });
        data = orgData;
      }
      
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
          coaAction: s.coa_opinion || null,
          coaComment: s.coa_comment || null,
          approvedBy: s.approved_by || s.submitted_to, // Use approved_by field, fallback to submitted_to
          ...s
        })));
        
        // Check for missed deadlines
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const missedDeadline = events.some((event) => {
          if (!event.isDeadline) return false;
          if (event.targetOrganization !== orgShortName) return false;
          
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
      }
    };
    loadActivityLogs();

    // Set up real-time subscription for submissions
    const submissionsChannel = supabase
      .channel('ao-submissions-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'submissions' }, 
        (payload) => {
          console.log('📝 Submissions changed:', payload);
          loadActivityLogs();
          loadEvents(); // Refresh deadlines when submissions change
        }
      )
      .subscribe();

    // Set up real-time subscription for notifications
    const notificationsChannel = supabase
      .channel('ao-notifications-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log('🔔 New notification:', payload);
          // Refresh notifications for this org
          if (payload.new && (payload.new.target_org === orgShortName || payload.new.target_org === 'ALL')) {
            // Reload notifications
            supabase
              .from('notifications')
              .select('*')
              .or(`target_org.eq.${orgShortName},target_org.eq.ALL`)
              .order('created_at', { ascending: false })
              .then(({ data }) => {
                if (data) {
                  setNotifications(data.map(n => ({
                    id: n.id,
                    eventTitle: n.event_title,
                    eventDescription: n.event_description,
                    createdBy: n.created_by,
                    createdAt: n.created_at,
                    isRead: n.is_read || false
                  })));
                  setUnreadCount(data.filter(n => !n.is_read).length);
                }
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(submissionsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [orgShortName, events]);

  // Function to update revision status for matching activity titles
  const updateRevisionStatus = async (activityTitle: string, submissionType: 'Accomplishment Report' | 'Liquidation Report', newStatus: string) => {
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
        
        // Determine the appropriate status based on LCO/COA action
        let finalStatus = newStatus;
        
        // Check if ANY submission for this activity has been approved by LCO or COA
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
          console.log(`✓ Setting status to "Approved" - LCO/COA has approved a resubmission`);
        } else if (!submissionToUpdate.coa_reviewed && !submissionToUpdate.coa_opinion) {
          // No COA action yet, set to Pending
          finalStatus = 'Pending';
          console.log(`✓ Setting status to "Pending" - no LCO/COA action yet`);
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
          // Reload activity logs to reflect changes
          reloadActivityLogs();
        }
      }
    } catch (error) {
      console.error('Error in updateRevisionStatus:', error);
    }
  };

  // Handle revision file upload for submitter
  const handleRevisionFileUpload = async (submissionData: any) => {
    if (!revisionUploadFile || !revisionUploadInput || !submissionData) return;
    setIsUploadingRevision(true);
    try {
      const file = revisionUploadInput;
      const filePath = `submissions/${submissionData.organization || orgShortName}/${submissionData.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(filePath);
      const newFileUrl = urlData.publicUrl;

      const currentFileUrls = (submissionData.file_urls || submissionData.fileUrl || submissionData.file_url || '').split(' | ').filter(Boolean);
      const currentFileNames = (submissionData.fileName || submissionData.file_name || '').split(' | ').filter(Boolean);
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

  // Reload activity logs function
  const reloadActivityLogs = async () => {
    let data;
    
    // For COA: Load all AR, LR, LOA, RTC submissions that are For Revision or Rejected
    if (orgShortName === 'COA') {
      const { data: coaData } = await supabase
        .from('submissions')
        .select('*')
        .in('submission_type', ['Accomplishment Report', 'Liquidation Report', 'Letter of Appeal', 'Request to Conduct Activity'])
        .order('submitted_at', { ascending: false });
      data = coaData;
    } else {
      // Fetch submissions: own org submissions OR submitted to this org OR approved by this org (endorsed to COA)
      const { data: orgData } = await supabase
        .from('submissions')
        .select('*')
        .or(`organization.eq.${orgShortName},submitted_to.eq.${orgShortName},approved_by.eq.${orgShortName}`)
        .order('submitted_at', { ascending: false });
      data = orgData;
    }
    
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
        coaAction: s.coa_opinion || null,
        coaComment: s.coa_comment || null,
        approvedBy: s.approved_by || s.submitted_to,
        ...s
      })));
    }
  };

  // Delete activity log
  const handleDeleteLog = async () => {
    if (!logToDelete) return;

    const logId = logToDelete.id;
    const logFileName = logToDelete.fileName;
    const logStatus = logToDelete.status;
    const logSubmissionType = logToDelete.type; // from map: s.submission_type -> type
    const logActivityTitle = logToDelete.documentName; // from map: s.activity_title -> documentName
    const logEventId = logToDelete.event_id;

    // Close dialog and clear state
    setIsDeleteDialogOpen(false);
    setLogToDelete(null);

    // Immediately remove from UI
    setActivityLogs(prev => prev.filter(log => log.id !== logId));

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
      .eq('organization', orgShortName)
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
        const templatesMap: Record<string, { fiscal?: { fileName: string; fileUrl: string } }> = {};
        data.forEach((template: { organization: string; template_type: string; file_name: string; file_url: string }) => {
          if (!templatesMap[template.organization]) {
            templatesMap[template.organization] = {};
          }
          if (template.template_type === "fiscal") {
            templatesMap[template.organization].fiscal = {
              fileName: template.file_name,
              fileUrl: template.file_url
            };
          }
        });
        setUploadedTemplates(templatesMap);
      }
    };
    loadTemplates();
  }, []);

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
    const orgKey = orgShortName.toLowerCase();
    localStorage.removeItem(`${orgKey}_userEmail`);
    localStorage.removeItem(`${orgKey}_userPassword`);
    localStorage.removeItem("userOrganization");
    localStorage.removeItem("app_lastPath");
    localStorage.removeItem(`${orgKey}_activeNav`);
    localStorage.removeItem(`${orgKey}_activeSubmissionTab`);
    window.location.href = "/";
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
    setEventTargetOrg("ALL");
    setEventRequireAccomplishment(false);
    setEventRequireLiquidation(false);
    setFormError("");
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async () => {
    const errors: {title?: boolean; description?: boolean; startDate?: boolean} = {};
    
    if (!eventTitle.trim()) errors.title = true;
    if (!eventDescription.trim()) errors.description = true;
    if (!eventStartDate) errors.startDate = true;
    
    if (Object.keys(errors).length > 0) {
      setEventErrors(errors);
      setFormError("Please fill in all required fields");
      return;
    }
    
    setEventErrors({});
    setFormError("");

    if (editingEvent) {
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
          target_organization: eventTargetOrg,
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
        targetOrganization: eventTargetOrg,
        requireAccomplishment: eventRequireAccomplishment,
        requireLiquidation: eventRequireLiquidation,
      };
      
      setEvents([...filteredEvents, updatedEvent]);
    } else {
      const newEvent = {
        id: Date.now().toString(),
        title: eventTitle,
        description: eventDescription,
        start_date: eventStartDate,
        end_date: eventEndDate || eventStartDate,
        start_time: eventStartTime,
        end_time: eventEndTime,
        all_day: eventAllDay,
        target_organization: eventTargetOrg,
        require_accomplishment: eventRequireAccomplishment,
        require_liquidation: eventRequireLiquidation,
      };

      await supabase
        .from('osld_events')
        .insert(newEvent);

      // Create notification for new event (notify all orgs except the creator)
      const allOrgs = ['AO', 'LSG', 'GSC', 'LCO', 'USG', 'TGP', 'OSLD', 'COA'];
      const targetOrgs = allOrgs.filter(org => org !== orgShortName);
      const notificationPromises = targetOrgs.map(org => 
        supabase
          .from('notifications')
          .insert({
            event_id: newEvent.id,
            event_title: newEvent.title,
            event_description: newEvent.description,
            created_by: orgShortName,
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
        if (liqDeadline) deadlineInfo += `${accomDeadline ? ', ' : ''}Liquidation Report due: ${liqDeadline}`;
        
        await supabase
          .from('notifications')
          .insert({
            event_id: newEvent.id,
            event_title: `${reportTypes.join(' & ')} Report Required: ${newEvent.title}`,
            event_description: `${orgShortName} requires submission of ${reportTypes.join(' and ')} report for "${newEvent.title}". ${deadlineInfo}`,
            created_by: orgShortName,
            target_org: eventTargetOrg
          });
      }

      setEvents([...events, {
        id: newEvent.id,
        title: newEvent.title,
        description: newEvent.description,
        startDate: newEvent.start_date,
        endDate: newEvent.end_date,
        startTime: newEvent.start_time,
        endTime: newEvent.end_time,
        allDay: newEvent.all_day,
        targetOrganization: newEvent.target_organization,
        requireAccomplishment: newEvent.require_accomplishment,
        requireLiquidation: newEvent.require_liquidation
      }]);

      // Reload notifications - only notifications targeted to this org or ALL
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .or(`target_org.eq.${orgShortName},target_org.eq.ALL`)
        .order('created_at', { ascending: false });
      
      // Load read status for this organization
      const { data: readStatusData } = await supabase
        .from('notification_read_status')
        .select('notification_id')
        .eq('read_by', orgShortName);
      
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
    setEventTargetOrg("ALL");
    setEventRequireAccomplishment(false);
    setEventRequireLiquidation(false);
    setEditingEvent(null);
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
    setEventTargetOrg(event.targetOrganization || "ALL");
    setEventRequireAccomplishment(event.requireAccomplishment || false);
    setEventRequireLiquidation(event.requireLiquidation || false);
    setFormError("");
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    await supabase
      .from('osld_events')
      .delete()
      .eq('id', eventId);
    // Remove the event and any associated deadline events
    setEvents(events.filter(e => e.id !== eventId && e.parentEventId !== eventId));
  };

  // Image upload handler
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

  // Officer functions
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
    // Validate all required fields
    const errors = {
      name: !officerName.trim(),
      role: !officerRole.trim(),
      program: !officerProgram.trim(),
      idNumber: !officerIdNumber.trim()
    };
    
    setOfficerErrors(errors);
    
    if (Object.values(errors).some(Boolean)) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Store role, program, id_number in position field as "Role | Program | ID"
    const position = [officerRole, officerProgram, officerIdNumber].filter(Boolean).join(" | ");
    
    try {
      if (editingOfficer) {
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

        const newOfficer: Officer = {
          id: editingOfficer.id,
          name: officerName,
          position: position,
          image: officerImage,
        };
        setOfficers(officers.map(o => o.id === editingOfficer.id ? newOfficer : o));
      } else {
        const { data, error } = await supabase
          .from("org_officers")
          .insert({
            organization: orgShortName.toLowerCase(),
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
      }

      setIsOfficerModalOpen(false);
      setOfficerName("");
      setOfficerRole("");
      setOfficerProgram("");
      setOfficerIdNumber("");
      setOfficerImage("");
      setEditingOfficer(null);
    } catch (error: unknown) {
      console.error("Error saving officer:", error);
    }
  };

  const removeOfficer = async (id: string) => {
    try {
      const { error } = await supabase
        .from("org_officers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setOfficers(officers.filter(o => o.id !== id));
      setIsOfficerDeleteDialogOpen(false);
      setOfficerToDelete(null);
      toast({
        title: "Officer Removed",
        description: "The officer has been successfully removed.",
      });
    } catch (error: unknown) {
      console.error("Error removing officer:", error);
    }
  };
  
  // Open officer delete confirmation
  const openOfficerDeleteDialog = (officer: Officer) => {
    setOfficerToDelete(officer);
    setIsOfficerDeleteDialogOpen(true);
  };

  // Adviser functions
  const openAddAdviserModal = () => {
    setEditingAdviser(null);
    setAdviserName("");
    setAdviserYearsExperience("");
    setAdviserExpertise([]);
    setAdviserImage("");
    setIsAdviserModalOpen(true);
  };

  const openEditAdviserModal = (adviser: Officer) => {
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
    // Validate required fields
    const errors = {
      name: !adviserName.trim()
    };
    
    setAdviserErrors(errors);
    
    if (Object.values(errors).some(Boolean)) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Store years and expertise in position field as "Years | Expertise1, Expertise2 Adviser"
    const expertiseStr = adviserExpertise.filter(Boolean).join(", ");
    const positionParts = [adviserYearsExperience, expertiseStr].filter(Boolean).join(" | ");
    const finalPosition = positionParts ? `${positionParts} Adviser` : "Adviser";
    
    try {
      if (editingAdviser) {
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
        const { data, error } = await supabase
          .from("org_officers")
          .insert({
            organization: orgShortName.toLowerCase(),
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
      setAdviserYearsExperience("");
      setAdviserExpertise([]);
      setAdviserImage("");
      setEditingAdviser(null);
      setAdviserErrors({ name: false });
    } catch (error: unknown) {
      console.error("Error saving adviser:", error);
    }
  };

  // Open adviser delete confirmation
  const openAdviserDeleteDialog = (adviser: Officer) => {
    setAdviserToDelete(adviser);
    setIsAdviserDeleteDialogOpen(true);
  };

  const removeAdviser = async (id: string) => {
    try {
      const { error } = await supabase
        .from("org_officers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setAdvisers(advisers.filter(a => a.id !== id));
      setIsAdviserDeleteDialogOpen(false);
      setAdviserToDelete(null);
    } catch (error: unknown) {
      console.error("Error removing adviser:", error);
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
          organization: orgShortName.toLowerCase(),
          facebook_url: editFacebookLink || null,
          contact_email: editContactEmail || null,
          contact_phone: editContactPhone || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'organization' });

      if (error) throw error;

      setPlatforms({ facebook: editFacebookLink });
      setContactEmail(editContactEmail);
      setContactPhone(editContactPhone);
      setIsSocialContactModalOpen(false);
    } catch (error: unknown) {
      console.error("Error saving social contacts:", error);
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

  const handleSendVerification = () => {
    setIsVerificationSent(true);
  };

  const handleSaveProfile = () => {
    console.log("Profile saved");
  };

  // Load officers, advisers, and social contacts from database on mount
  useEffect(() => {
    const loadOfficersAndAdvisers = async () => {
      try {
        const { data, error } = await supabase
          .from("org_officers")
          .select("*")
          .eq("organization", orgShortName.toLowerCase());

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
          .eq("organization", orgShortName.toLowerCase())
          .maybeSingle();

        if (data) {
          setPlatforms({ facebook: data.facebook_url || "" });
          setContactEmail(data.contact_email || "");
          setContactPhone(data.contact_phone || "");
        }
      } catch (error: unknown) {
        console.error("Error loading social contacts:", error);
      }
    };

    loadOfficersAndAdvisers();
    loadSocialContacts();
  }, []);

  // Helper function to get events for a specific day
  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => {
      const start = event.startDate;
      const end = event.endDate || event.startDate;
      return dateStr >= start && dateStr <= end;
    });
  };

  // Helper function to check if a day has deadline events
  const hasDeadlineOnDay = (day: number) => {
    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.some(event => {
      if (!event.isDeadline) return false;
      const start = event.startDate;
      const end = event.endDate || event.startDate;
      return dateStr >= start && dateStr <= end;
    });
  };

  // Get events for selected date
  const getEventsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    let filteredEvents = events.filter((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const current = new Date(dateStr);
      return current >= start && current <= end;
    });
    
    // Filter based on active view
    if (activeView === "DEADLINE") {
      filteredEvents = filteredEvents.filter(event => event.isDeadline);
    }
    
    return filteredEvents;
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
    start.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);
    const diffTime = current.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  // Check if org can edit events (only OSLD and COA)
  const canEditEvents = orgShortName === "COA";

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
      const dayDate = new Date(year, currentDate.getMonth(), day);
      const dayEvents = getEventsForDay(day);
      const hasEvent = dayEvents.length > 0;
      const hasDeadline = dayEvents.some(e => e.isDeadline);

      // Determine background style based on activeView
      let bgStyle = {};
      if (activeView === "TODAY") {
        // TODAY view: only yellow for today's date
        if (isToday) {
          bgStyle = { backgroundColor: "rgba(212, 175, 55, 0.2)" };
        }
      } else if (activeView === "DEADLINE") {
        // DEADLINE view: only show deadlines in light red
        if (hasDeadline) {
          bgStyle = { backgroundColor: "rgba(239, 68, 68, 0.15)" };
        }
      } else {
        // EVENT view: show all events
        if (isToday) {
          bgStyle = { backgroundColor: "rgba(212, 175, 55, 0.2)" };
        } else if (hasDeadline) {
          bgStyle = { backgroundColor: "rgba(239, 68, 68, 0.15)" };
        } else if (hasEvent) {
          bgStyle = { backgroundColor: "rgba(0, 59, 39, 0.1)" };
        }
      }

      // Filter events to display based on activeView
      const displayEvents = activeView === "DEADLINE" 
        ? dayEvents.filter(e => e.isDeadline)
        : dayEvents;

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate(dayDate)}
          style={bgStyle}
          className={`p-2 cursor-pointer rounded-lg min-h-[80px] border ${!isToday && !hasEvent ? "bg-white" : ""} hover:bg-gray-100 relative transition-colors`}
        >
          <div className="text-lg font-semibold text-left">{day}</div>
          {displayEvents.length > 0 && (
            <div className="absolute top-2 right-2 flex gap-1">
              {displayEvents.slice(0, 3).map((event, idx) => (
                <div
                  key={idx}
                  className="w-2 h-2 rounded-full"
                  style={{ 
                    backgroundColor: event.isDeadline 
                      ? '#ef4444'
                      : "#003b27" 
                  }}
                ></div>
              ))}
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

  // For COA: filter submissions to show only specific orgs' liquidation reports
  const coaLiquidationViewOrgs = ["USG", "LCO", "LSG", "AO", "GSC", "USED", "TGP"];

  const navItems = orgShortName === "COA" ? [
    "Dashboard",
    "Submissions",
    "Activity Logs",
    "Officers",
    "Organizations",
  ] : (orgShortName === "LCO" || orgShortName === "USG") ? [
    "Dashboard",
    "Request to Conduct Activity",
    "Accomplishment Report",
    "Liquidation Report",
    "Submissions",
    "Form Templates",
    "Activity Logs",
    "Officers",
    "Organizations",
  ] : [
    "Dashboard",
    "Request to Conduct Activity",
    "Accomplishment Report",
    "Liquidation Report",
    "Form Templates",
    "Activity Logs",
    "Officers",
    "Organizations",
  ];

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
                  {orgShortName}
                </h1>
                <p className="text-xs text-white/60 mt-1">{orgName}</p>
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
            
            {/* Audit Files Folder for COA */}
            {orgShortName === "COA" && (
              <div className="mb-2">
                <Button
                  onClick={() => setIsAuditFilesExpanded(!isAuditFilesExpanded)}
                  className="w-full justify-start text-white hover:bg-[#d4af37] hover:text-[#003b27] font-semibold text-sm"
                  variant="ghost"
                >
                  <Folder className="h-4 w-4 mr-2" />
                  Audit Files
                  {isAuditFilesExpanded ? (
                    <ChevronUp className="h-4 w-4 ml-auto" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  )}
                </Button>
                {isAuditFilesExpanded && (
                  <div className="ml-4 mt-1 space-y-2">
                    {[
                      "University Student Government",
                      "League of Campus Organization",
                      "Local Student Government",
                      "Accredited Organizations",
                      "Graduating Student Council",
                      "University Student Enterprise Development",
                      "The Gold Panicles",
                    ].map((orgItem) => (
                      <Button
                        key={orgItem}
                        onClick={() => {
                          setActiveNav(orgItem);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full justify-start text-left font-medium transition-all whitespace-normal text-xs leading-tight py-2 h-auto ${
                          activeNav === orgItem
                            ? "text-[#003b27]"
                            : "text-white/80 hover:bg-[#d4af37] hover:text-[#003b27]"
                        }`}
                        style={
                          activeNav === orgItem ? { backgroundColor: "#d4af37" } : undefined
                        }
                        variant={activeNav === orgItem ? "default" : "ghost"}
                      >
                        {orgItem}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
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

            {/* Single Form Template Section */}
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
                    <p className="text-sm text-gray-600">Download form templates uploaded by OSLD</p>
                  </div>
                </div>
                
                {uploadedTemplates['ALL']?.forms ? (
                  <div className="border-2 border-green-300 bg-green-50 rounded-lg p-6">
                    <div className="text-green-600 mb-4 text-center font-medium">✓ Template Available</div>
                    <div className="p-4 bg-white rounded-lg border mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 font-medium mb-1">GDrive Link</p>
                          <p className="text-xs text-gray-500 truncate">{uploadedTemplates['ALL'].forms?.fileUrl}</p>
                        </div>
                        <Button
                          className="ml-4"
                          style={{ backgroundColor: "#003b27" }}
                          onClick={() => window.open(uploadedTemplates['ALL'].forms?.fileUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Link
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 text-center">
                      This link contains all form templates for all organizations
                    </p>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Download className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-base text-gray-700 font-medium mb-2">No Template Available</p>
                    <p className="text-sm text-gray-500">
                      OSLD has not uploaded the form templates yet.
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Please contact OSLD for the templates.
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
      </div>
    );
  }

  // Render Request to Conduct Activity Section
  if (activeNav === "Request to Conduct Activity") {
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
      // Check if account is on hold
      if (isOnHold) {
        setIsOnHoldDialogOpen(true);
        return;
      }

      // Check for unsubmitted past-due accomplishment or liquidation reports
      if (hasMissedDeadline) {
        return;
      }

      // Validate all required fields
      const errors = {
        title: !activityTitle,
        date: !activityDate,
        recurrenceType: !activityRecurrenceType,
        venue: !activityVenue,
        participants: !activityParticipants,
        funds: !activityFunds,
        budget: !activityBudget,
        sdg: activitySDG.length === 0,
        likha: !activityLIKHA,
        files: !activityFiles.endorsementLetter || !activityFiles.letterToConduct || !activityFiles.activityDesign
      };
      
      setActivityErrors(errors);
      
      if (Object.values(errors).some(error => error)) {
        return;
      }
      
      try {
        // Determine target organization based on current org
        // LSG → USG, LCO/USG/GSC/USED/TGP → OSLD, AO (Accredited Orgs) → LCO
        let targetOrg = 'LCO'; // Default for AO (Accredited Orgs)
        if (orgShortName === 'LSG') {
          targetOrg = 'USG';
        } else if (['LCO', 'USG', 'GSC', 'USED', 'TGP'].includes(orgShortName)) {
          targetOrg = 'OSLD';
        }

        // Combine date and recurrence type
        const startDateStr = activityDate ? format(activityDate, 'PPP') : '';
        const endDateStr = activityEndDate ? format(activityEndDate, 'PPP') : '';
        const combinedDuration = `${startDateStr} - ${endDateStr} (${activityRecurrenceType})`;

        // Step 1: Insert DB row first to get submission_id BEFORE uploading files
        const { data: submissionData, error: dbError } = await supabase
          .from('submissions')
          .insert({
            organization: orgShortName,
            submission_type: 'Request to Conduct Activity',
            activity_title: activityTitle,
            activity_duration: combinedDuration,
            activity_venue: activityVenue,
            activity_participants: activityParticipants,
            activity_funds: activityFunds,
            activity_budget: activityBudget,
            activity_sdg: activitySDG.join(', '),
            activity_likha: activityLIKHA,
            file_url: '',
            file_name: '',
            file_urls: '',
            status: 'Pending',
            submitted_to: targetOrg
          })
          .select('id')
          .single();

        if (dbError) throw dbError;

        if (!submissionData?.id) {
          throw new Error('Submission created but no id was returned.');
        }

        const submissionId = submissionData.id;

        // Helper to upload a file with submission_id in path for strict isolation
        const uploadFile = async (file: File, label: string) => {
          if (!file.name.toLowerCase().endsWith('.pdf')) throw new Error(`Only PDF files are allowed. "${file.name}" is not a PDF.`);
          const fileExt = file.name.split('.').pop();
          const fileName = `${orgShortName}_${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
          const filePath = `activity-designs/${submissionId}/${fileName}`;
          const { error: uploadError } = await supabase.storage
            .from('osld-files')
            .upload(filePath, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage
            .from('osld-files')
            .getPublicUrl(filePath);
          return { url: publicUrl, name: `${label}: ${file.name}` };
        };

        // Step 2: Upload all required files with submission_id in path
        const fileEntries: { key: 'endorsementLetter' | 'letterToConduct' | 'activityDesign'; label: string }[] = [
          { key: 'endorsementLetter', label: 'Endorsement Letter' },
          { key: 'letterToConduct', label: 'Letter to Conduct' },
          { key: 'activityDesign', label: 'Activity Design' },
        ];

        const uploadResults = await Promise.all(
          fileEntries.map(({ key, label }) => uploadFile(activityFiles[key]!, label))
        );

        const fileNamesStr = uploadResults.map(r => r.name).join(' | ');
        const primaryFileUrl = uploadResults[0].url;

        // Step 3: Update submission row with actual file URLs
        await supabase
          .from('submissions')
          .update({
            file_url: primaryFileUrl,
            file_name: fileNamesStr,
            file_urls: uploadResults.map(r => r.url).join(' | '),
          })
          .eq('id', submissionId);

        // Create notification for target organization (reuse targetOrg from above)
        const orgFullNames: Record<string, string> = {
          "OSLD": "Office of Student Life and Development",
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
            event_id: submissionData.id,
            event_title: `New Request from ${orgFullNames[orgShortName] || orgShortName}`,
            event_description: `${orgFullNames[orgShortName] || orgShortName} submitted a Request to Conduct Activity titled "${activityTitle}". Check it out!`,
            created_by: orgShortName,
            target_org: targetOrg
          });

         // Log the activity to activity_logs
         const orgKey = orgShortName.toLowerCase();
         const storedEmail = localStorage.getItem(`${orgKey}_userEmail`) || 'System';
         
         const { error: activityLogError } = await supabase
           .from('activity_logs')
           .insert({
             organization: orgShortName,
             action_type: 'Request to Conduct Activity',
             action_description: `Submitted request to conduct activity: "${activityTitle}"`,
             performed_by: storedEmail
           });
         
         if (activityLogError) {
           console.error('Failed to log activity:', activityLogError);
         }

        setShowSuccessDialog(true);
        setSuccessSubmissionType("Request Activity");
        setHasPendingSubmission(true);
        setPendingSubmissionStatus('Pending');
        handleCancelActivity();
      } catch (error) {
        console.error('Error submitting activity:', error);
        alert('Failed to submit activity request. Please try again.');
      }
    };

    const handleCancelActivity = () => {
      setActivityTitle("");
      setActivityDate(undefined);
      setActivityEndDate(undefined);
      setActivityRecurrenceType("");
      setActivityVenue("");
      setActivityParticipants("");
      setActivityFunds("");
      setActivityBudget("");
      setActivitySDG([]);
      setActivityLIKHA("");
      setActivityFiles({
        endorsementLetter: null,
        letterToConduct: null,
        activityDesign: null,
      });
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
                <p className="text-xs text-white/60 mt-1">{orgName}</p>
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

        {/* Main Content */}
        <div className="flex-1 pt-16 lg:pt-0 h-screen overflow-hidden">
          <div className="p-6 h-full flex flex-col">
            <div className="max-w-6xl mx-auto w-full h-full flex flex-col">
              {/* Logo and Description */}
              <div className="text-center mb-4">
                <div className="flex items-center justify-center mb-2">
                  <div
                    className="h-14 w-14 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "#003b27" }}
                  >
                    <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <h2
                  className="text-2xl font-bold"
                  style={{ color: "#003b27" }}
                >
                  Request to Conduct Activity
                </h2>
                <p className="text-slate-600 text-sm mt-1">Submit your activity request for review and approval</p>
              </div>

              {isOnHold && (
                <div className="mb-4 p-3 rounded-lg border bg-orange-50 border-orange-300">
                  <p className="font-medium text-orange-800 text-sm">
                    ⚠️ Your account is currently on hold due to pending requirements. You cannot submit new activity requests until you complete your pending dues.
                  </p>
                </div>
              )}



              {hasMissedDeadline && (
                <div className="mb-4 p-3 rounded-lg border bg-red-50 border-red-300">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-800 mb-1 text-sm">Unsubmitted Reports</p>
                      <p className="text-xs text-red-700">
                        You have unsubmitted accomplishment or liquidation reports past their due date. Please submit all pending reports before your next activity request.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Card className="p-6 shadow-xl border-t-4 flex-1 overflow-hidden flex flex-col" style={{ borderTopColor: "#d4af37" }}>
              <div className="overflow-y-auto flex-1">
              <div className="flex flex-col md:flex-row gap-x-6 gap-y-4">

                {/* LEFT COLUMN */}
                <div className="flex-1 flex flex-col gap-y-4">

                  {/* Activity Title */}
                  <div className="space-y-1.5">
                    <Label className={`text-sm font-medium ${activityErrors.title ? 'text-red-500' : 'text-gray-700'}`}>Activity Title <span className="text-red-500">*</span></Label>
                    <Input
                      value={activityTitle}
                      onChange={(e) => setActivityTitle(e.target.value)}
                      className={`${activityErrors.title ? 'border-red-500' : 'border-gray-300'} focus:border-[#003b27] focus:ring-[#003b27]`}
                    />
                    {activityErrors.title && (
                      <p className="text-red-500 text-xs">Please fill up this field</p>
                    )}
                  </div>

                  {/* Venue/Platform */}
                  <div className="space-y-1.5">
                    <Label className={`text-sm font-medium ${activityErrors.venue ? 'text-red-500' : 'text-gray-700'}`}>Venue/Platform <span className="text-red-500">*</span></Label>
                    <Input
                      value={activityVenue}
                      onChange={(e) => setActivityVenue(e.target.value)}
                      className={`${activityErrors.venue ? 'border-red-500' : 'border-gray-300'} focus:border-[#003b27] focus:ring-[#003b27]`}
                    />
                    {activityErrors.venue && (
                      <p className="text-red-500 text-xs">Please fill up this field</p>
                    )}
                  </div>

                  {/* SDG's - Multi-select */}
                  <div className="space-y-1.5 flex-1">
                    <Label className={`text-sm font-medium ${activityErrors.sdg ? 'text-red-500' : 'text-gray-700'}`}>SDG's <span className="text-red-500">*</span></Label>
                    <div className={`border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto ${activityErrors.sdg ? 'border-red-500' : 'border-gray-300'}`}>
                      {sdgOptions.map((sdg) => (
                        <div key={sdg} className="flex items-center space-x-2">
                          <Checkbox
                            id={`sdg-${sdg}`}
                            checked={activitySDG.includes(sdg)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setActivitySDG([...activitySDG, sdg]);
                              } else {
                                setActivitySDG(activitySDG.filter(s => s !== sdg));
                              }
                            }}
                          />
                          <label htmlFor={`sdg-${sdg}`} className="text-sm cursor-pointer">{sdg}</label>
                        </div>
                      ))}
                    </div>
                    {activitySDG.length > 0 && (
                      <p className="text-xs text-gray-500">{activitySDG.length} SDG(s) selected</p>
                    )}
                    {activityErrors.sdg && (
                      <p className="text-red-500 text-xs">Please select at least one SDG</p>
                    )}
                  </div>

                </div>

                {/* RIGHT COLUMN */}
                <div className="flex-1 flex flex-col gap-y-4">

                  {/* Duration/Date */}
                  <div className="space-y-1.5">
                    <Label className={`text-sm font-medium ${activityErrors.date ? 'text-red-500' : 'text-gray-700'}`}>Duration/Date <span className="text-red-500">*</span></Label>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Start Date Picker */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${activityErrors.date ? 'border-red-500' : 'border-gray-300'}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {activityDate ? format(activityDate, "PPP") : <span>Start date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={activityDate}
                            onSelect={setActivityDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      {/* End Date Picker */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${activityErrors.date ? 'border-red-500' : 'border-gray-300'}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {activityEndDate ? format(activityEndDate, "PPP") : <span>End date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={activityEndDate}
                            onSelect={setActivityEndDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      {/* Recurrence Type */}
                      <Select value={activityRecurrenceType} onValueChange={setActivityRecurrenceType}>
                        <SelectTrigger className={`${activityErrors.recurrenceType ? 'border-red-500' : 'border-gray-300'}`}>
                          <SelectValue placeholder="Recurrence" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Day(s)">Day(s)</SelectItem>
                          <SelectItem value="Daily">Daily</SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Quarterly">Quarterly</SelectItem>
                          <SelectItem value="Every year">Every year</SelectItem>
                          <SelectItem value="1st Semester">1st Semester</SelectItem>
                          <SelectItem value="2nd Semester">2nd Semester</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(activityErrors.date || activityErrors.recurrenceType) && (
                      <p className="text-red-500 text-xs">Please fill up both fields</p>
                    )}
                  </div>

                  {/* Target Participants */}
                  <div className="space-y-1.5">
                    <Label className={`text-sm font-medium ${activityErrors.participants ? 'text-red-500' : 'text-gray-700'}`}>Target Participants <span className="text-red-500">*</span></Label>
                    <Select value={activityParticipants} onValueChange={setActivityParticipants}>
                      <SelectTrigger className={`${activityErrors.participants ? 'border-red-500' : 'border-gray-300'} focus:border-[#003b27] focus:ring-[#003b27]`}>
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
                      <p className="text-red-500 text-xs">Please fill up this field</p>
                    )}
                  </div>

                  {/* Budgetary Requirements */}
                  <div className="space-y-1.5">
                    <Label className={`text-sm font-medium ${activityErrors.budget ? 'text-red-500' : 'text-gray-700'}`}>
                      Budgetary Requirements <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={activityBudget}
                      onChange={(e) => setActivityBudget(e.target.value)}
                      className={`${activityErrors.budget ? 'border-red-500' : 'border-gray-300'} focus:border-[#003b27] focus:ring-[#003b27]`}
                      placeholder="Enter amount"
                    />
                    {activityErrors.budget && (
                      <p className="text-red-500 text-xs">Please fill up this field</p>
                    )}
                  </div>

                  {/* LIKHA AGENDA */}
                  <div className="space-y-1.5">
                    <Label className={`text-sm font-medium ${activityErrors.likha ? 'text-red-500' : 'text-gray-700'}`}>LIKHA AGENDA <span className="text-red-500">*</span></Label>
                    <Select value={activityLIKHA} onValueChange={setActivityLIKHA}>
                      <SelectTrigger className={`${activityErrors.likha ? 'border-red-500' : 'border-gray-300'} focus:border-[#003b27] focus:ring-[#003b27]`}>
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
                      <p className="text-red-500 text-xs">Please fill up this field</p>
                    )}
                  </div>

                  {/* Source of Funds */}
                  <div className="space-y-1.5">
                    <Label className={`text-sm font-medium ${activityErrors.funds ? 'text-red-500' : 'text-gray-700'}`}>
                      Source of Funds <span className="text-red-500">*</span>
                    </Label>
                    <Select value={activityFunds} onValueChange={setActivityFunds}>
                      <SelectTrigger className={`${activityErrors.funds ? 'border-red-500' : 'border-gray-300'} focus:border-[#003b27] focus:ring-[#003b27]`}>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="College Fee/Membership Fee">College Fee/Membership Fee</SelectItem>
                        <SelectItem value="IGF/Admin Project Fee Fund">IGF/Admin Project Fee Fund</SelectItem>
                        <SelectItem value="Sponsorship/Donation">Sponsorship/Donation</SelectItem>
                        <SelectItem value="IGP/Merch">IGP/Merch</SelectItem>
                      </SelectContent>
                    </Select>
                    {activityErrors.funds && (
                      <p className="text-red-500 text-xs">Please fill up this field</p>
                    )}
                  </div>

                </div>
              </div>

              {/* File Upload Section */}
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className={`text-sm font-medium ${activityErrors.files ? 'text-red-500' : 'text-gray-700'}`}>
                    Required Documents <span className="text-red-500">*</span>
                  </Label>
                  {activityErrors.files && (
                    <p className="text-red-500 text-xs">All documents are required</p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {([
                    { key: 'endorsementLetter' as const, label: 'Endorsement Letter' },
                    { key: 'letterToConduct' as const, label: 'Letter to Conduct' },
                    { key: 'activityDesign' as const, label: 'Activity Design' },
                  ]).map(({ key, label }) => (
                    <div
                      key={key}
                      className={`border-2 border-dashed rounded-lg p-3 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors min-h-[100px] relative group ${
                        activityFiles[key]
                          ? 'border-green-400 bg-green-50'
                          : activityErrors.files
                          ? 'border-red-400 bg-red-50'
                          : 'border-gray-300'
                      }`}
                      onClick={() => {
                        const input = document.getElementById(`file-input-${key}`);
                        if (input) input.click();
                      }}
                    >
                      <input
                        id={`file-input-${key}`}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          if (file && !file.name.toLowerCase().endsWith('.pdf')) {
                            alert('Only PDF files are allowed.');
                            e.target.value = '';
                            return;
                          }
                          setActivityFiles(prev => ({ ...prev, [key]: file }));
                          if (file) {
                            setActivityErrors(prev => ({ ...prev, files: false }));
                          }
                        }}
                      />
                      {activityFiles[key] ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                          <div className="text-center">
                            <p className="text-xs font-medium text-green-700">{label}</p>
                            <p className="text-[10px] text-green-600 mt-0.5 truncate max-w-[140px]">{activityFiles[key]!.name}</p>
                          </div>
                          <button
                            type="button"
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-0.5 shadow"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivityFiles(prev => ({ ...prev, [key]: null }));
                            }}
                          >
                            <X className="h-3 w-3 text-red-500" />
                          </button>
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-gray-400" />
                          <div className="text-center">
                            <p className="text-xs font-medium text-gray-700">{label}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">PDF file only</p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit and Cancel Buttons */}
              <div className="flex gap-4 mt-4">
                <Button
                  onClick={handleSubmitActivity}
                  className="flex-1 h-10 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                  style={{ backgroundColor: isOnHold || hasMissedDeadline ? "#9ca3af" : "#003b27" }}
                  disabled={isOnHold || hasMissedDeadline}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Request
                </Button>
                <Button
                  onClick={handleCancelActivity}
                  className="flex-1 h-10 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                  style={{ backgroundColor: "#ef4444" }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
              </div>
            </Card>
            </div>
          </div>
        </div>

        {/* Logout Dialog */}
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

        {/* Success Submission Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-green-600">
                {successSubmissionType === "Accomplishment Report" 
                  ? "Accomplishment Report Submitted Successfully"
                  : successSubmissionType === "Liquidation Report"
                  ? "Liquidation Report Submitted Successfully"
                  : "Request Submitted Successfully"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">
                {successSubmissionType === "Accomplishment Report" 
                  ? "Your accomplishment report has been submitted successfully. Please wait for it to be reviewed."
                  : successSubmissionType === "Liquidation Report"
                  ? "Your liquidation report has been submitted successfully. Please wait for it to be reviewed."
                  : "Your activity request has been submitted successfully. Please wait for it to be reviewed."}
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
      </div>
    );
  }

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
                <p className="text-xs text-white/60 mt-1">{orgName}</p>
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
                    <Label className={`text-base font-semibold flex items-center gap-2 ${accomplishmentErrors.title ? 'text-red-500' : ''}`} style={accomplishmentErrors.title ? {} : { color: "#003b27" }}>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Activity Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={accomplishmentActivityTitle}
                      onChange={(e) => setAccomplishmentActivityTitle(e.target.value)}
                      className={`h-12 text-base border-2 ${accomplishmentErrors.title ? 'border-red-500' : 'focus:border-[#d4af37]'} transition-colors`}
                      placeholder="Enter the activity title"
                    />
                    {accomplishmentErrors.title && (
                      <p className="text-red-500 text-xs">Please fill up this field</p>
                    )}
                  </div>

                  {/* File Upload Section */}
                  <div className="space-y-3">
                    <Label className={`text-base font-semibold flex items-center gap-2 ${accomplishmentErrors.files ? 'text-red-500' : ''}`} style={accomplishmentErrors.files ? {} : { color: "#003b27" }}>
                      <FileText className="h-5 w-5" style={{ color: "#003b27" }} />
                      Required Files <span className="text-red-500">*</span>
                    </Label>
                    {accomplishmentErrors.files && (
                      <p className="text-red-500 text-xs">Please upload all required files</p>
                    )}
                    {/* Row 1: 3 files */}
                    <div className="grid grid-cols-3 gap-4">
                      {([
                        { key: 'narrativeReport', label: 'Narrative Report' },
                        { key: 'documentation', label: 'Documentation' },
                        { key: 'attendance', label: 'Attendance' },
                      ] as { key: keyof typeof accomplishmentFiles; label: string }[]).map(({ key, label }) => {
                        const file = accomplishmentFiles[key];
                        return (
                          <div key={key} className="relative">
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                              onChange={(e) => {
                                const f = e.target.files?.[0] || null;
                                if (f && !f.name.toLowerCase().endsWith('.pdf')) {
                                  alert('Only PDF files are allowed.');
                                  e.target.value = '';
                                  return;
                                }
                                setAccomplishmentFiles(prev => ({ ...prev, [key]: f }));
                                if (f) setAccomplishmentErrors(prev => ({ ...prev, files: false }));
                              }}
                            />
                            <div className={`border-2 rounded-lg flex flex-col items-center justify-center p-4 h-32 transition-colors cursor-pointer ${
                              file
                                ? 'border-green-400 bg-green-50'
                                : accomplishmentErrors.files
                                ? 'border-red-400 bg-red-50'
                                : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100'
                            }`}>
                              {file ? (
                                <>
                                  <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                                  <p className="text-xs text-green-700 font-medium text-center truncate w-full px-1">{file.name}</p>
                                </>
                              ) : (
                                <>
                                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                  <p className="text-xs text-gray-500 font-medium text-center">{label}</p>
                                  <p className="text-xs text-gray-400 mt-1">PDF file only</p>
                                </>
                              )}
                            </div>
                            {file && (
                              <button
                                type="button"
                                className="absolute top-1 right-1 z-20 bg-white rounded-full p-0.5 shadow hover:bg-red-50"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setAccomplishmentFiles(prev => ({ ...prev, [key]: null }));
                                }}
                              >
                                <X className="h-3 w-3 text-red-500" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Row 2: 2 files centered */}
                    <div className="grid grid-cols-2 gap-4 max-w-[66%] mx-auto">
                      {([
                        { key: 'evaluationReport', label: 'Evaluation Report' },
                        { key: 'approveLetterToConduct', label: 'Approve Letter to Conduct Activity' },
                      ] as { key: keyof typeof accomplishmentFiles; label: string }[]).map(({ key, label }) => {
                        const file = accomplishmentFiles[key];
                        return (
                          <div key={key} className="relative">
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                              onChange={(e) => {
                                const f = e.target.files?.[0] || null;
                                if (f && !f.name.toLowerCase().endsWith('.pdf')) {
                                  alert('Only PDF files are allowed.');
                                  e.target.value = '';
                                  return;
                                }
                                setAccomplishmentFiles(prev => ({ ...prev, [key]: f }));
                                if (f) setAccomplishmentErrors(prev => ({ ...prev, files: false }));
                              }}
                            />
                            <div className={`border-2 rounded-lg flex flex-col items-center justify-center p-4 h-32 transition-colors cursor-pointer ${
                              file
                                ? 'border-green-400 bg-green-50'
                                : accomplishmentErrors.files
                                ? 'border-red-400 bg-red-50'
                                : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100'
                            }`}>
                              {file ? (
                                <>
                                  <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                                  <p className="text-xs text-green-700 font-medium text-center truncate w-full px-1">{file.name}</p>
                                </>
                              ) : (
                                <>
                                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                  <p className="text-xs text-gray-500 font-medium text-center">{label}</p>
                                  <p className="text-xs text-gray-400 mt-1">PDF file only</p>
                                </>
                              )}
                            </div>
                            {file && (
                              <button
                                type="button"
                                className="absolute top-1 right-1 z-20 bg-white rounded-full p-0.5 shadow hover:bg-red-50"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setAccomplishmentFiles(prev => ({ ...prev, [key]: null }));
                                }}
                              >
                                <X className="h-3 w-3 text-red-500" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-6">
                    <Button
                      onClick={() => handleAccomplishmentSubmit(currentEventIdForSubmission || undefined)}
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
            <p>Are you sure you want to logout?</p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsLogoutDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleLogout();
                }}
                style={{ backgroundColor: "#003b27" }}
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
                Accomplishment Report Submitted Successfully
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">
                Your accomplishment report has been submitted successfully. Please wait for it to be reviewed.
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
                <p className="text-xs text-white/60 mt-1">{orgName}</p>
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
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-lg">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-2" style={{ color: "#003b27" }}>
                  Liquidation Report
                </h2>
                <p className="text-gray-600 text-sm lg:text-base">
                  Submit your financial liquidation report for review
                </p>
              </div>

              {/* Form Card */}
              <Card className="border-t-4 border-[#d4af37] shadow-xl bg-white rounded-xl overflow-hidden">
                <div className="p-8 space-y-8">
                  {/* Activity Title Section */}
                  <div className="space-y-3">
                    <Label className={`text-base font-semibold flex items-center gap-2 ${liquidationErrors.title ? 'text-red-500' : ''}`} style={liquidationErrors.title ? {} : { color: "#003b27" }}>
                      <CheckCircle className="h-5 w-5 text-indigo-600" />
                      Activity Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={liquidationActivityTitle}
                      onChange={(e) => setLiquidationActivityTitle(e.target.value)}
                      className={`h-12 text-base border-2 ${liquidationErrors.title ? 'border-red-500' : 'focus:border-[#d4af37]'} transition-colors`}
                      placeholder="Enter the activity title"
                    />
                    {liquidationErrors.title && (
                      <p className="text-red-500 text-xs">Please fill up this field</p>
                    )}
                  </div>

                  {/* File Upload Section */}
                  <div className="space-y-3">
                    <Label className={`text-base font-semibold flex items-center gap-2 ${liquidationErrors.files ? 'text-red-500' : ''}`} style={liquidationErrors.files ? {} : { color: "#003b27" }}>
                      <FileText className="h-5 w-5" style={{ color: "#003b27" }} />
                      Required Files <span className="text-red-500">*</span>
                    </Label>
                    {liquidationErrors.files && (
                      <p className="text-red-500 text-xs">Please upload all required files</p>
                    )}
                    {/* Row 1: 3 files */}
                    <div className="grid grid-cols-3 gap-4">
                      {([
                        { key: 'liquidationReportPerEvent', label: 'Liquidation Report Per Event' },
                        { key: 'breakdownOfExpenses', label: 'Breakdown of Expenses' },
                        { key: 'dozeDsa', label: 'DoZE & DSA' },
                      ] as { key: keyof typeof liquidationFiles; label: string }[]).map(({ key, label }) => {
                        const file = liquidationFiles[key];
                        return (
                          <div key={key} className="relative">
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                              onChange={(e) => {
                                const f = e.target.files?.[0] || null;
                                if (f && !f.name.toLowerCase().endsWith('.pdf')) {
                                  alert('Only PDF files are allowed.');
                                  e.target.value = '';
                                  return;
                                }
                                setLiquidationFiles(prev => ({ ...prev, [key]: f }));
                                if (f) setLiquidationErrors(prev => ({ ...prev, files: false }));
                              }}
                            />
                            <div className={`border-2 rounded-lg flex flex-col items-center justify-center p-4 h-32 transition-colors cursor-pointer ${
                              file
                                ? 'border-green-400 bg-green-50'
                                : liquidationErrors.files
                                ? 'border-red-400 bg-red-50'
                                : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100'
                            }`}>
                              {file ? (
                                <>
                                  <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                                  <p className="text-xs text-green-700 font-medium text-center truncate w-full px-1">{file.name}</p>
                                </>
                              ) : (
                                <>
                                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                  <p className="text-xs text-gray-500 font-medium text-center">{label}</p>
                                  <p className="text-xs text-gray-400 mt-1">PDF file only</p>
                                </>
                              )}
                            </div>
                            {file && (
                              <button
                                type="button"
                                className="absolute top-1 right-1 z-20 bg-white rounded-full p-0.5 shadow hover:bg-red-50"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setLiquidationFiles(prev => ({ ...prev, [key]: null }));
                                }}
                              >
                                <X className="h-3 w-3 text-red-500" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Row 2: 2 files centered */}
                    <div className="grid grid-cols-2 gap-4 max-w-[66%] mx-auto">
                      {([
                        { key: 'officialReceipt', label: 'Official Receipt and Needed Fiscal Forms, Procurement Forms', optional: false },
                        { key: 'others', label: 'Others (Optional)', optional: true },
                      ] as { key: keyof typeof liquidationFiles; label: string; optional: boolean }[]).map(({ key, label, optional }) => {
                        const file = liquidationFiles[key];
                        return (
                          <div key={key} className="relative">
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                              onChange={(e) => {
                                const f = e.target.files?.[0] || null;
                                if (f && !f.name.toLowerCase().endsWith('.pdf')) {
                                  alert('Only PDF files are allowed.');
                                  e.target.value = '';
                                  return;
                                }
                                setLiquidationFiles(prev => ({ ...prev, [key]: f }));
                                if (f && !optional) setLiquidationErrors(prev => ({ ...prev, files: false }));
                              }}
                            />
                            <div className={`border-2 rounded-lg flex flex-col items-center justify-center p-4 h-32 transition-colors cursor-pointer ${
                              file
                                ? 'border-green-400 bg-green-50'
                                : liquidationErrors.files && !optional
                                ? 'border-red-400 bg-red-50'
                                : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100'
                            }`}>
                              {file ? (
                                <>
                                  <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                                  <p className="text-xs text-green-700 font-medium text-center truncate w-full px-1">{file.name}</p>
                                </>
                              ) : (
                                <>
                                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                  <p className="text-xs text-gray-500 font-medium text-center">{label}</p>
                                  <p className="text-xs text-gray-400 mt-1">PDF file only</p>
                                </>
                              )}
                            </div>
                            {file && (
                              <button
                                type="button"
                                className="absolute top-1 right-1 z-20 bg-white rounded-full p-0.5 shadow hover:bg-red-50"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setLiquidationFiles(prev => ({ ...prev, [key]: null }));
                                }}
                              >
                                <X className="h-3 w-3 text-red-500" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-6">
                    <Button
                      onClick={() => handleLiquidationSubmit(currentEventIdForSubmission || undefined)}
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
              <Card className="mt-6 bg-blue-50 border-blue-200">
                <div className="p-4 flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Important Reminder</p>
                    <p>Ensure all financial details and receipts are included in your liquidation report before submission.</p>
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
            <p>Are you sure you want to logout?</p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsLogoutDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleLogout();
                }}
                style={{ backgroundColor: "#003b27" }}
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
                Liquidation Report Submitted Successfully
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">
                Your liquidation report has been submitted successfully. Please wait for it to be reviewed.
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
      </div>
    );
  }

  // Render COA Organization Submission Pages
  if (orgShortName === "COA") {
    const coaOrgPages: Record<string, { shortName: string; fullName: string }> = {
      "University Student Government": { shortName: "USG", fullName: "University Student Government" },
      "League of Campus Organization": { shortName: "LCO", fullName: "League of Campus Organization" },
      "Local Student Government": { shortName: "LSG", fullName: "Local Student Government" },
      "Accredited Organizations": { shortName: "AO", fullName: "Accredited Organizations" },
      "Graduating Student Council": { shortName: "GSC", fullName: "Graduating Student Council" },
      "University Student Enterprise Development": { shortName: "USED", fullName: "University Student Enterprise Development" },
      "The Gold Panicles": { shortName: "TGP", fullName: "The Gold Panicles" },
    };

    if (coaOrgPages[activeNav]) {
      const { shortName, fullName } = coaOrgPages[activeNav];
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
                  <p className="text-xs text-white/60 mt-1">{orgName}</p>
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
              
              {/* Audit Files Folder for COA */}
              <div className="mb-2">
                <Button
                  onClick={() => setIsAuditFilesExpanded(!isAuditFilesExpanded)}
                  className="w-full justify-start text-white hover:bg-[#d4af37] hover:text-[#003b27] font-semibold text-sm"
                  variant="ghost"
                >
                  <Folder className="h-4 w-4 mr-2" />
                  Audit Files
                  {isAuditFilesExpanded ? (
                    <ChevronUp className="h-4 w-4 ml-auto" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  )}
                </Button>
                {isAuditFilesExpanded && (
                  <div className="ml-4 mt-1 space-y-2">
                    {[
                      "University Student Government",
                      "League of Campus Organization",
                      "Local Student Government",
                      "Accredited Organizations",
                      "Graduating Student Council",
                      "University Student Enterprise Development",
                      "The Gold Panicles",
                    ].map((orgItem) => (
                      <Button
                        key={orgItem}
                        onClick={() => {
                          setActiveNav(orgItem);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full justify-start text-left font-medium transition-all whitespace-normal text-xs leading-tight py-2 h-auto ${
                          activeNav === orgItem
                            ? "text-[#003b27]"
                            : "text-white/80 hover:bg-[#d4af37] hover:text-[#003b27]"
                        }`}
                        style={
                          activeNav === orgItem ? { backgroundColor: "#d4af37" } : undefined
                        }
                        variant={activeNav === orgItem ? "default" : "ghost"}
                      >
                        {orgItem}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              
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
              <COASubmissionsPage
                targetOrg={shortName}
                targetOrgFullName={fullName}
              />
            </div>
          </div>
        </div>
      );
    }
  }

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

    // COA-specific Filter controls component (only AR, LR, LOA and Pending, For Revision, Declined)
    const COAFilterControls = (
      <div className="flex flex-wrap gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by activity name, type, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>
        <Select value={logFilterType} onValueChange={setLogFilterType}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Filter by Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
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
            <SelectItem value="For Revision">For Revision</SelectItem>
            <SelectItem value="Rejected">Declined</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 w-[180px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
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

    // Filter controls component
    const FilterControls = (
      <div className="flex flex-wrap gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by activity name, type, or status..."
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
            <SelectValue placeholder="Filter by Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="For Revision">For Revision</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Submitted">Submitted</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 w-[180px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
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
        <div className="ml-auto flex items-center">
          {myLogs.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
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
                            status: "Deleted (Previously Approved)",
                            file_url: null,
                            file_name: null,
                            gdrive_link: null
                          })
                          .eq("organization", orgShortName)
                          .eq("status", "Approved")
                          .in("submission_type", ["Accomplishment Report", "Liquidation Report"]);

                        // Step 2: Hard-delete all remaining non-soft-deleted submissions
                        const { error } = await supabase
                          .from("submissions")
                          .delete()
                          .eq("organization", orgShortName)
                          .neq("status", "Deleted (Previously Approved)");

                        if (error) throw error;

                        // Real-time update: Filter out all logs for this organization
                        setActivityLogs((prevLogs) =>
                          prevLogs.filter(
                            (log) => log.organization !== orgShortName,
                          ),
                        );

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
      </div>
    );

    // Group logs by activity title and type
    const groupLogsByActivity = (logs: any[]) => {
      const grouped: Record<string, { accomplishment?: any; liquidation?: any; rtc?: any; loa?: any; auditFiles?: any[] }> = {};
      
      logs.forEach(log => {
        const key = log.documentName;
        if (!grouped[key]) {
          grouped[key] = { auditFiles: [] };
        }
        
        if (log.type === 'Accomplishment Report') {
          grouped[key].accomplishment = log;
        } else if (log.type === 'Liquidation Report') {
          grouped[key].liquidation = log;
        } else if (log.type === 'Request to Conduct Activity') {
          grouped[key].rtc = log;
        } else if (log.type === 'Letter of Appeal') {
          grouped[key].loa = log;
        } else {
          grouped[key].auditFiles?.push(log);
        }
      });
      
      return grouped;
    };

    // Table component for logs
    const LogsTable = ({ logs, showOrganization = false, showEndorseButton = false }: { logs: any[], showOrganization?: boolean, showEndorseButton?: boolean }) => {
      const groupedLogs = groupLogsByActivity(logs);
      
      return (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                {showOrganization && (
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                )}
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
                <td colSpan={showOrganization ? 9 : 8} className="px-3 py-8 text-center text-gray-400 text-sm">
                  No activity logs found.
                </td>
              </tr>
            ) : (
              Object.entries(groupedLogs).map(([activityTitle, docs]) => {
                const log = docs.rtc || docs.accomplishment || docs.liquidation || docs.loa || docs.auditFiles?.[0];
                if (!log) return null;
                
                return (
                  <tr key={activityTitle} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3 text-gray-500" />
                        <span className="text-xs font-medium text-gray-900 truncate max-w-[150px]" title={activityTitle}>{activityTitle}</span>
                      </div>
                    </td>
                    {showOrganization && (
                      <td className="px-2 py-2 text-xs text-gray-500">
                        {{
                          "OSLD": "OSLD",
                          "AO": "AO",
                          "LSG": "LSG",
                          "GSC": "GSC",
                          "LCO": "LCO",
                          "USG": "USG",
                          "TGP": "TGP",
                          "USED": "USED"
                        }[log.organization] || log.organization}
                      </td>
                    )}
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
                            onClick={() => {
                              const groupedLog = {
                                ...log,
                                accomplishmentData: null,
                                liquidationData: null,
                                rtcData: docs.rtc,
                                loaData: null,
                                isGroupedView: true
                              };
                              setSelectedLog(groupedLog);
                              setIsLogDetailOpen(true);
                            }}
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
                            onClick={() => {
                              const groupedLog = {
                                ...log,
                                accomplishmentData: docs.accomplishment,
                                liquidationData: null,
                                rtcData: null,
                                loaData: null,
                                isGroupedView: true
                              };
                              setSelectedLog(groupedLog);
                              setIsLogDetailOpen(true);
                            }}
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
                            onClick={() => {
                              const groupedLog = {
                                ...log,
                                accomplishmentData: null,
                                liquidationData: docs.liquidation,
                                rtcData: null,
                                loaData: null,
                                isGroupedView: true
                              };
                              setSelectedLog(groupedLog);
                              setIsLogDetailOpen(true);
                            }}
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
                            onClick={() => {
                              const groupedLog = {
                                ...log,
                                accomplishmentData: null,
                                liquidationData: null,
                                rtcData: null,
                                loaData: docs.loa,
                                isGroupedView: true
                              };
                              setSelectedLog(groupedLog);
                              setIsLogDetailOpen(true);
                            }}
                          ><Eye className="h-3 w-3 mr-0.5" />View</Button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400">Not Sub.</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-500">
                      {/* Show most recent submission date */}
                      {[docs.rtc, docs.accomplishment, docs.liquidation, docs.loa]
                        .filter(Boolean)
                        .map(d => d.date)
                        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || log.date}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">{showEndorseButton && (docs.accomplishment?.status === 'Approved' || docs.liquidation?.status === 'Approved') && (docs.accomplishment || docs.liquidation) && (docs.accomplishment?.submitted_to !== 'COA' && docs.liquidation?.submitted_to !== 'COA') && (
                          <Button
                            size="sm"
                            className="text-[10px] h-6 px-2 bg-amber-600 text-white hover:bg-amber-700"
                            onClick={async () => {
                              try {
                                // Update both accomplishment and liquidation if they exist
                                const idsToUpdate = [
                                  docs.accomplishment?.id,
                                  docs.liquidation?.id
                                ].filter(Boolean);

                                // Optimistically update UI
                                setActivityLogs(prevLogs => 
                                  prevLogs.map(l => 
                                    idsToUpdate.includes(l.id)
                                      ? { ...l, submitted_to: 'COA', approved_by: orgShortName, approvedBy: orgShortName }
                                      : l
                                  )
                                );

                                for (const id of idsToUpdate) {
                                  const { error } = await supabase
                                    .from('submissions')
                                    .update({ 
                                      submitted_to: 'COA',
                                      approved_by: orgShortName
                                    })
                                    .eq('id', id);

                                  if (error) throw error;
                                }

                                await supabase.from('notifications').insert({
                                  event_id: log.event_id || null,
                                  event_title: `New Submission Endorsed to COA`,
                                  event_description: `${orgShortName} has endorsed documents for "${activityTitle}" from ${log.organization} to COA for review.`,
                                  created_by: orgShortName,
                                  target_org: 'COA'
                                });

                                await supabase.from('notifications').insert({
                                  event_id: log.event_id || null,
                                  event_title: `Documents Forwarded to COA`,
                                  event_description: `Your documents for "${activityTitle}" have been endorsed to COA by ${orgShortName}.`,
                                  created_by: orgShortName,
                                  target_org: log.organization
                                });

                                toast({
                                  title: "Success",
                                  description: `Documents have been endorsed to COA.`,
                                });
                              } catch (error: unknown) {
                                console.error('Error endorsing to COA:', error);
                                reloadActivityLogs();
                                toast({
                                  title: "Error",
                                  description: "Failed to endorse to COA. Please try again.",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            Endorse
                          </Button>
                        )}
                        {showEndorseButton && (docs.accomplishment?.status === 'Approved' || docs.liquidation?.status === 'Approved') && (docs.accomplishment || docs.liquidation) && (docs.accomplishment?.submitted_to === 'COA' || docs.liquidation?.submitted_to === 'COA') && (
                          <Button size="sm" className="text-[10px] h-6 px-2 bg-gray-500 text-white cursor-not-allowed" disabled>
                            Endorsed
                          </Button>
                        )}
                        {!showOrganization && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-6 px-2 border-gray-300 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                            onClick={() => {
                              setLogToDelete(log);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
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

    // COA Remarks Table
    const CoaRemarksTable = ({ logs }: { logs: any[] }) => (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document / Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">COA Opinion</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">COA Comment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  No COA remarks yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{log.documentName}</span>
                      <span className="text-xs text-gray-500">{log.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {log.coaAction && (
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.coaAction === 'Approved' ? 'bg-green-100 text-green-800' :
                        log.coaAction === 'Disapproved' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.coaAction}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {log.coaComment || <span className="text-gray-400 italic">No comment</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{log.date}</td>
                  <td className="px-6 py-4">
                    <Button
                      size="sm"
                      className="text-xs bg-[#003b27] text-white hover:bg-[#002a1c]"
                      onClick={() => {
                        setSelectedLog(log);
                        setIsLogDetailOpen(true);
                      }}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );

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
                <p className="text-xs text-white/60 mt-1">{orgName}</p>
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
            
            {/* Audit Files Folder for COA */}
            {orgShortName === "COA" && (
              <div className="mb-2">
                <Button
                  onClick={() => setIsAuditFilesExpanded(!isAuditFilesExpanded)}
                  className="w-full justify-start text-white hover:bg-[#d4af37] hover:text-[#003b27] font-semibold text-sm"
                  variant="ghost"
                >
                  <Folder className="h-4 w-4 mr-2" />
                  Audit Files
                  {isAuditFilesExpanded ? (
                    <ChevronUp className="h-4 w-4 ml-auto" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  )}
                </Button>
                {isAuditFilesExpanded && (
                  <div className="ml-4 mt-1 space-y-2">
                    {[
                      "University Student Government",
                      "League of Campus Organization",
                      "Local Student Government",
                      "Accredited Organizations",
                      "Graduating Student Council",
                      "University Student Enterprise Development",
                      "The Gold Panicles",
                    ].map((orgItem) => (
                      <Button
                        key={orgItem}
                        onClick={() => {
                          setActiveNav(orgItem);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full justify-start text-left font-medium transition-all whitespace-normal text-xs leading-tight py-2 h-auto ${
                          activeNav === orgItem
                            ? "text-[#003b27]"
                            : "text-white/80 hover:bg-[#d4af37] hover:text-[#003b27]"
                        }`}
                        style={
                          activeNav === orgItem ? { backgroundColor: "#d4af37" } : undefined
                        }
                        variant={activeNav === orgItem ? "default" : "ghost"}
                      >
                        {orgItem}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
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

        {/* Main Content */}
        <div className="flex-1 overflow-auto pt-16 lg:pt-0">
          <div className="p-4 lg:p-8">
            <div className="flex justify-between items-center mb-6 lg:mb-8">
              <h2
                className="text-2xl lg:text-4xl font-bold"
                style={{ color: "#003b27" }}
              >
                Activity Logs
              </h2>
            </div>
            
            {/* COA-specific Activity Logs - Only Org Activity Logs */}
            {orgShortName === "COA" ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-[#003b27]">
                  <h3 className="text-lg font-semibold text-white">Org Activity Logs</h3>
                </div>
                {COAFilterControls}
                <LogsTable logs={coaOrgActivityLogs} showOrganization />
              </div>
            ) : (
              /* Tabs for Activity Logs - For non-COA orgs */
              <Tabs defaultValue="my-logs" className="w-full">
                <TabsList className={`grid w-full max-w-lg mb-6 ${showOtherOrgTab ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <TabsTrigger value="my-logs" className="text-sm font-semibold">My Logs</TabsTrigger>
                  {showOtherOrgTab && (
                    <TabsTrigger value="other-logs" className="text-sm font-semibold">Other Org Logs</TabsTrigger>
                  )}
                  <TabsTrigger value="coa-remarks" className="text-sm font-semibold">COA's Remarks</TabsTrigger>
                </TabsList>
                
                <TabsContent value="my-logs">
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-[#003b27] flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-white">My Activity Logs</h3>
                    </div>
                    {/* Filter controls */}
                    {FilterControls}
                    <LogsTable logs={myLogs} />
                  </div>
                </TabsContent>
                
                {showOtherOrgTab && (
                  <TabsContent value="other-logs">
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 bg-[#003b27]">
                        <h3 className="text-lg font-semibold text-white">Other Organizations' Logs</h3>
                      </div>
                      {FilterControls}
                      <LogsTable logs={otherOrgLogs} showOrganization showEndorseButton />
                    </div>
                  </TabsContent>
                )}
                
                <TabsContent value="coa-remarks">
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-[#003b27]">
                      <h3 className="text-lg font-semibold text-white">COA's Remarks</h3>
                    </div>
                    <CoaRemarksTable logs={coaRemarksLogs} />
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>

        {/* Activity Log Detail Dialog */}
        <Dialog open={isLogDetailOpen} onOpenChange={setIsLogDetailOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-black border-0 shadow-lg">
            <DialogHeader className="text-black border-b border-gray-200 pb-4 mb-4">
              <DialogTitle className="text-2xl font-bold text-black" style={{ color: "#003b27" }}>
                Activity Details
              </DialogTitle>
            </DialogHeader>
            {!selectedLog ? (
              <div className="py-8 text-center text-gray-500 font-medium">
                Loading activity details...
              </div>
            ) : (
              <div className="space-y-5 py-2 text-black">
                <div className="p-3 bg-gradient-to-r from-green-50 to-transparent rounded-lg border border-green-100">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Activity Name</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{selectedLog.documentName}</p>
                </div>

                {/* Grouped View: Show revision reasons for AR and LR separately */}
                {selectedLog.isGroupedView && (selectedLog.accomplishmentData?.status === 'For Revision' || selectedLog.liquidationData?.status === 'For Revision') && (
                  <div className="space-y-3">
                    {selectedLog.accomplishmentData?.status === 'For Revision' && selectedLog.accomplishmentData?.revisionReason && (
                      <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-25 border border-orange-200 rounded-lg shadow-sm">
                        <p className="text-orange-900 font-semibold mb-2 flex items-center gap-2">
                          <span className="text-lg">📄</span> Accomplishment Report - Revision Required
                        </p>
                        <p className="text-gray-700 text-sm mb-3">
                          You are advised to revise your Accomplishment Report due to the following reasons:
                        </p>
                        <div className="mt-2 p-3 bg-white border border-orange-100 rounded">
                          <p className="text-gray-800 text-sm">{selectedLog.accomplishmentData.revisionReason}</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedLog.liquidationData?.status === 'For Revision' && selectedLog.liquidationData?.revisionReason && (
                      <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-25 border border-orange-200 rounded-lg shadow-sm">
                        <p className="text-orange-900 font-semibold mb-2 flex items-center gap-2">
                          <span className="text-lg">💰</span> Liquidation Report - Revision Required
                        </p>
                        <p className="text-gray-700 text-sm mb-3">
                          You are advised to revise your Liquidation Report due to the following reasons:
                        </p>
                        <div className="mt-2 p-3 bg-white border border-orange-100 rounded">
                          <p className="text-gray-800 text-sm">{selectedLog.liquidationData.revisionReason}</p>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-sm text-gray-600 italic">
                      Please stay updated for further announcements.
                    </p>
                  </div>
                )}

                {/* Single View: Show revision reason for single document */}
                {!selectedLog.isGroupedView && selectedLog.status === 'For Revision' && selectedLog.revisionReason && (
                  <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-25 border border-orange-200 rounded-lg shadow-sm">
                    <p className="text-orange-900 font-semibold mb-2">⚠️ Revision Required</p>
                    <p className="text-gray-700 text-sm mb-3">
                      You are advised to revise your request to conduct activity due to the following reasons:
                    </p>
                    <div className="mt-2 p-3 bg-white border border-orange-100 rounded">
                      <p className="text-gray-800 text-sm">{selectedLog.revisionReason}</p>
                    </div>
                    <p className="text-sm text-gray-600 italic mt-3">
                      Please stay updated for further announcements.
                    </p>
                  </div>
                )}

                {/* COA Remarks Section */}
                {(selectedLog.coaAction || selectedLog.coaComment) && (
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-25 border border-blue-200 rounded-lg shadow-sm">
                    <p className="text-blue-900 font-semibold mb-3 flex items-center gap-2">
                      <span className="text-lg">💭</span> COA's Remarks
                    </p>
                    {selectedLog.coaAction && (
                      <p className="text-gray-700 text-sm mb-2">
                        <span className="font-semibold text-gray-900">Opinion:</span> <span className="text-gray-700">{selectedLog.coaAction}</span>
                      </p>
                    )}
                    {selectedLog.coaComment && (
                      <p className="text-gray-700 text-sm">
                        <span className="font-semibold text-gray-900">Comment:</span> <span className="text-gray-700">{selectedLog.coaComment}</span>
                      </p>
                    )}
                  </div>
                )}

                {selectedLog.type !== 'Accomplishment Report' && selectedLog.type !== 'Liquidation Report' && selectedLog.type !== 'Letter of Appeal' && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Activity Information</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Duration</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{selectedLog.activity_duration}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Venue</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{selectedLog.activity_venue}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Participants</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{selectedLog.activity_participants}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Source of Funds</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">₱{selectedLog.activity_funds}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Budget</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">₱{selectedLog.activity_budget}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">SDG</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{selectedLog.activity_sdg}</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200 col-span-2">
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">LIKHA Agenda</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{selectedLog.activity_likha}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* All Submitted Files Section */}
                {(() => {
                  // Helper: render file list for a sub-submission with For Revision split view
                  const renderSubFiles = (subData: any, fileType: string, emoji: string, onDelete: () => void) => {
                    const fileUrl = subData?.fileUrl || subData?.file_url;
                    if (!fileUrl) return null;
                    const fileNames = (subData.fileName || subData.file_name || '').split(' | ').filter(Boolean);
                    const fileUrls = (subData.file_urls || fileUrl || '').split(' | ').filter(Boolean);
                    const files = fileNames.map((name: string, i: number) => ({
                      name,
                      url: fileUrls[i] || fileUrls[0] || fileUrl,
                    }));

                    const isForRevision = subData.status === 'For Revision';
                    const frs: Record<string, string> = subData.file_revision_status || {};
                    const forRevisionFiles = isForRevision ? files.filter((f: {name: string; url: string}) => frs[f.url] === 'for_revision') : [];
                    const approvedFiles = isForRevision ? files.filter((f: {name: string; url: string}) => frs[f.url] !== 'for_revision') : files;

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
                          <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={onDelete}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {isForRevision ? (
                          <div className="space-y-3">
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
                                            <Button
                                              size="sm"
                                              className="bg-[#003b27] hover:bg-[#004d33] text-white text-xs h-7 px-2"
                                              onClick={() => setRevisionUploadFile({ submissionId: subData.id, fileUrl: file.url, fileName: file.name })}
                                            >
                                              <Upload className="h-3 w-3 mr-1" />
                                              Submit Revised
                                            </Button>
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
                                    <Button size="sm" style={{ backgroundColor: "#003b27" }} className="text-white text-xs h-7 px-2">
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

                  const rtcDeleteHandler = async () => {
                    try {
                      if (selectedLog.rtcData?.status === 'Approved') {
                        const { error } = await supabase.from('submissions').update({ status: 'Deleted (Previously Approved)', file_url: null, file_name: null, gdrive_link: null }).eq('id', selectedLog.rtcData.id);
                        if (error) throw error;
                      } else {
                        const { error } = await supabase.from('submissions').delete().eq('id', selectedLog.rtcData.id);
                        if (error) throw error;
                      }
                      toast({ title: "Success", description: "File deleted successfully." });
                      setIsLogDetailOpen(false);
                      reloadActivityLogs();
                    } catch (error) { toast({ title: "Error", description: "Failed to delete file.", variant: "destructive" }); }
                  };

                  const arData = selectedLog.accomplishmentData || (!selectedLog.isGroupedView && selectedLog.type === 'Accomplishment Report' ? selectedLog : null);
                  const arDeleteHandler = async () => {
                    if (!arData) return;
                    try {
                      if (arData.status === 'Approved') {
                        const { error } = await supabase.from('submissions').update({ status: 'Deleted (Previously Approved)', file_url: null, file_name: null, gdrive_link: null }).eq('id', arData.id);
                        if (error) throw error;
                      } else {
                        const { error } = await supabase.from('submissions').delete().eq('id', arData.id);
                        if (error) throw error;
                      }
                      toast({ title: "Success", description: "File deleted successfully." });
                      setIsLogDetailOpen(false);
                      reloadActivityLogs();
                    } catch (error) { toast({ title: "Error", description: "Failed to delete file.", variant: "destructive" }); }
                  };

                  const lrData = selectedLog.liquidationData || (!selectedLog.isGroupedView && selectedLog.type === 'Liquidation Report' ? selectedLog : null);
                  const lrDeleteHandler = async () => {
                    if (!lrData) return;
                    try {
                      if (lrData.status === 'Approved') {
                        const { error } = await supabase.from('submissions').update({ status: 'Deleted (Previously Approved)', file_url: null, file_name: null, gdrive_link: null }).eq('id', lrData.id);
                        if (error) throw error;
                      } else {
                        const { error } = await supabase.from('submissions').delete().eq('id', lrData.id);
                        if (error) throw error;
                      }
                      toast({ title: "Success", description: "File deleted successfully." });
                      setIsLogDetailOpen(false);
                      reloadActivityLogs();
                    } catch (error) { toast({ title: "Error", description: "Failed to delete file.", variant: "destructive" }); }
                  };

                  const loaData = selectedLog.loaData || (!selectedLog.isGroupedView && selectedLog.type === 'Letter of Appeal' ? selectedLog : null);
                  const loaDeleteHandler = async () => {
                    if (!loaData) return;
                    try {
                      const { error } = await supabase.from('submissions').delete().eq('id', loaData.id);
                      if (error) throw error;
                      toast({ title: "Success", description: "File deleted successfully." });
                      setIsLogDetailOpen(false);
                      reloadActivityLogs();
                    } catch (error) { toast({ title: "Error", description: "Failed to delete file.", variant: "destructive" }); }
                  };

                  const hasAnyFile = selectedLog.rtcData?.fileUrl || arData?.fileUrl || arData?.file_url || lrData?.fileUrl || lrData?.file_url || loaData?.fileUrl || loaData?.file_url;

                  return (
                  <div className="space-y-3 border-t border-gray-200 pt-4">
                    <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
                      <span className="text-lg">📁</span> Submitted Files
                    </h3>

                    {renderSubFiles(selectedLog.rtcData, 'Request to Conduct Activity', '📋', rtcDeleteHandler)}
                    {renderSubFiles(arData, 'Accomplishment Report', '📝', arDeleteHandler)}
                    {renderSubFiles(lrData, 'Liquidation Report', '💰', lrDeleteHandler)}
                    {renderSubFiles(loaData, 'Letter of Appeal', '✉️', loaDeleteHandler)}

                    {!hasAnyFile && (
                      <div className="p-8 text-center text-gray-400 border border-gray-300 rounded-lg bg-gray-50">
                        <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm text-gray-600">No files submitted yet</p>
                      </div>
                    )}
                  </div>
                  );
                })()}
              </div>
            )}
            <DialogFooter className="border-t border-gray-200 pt-4 mt-4">
              <Button variant="outline" onClick={() => setIsLogDetailOpen(false)} className="border-gray-300 hover:bg-gray-50">
                Close
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
                Are you sure you want to delete this activity log?
              </p>
              {logToDelete && (
                <p className="mt-2 text-sm text-gray-500">
                  Document: <span className="font-medium">{logToDelete.documentName}</span>
                </p>
              )}
              <p className="mt-2 text-sm text-red-500">
                This action cannot be undone.
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
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Logout Dialog */}
        <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Logout</DialogTitle>
              <DialogDescription>
                Are you sure you want to logout?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsLogoutDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                style={{ backgroundColor: "#003b27" }}
                onClick={() => {
                  setIsLogoutDialogOpen(false);
                  handleLogout();
                }}
              >
                Logout
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
                <p className="text-xs text-white/60 mt-1">{orgName}</p>
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
            
            {/* Audit Files Folder for COA */}
            {orgShortName === "COA" && (
              <div className="mb-2">
                <Button
                  onClick={() => setIsAuditFilesExpanded(!isAuditFilesExpanded)}
                  className="w-full justify-start text-white hover:bg-[#d4af37] hover:text-[#003b27] font-semibold text-sm"
                  variant="ghost"
                >
                  <Folder className="h-4 w-4 mr-2" />
                  Audit Files
                  {isAuditFilesExpanded ? (
                    <ChevronUp className="h-4 w-4 ml-auto" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  )}
                </Button>
                {isAuditFilesExpanded && (
                  <div className="ml-4 mt-1 space-y-2">
                    {[
                      "University Student Government",
                      "League of Campus Organization",
                      "Local Student Government",
                      "Accredited Organizations",
                      "Graduating Student Council",
                      "University Student Enterprise Development",
                      "The Gold Panicles",
                    ].map((orgItem) => (
                      <Button
                        key={orgItem}
                        onClick={() => {
                          setActiveNav(orgItem);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full justify-start text-left font-medium transition-all whitespace-normal text-xs leading-tight py-2 h-auto ${
                          activeNav === orgItem
                            ? "text-[#003b27]"
                            : "text-white/80 hover:bg-[#d4af37] hover:text-[#003b27]"
                        }`}
                        style={
                          activeNav === orgItem ? { backgroundColor: "#d4af37" } : undefined
                        }
                        variant={activeNav === orgItem ? "default" : "ghost"}
                      >
                        {orgItem}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
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
              Officers & Advisers
            </h2>

            <div className="space-y-8">
              {/* Advisers Section - FIRST */}
              <Card
                className="p-8 shadow-xl border-t-4"
                style={{ borderTopColor: "#d4af37" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3
                    className="text-2xl font-bold"
                    style={{ color: "#003b27" }}
                  >
                    Advisers
                  </h3>
                  <Button
                    variant="outline"
                    onClick={openAddAdviserModal}
                    className="font-semibold border-2"
                    style={{ borderColor: "#003b27", color: "#003b27" }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Adviser
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {advisers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 col-span-full">
                      No advisers added yet
                    </p>
                  ) : (
                    advisers.map((adviser) => {
                      const positionParts = adviser.position.replace(/\s*adviser\s*/gi, '').split(" | ");
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
                              <span className="font-semibold text-gray-700">Years as Adviser:</span>{" "}
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
                              onClick={() => openAdviserDeleteDialog(adviser)}
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

              {/* Officers Section - SECOND */}
              <Card
                className="p-8 shadow-xl border-t-4"
                style={{ borderTopColor: "#d4af37" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3
                    className="text-2xl font-bold"
                    style={{ color: "#003b27" }}
                  >
                    Officers
                  </h3>
                  <Button
                    variant="outline"
                    onClick={openAddOfficerModal}
                    className="font-semibold border-2"
                    style={{ borderColor: "#003b27", color: "#003b27" }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Officer
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {officers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 col-span-full">
                      No officers added yet
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
                              onClick={() => openOfficerDeleteDialog(officer)}
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
                        className="text-blue-600 hover:underline"
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
                      No contact information added yet
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Logout Dialog */}
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

        {/* Officer Modal */}
        <Dialog open={isOfficerModalOpen} onOpenChange={setIsOfficerModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
                {editingOfficer ? "Edit Officer" : "Add Officer"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label className={officerErrors.name ? 'text-red-500' : ''}>Name <span className="text-red-500">*</span></Label>
                <Input
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  placeholder="Enter officer name"
                  className={officerErrors.name ? 'border-red-500' : ''}
                />
                {officerErrors.name && <p className="text-red-500 text-xs mt-1">This field is required</p>}
              </div>
              <div>
                <Label className={officerErrors.role ? 'text-red-500' : ''}>Role <span className="text-red-500">*</span></Label>
                <Input
                  value={officerRole}
                  onChange={(e) => setOfficerRole(e.target.value)}
                  placeholder="Enter role (e.g., President, Secretary)"
                  className={officerErrors.role ? 'border-red-500' : ''}
                />
                {officerErrors.role && <p className="text-red-500 text-xs mt-1">This field is required</p>}
              </div>
              <div>
                <Label className={officerErrors.program ? 'text-red-500' : ''}>Program and Year <span className="text-red-500">*</span></Label>
                <Input
                  value={officerProgram}
                  onChange={(e) => setOfficerProgram(e.target.value)}
                  placeholder="Enter program and year (e.g., BS Information System - 4)"
                  className={officerErrors.program ? 'border-red-500' : ''}
                />
                {officerErrors.program && <p className="text-red-500 text-xs mt-1">This field is required</p>}
              </div>
              <div>
                <Label className={officerErrors.idNumber ? 'text-red-500' : ''}>ID Number <span className="text-red-500">*</span></Label>
                <Input
                  value={officerIdNumber}
                  onChange={(e) => setOfficerIdNumber(e.target.value)}
                  placeholder="Enter ID number"
                  className={officerErrors.idNumber ? 'border-red-500' : ''}
                />
                {officerErrors.idNumber && <p className="text-red-500 text-xs mt-1">This field is required</p>}
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

        {/* Officer Delete Confirmation Dialog */}
        <Dialog open={isOfficerDeleteDialogOpen} onOpenChange={setIsOfficerDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-red-600">
                Delete Officer
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">
                Are you sure you want to delete this officer?
              </p>
              {officerToDelete && (
                <p className="mt-2 text-sm text-gray-500">
                  Officer: <span className="font-medium">{officerToDelete.name}</span>
                </p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOfficerDeleteDialogOpen(false);
                  setOfficerToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => officerToDelete && removeOfficer(officerToDelete.id)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Adviser Modal */}
        <Dialog open={isAdviserModalOpen} onOpenChange={setIsAdviserModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
                {editingAdviser ? "Edit Adviser" : "Add Adviser"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label className={adviserErrors.name ? 'text-red-500' : ''}>Name <span className="text-red-500">*</span></Label>
                <Input
                  value={adviserName}
                  onChange={(e) => setAdviserName(e.target.value)}
                  placeholder="Enter adviser name"
                  className={adviserErrors.name ? 'border-red-500' : ''}
                />
                {adviserErrors.name && <p className="text-red-500 text-xs mt-1">This field is required</p>}
              </div>
              <div>
                <Label>Number of Year/s being the Adviser</Label>
                <Input
                  value={adviserYearsExperience}
                  onChange={(e) => setAdviserYearsExperience(e.target.value)}
                  placeholder="Enter number of years (e.g., 3 years)"
                />
              </div>
              <div>
                <Label>Field of Expertise</Label>
                <div className="space-y-2">
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

        {/* Adviser Delete Confirmation Dialog */}
        <Dialog open={isAdviserDeleteDialogOpen} onOpenChange={setIsAdviserDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-red-600">
                Delete Adviser
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">
                Are you sure you want to delete this adviser?
              </p>
              {adviserToDelete && (
                <p className="mt-2 text-sm text-gray-500">
                  Name: <span className="font-medium">{adviserToDelete.name}</span>
                </p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdviserDeleteDialogOpen(false);
                  setAdviserToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => adviserToDelete && removeAdviser(adviserToDelete.id)}
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

  // Render Organizations Section
  if (activeNav === "Organizations") {
    return (
      <OrganizationsPage
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        sidebarTitle={orgShortName}
        sidebarSubtitle={orgName}
        orgLogo={orgLogo}
        navItems={navItems}
      />
    );
  }

  // Render Submissions Section (LCO and USG only) - Show submission content only
  const submissionTypes = [
    "Request to Conduct Activity",
    "Accomplishment Report",
    "Liquidation Report",
  ];

  // Render Profile Section
  if (showProfile) {
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
                <p className="text-xs text-white/60 mt-1">{orgName}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            {navItems.map((item) => (
              <Button
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  setShowProfile(false);
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
            
            {/* Audit Files Folder for COA */}
            {orgShortName === "COA" && (
              <div className="mb-2">
                <Button
                  onClick={() => setIsAuditFilesExpanded(!isAuditFilesExpanded)}
                  className="w-full justify-start text-white hover:bg-[#d4af37] hover:text-[#003b27] font-semibold text-sm"
                  variant="ghost"
                >
                  <Folder className="h-4 w-4 mr-2" />
                  Audit Files
                  {isAuditFilesExpanded ? (
                    <ChevronUp className="h-4 w-4 ml-auto" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  )}
                </Button>
                {isAuditFilesExpanded && (
                  <div className="ml-4 mt-1 space-y-2">
                    {[
                      "University Student Government",
                      "League of Campus Organization",
                      "Local Student Government",
                      "Accredited Organizations",
                      "Graduating Student Council",
                      "University Student Enterprise Development",
                      "The Gold Panicles",
                    ].map((orgItem) => (
                      <Button
                        key={orgItem}
                        onClick={() => {
                          setActiveNav(orgItem);
                          setShowProfile(false);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full justify-start text-left font-medium transition-all whitespace-normal text-xs leading-tight py-2 h-auto ${
                          activeNav === orgItem
                            ? "text-[#003b27]"
                            : "text-white/80 hover:bg-[#d4af37] hover:text-[#003b27]"
                        }`}
                        style={
                          activeNav === orgItem ? { backgroundColor: "#d4af37" } : undefined
                        }
                        variant={activeNav === orgItem ? "default" : "ghost"}
                      >
                        {orgItem}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
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

        {/* Profile Content */}
        <div className="flex-1 overflow-auto pt-16 lg:pt-0">
          <div className="p-4 lg:p-8">
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
                                const fileName = `${orgShortName}_logo`;
                                const { data: files } = await supabase.storage
                                  .from('osld-files')
                                  .list('logos', { search: fileName });
                                
                                if (files && files.length > 0) {
                                  await supabase.storage
                                    .from('osld-files')
                                    .remove([`logos/${files[0].name}`]);
                                }
                                setOrgLogo("");
                                toast({
                                  title: "Success",
                                  description: "Logo removed successfully",
                                });
                              } catch (error: unknown) {
                                console.error("Error removing logo:", error);
                                setOrgLogo("");
                                toast({
                                  title: "Error",
                                  description: "Failed to remove logo",
                                  variant: "destructive",
                                });
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
                    
                    {/* Upload Controls */}
                    <div className="flex-1 text-center md:text-left">
                      <h4 className="text-lg font-semibold text-gray-700 mb-2">Choose File</h4>
                      <p className="text-sm text-gray-500 mb-4">
                        Supported: PNG, JPG, GIF (Max 5MB)
                      </p>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const fileExt = file.name.split('.').pop();
                              const fileName = `${orgShortName}_logo.${fileExt}`;
                              const filePath = `logos/${fileName}`;

                              const { error: uploadError } = await supabase.storage
                                .from('osld-files')
                                .upload(filePath, file, { upsert: true });

                              if (uploadError) throw uploadError;

                              const { data } = supabase.storage
                                .from('osld-files')
                                .getPublicUrl(filePath);

                              setOrgLogo(data.publicUrl);
                              toast({
                                title: "Success",
                                description: "Logo uploaded successfully!",
                              });
                            } catch (error: any) {
                              console.error("Error uploading logo:", error);
                              toast({
                                title: "Error",
                                description: "Failed to upload logo",
                                variant: "destructive",
                              });
                            }
                          }
                        }}
                        className="max-w-xs"
                      />
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

                {/* Accreditation Status */}
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
                <div className="grid md:grid-cols-2 gap-6">
                  <Card
                    className="p-8 shadow-lg border-l-4"
                    style={{ borderLeftColor: "#d4af37" }}
                  >
                    <h3
                      className="text-xl font-bold mb-4"
                      style={{ color: "#003b27" }}
                    >
                      Resolution
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
                  </Card>

                  <Card
                    className="p-8 shadow-lg border-l-4"
                    style={{ borderLeftColor: "#d4af37" }}
                  >
                    <h3
                      className="text-xl font-bold mb-4"
                      style={{ color: "#003b27" }}
                    >
                      Annual Action Plan
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
                  </Card>

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

        {/* Edit Account Modal */}
        <Dialog open={isEditAccountModalOpen} onOpenChange={setIsEditAccountModalOpen}>
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
                <Label htmlFor="newEmail" className="text-base font-medium">
                  New Email
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email"
                    className="text-base flex-1"
                  />
                  <Button
                    onClick={handleSendVerification}
                    disabled={isVerificationSent}
                    style={{ backgroundColor: "#003b27" }}
                  >
                    {isVerificationSent ? "Sent" : "Verify"}
                  </Button>
                </div>
              </div>

              {isVerificationSent && (
                <div className="space-y-2">
                  <Label
                    htmlFor="verificationCode"
                    className="text-base font-medium"
                  >
                    Verification Code
                  </Label>
                  <Input
                    id="verificationCode"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="text-base"
                  />
                  <p className="text-sm text-gray-500">
                    Check your email for the verification code
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-base font-medium">
                  New Password (Optional)
                </Label>
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="text-base"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-sm"
                >
                  {showPassword ? "Hide" : "Show"} Password
                </Button>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditAccountModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setIsEditAccountModalOpen(false)}
                className="flex-1"
                style={{ backgroundColor: "#003b27" }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

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
              <p className="text-xs text-white/60 mt-1">{orgName}</p>
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
          
          {/* Audit Files Folder for COA */}
          {orgShortName === "COA" && (
            <div className="mb-2">
              <Button
                onClick={() => setIsAuditFilesExpanded(!isAuditFilesExpanded)}
                className="w-full justify-start text-white hover:bg-[#d4af37] hover:text-[#003b27] font-semibold text-sm"
                variant="ghost"
              >
                <Folder className="h-4 w-4 mr-2" />
                Audit Files
                {isAuditFilesExpanded ? (
                  <ChevronUp className="h-4 w-4 ml-auto" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-auto" />
                )}
              </Button>
              {isAuditFilesExpanded && (
                <div className="ml-4 mt-1 space-y-2">
                  {[
                    "University Student Government",
                    "League of Campus Organization",
                    "Local Student Government",
                    "Accredited Organizations",
                    "Graduating Student Council",
                    "University Student Enterprise Development",
                    "The Gold Panicles",
                  ].map((orgItem) => (
                    <Button
                      key={orgItem}
                      onClick={() => {
                        setActiveNav(orgItem);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full justify-start text-left font-medium transition-all whitespace-normal text-xs leading-tight py-2 h-auto ${
                        activeNav === orgItem
                          ? "text-[#003b27]"
                          : "text-white/80 hover:bg-[#d4af37] hover:text-[#003b27]"
                      }`}
                      style={
                        activeNav === orgItem ? { backgroundColor: "#d4af37" } : undefined
                      }
                      variant={activeNav === orgItem ? "default" : "ghost"}
                    >
                      {orgItem}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
          
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
          {activeNav === "Submissions" && orgShortName === "COA" ? (
            <SubmissionsPage
              activeNav={activeNav}
              setActiveNav={setActiveNav}
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
              orgShortName={orgShortName}
              orgFullName={orgName}
              orgLogo={orgLogo}
              isEmbedded={true}
              onActivityChange={loadEvents}
              activeSubmissionTab={activeSubmissionTab}
              setActiveSubmissionTab={setActiveSubmissionTab}
            />
          ) : activeNav === "Submissions" ? (
            <SubmissionsPage
              activeNav={activeNav}
              setActiveNav={setActiveNav}
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
              orgShortName={orgShortName}
              orgFullName={orgName}
              orgLogo={orgLogo}
              isEmbedded={true}
              onActivityChange={loadEvents}
              activeSubmissionTab={activeSubmissionTab}
              setActiveSubmissionTab={setActiveSubmissionTab}
            />
          ) : coaLiquidationViewOrgs.map(org => activeNav === 
            (org === "USG" ? "University Student Government" : 
             org === "LCO" ? "League of Campus Organization" :
             org === "LSG" ? "Local Student Government" : 
             org === "AO" ? "Accredited Organizations" : 
             org === "GSC" ? "Graduating Student Council" : 
             org === "USED" ? "University Student Enterprise Development" :
             org === "TGP" ? "The Gold Panicles" : "")).includes(true) && orgShortName === "COA" ? (
            <COASubmissionsPage
              targetOrg={
                activeNav === "University Student Government" ? "USG" :
                activeNav === "League of Campus Organization" ? "LCO" :
                activeNav === "Local Student Government" ? "LSG" :
                activeNav === "Accredited Organizations" ? "AO" :
                activeNav === "Graduating Student Council" ? "GSC" :
                activeNav === "University Student Enterprise Development" ? "USED" :
                activeNav === "The Gold Panicles" ? "TGP" : ""
              }
              targetOrgFullName={activeNav}
            />
          ) : (
            <>
          <div className="flex items-center justify-between mb-6 lg:mb-8">
            <h2
              className="text-2xl lg:text-4xl font-bold"
              style={{ color: "#003b27" }}
            >
              CALENDAR
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
                                  read_by: orgShortName
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
                                .eq('read_by', orgShortName);
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
                                        read_by: orgShortName
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
                                    .eq('read_by', orgShortName);
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

          {/* On Hold Warning in Dashboard */}
          {isOnHold && (
            <div className="mb-6 p-4 rounded-lg border bg-orange-50 border-orange-300">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-orange-800 mb-1">Account On Hold</p>
                  <p className="text-sm text-orange-700">
                    Your account is currently on hold due to pending requirements. Please complete your pending dues to resume submitting activity requests.
                  </p>
                </div>
              </div>
            </div>
          )}

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
            {/* Calendar Card */}
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
                      setCurrentDate(
                        new Date(today.getFullYear(), today.getMonth(), 1),
                      );
                      setSelectedDate(today);
                      setActiveView("TODAY");
                    }}
                    className="font-semibold px-3 lg:px-6 transition-all hover:scale-105 hover:shadow-md text-xs lg:text-sm"
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
                    className="font-semibold px-3 lg:px-6 transition-all hover:scale-105 hover:shadow-md text-xs lg:text-sm"
                    style={{
                      backgroundColor: "#003b27",
                      color: "#d4af37",
                    }}
                  >
                    EVENT
                  </Button>
                  {showDeadline && (
                    <Button
                      size="sm"
                      onClick={() => setActiveView("DEADLINE")}
                      className="font-semibold px-3 lg:px-6 transition-all hover:scale-105 hover:shadow-md text-xs lg:text-sm"
                      style={{
                        backgroundColor: activeView === "DEADLINE" ? "#dc2626" : "#991b1b",
                        color: "#ffffff",
                      }}
                    >
                      DEADLINE
                    </Button>
                  )}
                  {showAddButton && (
                    <Button
                      size="icon"
                      className="rounded-full w-8 h-8 lg:w-10 lg:h-10 shadow-lg hover:shadow-xl transition-all"
                      style={{ backgroundColor: "#d4af37" }}
                      onClick={openAddEventModal}
                    >
                      <Plus
                        className="h-4 w-4 lg:h-5 lg:w-5"
                        style={{ color: "#003b27" }}
                      />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 lg:gap-2 shadow-inner bg-gray-50 p-2 lg:p-4 rounded-lg overflow-x-auto">
                {renderCalendar()}
              </div>
            </Card>

            {/* Side Panel - TODAY/INBOX */}
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
                    const isCurrentDay = 
                      selectedDate.getDate() === new Date().getDate() &&
                      selectedDate.getMonth() === new Date().getMonth() &&
                      selectedDate.getFullYear() === new Date().getFullYear();
                    
                    // Professional deadline card styling
                    if (event.isDeadline) {
                      return (
                        <div
                          key={event.id}
                          className={`overflow-hidden shadow-md ${event.isPending ? 'rounded-2xl border border-slate-200 bg-white' : 'rounded-xl border-2 border-red-500 bg-white'}`}
                        >
                          {/* Header with conditional color based on status */}
                          <div 
                            className={`px-4 py-3 flex items-center justify-between border-b ${event.isPending ? 'border-slate-200' : 'border-red-200'}`}
                            style={{ 
                              background: event.isPending ? 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm`} style={{ backgroundColor: event.isPending ? '#003b27' : '#ef4444' }}>
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <span className={`font-bold text-sm uppercase tracking-wide`} style={{ color: event.isPending ? '#003b27' : '#991b1b' }}>
                                {event.deadlineType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report'}
                              </span>
                            </div>
                            {event.isPending && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#e6f0ec', color: '#003b27' }}>Submitted</span>
                            )}
                          </div>
                          {/* Body content */}
                          <div className="p-4 bg-white">
                            <p className="font-semibold text-gray-800 mb-3">
                              {event.title}
                            </p>
                            {event.isPending ? (
                              <div 
                                className="p-2"
                              >
                                {event.isMonitoringOrg ? (
                                  // COA/OSLD monitoring AO/LSG's submission to LCO/USG
                                  <div className="w-full rounded-xl p-5 border-2 shadow-sm" style={{ backgroundColor: '#f8fafc', borderColor: '#003b27', borderLeftWidth: '4px' }}>
                                    <div className="flex items-center gap-3 mb-4">
                                      <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: '#003b27' }}>
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                      </div>
                                      <div>
                                        <span className="text-sm font-bold uppercase tracking-wider block" style={{ color: '#003b27' }}>
                                          Under Review
                                        </span>
                                        <span className="text-xs text-slate-500 font-medium">Monitoring Status</span>
                                      </div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 mb-3 border border-slate-200">
                                      <p className="text-sm text-slate-700 leading-relaxed">
                                        {event.submittingOrganization === 'AO' 
                                          ? <>An <span className="font-bold text-slate-900">Accredited Organization (AO)</span> has submitted the {event.deadlineType === 'accomplishment' ? 'accomplishment' : 'liquidation'} report to the LCO for review.</>
                                          : event.submittingOrganization === 'LSG'
                                          ? <>A <span className="font-bold text-slate-900">Local Student Government (LSG)</span> has submitted the {event.deadlineType === 'accomplishment' ? 'accomplishment' : 'liquidation'} report to the USG for review.</>
                                          : <>An organization has submitted the {event.deadlineType === 'accomplishment' ? 'accomplishment' : 'liquidation'} report to their reviewing body.</>
                                        }
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#003b27' }}>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Awaiting review completion
                                    </div>
                                  </div>
                                ) : event.isReviewingOrg ? (
                                  // LCO/USG reviewing AO/LSG's submission
                                  <div className="w-full rounded-xl p-5 border shadow-sm bg-white" style={{ borderColor: '#e2e8f0', borderLeftWidth: '4px', borderLeftColor: '#003b27' }}>
                                    <div className="flex items-center gap-3 mb-4">
                                      <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: '#003b27' }}>
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                        </svg>
                                      </div>
                                      <div>
                                        <span className="text-sm font-bold uppercase tracking-wider block" style={{ color: '#003b27' }}>
                                          Action Required
                                        </span>
                                        <span className="text-xs font-medium" style={{ color: '#64748b' }}>Pending Your Review</span>
                                      </div>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-slate-200">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Submitted by:</span>
                                        <span className="text-sm font-bold" style={{ color: '#003b27' }}>
                                          {event.submittingOrganization === 'AO' ? 'Accredited Organization' : event.submittingOrganization === 'LSG' ? 'Local Student Government' : event.submittingOrganization === 'LCO' ? 'League of Campus Organization' : event.submittingOrganization === 'USG' ? 'University Student Government' : event.submittingOrganization === 'GSC' ? 'Graduating Student Council' : event.submittingOrganization === 'USED' ? 'University Student Enterprise Development' : event.submittingOrganization === 'TGP' ? 'The Gold Panicles' : event.submittingOrganization === 'OSLD' ? 'Office of Student Leadership and Development' : event.submittingOrganization === 'COA' ? 'Commission on Audit' : event.submittingOrganization}
                                        </span>
                                      </div>
                                      <p className="text-sm text-slate-600 leading-relaxed">
                                        A {event.deadlineType === 'accomplishment' ? 'accomplishment' : 'liquidation'} report has been submitted and requires your review.
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => {
                                        const tabMap = {
                                          'accomplishment': 'Accomplishment Report',
                                          'liquidation': 'Liquidation Report'
                                        };
                                        setActiveSubmissionTab?.(tabMap[event.deadlineType as 'accomplishment' | 'liquidation'] || "Submissions");
                                        setActiveNav?.('Submissions');
                                      }}
                                      className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-lg transition-all hover:opacity-90 shadow-md"
                                      style={{ backgroundColor: '#003b27' }}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      Review Submission
                                    </button>
                                  </div>
                                ) : event.isSubmittingOrg ? (
                                  // AO/LSG's own pending submission - only show this if they are the submitter
                                  <div className="w-full rounded-xl p-5 border-2 shadow-sm bg-slate-50" style={{ borderColor: '#94a3b8', borderLeftWidth: '4px' }}>
                                    <div className="flex items-center gap-3 mb-4">
                                      <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-md bg-slate-500">
                                        <svg className="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      </div>
                                      <div>
                                        <span className="text-sm font-bold uppercase tracking-wider text-slate-700 block">
                                          Pending Review
                                        </span>
                                        <span className="text-xs text-slate-500 font-medium">Awaiting approval</span>
                                      </div>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 mb-3 border border-slate-200">
                                      <p className="text-sm text-slate-600 leading-relaxed">
                                        Your {event.deadlineType} report for this activity has been submitted successfully.
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Please wait for updates from your reviewing body.
                                    </div>
                                  </div>
                                ) : (
                                  // Fallback - show the report submission section if none of the above cases match
                                  <DeadlineAppealSection 
                                    deadlineType={event.deadlineType}
                                    eventId={event.parentEventId}
                                    orgShortName={orgShortName}
                                    targetOrg={event.targetOrganization}
                                    appealApproved={event.hasOverride}
                                    setActiveNav={setActiveNav}
                                    setActiveSubmissionTab={setActiveSubmissionTab}
                                    eventTitle={event.title}
                                    onSubmitHere={() => {
                                      setCurrentEventIdForSubmission(event.parentEventId);
                                      setActiveNav(event.deadlineType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report');
                                      setIsMobileMenuOpen(false);
                                    }}
                                  />
                                )}
                              </div>
                            ) : (
                              <DeadlineAppealSection 
                                deadlineType={event.deadlineType}
                                eventId={event.parentEventId}
                                orgShortName={orgShortName}
                                targetOrg={event.targetOrganization}
                                appealApproved={event.hasOverride}
                                setActiveNav={setActiveNav}
                                setActiveSubmissionTab={setActiveSubmissionTab}
                                eventTitle={event.title}
                                onSubmitHere={() => {
                                  setCurrentEventIdForSubmission(event.parentEventId);
                                  setActiveNav(event.deadlineType === 'accomplishment' ? 'Accomplishment Report' : 'Liquidation Report');
                                  setIsMobileMenuOpen(false);
                                }}
                              />
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
                        style={{ borderColor: isCurrentDay ? '#d4af37' : '#e5e7eb' }}
                      >
                        <div 
                          className="px-4 py-3 flex items-center justify-between"
                          style={{ 
                            backgroundColor: isCurrentDay ? 'rgba(212, 175, 55, 0.15)' : 'rgba(0, 59, 39, 0.05)',
                            borderBottom: '3px solid #003b27'
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: '#003b27' }}
                            />
                            <span className="font-bold text-sm" style={{ color: '#003b27' }}>
                              {isCurrentDay ? 'Today' : 'Event'}
                            </span>
                          </div>
                          {canEditEvents && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full hover:bg-white/50"
                                onClick={() => openEditEventModal(event)}
                              >
                                <Edit2 className="h-3.5 w-3.5" style={{ color: "#003b27" }} />
                              </Button>
                            </div>
                          )}
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

      {/* On Hold Dialog */}
      <Dialog open={isOnHoldDialogOpen} onOpenChange={setIsOnHoldDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-orange-600">
              Account On Hold
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">
              Your account is currently on hold due to pending requirements. Please complete your pending dues to resume submitting activity requests.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsOnHoldDialogOpen(false)}
              style={{ backgroundColor: "#003b27" }}
            >
              Okay
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

      {/* Add Event Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
              {editingEvent ? "Edit Event" : "Add Event"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
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
                placeholder="Enter event title"
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
                />
              </div>
            </div>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#003b27] text-base"
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
                  onCheckedChange={(checked) => setEventAllDay(checked as boolean)}
                />
                <Label htmlFor="allDay">All Day</Label>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editingEvent && (
              <Button
                variant="destructive"
                onClick={() => {
                  handleDeleteEvent(editingEvent.id);
                  setIsEventModalOpen(false);
                }}
                className="flex-1"
              >
                Delete
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setIsEventModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEvent}
              className="flex-1"
              style={{ backgroundColor: "#003b27" }}
            >
              {editingEvent ? "Update Event" : "Add Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

export default memo(AODashboard);
