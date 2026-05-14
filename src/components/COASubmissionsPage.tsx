import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { copyToAuditFolder, copyPendingToInitialAudit, hasInitialAudit, movePendingToFinalAudit, getAuditFolderContents, getSemesterFromDate } from "@/lib/coaAuditFolders";
import { getNextAuditType } from "@/lib/auditTypeAssignment";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { FileText, Clock, Building2, ExternalLink, MessageSquare, Eye, CheckCircle2, Folder, ChevronRight, ChevronDown, Calendar, Send } from "lucide-react";

interface Submission {
  id: string;
  organization: string;
  submission_type: string;
  file_name: string;
  file_url: string;
  submitted_at: string;
  submitted_to: string;
  status: string;
  coa_opinion?: string;
  coa_comment?: string;
  coa_reviewed?: boolean;
  coa_reviewed_at?: string;
  event_id?: string;
  activity_title?: string;
  revision_count?: number;
  endorsed_to_osld?: boolean;
}

interface COASubmissionsPageProps {
  targetOrg: string; // The organization being viewed (USG, LCO, LSG, AO, GSC, USED, TGP)
  targetOrgFullName: string;
}

// Component to display audit type assignment
function AuditTypeIndicator({ organization }: { organization: string }) {
  const [auditInfo, setAuditInfo] = useState<{
    display_text: string;
    submission_count: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAuditType() {
      try {
        const info = await getNextAuditType(organization);
        setAuditInfo({
          display_text: info.display_text,
          submission_count: info.submission_count
        });
      } catch (error) {
        console.error('Error loading audit type:', error);
      } finally {
        setLoading(false);
      }
    }
    loadAuditType();
  }, [organization]);

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600 animate-pulse" />
          <span className="text-sm text-blue-600">Loading audit assignment...</span>
        </div>
      </div>
    );
  }

  if (!auditInfo) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Calendar className="h-4 w-4 text-blue-600" />
        <span className="text-xs font-semibold text-blue-700">AUDIT ASSIGNMENT</span>
      </div>
      <p className="text-sm font-medium text-blue-700">
        This will be assigned to: <span className="font-bold">{auditInfo.display_text}</span>
      </p>
    </div>
  );
}

