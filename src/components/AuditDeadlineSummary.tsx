import { useCOAAuditSchedule } from '@/hooks/useCOAAuditSchedule';
import { calculateAuditDeadlines, getNextAuditDeadline, formatDeadlineDisplay, getDeadlineStatus } from '@/lib/auditDeadlines';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Calendar } from 'lucide-react';

export function AuditDeadlineSummary() {
  const { schedule, isLoading, error } = useCOAAuditSchedule();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>COA Audit Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || schedule.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Unable to load audit schedule</AlertDescription>
      </Alert>
    );
  }

  const deadlines = calculateAuditDeadlines(schedule);
  const nextDeadline = getNextAuditDeadline(deadlines);

  if (!nextDeadline) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>COA Audit Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No audits scheduled</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          COA Audit Schedule
        </CardTitle>
        <CardDescription>Next scheduled audit</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-lg font-semibold">
            {nextDeadline.auditType} - {nextDeadline.semester}
          </div>
          <div className="text-sm text-gray-600">
            {formatDeadlineDisplay(nextDeadline)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
