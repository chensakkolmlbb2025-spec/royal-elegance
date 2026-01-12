# Delete Operations System — Complete Reference Guide

## Overview

This document describes the **production-grade delete operations system** implemented across the Royal Elegance Hotel management application. The system provides:

- ✅ **Confirmation dialogs** before all destructive operations
- ✅ **Dependency checking** to warn about related records
- ✅ **Smart soft-delete** for entities with FK constraints
- ✅ **Loading states** during async operations
- ✅ **Detailed error messages** for troubleshooting
- ✅ **Audit logging** for compliance and debugging
- ✅ **Consistent UX** across all admin components

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Admin Component                            │
│  (service-management, room-management, floor-management, etc.)  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   useDeleteOperation Hook                        │
│  • Initiates delete                                              │
│  • Fetches dependencies                                          │
│  • Opens confirmation dialog                                     │
│  • Executes delete                                               │
│  • Logs activity                                                 │
│  • Handles errors                                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│               DeleteConfirmationDialog Component                 │
│  • Shows item being deleted                                      │
│  • Displays dependency warnings                                  │
│  • Shows soft-delete notices                                     │
│  • Loading state during deletion                                 │
│  • Cancel/Confirm buttons                                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  supabase-service.ts                             │
│  • deleteFloor() — FK error → descriptive message               │
│  • deleteRoomType() — FK error → descriptive message            │
│  • deleteRoom() — FK error → soft-delete to 'maintenance'       │
│  • deleteService() — FK error → soft-delete to 'unavailable'    │
│  • deleteServiceCategory() — FK error → descriptive message     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components Created/Modified

### 1. DeleteConfirmationDialog Component

**File**: `components/ui/delete-confirmation-dialog.tsx`

A reusable confirmation dialog that:
- Shows the item name and type being deleted
- Displays dependency warnings (e.g., "3 bookings using this service")
- Shows soft-delete notices when applicable
- Has loading state during deletion
- Supports different variants (danger, warning, default)

**Usage**:
```tsx
<DeleteConfirmationDialog
  open={deleteOperation.state.isDialogOpen}
  onOpenChange={deleteOperation.setDialogOpen}
  onConfirm={deleteOperation.confirmDelete}
  title="Delete Service"
  itemName="Spa Treatment"
  itemType="Service"
  description="This will remove the service from availability."
  dependencies={[{ type: 'bookings', count: 5, label: 'booking(s)' }]}
  willSoftDelete={true}
  isLoading={false}
  variant="danger"
/>
```

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `open` | boolean | Whether dialog is visible |
| `onOpenChange` | function | Callback when dialog state changes |
| `onConfirm` | function | Called when user confirms deletion |
| `title` | string | Dialog title |
| `itemName` | string | Name of item being deleted |
| `itemType` | string | Type label (Service, Room, etc.) |
| `description` | string | Additional context |
| `dependencies` | DependencyInfo[] | Related records that will be affected |
| `willSoftDelete` | boolean | Whether soft-delete will be used |
| `isLoading` | boolean | Show loading spinner |
| `variant` | 'danger' \| 'warning' \| 'default' | Visual style |

---

### 2. useDeleteOperation Hook

**File**: `hooks/use-delete-operation.ts`

A comprehensive hook that manages the entire delete workflow:

**Features**:
- Fetches dependencies before showing confirmation
- Manages dialog state
- Executes delete function
- Handles errors with user-friendly messages
- Logs delete activities for auditing

**Core Hook**:
```tsx
const deleteOperation = useDeleteOperation({
  entityType: "Service",
  fetchDependencies: getServiceDependencies,
  deleteFunction: deleteService,
  onSuccess: refreshServices,
  supportsSoftDelete: true,
});

// Use in component
<Button onClick={() => deleteOperation.initiateDelete(service.id, service.name)}>
  Delete
</Button>
```

**Convenience Hooks**:
```tsx
// Pre-configured hooks for each entity type
const deleteOp = useServiceDelete(deleteService, onSuccess);
const deleteOp = useRoomDelete(deleteRoom, onSuccess);
const deleteOp = useRoomTypeDelete(deleteRoomType, onSuccess);
const deleteOp = useFloorDelete(deleteFloor, onSuccess);
const deleteOp = useServiceCategoryDelete(deleteServiceCategory, onSuccess);
```