export function COASubmissionsPage({ targetOrg, targetOrgFullName }: COASubmissionsPageProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reviewCopies, setReviewCopies] = useState<any[]>([]); // Store coa_review_copies data
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [tempOpinions, setTempOpinions] = useState<Record<string, string>>({});
  const [tempComments, setTempComments] = useState<Record<string, string>>({});
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [nextAuditType, setNextAuditType] = useState<string>("");
  const [loadingAuditType, setLoadingAuditType] = useState(false);
  const [expandedSemesters, setExpandedSemesters] = useState<Set<string>>(new Set());
  const [expandedAuditTypes, setExpandedAuditTypes] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Map COA sidebar pages to the organizations that submit to them
  const getOrgsForPage = () => {
    // NEW ROUTING: USED, LCO, USG, GSC, TGP submit directly to COA
    // LSG submissions come via USG endorsement
    // AO submissions come via LCO endorsement
    if (targetOrg === "USG" || targetOrg === "LCO" || targetOrg === "GSC" || targetOrg === "USED" || targetOrg === "TGP") {
      return [targetOrg];
    }
    if (targetOrg === "LSG") {
      return ["LSG"];
    }
    if (targetOrg === "AO") {
      return ["AO"];
    }
    return [targetOrg];
  };

  // Get the approver for display
  const getApprover = (submission: Submission) => {
    // NEW ROUTING: All submissions to COA are reviewed by COA
    // COA can then endorse to OSLD if needed
    return "Commission on Audit";
  };

  // Get full organization name
  const getOrgFullName = (orgShortName: string) => {
    const orgNames: Record<string, string> = {
      "USG": "University Student Government",
      "LCO": "League of Campus Organization",
      "LSG": "Local Student Government",
      "AO": "Accredited Organizations",
      "GSC": "Graduating Student Council",
      "USED": "University Student Enterprise Development",
      "TGP": "The Gold Panicles",
      "OSLD": "Office of Student Leadership and Development",
    };
    return orgNames[orgShortName] || orgShortName;
  };

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const orgsToFetch = getOrgsForPage();
      // Get ALL submissions sent to COA from the target organization(s)
      // Show APPROVED submissions in Audit Files (only Accomplishment and Liquidation Reports, exclude appeals)
      // After COA approves a submission, it moves here for adding COA opinion/comment
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('submitted_to', 'COA')
        .in('organization', orgsToFetch)
        .in('status', ['Approved', 'Pending'])  // Load approved AND pending submissions (pending = initial audits in progress)
        .in('submission_type', ['Accomplishment Report', 'Liquidation Report'])
        .neq('status', 'In Final Audit')  // Exclude final audits that have been moved
        .neq('status', 'Deleted (Previously Approved)')  // Exclude soft-deleted submissions
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data?.map(s => ({
        ...s,
        endorsed_to_osld: s.endorsed_to_osld || false
      })) || []);

      // Also load coa_review_copies for Internal Reviews tab
      const { data: copiesData, error: copiesError } = await supabase
        .from('coa_review_copies')
        .select('*')
        .in('organization', orgsToFetch)
        .order('copied_at', { ascending: false });

      if (copiesError) throw copiesError;
      setReviewCopies(copiesData || []);
    } catch (error: any) {
      console.error('Error loading submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [targetOrg]);

  const getSubmissionsByType = (type: string) => {
    return submissions.filter(s => s.submission_type === type);
  };

  const handleOpinionChange = async (submissionId: string, opinion: string) => {
    // This function is no longer used - keeping for compatibility
    // Opinion changes are now handled in the Submit button
  };

  const handleSaveComment = async () => {
    if (!selectedSubmission) return;

    try {
      // Fetch the latest submission data from database
      const { data: latestSubmission, error: fetchError } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', selectedSubmission.id)
        .single();
      
      if (fetchError || !latestSubmission) {
        throw new Error('Submission not found');
      }

      // Check if both opinion and comment are set - this means review is complete
      const hasOpinion = tempOpinions[selectedSubmission.id] || latestSubmission.coa_opinion;
      const hasComment = comment || latestSubmission.coa_comment;
      const shouldMarkReviewed = hasOpinion && hasComment;
      
      if (shouldMarkReviewed) {
        // Automatically determine audit type based on submission count
        const auditTypeInfo = await getNextAuditType(latestSubmission.organization);
        
        // For backward compatibility with existing code
        const submissionDate = new Date(latestSubmission.submitted_at);
        const year = submissionDate.getFullYear();
        const semester = auditTypeInfo.semester;
        const auditType: 'initial' | 'final' = auditTypeInfo.audit_type.toLowerCase() as 'initial' | 'final';
        
        // Copy to appropriate audit folder
         if (auditType === 'initial') {
           // Initial Audit: copy pending files but keep them visible in Pending
           await copyPendingToInitialAudit(latestSubmission.organization, year, semester);
         } else {
           // Final Audit: move all pending submissions to final audit folder and remove from Pending
           await movePendingToFinalAudit(latestSubmission.organization, year, semester);
         }
        
        // Create a NEW reviewed record for Internal Review (new folder)
        const currentYear = new Date().getFullYear();
        const currentRevisionCount = latestSubmission.revision_count || 1;
        
        // Create new record with COA opinion and comment
        const { error: insertError } = await supabase
          .from('submissions')
          .insert({
            organization: latestSubmission.organization,
            submission_type: latestSubmission.submission_type,
            activity_title: latestSubmission.activity_title,
            activity_duration: latestSubmission.activity_duration,
            activity_venue: latestSubmission.activity_venue,
            activity_participants: latestSubmission.activity_participants,
            activity_funds: latestSubmission.activity_funds,
            activity_budget: latestSubmission.activity_budget,
            activity_sdg: latestSubmission.activity_sdg,
            activity_likha: latestSubmission.activity_likha,
            file_url: latestSubmission.file_url,
            file_name: latestSubmission.file_name,
            status: latestSubmission.status,
            submitted_to: 'COA',
            approved_by: latestSubmission.approved_by,
            revision_count: currentRevisionCount,
            coa_opinion: hasOpinion,
            coa_comment: hasComment,
            coa_reviewed: true,
            coa_reviewed_at: new Date().toISOString(),
            endorsed_to_coa: true,
            audit_type: auditTypeInfo.display_text, // Store full audit type display text
            semester: auditTypeInfo.semester // Store semester separately for queries
          });

        if (insertError) throw insertError;
        
        // Note: We do NOT delete the original submission
        // - For Initial Audit: files remain in Pending with audit_type='initial' 
        // - For Final Audit: movePendingToFinalAudit already changed status to 'In Final Audit'
      } else {
        // Just save comment without marking as reviewed (still in Pending Review)
        const { error } = await supabase
          .from('submissions')
          .update({ 
            coa_comment: comment,
            ...(hasOpinion && { coa_opinion: hasOpinion })
          })
          .eq('id', selectedSubmission.id);

        if (error) throw error;
      }

      // Create notification for the organization
      const orgFullNames: Record<string, string> = {
        "USG": "University Student Government",
        "LCO": "League of Campus Organization",
        "LSG": "Local Student Government",
        "AO": "Accredited Organizations",
        "GSC": "Graduating Student Council",
        "USED": "University Student Enterprise Development",
        "TGP": "The Gold Panicles",
      };

      await supabase
        .from('notifications')
        .insert({
          event_id: selectedSubmission.id,
          event_title: `COA Comment on ${selectedSubmission.submission_type}`,
          event_description: `COA has added a comment to your ${selectedSubmission.submission_type} titled "${selectedSubmission.activity_title}". Check your Logs for details.`,
          created_by: 'COA',
          target_org: selectedSubmission.organization
        });

      if (shouldMarkReviewed) {
        toast({
          title: "Review Complete",
          description: `${selectedSubmission.submission_type} has been marked as reviewed and moved to Internal Review as ${auditTypeInfo.display_text}.`,
        });
      } else {
        toast({
          title: "Comment saved",
          description: "Your comment has been saved. Set an opinion to complete the review.",
        });
      }
      setIsCommentDialogOpen(false);
      setComment("");
      setTempOpinions(prev => {
        const newOpinions = { ...prev };
        delete newOpinions[selectedSubmission.id];
        return newOpinions;
      });
      setTempComments(prev => {
        const newComments = { ...prev };
        delete newComments[selectedSubmission.id];
        return newComments;
      });
      loadSubmissions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openCommentDialog = async (submission: Submission) => {
    setSelectedSubmission(submission);
    setComment(submission.coa_comment || "");
    setIsCommentDialogOpen(true);
    
    // Fetch next audit type for this organization
    setLoadingAuditType(true);
    try {
      const auditTypeInfo = await getNextAuditType(submission.organization);
      setNextAuditType(auditTypeInfo.display_text);
    } catch (error) {
      console.error('Error fetching audit type:', error);
      setNextAuditType('Unable to determine audit type');
    } finally {
      setLoadingAuditType(false);
    }
  };

  // Helper function to render organization files in Internal Review
  const renderOrgFiles = (
    orgSubmissions: Submission[],
    groupByActivityTitle: (subs: Submission[]) => Record<string, { accomplishment?: Submission; liquidation?: Submission }>
  ) => {
    const groupedByTitle = groupByActivityTitle(orgSubmissions);

    return (
      <div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableHead className="text-gray-700 font-semibold">DOCUMENT</TableHead>
              <TableHead className="text-gray-700 font-semibold">ACCOMPLISHMENT</TableHead>
              <TableHead className="text-gray-700 font-semibold">LIQUIDATION</TableHead>
              <TableHead className="text-gray-700 font-semibold">DATE SUBMITTED</TableHead>
              <TableHead className="text-gray-700 font-semibold">OVERALL ACTION</TableHead>
              <TableHead className="text-gray-700 font-semibold">OVERALL COMMENT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedByTitle).map(([title, docs]) => (
              <TableRow key={title} className="hover:bg-gray-50">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    {title}
                  </div>
                </TableCell>
                <TableCell>
                  {docs.accomplishment?.file_url ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                      onClick={() => window.open(docs.accomplishment!.file_url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  ) : (
                    <span className="text-gray-400 text-sm">Not submitted</span>
                  )}
                </TableCell>
                <TableCell>
                  {docs.liquidation?.file_url ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                      onClick={() => window.open(docs.liquidation!.file_url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  ) : (
                    <span className="text-gray-400 text-sm">Not submitted</span>
                  )}
                </TableCell>
                <TableCell className="text-gray-600">
                  {(docs.accomplishment || docs.liquidation)?.submitted_at 
                    ? new Date((docs.accomplishment || docs.liquidation)!.submitted_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : 'N/A'}
                </TableCell>
                <TableCell>
                  <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-gray-700 text-sm">
                    {(docs.accomplishment || docs.liquidation)?.coa_opinion || 'N/A'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-gray-700 text-sm max-w-xs truncate" title={(docs.accomplishment || docs.liquidation)?.coa_comment || 'No comment'}>
                    {(docs.accomplishment || docs.liquidation)?.coa_comment || 'No comment'}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* COA Action/Comment Section */}
        {orgSubmissions[0].coa_opinion && (
          <div className="bg-gray-100 px-6 py-4 border-t">
            <div className="flex items-start gap-6">
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  COA Action
                </label>
                <div className="px-3 py-2 bg-white border rounded-md text-gray-700 text-sm">
                  {orgSubmissions[0].coa_opinion}
                </div>
              </div>
              <div className="flex-[2]">
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  COA Comment
                </label>
                <div className="px-3 py-2 bg-white border rounded-md text-gray-700 text-sm min-h-[60px]">
                  {orgSubmissions[0].coa_comment || "No comment provided"}
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              {orgSubmissions.some(s => s.endorsed_to_osld) ? (
                <Button
                  className="bg-gray-400 text-white cursor-not-allowed"
                  disabled
                >
                  Endorsed to OSLD
                </Button>
              ) : (
                <Button
                  onClick={async () => {
                    try {
                      // Get all submissions for this activity title
                      const activityTitle = orgSubmissions[0].activity_title;
                      const organization = orgSubmissions[0].organization;
                      
                      // Create copies of both accomplishment and liquidation reports endorsed to OSLD
                      for (const submission of orgSubmissions) {
                        const { error } = await supabase
                          .from('submissions')
                          .insert({
                            organization: submission.organization,
                            submission_type: submission.submission_type,
                            activity_title: submission.activity_title,
                            activity_duration: submission.activity_duration,
                            activity_venue: submission.activity_venue,
                            activity_participants: submission.activity_participants,
                            activity_funds: submission.activity_funds,
                            activity_budget: submission.activity_budget,
                            activity_sdg: submission.activity_sdg,
                            activity_likha: submission.activity_likha,
                            file_url: submission.file_url,
                            file_name: submission.file_name,
                            status: 'Pending',
                            submitted_to: 'OSLD',
                            coa_opinion: submission.coa_opinion,
                            coa_comment: submission.coa_comment,
                            coa_reviewed: true,
                            coa_reviewed_at: submission.coa_reviewed_at,
                            revision_count: submission.revision_count,
                            endorsed_to_osld: true
                          });
                        
                        if (error) throw error;
                        
                        // Mark the original submission as endorsed to OSLD
                        await supabase
                          .from('submissions')
                          .update({ endorsed_to_osld: true })
                          .eq('id', submission.id);
                      }
                      
                      // Send notification to OSLD
                      await supabase
                        .from('notifications')
                        .insert({
                          event_id: orgSubmissions[0].id,
                          event_title: `COA Endorsed Files from ${organization}`,
                          event_description: `COA has endorsed files for "${activityTitle}" from ${organization}. Check Activity Logs.`,
                          created_by: 'COA',
                          target_org: 'OSLD'
                        });
                      
                      toast({
                        title: "Success",
                        description: "Files endorsed to OSLD successfully.",
                      });
                      
                      // Refresh submissions
                      loadSubmissions();
                    } catch (error: unknown) {
                      console.error('Error endorsing to OSLD:', error);
                      toast({
                        title: "Error",
                        description: "Failed to endorse files to OSLD.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Endorse to OSLD
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSubmissionsByOrg = (filterType: string) => {
    // Filter submissions based on tab - "all" shows all, "reviewed" shows only reviewed ones
    const filteredSubmissions = filterType === "reviewed" 
      ? submissions.filter(s => s.coa_reviewed === true)
      : submissions.filter(s => s.status === 'Approved' && !s.coa_reviewed);
    
    const isReviewedView = filterType === "reviewed";

    // For Internal Review, we also need to show coa_review_copies
    if (isReviewedView && filteredSubmissions.length === 0 && reviewCopies.length === 0) {
      return (
        <Card className="p-12 text-center">
          <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">No submissions</p>
          <p className="text-gray-400 text-sm mt-2">
            {filterType === "reviewed" ? "Reviewed submissions will appear here" : "Approved submissions will appear here"}
          </p>
        </Card>
      );
    }

    if (!isReviewedView && filteredSubmissions.length === 0) {
      return (
        <Card className="p-12 text-center">
          <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">No submissions</p>
          <p className="text-gray-400 text-sm mt-2">
            Approved submissions will appear here
          </p>
        </Card>
      );
    }

    // For Internal Review - Folder structure: Year > Organization (for AO/LSG) > Files
    if (isReviewedView) {
      // Group by year first
      const groupedByYear: Record<string, Submission[]> = {};
      filteredSubmissions.forEach((sub) => {
        const year = sub.coa_reviewed_at 
          ? new Date(sub.coa_reviewed_at).getFullYear().toString()
          : new Date().getFullYear().toString();
        if (!groupedByYear[year]) {
          groupedByYear[year] = [];
        }
        groupedByYear[year].push(sub);
      });

      // Sort years in descending order
      const sortedYears = Object.keys(groupedByYear).sort((a, b) => parseInt(b) - parseInt(a));

      return (
        <div className="space-y-4">
          {sortedYears.map((year) => {
            const yearSubmissions = groupedByYear[year];
            const isYearExpanded = expandedYears.has(year);

            // Group by organization within the year
            const groupedByOrg: Record<string, Submission[]> = {};
            yearSubmissions.forEach((sub) => {
              if (!groupedByOrg[sub.organization]) {
                groupedByOrg[sub.organization] = [];
              }
              groupedByOrg[sub.organization].push(sub);
            });

            return (
              <Card key={year} className="overflow-hidden border-2 border-[#003b27]">
                {/* Year Folder Header */}
                <button
                  onClick={() => {
                    setExpandedYears(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(year)) {
                        newSet.delete(year);
                      } else {
                        newSet.add(year);
                      }
                      return newSet;
                    });
                  }}
                  className="w-full bg-[#003b27] text-white px-6 py-4 flex items-center justify-between hover:bg-[#002a1c] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Folder className="h-6 w-6 text-[#d4af37]" />
                    <div className="text-left">
                      <h3 className="text-lg font-bold">{year} Remarks</h3>
                      <p className="text-sm text-gray-300">
                        {yearSubmissions.length} file{yearSubmissions.length !== 1 ? 's' : ''} • {Object.keys(groupedByOrg).length} organization{Object.keys(groupedByOrg).length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {isYearExpanded ? (
                    <ChevronDown className="h-5 w-5 text-[#d4af37]" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-[#d4af37]" />
                  )}
                </button>

                {/* Expanded Year Content */}
                {isYearExpanded && (
                  <div className="p-4 bg-gray-50 space-y-4">
                    {Object.entries(groupedByOrg).map(([org, orgSubmissions]) => {
                      const orgKey = `${year}-${org}`;
                      const isOrgExpanded = expandedOrgs.has(orgKey);

                      // Show organization folder for all orgs
                      return (
                        <Card key={orgKey} className="overflow-hidden border border-gray-300">
                          {/* Organization Folder Header */}
                          <button
                            onClick={() => {
                              setExpandedOrgs(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(orgKey)) {
                                  newSet.delete(orgKey);
                                } else {
                                  newSet.add(orgKey);
                                }
                                return newSet;
                              });
                            }}
                            className="w-full bg-[#f5f5f5] px-4 py-3 flex items-center justify-between hover:bg-gray-200 transition-colors border-b"
                          >
                            <div className="flex items-center gap-3">
                              <Folder className="h-5 w-5 text-[#003b27]" />
                              <div className="text-left">
                                <h4 className="text-base font-semibold text-gray-800">{getOrgFullName(org)}</h4>
                                <p className="text-xs text-gray-500">
                                  {orgSubmissions.length} file{orgSubmissions.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            {isOrgExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                          </button>

                          {/* Organization Expanded Content - Semesters */}
                          {isOrgExpanded && (
                            <div className="bg-white space-y-2 p-3">
                              {/* 1st Semester */}
                              {(() => {
                                const semesterKey = `${orgKey}-1st`;
                                const isSemesterExpanded = expandedSemesters.has(semesterKey);
                                
                                return (
                                  <Card key="1st-semester" className="overflow-hidden border border-gray-200">
                                    <button
                                      onClick={() => {
                                        setExpandedSemesters(prev => {
                                          const newSet = new Set(prev);
                                          if (newSet.has(semesterKey)) {
                                            newSet.delete(semesterKey);
                                          } else {
                                            newSet.add(semesterKey);
                                          }
                                          return newSet;
                                        });
                                      }}
                                      className="w-full bg-[#f9f9f9] px-4 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors border-b border-gray-200"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Folder className="h-4 w-4 text-gray-500" />
                                        <h5 className="text-sm font-medium text-gray-700">1st Semester</h5>
                                      </div>
                                      {isSemesterExpanded ? (
                                        <ChevronDown className="h-3 w-3 text-gray-400" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3 text-gray-400" />
                                      )}
                                    </button>

                                    {isSemesterExpanded && (
                                      <div className="bg-white space-y-2 p-2">
                                        {/* Initial Audit Folder */}
                                        {(() => {
                                          const initialKey = `${semesterKey}-initial`;
                                          const isInitialExpanded = expandedAuditTypes.has(initialKey);
                                          
                                          return (
                                            <Card key="initial-audit" className="overflow-hidden border border-gray-100">
                                              <button
                                                onClick={() => {
                                                  setExpandedAuditTypes(prev => {
                                                    const newSet = new Set(prev);
                                                    if (newSet.has(initialKey)) {
                                                      newSet.delete(initialKey);
                                                    } else {
                                                      newSet.add(initialKey);
                                                    }
                                                    return newSet;
                                                  });
                                                }}
                                                className="w-full bg-[#fafafa] px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <Folder className="h-3 w-3 text-blue-500" />
                                                  <span className="text-xs font-medium text-gray-600">Initial Audit</span>
                                                </div>
                                                {isInitialExpanded ? (
                                                  <ChevronDown className="h-3 w-3 text-gray-400" />
                                                ) : (
                                                  <ChevronRight className="h-3 w-3 text-gray-400" />
                                                )}
                                              </button>
                                              
                                              {isInitialExpanded && (
                                                <div className="p-4 bg-white">
                                                  {(() => {
                                                    // Determine semester based on key (1st or 2nd)
                                                    const semester = semesterKey.includes('-1st') ? '1st' : '2nd';
                                                    // Filter review copies for this org, year, semester, and audit type
                                                    const copies = reviewCopies.filter(
                                                      c => c.organization === org && 
                                                           c.year === parseInt(year) && 
                                                           c.semester === semester && 
                                                           c.audit_type === 'initial'
                                                    );
                                                    
                                                    if (copies.length === 0) {
                                                      return (
                                                        <div className="text-xs text-gray-500 text-center py-2">
                                                          No initial audit files
                                                        </div>
                                                      );
                                                    }
                                                    
                                                    return (
                                                      <div className="space-y-3">
                                                        {(() => {
                                                          // Get the submission that was reviewed (prefer accomplishment if both exist)
                                                          const reviewedSubmission = copies.length > 0 
                                                            ? submissions.find(s => s.id === copies[0].submission_id && s.submission_type === "Accomplishment Report") ||
                                                              submissions.find(s => s.id === copies[0].submission_id)
                                                            : null;
                                                            
                                                          if (reviewedSubmission) {
                                                            const isEndorsed = reviewedSubmission.endorsed_to_osld;
                                                            
                                                            return (
                                                              <div className="border-b pb-3 space-y-2">
                                                                <div className="flex items-start justify-between">
                                                                  <div className="flex-1">
                                                                    {reviewedSubmission.coa_reviewed_at && (
                                                                      <div className="text-xs text-gray-600 mb-2">
                                                                        <span className="font-semibold">Reviewed on:</span> {new Date(reviewedSubmission.coa_reviewed_at).toLocaleDateString('en-US', {
                                                                          month: 'short',
                                                                          day: 'numeric',
                                                                          year: 'numeric'
                                                                        })}
                                                                      </div>
                                                                    )}
                                                                    {reviewedSubmission.coa_opinion && (
                                                                      <div className="mb-2">
                                                                        <span className="text-xs font-semibold text-gray-900">COA Opinion: </span>
                                                                        <span className="text-sm text-gray-900">
                                                                          {reviewedSubmission.coa_opinion}
                                                                        </span>
                                                                      </div>
                                                                    )}
                                                                    {reviewedSubmission.coa_comment && (
                                                                      <div>
                                                                        <span className="text-xs font-semibold text-gray-900">COA Comment: </span>
                                                                        <span className="text-sm text-gray-700">
                                                                          {reviewedSubmission.coa_comment}
                                                                        </span>
                                                                      </div>
                                                                    )}
                                                                  </div>
                                                                  <Button
                                                                    size="sm"
                                                                    className={`ml-4 ${isEndorsed ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' : 'bg-[#0F4229] hover:bg-[#0d3821]'}`}
                                                                    disabled={isEndorsed}
                                                                    onClick={async () => {
                                                                      try {
                                                                        const { error } = await supabase
                                                                          .from('submissions')
                                                                          .update({ endorsed_to_osld: true })
                                                                          .eq('id', reviewedSubmission.id);
                                                                        
                                                                        if (error) throw error;
                                                                        
                                                                        // Send notification to OSLD
                                                                        await supabase
                                                                          .from('notifications')
                                                                          .insert({
                                                                            event_id: reviewedSubmission.id,
                                                                            event_title: `COA Endorsed Files from ${reviewedSubmission.organization}`,
                                                                            event_description: `COA has endorsed files for "${reviewedSubmission.activity_title}" from ${reviewedSubmission.organization}. Check Activity Logs.`,
                                                                            created_by: 'COA',
                                                                            target_org: 'OSLD'
                                                                          });
                                                                        
                                                                        toast({
                                                                          title: "Success",
                                                                          description: "Successfully endorsed to OSLD",
                                                                        });
                                                                        
                                                                        // Refresh data
                                                                        loadSubmissions();
                                                                      } catch (error) {
                                                                        console.error('Error endorsing to OSLD:', error);
                                                                        toast({
                                                                          title: "Error",
                                                                          description: "Failed to endorse to OSLD",
                                                                          variant: "destructive",
                                                                        });
                                                                      }
                                                                    }}
                                                                  >
                                                                    <Send className="h-3 w-3 mr-1" />
                                                                    {isEndorsed ? 'Endorsed' : 'Endorse to OSLD'}
                                                                  </Button>
                                                                </div>
                                                              </div>
                                                            );
                                                          }
                                                          return null;
                                                        })()}
                                                        
                                                        <Table>
                                                          <TableHeader>
                                                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                                              <TableHead className="text-gray-700 font-semibold">Document</TableHead>
                                                              <TableHead className="text-gray-700 font-semibold">Accomplishment</TableHead>
                                                              <TableHead className="text-gray-700 font-semibold">Liquidation</TableHead>
                                                            </TableRow>
                                                          </TableHeader>
                                                          <TableBody>
                                                            {(() => {
                                                              const groupedByActivity: Record<string, { accomplishment?: typeof copies[0]; liquidation?: typeof copies[0] }> = {};
                                                              copies.forEach((copy) => {
                                                                const originalSubmission = submissions.find(s => s.id === copy.submission_id);
                                                                if (originalSubmission) {
                                                                  const title = originalSubmission.activity_title;
                                                                  if (!groupedByActivity[title]) {
                                                                    groupedByActivity[title] = {};
                                                                  }
                                                                  if (originalSubmission.submission_type === "Accomplishment Report") {
                                                                    groupedByActivity[title].accomplishment = copy;
                                                                  } else if (originalSubmission.submission_type === "Liquidation Report") {
                                                                    groupedByActivity[title].liquidation = copy;
                                                                  }
                                                                }
                                                              });
                                                              
                                                              return Object.entries(groupedByActivity).map(([title, docs]) => {
                                                                return (
                                                                  <TableRow key={title} className="hover:bg-gray-50">
                                                                    <TableCell className="font-medium">
                                                                      <div className="flex items-center gap-2">
                                                                        {title}
                                                                      </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                      {docs.accomplishment ? (
                                                                        <a
                                                                          href={docs.accomplishment.file_url}
                                                                          target="_blank"
                                                                          rel="noopener noreferrer"
                                                                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                                                                        >
                                                                          <Eye className="h-4 w-4" />
                                                                          View
                                                                        </a>
                                                                      ) : (
                                                                        <span className="text-gray-400 text-sm">Not submitted</span>
                                                                      )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                      {docs.liquidation ? (
                                                                        <a
                                                                          href={docs.liquidation.file_url}
                                                                          target="_blank"
                                                                          rel="noopener noreferrer"
                                                                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                                                                        >
                                                                          <Eye className="h-4 w-4" />
                                                                          View
                                                                        </a>
                                                                      ) : (
                                                                        <span className="text-gray-400 text-sm">Not submitted</span>
                                                                      )}
                                                                    </TableCell>
                                                                  </TableRow>
                                                                );
                                                              });
                                                            })()}
                                                          </TableBody>
                                                        </Table>
                                                      </div>
                                                    );
                                                  })()}
                                                </div>
                                              )}
                                            </Card>
                                          );
                                        })()}

                                        {/* Final Audit Folder */}
                                        {(() => {
                                          const finalKey = `${semesterKey}-final`;
                                          const isFinalExpanded = expandedAuditTypes.has(finalKey);
                                          
                                          return (
                                            <Card key="final-audit" className="overflow-hidden border border-gray-100">
                                              <button
                                                onClick={() => {
                                                  setExpandedAuditTypes(prev => {
                                                    const newSet = new Set(prev);
                                                    if (newSet.has(finalKey)) {
                                                      newSet.delete(finalKey);
                                                    } else {
                                                      newSet.add(finalKey);
                                                    }
                                                    return newSet;
                                                  });
                                                }}
                                                className="w-full bg-[#fafafa] px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <Folder className="h-3 w-3 text-green-500" />
                                                  <span className="text-xs font-medium text-gray-600">Final Audit</span>
                                                </div>
                                                {isFinalExpanded ? (
                                                  <ChevronDown className="h-3 w-3 text-gray-400" />
                                                ) : (
                                                  <ChevronRight className="h-3 w-3 text-gray-400" />
                                                )}
                                              </button>
                                              
                                              {isFinalExpanded && (
                                                <div className="p-4 bg-white">
                                                  {(() => {
                                                    // Determine semester based on key (1st or 2nd)
                                                    const semester = semesterKey.includes('-1st') ? '1st' : '2nd';
                                                    // Filter review copies for this org, year, semester, and audit type
                                                    const copies = reviewCopies.filter(
                                                      c => c.organization === org && 
                                                           c.year === parseInt(year) && 
                                                           c.semester === semester && 
                                                           c.audit_type === 'final'
                                                    );
                                                    
                                                    if (copies.length === 0) {
                                                      return (
                                                        <div className="text-xs text-gray-500 text-center py-2">
                                                          No final audit files
                                                        </div>
                                                      );
                                                    }
                                                    
                                                    return (
                                                      <div className="space-y-3">
                                                        {(() => {
                                                          // Get the submission that was reviewed (prefer accomplishment if both exist)
                                                          const reviewedSubmission = copies.length > 0 
                                                            ? submissions.find(s => s.id === copies[0].submission_id && s.submission_type === "Accomplishment Report") ||
                                                              submissions.find(s => s.id === copies[0].submission_id)
                                                            : null;
                                                            
                                                          if (reviewedSubmission) {
                                                            const isEndorsed = reviewedSubmission.endorsed_to_osld;
                                                            
                                                            return (
                                                              <div className="border-b pb-3 space-y-2">
                                                                <div className="flex items-start justify-between">
                                                                  <div className="flex-1">
                                                                    {reviewedSubmission.coa_reviewed_at && (
                                                                      <div className="text-xs text-gray-600 mb-2">
                                                                        <span className="font-semibold">Reviewed on:</span> {new Date(reviewedSubmission.coa_reviewed_at).toLocaleDateString('en-US', {
                                                                          month: 'short',
                                                                          day: 'numeric',
                                                                          year: 'numeric'
                                                                        })}
                                                                      </div>
                                                                    )}
                                                                    {reviewedSubmission.coa_opinion && (
                                                                      <div className="mb-2">
                                                                        <span className="text-xs font-semibold text-gray-900">COA Opinion: </span>
                                                                        <span className="text-sm text-gray-900">
                                                                          {reviewedSubmission.coa_opinion}
                                                                        </span>
                                                                      </div>
                                                                    )}
                                                                    {reviewedSubmission.coa_comment && (
                                                                      <div>
                                                                        <span className="text-xs font-semibold text-gray-900">COA Comment: </span>
                                                                        <span className="text-sm text-gray-700">
                                                                          {reviewedSubmission.coa_comment}
                                                                        </span>
                                                                      </div>
                                                                    )}
                                                                  </div>
                                                                  <Button
                                                                    size="sm"
                                                                    className={`ml-4 ${isEndorsed ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' : 'bg-[#0F4229] hover:bg-[#0d3821]'}`}
                                                                    disabled={isEndorsed}
                                                                    onClick={async () => {
                                                                      try {
                                                                        const { error } = await supabase
                                                                          .from('submissions')
                                                                          .update({ endorsed_to_osld: true })
                                                                          .eq('id', reviewedSubmission.id);
                                                                        
                                                                        if (error) throw error;
                                                                        
                                                                        // Send notification to OSLD
                                                                        await supabase
                                                                          .from('notifications')
                                                                          .insert({
                                                                            event_id: reviewedSubmission.id,
                                                                            event_title: `COA Endorsed Files from ${reviewedSubmission.organization}`,
                                                                            event_description: `COA has endorsed files for "${reviewedSubmission.activity_title}" from ${reviewedSubmission.organization}. Check Activity Logs.`,
                                                                            created_by: 'COA',
                                                                            target_org: 'OSLD'
                                                                          });
                                                                        
                                                                        toast({
                                                                          title: "Success",
                                                                          description: "Successfully endorsed to OSLD",
                                                                        });
                                                                        
                                                                        // Refresh data
                                                                        loadSubmissions();
                                                                      } catch (error) {
                                                                        console.error('Error endorsing to OSLD:', error);
                                                                        toast({
                                                                          title: "Error",
                                                                          description: "Failed to endorse to OSLD",
                                                                          variant: "destructive",
                                                                        });
                                                                      }
                                                                    }}
                                                                  >
                                                                    <Send className="h-3 w-3 mr-1" />
                                                                    {isEndorsed ? 'Endorsed' : 'Endorse to OSLD'}
                                                                  </Button>
                                                                </div>
                                                              </div>
                                                            );
                                                          }
                                                          return null;
                                                        })()}
                                                        
                                                        <Table>
                                                          <TableHeader>
                                                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                                              <TableHead className="text-gray-700 font-semibold">Document</TableHead>
                                                              <TableHead className="text-gray-700 font-semibold">Accomplishment</TableHead>
                                                              <TableHead className="text-gray-700 font-semibold">Liquidation</TableHead>
                                                            </TableRow>
                                                          </TableHeader>
                                                          <TableBody>
                                                            {(() => {
                                                              const groupedByActivity: Record<string, { accomplishment?: typeof copies[0]; liquidation?: typeof copies[0] }> = {};
                                                              copies.forEach((copy) => {
                                                                const originalSubmission = submissions.find(s => s.id === copy.submission_id);
                                                                if (originalSubmission) {
                                                                  const title = originalSubmission.activity_title;
                                                                  if (!groupedByActivity[title]) {
                                                                    groupedByActivity[title] = {};
                                                                  }
                                                                  if (originalSubmission.submission_type === "Accomplishment Report") {
                                                                    groupedByActivity[title].accomplishment = copy;
                                                                  } else if (originalSubmission.submission_type === "Liquidation Report") {
                                                                    groupedByActivity[title].liquidation = copy;
                                                                  }
                                                                }
                                                              });
                                                              
                                                              return Object.entries(groupedByActivity).map(([title, docs]) => {
                                                                return (
                                                                  <TableRow key={title} className="hover:bg-gray-50">
                                                                    <TableCell className="font-medium">
                                                                      <div className="flex items-center gap-2">
                                                                        {title}
                                                                      </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                      {docs.accomplishment ? (
                                                                        <a
                                                                          href={docs.accomplishment.file_url}
                                                                          target="_blank"
                                                                          rel="noopener noreferrer"
                                                                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                                                                        >
                                                                          <Eye className="h-4 w-4" />
                                                                          View
                                                                        </a>
                                                                      ) : (
                                                                        <span className="text-gray-400 text-sm">Not submitted</span>
                                                                      )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                      {docs.liquidation ? (
                                                                        <a
                                                                          href={docs.liquidation.file_url}
                                                                          target="_blank"
                                                                          rel="noopener noreferrer"
                                                                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                                                                        >
                                                                          <Eye className="h-4 w-4" />
                                                                          View
                                                                        </a>
                                                                      ) : (
                                                                        <span className="text-gray-400 text-sm">Not submitted</span>
                                                                      )}
                                                                    </TableCell>
                                                                  </TableRow>
                                                                );
                                                              });
                                                            })()}
                                                          </TableBody>
                                                        </Table>
                                                      </div>
                                                    );
                                                  })()}
                                                </div>
                                              )}
                                            </Card>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </Card>
                                );
                              })()}

                              {/* 2nd Semester */}
                              {(() => {
                                const semesterKey = `${orgKey}-2nd`;
                                const isSemesterExpanded = expandedSemesters.has(semesterKey);
                                
                                return (
                                  <Card key="2nd-semester" className="overflow-hidden border border-gray-200">
                                    <button
                                      onClick={() => {
                                        setExpandedSemesters(prev => {
                                          const newSet = new Set(prev);
                                          if (newSet.has(semesterKey)) {
                                            newSet.delete(semesterKey);
                                          } else {
                                            newSet.add(semesterKey);
                                          }
                                          return newSet;
                                        });
                                      }}
                                      className="w-full bg-[#f9f9f9] px-4 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors border-b border-gray-200"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Folder className="h-4 w-4 text-gray-500" />
                                        <h5 className="text-sm font-medium text-gray-700">2nd Semester</h5>
                                      </div>
                                      {isSemesterExpanded ? (
                                        <ChevronDown className="h-3 w-3 text-gray-400" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3 text-gray-400" />
                                      )}
                                    </button>

                                    {isSemesterExpanded && (
                                      <div className="bg-white space-y-2 p-2">
                                        {/* Initial Audit Folder */}
                                        {(() => {
                                          const initialKey = `${semesterKey}-initial`;
                                          const isInitialExpanded = expandedAuditTypes.has(initialKey);
                                          
                                          return (
                                            <Card key="initial-audit" className="overflow-hidden border border-gray-100">
                                              <button
                                                onClick={() => {
                                                  setExpandedAuditTypes(prev => {
                                                    const newSet = new Set(prev);
                                                    if (newSet.has(initialKey)) {
                                                      newSet.delete(initialKey);
                                                    } else {
                                                      newSet.add(initialKey);
                                                    }
                                                    return newSet;
                                                  });
                                                }}
                                                className="w-full bg-[#fafafa] px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <Folder className="h-3 w-3 text-blue-500" />
                                                  <span className="text-xs font-medium text-gray-600">Initial Audit</span>
                                                </div>
                                                {isInitialExpanded ? (
                                                  <ChevronDown className="h-3 w-3 text-gray-400" />
                                                ) : (
                                                  <ChevronRight className="h-3 w-3 text-gray-400" />
                                                )}
                                              </button>
                                              
                                              {isInitialExpanded && (
                                                <div className="p-4 bg-white">
                                                  {(() => {
                                                    // Determine semester based on key (1st or 2nd)
                                                    const semester = semesterKey.includes('-1st') ? '1st' : '2nd';
                                                    // Filter review copies for this org, year, semester, and audit type
                                                    const copies = reviewCopies.filter(
                                                      c => c.organization === org && 
                                                           c.year === parseInt(year) && 
                                                           c.semester === semester && 
                                                           c.audit_type === 'initial'
                                                    );
                                                    
                                                    if (copies.length === 0) {
                                                      return (
                                                        <div className="text-xs text-gray-500 text-center py-2">
                                                          No initial audit files
                                                        </div>
                                                      );
                                                    }
                                                    
                                                    return (
                                                      <div className="space-y-3">
                                                        {(() => {
                                                          // Get the submission that was reviewed (prefer accomplishment if both exist)
                                                          const reviewedSubmission = copies.length > 0 
                                                            ? submissions.find(s => s.id === copies[0].submission_id && s.submission_type === "Accomplishment Report") ||
                                                              submissions.find(s => s.id === copies[0].submission_id)
                                                            : null;
                                                            
                                                          if (reviewedSubmission) {
                                                            const isEndorsed = reviewedSubmission.endorsed_to_osld;
                                                            
                                                            return (
                                                              <div className="border-b pb-3 space-y-2">
                                                                <div className="flex items-start justify-between">
                                                                  <div className="flex-1">
                                                                    {reviewedSubmission.coa_reviewed_at && (
                                                                      <div className="text-xs text-gray-600 mb-2">
                                                                        <span className="font-semibold">Reviewed on:</span> {new Date(reviewedSubmission.coa_reviewed_at).toLocaleDateString('en-US', {
                                                                          month: 'short',
                                                                          day: 'numeric',
                                                                          year: 'numeric'
                                                                        })}
                                                                      </div>
                                                                    )}
                                                                    {reviewedSubmission.coa_opinion && (
                                                                      <div className="mb-2">
                                                                        <span className="text-xs font-semibold text-gray-900">COA Opinion: </span>
                                                                        <span className="text-sm text-gray-900">
                                                                          {reviewedSubmission.coa_opinion}
                                                                        </span>
                                                                      </div>
                                                                    )}
                                                                    {reviewedSubmission.coa_comment && (
                                                                      <div>
                                                                        <span className="text-xs font-semibold text-gray-900">COA Comment: </span>
                                                                        <span className="text-sm text-gray-700">
                                                                          {reviewedSubmission.coa_comment}
                                                                        </span>
                                                                      </div>
                                                                    )}
                                                                  </div>
                                                                  <Button
                                                                    size="sm"
                                                                    className={`ml-4 ${isEndorsed ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' : 'bg-[#0F4229] hover:bg-[#0d3821]'}`}
                                                                    disabled={isEndorsed}
                                                                    onClick={async () => {
                                                                      try {
                                                                        const { error } = await supabase
                                                                          .from('submissions')
                                                                          .update({ endorsed_to_osld: true })
                                                                          .eq('id', reviewedSubmission.id);
                                                                        
                                                                        if (error) throw error;
                                                                        
                                                                        // Send notification to OSLD
                                                                        await supabase
                                                                          .from('notifications')
                                                                          .insert({
                                                                            event_id: reviewedSubmission.id,
                                                                            event_title: `COA Endorsed Files from ${reviewedSubmission.organization}`,
                                                                            event_description: `COA has endorsed files for "${reviewedSubmission.activity_title}" from ${reviewedSubmission.organization}. Check Activity Logs.`,
                                                                            created_by: 'COA',
                                                                            target_org: 'OSLD'
                                                                          });
                                                                        
                                                                        toast({
                                                                          title: "Success",
                                                                          description: "Successfully endorsed to OSLD",
                                                                        });
                                                                        
                                                                        // Refresh data
                                                                        loadSubmissions();
                                                                      } catch (error) {
                                                                        console.error('Error endorsing to OSLD:', error);
                                                                        toast({
                                                                          title: "Error",
                                                                          description: "Failed to endorse to OSLD",
                                                                          variant: "destructive",
                                                                        });
                                                                      }
                                                                    }}
                                                                  >
                                                                    <Send className="h-3 w-3 mr-1" />
                                                                    {isEndorsed ? 'Endorsed' : 'Endorse to OSLD'}
                                                                  </Button>
                                                                </div>
                                                              </div>
                                                            );
                                                          }
                                                          return null;
                                                        })()}
                                                        
                                                        <Table>
                                                          <TableHeader>
                                                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                                              <TableHead className="text-gray-700 font-semibold">Document</TableHead>
                                                              <TableHead className="text-gray-700 font-semibold">Accomplishment</TableHead>
                                                              <TableHead className="text-gray-700 font-semibold">Liquidation</TableHead>
                                                            </TableRow>
                                                          </TableHeader>
                                                          <TableBody>
                                                            {(() => {
                                                              const groupedByActivity: Record<string, { accomplishment?: typeof copies[0]; liquidation?: typeof copies[0] }> = {};
                                                              copies.forEach((copy) => {
                                                                const originalSubmission = submissions.find(s => s.id === copy.submission_id);
                                                                if (originalSubmission) {
                                                                  const title = originalSubmission.activity_title;
                                                                  if (!groupedByActivity[title]) {
                                                                    groupedByActivity[title] = {};
                                                                  }
                                                                  if (originalSubmission.submission_type === "Accomplishment Report") {
                                                                    groupedByActivity[title].accomplishment = copy;
                                                                  } else if (originalSubmission.submission_type === "Liquidation Report") {
                                                                    groupedByActivity[title].liquidation = copy;
                                                                  }
                                                                }
                                                              });
                                                              
                                                              return Object.entries(groupedByActivity).map(([title, docs]) => {
                                                                return (
                                                                  <TableRow key={title} className="hover:bg-gray-50">
                                                                    <TableCell className="font-medium">
                                                                      <div className="flex items-center gap-2">
                                                                        {title}
                                                                      </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                      {docs.accomplishment ? (
                                                                        <a
                                                                          href={docs.accomplishment.file_url}
                                                                          target="_blank"
                                                                          rel="noopener noreferrer"
                                                                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                                                                        >
                                                                          <Eye className="h-4 w-4" />
                                                                          View
                                                                        </a>
                                                                      ) : (
                                                                        <span className="text-gray-400 text-sm">Not submitted</span>
                                                                      )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                      {docs.liquidation ? (
                                                                        <a
                                                                          href={docs.liquidation.file_url}
                                                                          target="_blank"
                                                                          rel="noopener noreferrer"
                                                                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                                                                        >
                                                                          <Eye className="h-4 w-4" />
                                                                          View
                                                                        </a>
                                                                      ) : (
                                                                        <span className="text-gray-400 text-sm">Not submitted</span>
                                                                      )}
                                                                    </TableCell>
                                                                  </TableRow>
                                                                );
                                                              });
                                                            })()}
                                                          </TableBody>
                                                        </Table>
                                                      </div>
                                                    );
                                                  })()}
                                                </div>
                                              )}
                                            </Card>
                                          );
                                        })()}

                                        {/* Final Audit Folder */}
                                        {(() => {
                                          const finalKey = `${semesterKey}-final`;
                                          const isFinalExpanded = expandedAuditTypes.has(finalKey);
                                          
                                          return (
                                            <Card key="final-audit" className="overflow-hidden border border-gray-100">
                                              <button
                                                onClick={() => {
                                                  setExpandedAuditTypes(prev => {
                                                    const newSet = new Set(prev);
                                                    if (newSet.has(finalKey)) {
                                                      newSet.delete(finalKey);
                                                    } else {
                                                      newSet.add(finalKey);
                                                    }
                                                    return newSet;
                                                  });
                                                }}
                                                className="w-full bg-[#fafafa] px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <Folder className="h-3 w-3 text-green-500" />
                                                  <span className="text-xs font-medium text-gray-600">Final Audit</span>
                                                </div>
                                                {isFinalExpanded ? (
                                                  <ChevronDown className="h-3 w-3 text-gray-400" />
                                                ) : (
                                                  <ChevronRight className="h-3 w-3 text-gray-400" />
                                                )}
                                              </button>
                                              
                                              {isFinalExpanded && (
                                                <div className="p-4 bg-white">
                                                  {(() => {
                                                    // Determine semester based on key (1st or 2nd)
                                                    const semester = semesterKey.includes('-1st') ? '1st' : '2nd';
                                                    // Filter review copies for this org, year, semester, and audit type
                                                    const copies = reviewCopies.filter(
                                                      c => c.organization === org && 
                                                           c.year === parseInt(year) && 
                                                           c.semester === semester && 
                                                           c.audit_type === 'final'
                                                    );
                                                    
                                                    if (copies.length === 0) {
                                                      return (
                                                        <div className="text-xs text-gray-500 text-center py-2">
                                                          No final audit files
                                                        </div>
                                                      );
                                                    }
                                                    
                                                    return (
                                                      <div className="space-y-3">
                                                        {(() => {
                                                          // Get the submission that was reviewed (prefer accomplishment if both exist)
                                                          const reviewedSubmission = copies.length > 0 
                                                            ? submissions.find(s => s.id === copies[0].submission_id && s.submission_type === "Accomplishment Report") ||
                                                              submissions.find(s => s.id === copies[0].submission_id)
                                                            : null;
                                                            
                                                          if (reviewedSubmission) {
                                                            const isEndorsed = reviewedSubmission.endorsed_to_osld;
                                                            
                                                            return (
                                                              <div className="border-b pb-3 space-y-2">
                                                                <div className="flex items-start justify-between">
                                                                  <div className="flex-1">
                                                                    {reviewedSubmission.coa_reviewed_at && (
                                                                      <div className="text-xs text-gray-600 mb-2">
                                                                        <span className="font-semibold">Reviewed on:</span> {new Date(reviewedSubmission.coa_reviewed_at).toLocaleDateString('en-US', {
                                                                          month: 'short',
                                                                          day: 'numeric',
                                                                          year: 'numeric'
                                                                        })}
                                                                      </div>
                                                                    )}
                                                                    {reviewedSubmission.coa_opinion && (
                                                                      <div className="mb-2">
                                                                        <span className="text-xs font-semibold text-gray-900">COA Opinion: </span>
                                                                        <span className="text-sm text-gray-900">
                                                                          {reviewedSubmission.coa_opinion}
                                                                        </span>
                                                                      </div>
                                                                    )}
                                                                    {reviewedSubmission.coa_comment && (
                                                                      <div>
                                                                        <span className="text-xs font-semibold text-gray-900">COA Comment: </span>
                                                                        <span className="text-sm text-gray-700">
                                                                          {reviewedSubmission.coa_comment}
                                                                        </span>
                                                                      </div>
                                                                    )}
                                                                  </div>
                                                                  <Button
                                                                    size="sm"
                                                                    className={`ml-4 ${isEndorsed ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' : 'bg-[#0F4229] hover:bg-[#0d3821]'}`}
                                                                    disabled={isEndorsed}
                                                                    onClick={async () => {
                                                                      try {
                                                                        const { error } = await supabase
                                                                          .from('submissions')
                                                                          .update({ endorsed_to_osld: true })
                                                                          .eq('id', reviewedSubmission.id);
                                                                        
                                                                        if (error) throw error;
                                                                        
                                                                        // Send notification to OSLD
                                                                        await supabase
                                                                          .from('notifications')
                                                                          .insert({
                                                                            event_id: reviewedSubmission.id,
                                                                            event_title: `COA Endorsed Files from ${reviewedSubmission.organization}`,
                                                                            event_description: `COA has endorsed files for "${reviewedSubmission.activity_title}" from ${reviewedSubmission.organization}. Check Activity Logs.`,
                                                                            created_by: 'COA',
                                                                            target_org: 'OSLD'
                                                                          });
                                                                        
                                                                        toast({
                                                                          title: "Success",
                                                                          description: "Successfully endorsed to OSLD",
                                                                        });
                                                                        
                                                                        // Refresh data
                                                                        loadSubmissions();
                                                                      } catch (error) {
                                                                        console.error('Error endorsing to OSLD:', error);
                                                                        toast({
                                                                          title: "Error",
                                                                          description: "Failed to endorse to OSLD",
                                                                          variant: "destructive",
                                                                        });
                                                                      }
                                                                    }}
                                                                  >
                                                                    <Send className="h-3 w-3 mr-1" />
                                                                    {isEndorsed ? 'Endorsed' : 'Endorse to OSLD'}
                                                                  </Button>
                                                                </div>
                                                              </div>
                                                            );
                                                          }
                                                          return null;
                                                        })()}
                                                        
                                                        <Table>
                                                          <TableHeader>
                                                            <TableRow className="bg-gray-50 hover:bg-gray-50">
                                                              <TableHead className="text-gray-700 font-semibold">Document</TableHead>
                                                              <TableHead className="text-gray-700 font-semibold">Accomplishment</TableHead>
                                                              <TableHead className="text-gray-700 font-semibold">Liquidation</TableHead>
                                                            </TableRow>
                                                          </TableHeader>
                                                          <TableBody>
                                                            {(() => {
                                                              const groupedByActivity: Record<string, { accomplishment?: typeof copies[0]; liquidation?: typeof copies[0] }> = {};
                                                              copies.forEach((copy) => {
                                                                const originalSubmission = submissions.find(s => s.id === copy.submission_id);
                                                                if (originalSubmission) {
                                                                  const title = originalSubmission.activity_title;
                                                                  if (!groupedByActivity[title]) {
                                                                    groupedByActivity[title] = {};
                                                                  }
                                                                  if (originalSubmission.submission_type === "Accomplishment Report") {
                                                                    groupedByActivity[title].accomplishment = copy;
                                                                  } else if (originalSubmission.submission_type === "Liquidation Report") {
                                                                    groupedByActivity[title].liquidation = copy;
                                                                  }
                                                                }
                                                              });
                                                              
                                                              return Object.entries(groupedByActivity).map(([title, docs]) => {
                                                                return (
                                                                  <TableRow key={title} className="hover:bg-gray-50">
                                                                    <TableCell className="font-medium">
                                                                      <div className="flex items-center gap-2">
                                                                        {title}
                                                                      </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                      {docs.accomplishment ? (
                                                                        <a
                                                                          href={docs.accomplishment.file_url}
                                                                          target="_blank"
                                                                          rel="noopener noreferrer"
                                                                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                                                                        >
                                                                          <Eye className="h-4 w-4" />
                                                                          View
                                                                        </a>
                                                                      ) : (
                                                                        <span className="text-gray-400 text-sm">Not submitted</span>
                                                                      )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                      {docs.liquidation ? (
                                                                        <a
                                                                          href={docs.liquidation.file_url}
                                                                          target="_blank"
                                                                          rel="noopener noreferrer"
                                                                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                                                                        >
                                                                          <Eye className="h-4 w-4" />
                                                                          View
                                                                        </a>
                                                                      ) : (
                                                                        <span className="text-gray-400 text-sm">Not submitted</span>
                                                                      )}
                                                                    </TableCell>
                                                                  </TableRow>
                                                                );
                                                              });
                                                            })()}
                                                          </TableBody>
                                                        </Table>
                                                      </div>
                                                    );
                                                  })()}
                                                </div>
                                              )}
                                            </Card>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </Card>
                                );
                              })()}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      );
    }

    // For Pending Review - original logic
    const groupedByOrg: Record<string, Submission[]> = {};
    filteredSubmissions.forEach((sub) => {
      if (!groupedByOrg[sub.organization]) {
        groupedByOrg[sub.organization] = [];
      }
      groupedByOrg[sub.organization].push(sub);
    });

    // Helper function to group by activity_title within an organization
    const groupByActivityTitle = (submissions: Submission[]) => {
      const grouped: Record<string, { accomplishment?: Submission; liquidation?: Submission; appeal?: Submission }> = {};
      submissions.forEach((sub) => {
        const title = sub.activity_title;
        if (!grouped[title]) {
          grouped[title] = {};
        }
        if (sub.submission_type === "Accomplishment Report") {
          grouped[title].accomplishment = sub;
        } else if (sub.submission_type === "Liquidation Report") {
          grouped[title].liquidation = sub;
        } else if (sub.submission_type === "Letter of Appeal") {
          grouped[title].appeal = sub;
        }
      });
      return grouped;
    };

    // For Pending Review - render organizations with submit forms
    return (
      <div className="space-y-8">
        {Object.entries(groupedByOrg).map(([org, orgSubmissions]) => {
          const groupedByTitle = groupByActivityTitle(orgSubmissions);
          
          return (
          <Card key={org} className="overflow-hidden border-t-4" style={{ borderTopColor: "#d4af37" }}>
            {/* Organization Header */}
            <div className="bg-white px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {getOrgFullName(org)}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="p-2 bg-blue-50 rounded-full">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">
                    One decision applies to all documents below
                  </span>
                </div>
              </div>
              
              {/* Audit Type Indicator */}
              <div className="mt-4">
                <AuditTypeIndicator organization={org} />
              </div>
            </div>

            {/* Documents Table */}
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="text-gray-700 font-semibold">DOCUMENT</TableHead>
                  <TableHead className="text-gray-700 font-semibold">ACCOMPLISHMENT</TableHead>
                  <TableHead className="text-gray-700 font-semibold">LIQUIDATION</TableHead>
                  <TableHead className="text-gray-700 font-semibold">DATE SUBMITTED</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedByTitle).map(([title, docs]) => (
                  // Using Fragment shorthand to avoid Tempo data-tempoelementid warning
                  <React.Fragment key={`fragment-${title}`}>
                    {/* Show Appeal Submitted Card if there's an appeal for this activity submitted TO COA */}
                    {docs.appeal && docs.appeal.status === 'Pending' && docs.appeal.submitted_to === 'COA' && (
                      <TableRow>
                        <TableCell colSpan={4} className="p-0">
                          <div className="bg-gradient-to-r from-red-50 to-red-50 border-l-4 border-red-400 m-2">
                            <div className="flex gap-0">
                              <div className="w-1 bg-gray-400" />
                              
                              <div className="flex-1 p-4">
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
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
                                    <span className="text-xs font-bold text-gray-700">{org}</span>
                                  </div>
                                </div>
                                
                                {/* Appeal Message */}
                                <div className="bg-white border border-gray-200 rounded p-3 mb-4">
                                  <p className="text-xs text-gray-900">
                                    A Letter of Appeal has been submitted and requires your review.
                                  </p>
                                </div>
                                
                                {/* Review Appeal Button */}
                                <Button
                                  className="w-full bg-[#0F4229] hover:bg-[#0d3821] text-white"
                                  onClick={() => {
                                    if (docs.appeal?.file_url) {
                                      window.open(docs.appeal.file_url, '_blank');
                                    }
                                  }}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Review Appeal
                                </Button>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    
                    <TableRow className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          {title}
                        </div>
                      </TableCell>
                      <TableCell>
                        {docs.accomplishment?.file_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                            onClick={() => window.open(docs.accomplishment!.file_url, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-sm">Not submitted</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {docs.liquidation?.file_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                            onClick={() => window.open(docs.liquidation!.file_url, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-sm">Not submitted</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {(docs.accomplishment || docs.liquidation)?.submitted_at 
                          ? new Date((docs.accomplishment || docs.liquidation)!.submitted_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>

            {/* Overall Action Section */}
            <div className="bg-gray-50 px-6 py-6 border-t">
              <div className="flex items-start gap-8">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Overall Action
                  </label>
                  <Select
                    value={tempOpinions[org] || ""}
                    onValueChange={(value) => {
                      setTempOpinions(prev => ({ ...prev, [org]: value }));
                    }}
                  >
                    <SelectTrigger className="w-full max-w-xs bg-white">
                      <SelectValue placeholder="Select Action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Qualified">Qualified</SelectItem>
                      <SelectItem value="Unqualified">Unqualified</SelectItem>
                      <SelectItem value="Adverse">Adverse</SelectItem>
                      <SelectItem value="Disclaimer of Opinion">Disclaimer of Opinion</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    This decision applies to all documents
                  </p>
                </div>
                <div className="flex-[2]">
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Overall Comment
                  </label>
                  <Textarea
                    placeholder="Add a clear, concise remark for the submission"
                    value={tempComments[org] || ""}
                    onChange={(e) => {
                      setTempComments(prev => ({ ...prev, [org]: e.target.value }));
                    }}
                    className="min-h-[100px] bg-white"
                  />
                </div>
                <div className="pt-7">
                  <Button
                    className="bg-[#003b27] hover:bg-[#002a1c] text-white"
                    onClick={async () => {
                      const opinion = tempOpinions[org];
                      const comment = tempComments[org];
                      
                      if (!opinion || !comment) {
                        toast({
                          title: "Incomplete Review",
                          description: "Please select an opinion and add a comment before submitting.",
                          variant: "destructive",
                        });
                        return;
                      }

                      try {
                        // Get audit type assignment for this organization
                        const auditTypeInfo = await getNextAuditType(org);
                        
                        // Copy files to audit folders based on audit type
                        const submissionDate = new Date(orgSubmissions[0].submitted_at);
                        const year = submissionDate.getFullYear();
                        const semester = auditTypeInfo.semester;
                        const auditType = auditTypeInfo.audit_type.toLowerCase() as 'initial' | 'final';
                        
                        // Copy files to coa_review_copies table
                        for (const sub of orgSubmissions) {
                          await copyToAuditFolder(sub, auditType, semester);
                        }
                        
                        // Update all submissions for this organization
                        const reviewedAt = new Date().toISOString();
                        for (const sub of orgSubmissions) {
                          // Don't increment revision_count on first review (keeps it at 1)
                          // Only increment when reviewing documents that were previously reviewed
                          const currentRevisionCount = sub.revision_count || 1;
                          
                          await supabase
                            .from('submissions')
                            .update({ 
                              coa_opinion: opinion,
                              coa_comment: comment,
                              coa_reviewed: true,
                              coa_reviewed_at: reviewedAt,
                              revision_count: currentRevisionCount,
                              audit_type: auditTypeInfo.display_text,
                              semester: auditTypeInfo.semester
                            })
                            .eq('id', sub.id);

                          // Create notification for the organization
                          await supabase
                            .from('notifications')
                            .insert({
                              event_id: sub.id,
                              event_title: `COA Action on ${sub.submission_type}`,
                              event_description: `COA has marked your ${sub.submission_type} titled "${sub.activity_title}" as "${opinion}" for ${auditTypeInfo.display_text}. Check your Logs for details.`,
                              created_by: 'COA',
                              target_org: sub.organization
                            });
                        }

                        // Clear temporary states for this org
                        setTempOpinions(prev => {
                          const newState = { ...prev };
                          delete newState[org];
                          return newState;
                        });
                        setTempComments(prev => {
                          const newState = { ...prev };
                          delete newState[org];
                          return newState;
                        });

                        toast({
                          title: "Review Complete",
                          description: `All documents for ${getOrgFullName(org)} have been reviewed and assigned to the audit schedule.`,
                        });
                        
                        loadSubmissions();
                      } catch (error: any) {
                        toast({
                          title: "Error",
                          description: error.message || "Failed to submit review",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Submit
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003b27]"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">
          Submissions
        </h2>
        <p className="text-gray-600 mt-1">
          Review accomplishment and liquidation files together per document
        </p>
      </div>

      {/* Tabs for Accomplishment and Liquidation */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100">
          <TabsTrigger 
            value="all"
            className="data-[state=active]:bg-[#003b27] data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm data-[state=inactive]:text-[#003b27]"
          >
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Review
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="reviewed"
            className="data-[state=active]:bg-[#003b27] data-[state=active]:text-white"
          >
            Internal Review
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {renderSubmissionsByOrg("all")}
        </TabsContent>

        <TabsContent value="reviewed">
          {renderSubmissionsByOrg("reviewed")}
        </TabsContent>
      </Tabs>

      {/* Comment Dialog */}
      <Dialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">
                File: {selectedSubmission?.file_name || "N/A"}
              </p>
              <p className="text-sm text-gray-500 mb-2">
                Organization: {selectedSubmission?.organization}
              </p>
              
              {/* Audit Type Indicator */}
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700">AUDIT ASSIGNMENT</span>
                </div>
                {loadingAuditType ? (
                  <p className="text-sm text-blue-600">Loading audit type...</p>
                ) : (
                  <p className="text-sm font-medium text-blue-700">
                    This will be assigned to: <span className="font-bold">{nextAuditType}</span>
                  </p>
                )}
              </div>
            </div>
            <Textarea
              placeholder="Enter your comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCommentDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-[#003b27] hover:bg-[#002a1c]"
              onClick={handleSaveComment}
            >
              Save Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
