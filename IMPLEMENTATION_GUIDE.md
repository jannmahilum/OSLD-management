# Implementation Guide: Recurrence & Delete Confirmation Features

## Features Implemented

### 1. Specific Day Selection for Weekly Recurrence
- Added `eventRecurrenceDay` state to OSLDDashboard component
- New dropdown appears when "Weekly" recurrence is selected
- Users can now choose "Every Monday", "Every Tuesday", etc.
- Recurrence utilities support the new logic

### 2. Delete Confirmation Dialogs
- Created reusable `DeleteConfirmationDialog` component
- Should be applied to all delete operations to prevent accidental deletions
- Displays warning message: "This action cannot be undone"

## Files Created/Modified

### New Files:
1. **src/lib/recurrenceUtils.ts**
   - `isRecurringEventOnDate()` - Check if event occurs on a specific date
   - `getNextOccurrence()` - Get next occurrence of recurring event
   - `formatRecurrenceText()` - Format display text for recurrence
   - `DAYS_OF_WEEK` - Array of day options

2. **src/components/DeleteConfirmationDialog.tsx**
   - Reusable dialog component for delete confirmations
   - Customizable title, description, and item name
   - Dangerous action styling with warning

## How to Use

### For Recurrence with Specific Days:

```tsx
import { formatRecurrenceText, isRecurringEventOnDate, DAYS_OF_WEEK } from "@/lib/recurrenceUtils";

// In your event form:
{eventRecurrence === "Weekly" && (
  <div>
    <Label>Select Day of Week</Label>
    <select
      value={eventRecurrenceDay}
      onChange={(e) => setEventRecurrenceDay(e.target.value)}
    >
      <option value="">-- Select a day --</option>
      {DAYS_OF_WEEK.map(day => (
        <option key={day.value} value={day.value}>
          {day.label}
        </option>
      ))}
    </select>
  </div>
)}

// When checking if event occurs:
const occursOnDate = isRecurringEventOnDate(event, new Date());

// For display:
const recurrenceText = formatRecurrenceText(event.recurrenceType, event.recurrenceDay);
```

### For Delete Confirmations:

```tsx
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";

// In your component:
const [isDeleteOpen, setIsDeleteOpen] = useState(false);
const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

// Show dialog on delete click:
const handleDeleteClick = (id: string, name: string) => {
  setDeleteItemId(id);
  setDeleteDocumentName(name);
  setIsDeleteOpen(true);
};

// Render dialog:
<DeleteConfirmationDialog
  open={isDeleteOpen}
  onOpenChange={setIsDeleteOpen}
  title="Delete Document"
  description="Are you sure you want to delete this document?"
  itemName={deleteDocumentName}
  onConfirm={async () => {
    if (deleteItemId) {
      await supabase.from('table').delete().eq('id', deleteItemId);
    }
  }}
  isDangerous={true}
/>

// Add to delete button:
<button onClick={() => handleDeleteClick(doc.id, doc.name)}>
  Delete
</button>
```

## Implementation Steps in OSLDDashboard.tsx

1. **Add State for Day Selection:**
   ```tsx
   const [eventRecurrenceDay, setEventRecurrenceDay] = useState("");
   ```

2. **Reset in handleReset/closeModal:**
   ```tsx
   setEventRecurrenceDay("");
   ```

3. **Add Day Selection UI** (after recurrence type dropdown):
   ```tsx
   {eventRecurrence === "Weekly" && (
     <div>
       <Label>Select Day of Week</Label>
       <select value={eventRecurrenceDay} onChange={(e) => setEventRecurrenceDay(e.target.value)}>
         <option value="">-- Select a day --</option>
         <option value="Monday">Every Monday</option>
         <option value="Tuesday">Every Tuesday</option>
         {/* ... etc ... */}
       </select>
     </div>
   )}
   ```

4. **Apply Delete Confirmations** to all delete operations:
   - Document delete buttons
   - Event delete buttons
   - Account delete buttons

## Database Considerations

The `recurrence_day` field exists in the `osld_events` table schema and can be used to store the selected day (e.g., "Monday", "Wednesday").

When saving events, include:
```tsx
{
  // ... other fields
  recurrenceType: eventRecurrence,
  recurrenceDay: eventRecurrenceDay, // New field for weekly specificity
}
```

## Testing

Test cases to verify:
1. ✓ Create event with "Weekly" recurrence and specific day
2. ✓ Event appears on that day in calendar
3. ✓ Delete confirmation dialog appears before deletion
4. ✓ User can cancel deletion
5. ✓ User can confirm deletion