**Dependency Checkers**:
```tsx
// Built-in dependency fetchers
getServiceDependencies(serviceId)    // → booking_services count
getRoomDependencies(roomId)          // → bookings count
getRoomTypeDependencies(roomTypeId)  // → rooms count, bookings count
getFloorDependencies(floorId)        // → rooms count
getServiceCategoryDependencies(id)   // → services count
```

---

### 3. Updated Admin Components

All admin components now use the new delete system:

| Component | File | Changes |
|-----------|------|---------|
| ServiceManagement | `components/admin/service-management.tsx` | ✅ Full integration |
| RoomManagement | `components/admin/room-management.tsx` | ✅ Full integration |
| RoomTypeManagement | `components/admin/room-type-management.tsx` | ✅ Full integration |
| FloorManagement | `components/admin/floor-management.tsx` | ✅ Full integration |

**Common Changes**:
1. Import `DeleteConfirmationDialog` and entity-specific hook
2. Add `useCallback` for refresh function
3. Initialize delete hook with refresh callback
4. Replace direct `deleteX(id)` calls with `deleteOperation.initiateDelete(item.id, item.name)`
5. Add `DeleteConfirmationDialog` to render
6. Add loading spinner to delete buttons

---

### 4. Enhanced Service Layer

**File**: `lib/supabase-service.ts`

All delete functions now have intelligent FK constraint handling:

| Function | FK Behavior | Error Message |
|----------|-------------|---------------|
| `deleteFloor` | Throws descriptive error | "Cannot delete floor: There are rooms assigned to this floor..." |
| `deleteRoomType` | Throws descriptive error | "Cannot delete room type: There are rooms of this type..." |
| `deleteRoom` | Soft-delete to 'maintenance' | Marks room as maintenance instead of hard delete |
| `deleteService` | Soft-delete to 'unavailable' | Marks service as unavailable instead of hard delete |
| `deleteServiceCategory` | Throws descriptive error | "Cannot delete category: There are services in this category..." |

---

## Delete Flow Example

### Service Deletion Flow

```
1. Admin clicks delete button on "Spa Treatment" service
   ↓
2. useServiceDelete.initiateDelete("spa-123", "Spa Treatment")
   ↓
3. Hook fetches dependencies: getServiceDependencies("spa-123")
   → Returns: [{ type: 'bookings', count: 3, label: 'booking(s)' }]
   ↓
4. Hook determines: hasDependencies=true, willSoftDelete=true
   ↓
5. DeleteConfirmationDialog opens showing:
   ┌─────────────────────────────────────────┐
   │ 🗑️ Delete Service                       │
   │                                         │
   │ Are you sure you want to delete this    │
   │ service?                                │
   │                                         │
   │ ┌─────────────────────────────────────┐ │
   │ │ Spa Treatment           [Service]  │ │
   │ └─────────────────────────────────────┘ │
   │                                         │
   │ ⚠️ This item has 3 related records      │
   │   • 3 booking(s) using this service    │
   │                                         │
   │ ℹ️ This item will be marked as          │
   │   unavailable instead of permanently   │
   │   deleted to preserve history.         │
   │                                         │
   │              [Cancel]  [🗑️ Disable]     │
   └─────────────────────────────────────────┘
   ↓
6. Admin clicks "Disable"
   ↓
7. Hook calls deleteService("spa-123")
   ↓
8. supabase-service.ts attempts DELETE
   ↓
9. FK constraint error detected (23503)
   ↓
10. Fallback: updateService("spa-123", { available: false })
   ↓
11. Hook logs activity: logDeleteActivity("Service", "spa-123", "Spa Treatment", "soft_delete")
   ↓
12. Success toast: "Service deleted successfully - Spa Treatment has been marked as unavailable."
   ↓
13. onSuccess callback: refreshServices()
   ↓
14. UI updates, dialog closes
```

---

## Error Handling

### Error Types and Messages

| Error Type | Detection | User Message |
|------------|-----------|--------------|
| FK Constraint | code=23503 or message contains "foreign key" | Entity-specific helpful message |
| Permission Denied | message contains "permission denied" | "You don't have permission to delete this..." |
| Not Found | message contains "not found" or "No rows" | "This item may have already been deleted..." |
| Unknown | Any other error | Shows raw error message |

### Example Error Messages

**Floor with rooms**:
```
❌ Cannot delete Floor
   There are rooms assigned to this floor. 
   Please move or delete those rooms first.
```

