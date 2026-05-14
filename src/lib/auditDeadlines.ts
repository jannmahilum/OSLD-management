import { COAAuditSchedule } from '@/hooks/useCOAAuditSchedule';

export interface AuditDeadline {
  auditType: string;
  semester: string;
  month: number;
  monthName: string;
}

/**
 * Get audit schedule with month information
 */
export function calculateAuditDeadlines(
  schedule: COAAuditSchedule[]
): AuditDeadline[] {
  return schedule.map((item) => ({
    auditType: item.audit_type,
    semester: item.semester,
    month: item.month,
    monthName: item.month_name,
  }));
}

/**
 * Get the next upcoming audit by month
 */
export function getNextAuditDeadline(deadlines: AuditDeadline[]): AuditDeadline | null {
  return deadlines.length > 0 ? deadlines[0] : null;
}

/**
 * Format audit month display
 */
export function formatDeadlineDisplay(deadline: AuditDeadline): string {
  return `${deadline.auditType} - ${deadline.monthName}`;
}

/**
 * Get audit status for UI styling
 */
export function getDeadlineStatus(deadline: AuditDeadline): 'info' {
  return 'info';
}
