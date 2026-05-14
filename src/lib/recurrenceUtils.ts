/**
 * Utility functions for event recurrence handling
 */

export interface Event {
  id: string;
  startDate: string;
  endDate: string;
  recurrenceType?: string;
  recurrenceDay?: string; // For weekly: Monday, Tuesday, etc.
  [key: string]: any;
}

/**
 * Check if an event should occur on a specific date based on recurrence rules
 */
export const isRecurringEventOnDate = (event: Event, date: Date): boolean => {
  const eventStart = new Date(event.startDate);
  const eventEnd = new Date(event.endDate);

  // Date must be after event start and before the end of the event period
  if (date < eventStart) return false;

  const recurrenceType = event.recurrenceType || "";

  switch (recurrenceType) {
    case "Daily":
      return date <= eventEnd;

    case "Weekly":
      // If a specific day is selected, only return true for that day
      if (event.recurrenceDay) {
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayOfWeek = dayNames[date.getDay()];
        return dayOfWeek === event.recurrenceDay && date <= eventEnd;
      }
      // Otherwise, recurring on the same day of week as start date
      return date.getDay() === eventStart.getDay() && date <= eventEnd;

    case "Monthly":
      // Recur on the same day of each month
      return date.getDate() === eventStart.getDate() && date <= eventEnd;

    case "Quarterly":
      // Recur every 3 months on the same day
      const monthDiff = (date.getFullYear() - eventStart.getFullYear()) * 12 + (date.getMonth() - eventStart.getMonth());
      return monthDiff % 3 === 0 && date.getDate() === eventStart.getDate() && date <= eventEnd;

    case "Every Year":
      // Recur on the same month and day each year
      return date.getMonth() === eventStart.getMonth() && date.getDate() === eventStart.getDate() && date <= eventEnd;

    case "1st Semester":
      // October and December (1st semester months)
      return [9, 11].includes(date.getMonth()) && date <= eventEnd;

    case "2nd Semester":
      // March and May (2nd semester months)
      return [2, 4].includes(date.getMonth()) && date <= eventEnd;

    default:
      return false;
  }
};

/**
 * Get the next occurrence of a recurring event
 */
export const getNextOccurrence = (event: Event, fromDate: Date = new Date()): Date | null => {
  const eventEnd = new Date(event.endDate);
  if (fromDate > eventEnd) return null;

  let checkDate = new Date(fromDate);
  checkDate.setHours(0, 0, 0, 0);

  // Search for the next occurrence within a reasonable timeframe (2 years)
  const maxDate = new Date(fromDate);
  maxDate.setFullYear(maxDate.getFullYear() + 2);

  while (checkDate <= maxDate && checkDate <= eventEnd) {
    if (isRecurringEventOnDate(event, checkDate)) {
      return checkDate;
    }
    checkDate.setDate(checkDate.getDate() + 1);
  }

  return null;
};

/**
 * Format recurrence display text
 */
export const formatRecurrenceText = (recurrenceType: string, recurrenceDay?: string): string => {
  if (!recurrenceType || recurrenceType === "") {
    return "No recurrence";
  }

  if (recurrenceType === "Weekly" && recurrenceDay) {
    return `Every ${recurrenceDay}`;
  }

  return recurrenceType;
};

/**
 * Days of the week for dropdown
 */
export const DAYS_OF_WEEK = [
  { value: "Monday", label: "Every Monday" },
  { value: "Tuesday", label: "Every Tuesday" },
  { value: "Wednesday", label: "Every Wednesday" },
  { value: "Thursday", label: "Every Thursday" },
  { value: "Friday", label: "Every Friday" },
  { value: "Saturday", label: "Every Saturday" },
  { value: "Sunday", label: "Every Sunday" },
];