**Room type with rooms**:
```
❌ Cannot delete Room Type
   There are rooms of this type. 
   Please reassign or delete those rooms first.
```

**Service with bookings**:
```
✅ Service deleted successfully
   "Spa Treatment" has been marked as unavailable.
```

---

## Audit Logging

The system logs all delete operations for compliance:

```typescript
// Logged to activity_logs table (if exists) + console
{
  user_id: "user-uuid",
  action: "soft_delete" | "hard_delete" | "delete_attempted",
  entity_type: "Service" | "Room" | "RoomType" | "Floor",
  entity_id: "item-uuid",
  details: {
    entity_name: "Spa Treatment",
    deleted_at: "2026-01-12T10:30:00Z",
    dependencies: [{ type: "bookings", count: 3 }]
  }
}
```

---

## Testing Checklist

### Service Deletion
- [ ] Delete service with no bookings → Hard delete, success toast
- [ ] Delete service with bookings → Soft delete, shows warning, marks unavailable
- [ ] Delete as non-admin → Permission denied error
- [ ] Cancel delete → Dialog closes, no changes

### Room Deletion
- [ ] Delete room with no bookings → Hard delete, success toast
- [ ] Delete room with bookings → Soft delete to 'maintenance', shows warning
- [ ] Cancel delete → Dialog closes, no changes

### Room Type Deletion
- [ ] Delete room type with no rooms → Hard delete, success toast
- [ ] Delete room type with rooms → Error with helpful message
- [ ] Cancel delete → Dialog closes, no changes

### Floor Deletion
- [ ] Delete floor with no rooms → Hard delete, success toast
- [ ] Delete floor with rooms → Error with helpful message
- [ ] Cancel delete → Dialog closes, no changes

---

## Files Changed Summary

| File | Status | Changes |
|------|--------|---------|
| `components/ui/delete-confirmation-dialog.tsx` | ✅ Created | Reusable confirmation dialog |
| `hooks/use-delete-operation.ts` | ✅ Created | Delete workflow hook with audit logging |
| `components/admin/service-management.tsx` | ✅ Modified | Full delete system integration |
| `components/admin/room-management.tsx` | ✅ Modified | Full delete system integration |
| `components/admin/room-type-management.tsx` | ✅ Modified | Full delete system integration |
| `components/admin/floor-management.tsx` | ✅ Modified | Full delete system integration |
| `lib/supabase-service.ts` | ✅ Modified | Enhanced FK handling for all delete functions |

---

## Before vs After

### Before
```tsx
// Simple, dangerous delete
const handleDelete = (id: string) => {
  deleteService(id)  // No confirmation
  toast({ title: "Deleted" })  // No error info
}

<Button onClick={() => handleDelete(service.id)}>
  <Trash2 />  {/* No loading state */}
</Button>
```

### After
```tsx
// Safe, informative delete
const deleteOperation = useServiceDelete(deleteService, refreshServices)

const handleDelete = (service: Service) => {
  deleteOperation.initiateDelete(service.id, service.name)
}

<>
  <DeleteConfirmationDialog
    open={deleteOperation.state.isDialogOpen}
    onOpenChange={deleteOperation.setDialogOpen}
    onConfirm={deleteOperation.confirmDelete}
    title="Delete Service"
    itemName={deleteOperation.state.itemToDelete?.name || ""}
    itemType="Service"
    dependencies={deleteOperation.state.dependencies}
    willSoftDelete={deleteOperation.state.willSoftDelete}
    isLoading={deleteOperation.state.isLoading}
  />
  
  <Button 
    onClick={() => handleDelete(service)}
    disabled={deleteOperation.state.isLoading}
  >
    {deleteOperation.state.isLoading ? <Loader2 className="animate-spin" /> : <Trash2 />}
  </Button>
</>
```

---

## Future Improvements

1. **Batch Delete**: Allow selecting and deleting multiple items at once
2. **Undo/Restore**: Add ability to restore soft-deleted items
3. **Cascade Delete**: Option to delete all dependent records
4. **Delete History**: View deletion history in admin panel
5. **Scheduled Delete**: Schedule items for future deletion
6. **Export Before Delete**: Download data before permanent deletion

---

**Document Created**: January 12, 2026
**System Version**: 2.0 (Production-Grade Delete Operations)
**Files Modified**: 7
**New Components**: 2
