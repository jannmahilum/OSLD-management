import { useCOAAuditSchedule } from '@/hooks/useCOAAuditSchedule';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Calendar } from 'lucide-react';

export function COAAuditScheduleDisplay() {
  const { schedule, isLoading, error } = useCOAAuditSchedule();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>COA Audit Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Group by semester
  const groupedBySemester = schedule.reduce(
    (acc, item) => {
      if (!acc[item.semester]) {
        acc[item.semester] = [];
      }
      acc[item.semester].push(item);
      return acc;
    },
    {} as Record<string, typeof schedule>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[#003b27]" />
          COA Audit Schedule
        </CardTitle>
        <CardDescription>Important dates for COA audits throughout the year</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedBySemester).map(([semester, audits]) => (
            <div key={semester}>
              <h3 className="font-semibold text-lg text-[#003b27] mb-3">{semester}</h3>
              <div className="space-y-2 ml-4 border-l-2 border-[#d4af37] pl-4">
                {audits.map((audit) => (
                  <div key={audit.id} className="flex flex-col">
                    <div className="font-medium text-gray-800">{audit.audit_type}</div>
                    <div className="text-sm text-gray-600">
                      {audit.month_name} (Month {audit.month})
                    </div>
                    {audit.description && (
                      <div className="text-xs text-gray-500 italic">{audit.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
