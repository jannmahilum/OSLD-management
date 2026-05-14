# Automatic Revision Status Update System

## Overview
This system automatically updates the status of "For Revision" submissions when a revised version is resubmitted with the same activity title.

## How It Works

### Example Scenario
1. **Initial Submission**: Organization submits AR titled "hello" → Status: "Pending"
2. **Marked for Revision**: COA/LSG/USG marks it as "For Revision" for the Liquidation Report
3. **Resubmission**: Organization submits a new LR titled "hello"
4. **Automatic Update**: The old "For Revision" LR is automatically updated to "Pending"

### Technical Implementation

#### Function: `updateRevisionStatus`
Located in: `src/components/AODashboard.tsx`

```typescript
const updateRevisionStatus = async (
  activityTitle: string, 
  submissionType: 'Accomplishment Report' | 'Liquidation Report', 
  newStatus: string
) => {
  // 1. Find all submissions matching:
  //    - Same activity title
  //    - Same submission type (AR or LR)
  //    - Status = "For Revision"
  
  // 2. Update the most recent "For Revision" submission to "Pending"
  
  // 3. Clear the revision_reason field
  
  // 4. Reload activity logs to show updated status
}
```

#### Integration Points

**Accomplishment Report Submission** (Line ~691-698):
```typescript
await updateRevisionStatus(
  accomplishmentActivityTitle, 
  'Accomplishment Report', 
  'Pending'
);
```

**Liquidation Report Submission** (Line ~794-800):
```typescript
await updateRevisionStatus(
  liquidationActivityTitle, 
  'Liquidation Report', 
  'Pending'
);
```

## Features

### ✅ Automatic Status Update
- When an org resubmits a report with the same title, the old "For Revision" entry is automatically updated to "Pending"

### ✅ Preserves Submission History
- The original submission record is updated, not deleted
- All previous data (file URLs, timestamps, etc.) is preserved

### ✅ Smart Matching
- Matches by exact activity title
- Matches by submission type (AR vs LR)
- Only updates "For Revision" submissions

### ✅ Real-time Updates
- Activity logs automatically reload after status update
- UI reflects changes immediately via Supabase real-time subscriptions

## User Experience

### Before
- Old "For Revision" entry remains visible
- Org sees duplicate entries (old revision + new pending)
- Confusing to track which is current

### After
- Old "For Revision" automatically becomes "Pending"
- Clean, single entry for each activity
- Clear status progression: Pending → For Revision → Pending → Approved

## Status Flow

```
Initial Submission
    ↓
  Pending  ←──────────────┐
    ↓                     │
Reviewed by COA/LSG/USG   │
    ↓                     │
For Revision              │
    ↓                     │
Org Resubmits (same title)│
    │                     │
    └─────────────────────┘
         (Auto-update)
```

## Activity Logs Display

The Activity Logs table now shows:
- **AR Status**: Individual status for Accomplishment Report
- **LR Status**: Individual status for Liquidation Report
- **Overall Progress**: Summary badge (e.g., "1/2 Approved", "All Approved")

### Status Badges
- ✓ Green: Approved
- ⚠️ Yellow: For Revision
- ⏳ Gray: Pending
- 📊 Blue: Partial progress

## Database Impact

### Updated Fields
- `status`: Changed from "For Revision" to "Pending"
- `revision_reason`: Cleared (set to `null`)

### Preserved Fields
- `id`: Original submission ID
- `activity_title`: Unchanged
- `file_url`: Points to new submission file
- `submitted_at`: Original timestamp
- `organization`: Unchanged
- `submitted_to`: Unchanged

## Error Handling

- Console logs successful updates
- Gracefully handles missing submissions
- No errors if no "For Revision" entries exist
- Database errors are logged but don't block submission

## Future Enhancements

Potential improvements:
1. Add revision count tracking
2. Store revision history in separate table
3. Notify reviewers of resubmissions
4. Auto-increment revision number in activity logs
