"use client"

import { useState, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import type { DependencyInfo } from "@/components/ui/delete-confirmation-dialog"

// ============================================================================
// TYPES
// ============================================================================

export interface DeleteOperationConfig<T = unknown> {
  /** Entity type for logging and messages (e.g., "service", "room") */
  entityType: string
  /** Function to fetch dependencies for an entity */
  fetchDependencies?: (id: string) => Promise<DependencyInfo[]>
  /** Function to perform the delete */
  deleteFunction: (id: string) => Promise<void>
  /** Callback after successful delete */
  onSuccess?: () => void | Promise<void>
  /** Whether soft-delete is supported for this entity */
  supportsSoftDelete?: boolean
  /** Custom success message */
  successMessage?: string
  /** Custom error message prefix */
  errorMessagePrefix?: string
}

export interface DeleteOperationState {
  isLoading: boolean
  isDialogOpen: boolean
  itemToDelete: { id: string; name: string } | null
  dependencies: DependencyInfo[]
  willSoftDelete: boolean
  error: string | null
}

export interface UseDeleteOperationReturn {
  state: DeleteOperationState
  /** Initiate delete - opens confirmation dialog and fetches dependencies */
  initiateDelete: (id: string, name: string) => Promise<void>
  /** Confirm and execute the delete */
  confirmDelete: () => Promise<void>
  /** Cancel the delete operation */
  cancelDelete: () => void
  /** Close dialog */
  setDialogOpen: (open: boolean) => void
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export async function logDeleteActivity(
  entityType: string,
  entityId: string,
  entityName: string,
  action: "hard_delete" | "soft_delete" | "delete_attempted",
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.warn("[AuditLog] No user found for logging delete activity")
      return
    }

    // Check if activity_logs table exists and insert
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: action,
        entity_type: entityType,
        entity_id: entityId,
        details: {
          entity_name: entityName,
          deleted_at: new Date().toISOString(),
          ...details
        }
      })

    if (error) {
      // Table might not exist, just log to console
      console.log(`[AuditLog] ${action}: ${entityType} "${entityName}" (${entityId})`, details)
    }
  } catch (e) {
    // Silent fail - audit logging should never break the app
    console.log(`[AuditLog] ${action}: ${entityType} "${entityName}" (${entityId})`)
  }
}

// ============================================================================
// DEPENDENCY CHECKERS
// ============================================================================

export async function getServiceDependencies(serviceId: string): Promise<DependencyInfo[]> {
  const supabase = createClient()
  
  // Check booking_services
  const { count: bookingCount } = await supabase
    .from('booking_services')
    .select('*', { count: 'exact', head: true })
    .eq('service_id', serviceId)

  return [
    { type: 'bookings', count: bookingCount || 0, label: 'booking(s) using this service' }
  ]
}

export async function getRoomDependencies(roomId: string): Promise<DependencyInfo[]> {
  const supabase = createClient()
  
  // Check bookings
  const { count: bookingCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId)

  return [
    { type: 'bookings', count: bookingCount || 0, label: 'booking(s) for this room' }
  ]
}

export async function getRoomTypeDependencies(roomTypeId: string): Promise<DependencyInfo[]> {
  const supabase = createClient()
  
  // Check rooms
  const { count: roomCount } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true })
    .eq('room_type_id', roomTypeId)

  // Check bookings through rooms
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id')
    .eq('room_type_id', roomTypeId)

  let bookingCount = 0
  if (rooms && rooms.length > 0) {
    const roomIds = rooms.map((r: { id: string }) => r.id)
    const { count } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .in('room_id', roomIds)
    bookingCount = count || 0
  }

  return [
    { type: 'rooms', count: roomCount || 0, label: 'room(s) of this type' },
    { type: 'bookings', count: bookingCount, label: 'booking(s) for rooms of this type' }
  ]
}

export async function getFloorDependencies(floorId: string): Promise<DependencyInfo[]> {
  const supabase = createClient()
  
  // Check rooms
  const { count: roomCount } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true })
    .eq('floor_id', floorId)

  return [
    { type: 'rooms', count: roomCount || 0, label: 'room(s) on this floor' }
  ]
}

export async function getServiceCategoryDependencies(categoryId: string): Promise<DependencyInfo[]> {
  const supabase = createClient()
  
  // Check services
  const { count: serviceCount } = await supabase
    .from('services')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId)

  return [
    { type: 'services', count: serviceCount || 0, label: 'service(s) in this category' }
  ]
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useDeleteOperation(config: DeleteOperationConfig): UseDeleteOperationReturn {
  const { toast } = useToast()
  
  const [state, setState] = useState<DeleteOperationState>({
    isLoading: false,
    isDialogOpen: false,
    itemToDelete: null,
    dependencies: [],
    willSoftDelete: false,
    error: null,
  })

  const initiateDelete = useCallback(async (id: string, name: string) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      itemToDelete: { id, name },
      error: null,
    }))

    try {
      // Fetch dependencies if checker is provided
      let dependencies: DependencyInfo[] = []
      if (config.fetchDependencies) {
        dependencies = await config.fetchDependencies(id)
      }

      const hasDependencies = dependencies.some(d => d.count > 0)
      const willSoftDelete = hasDependencies && config.supportsSoftDelete

      setState(prev => ({
        ...prev,
        isLoading: false,
        isDialogOpen: true,
        dependencies,
        willSoftDelete: willSoftDelete ?? false,
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to check dependencies"
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }, [config, toast])

  const confirmDelete = useCallback(async () => {
    if (!state.itemToDelete) return

    const { id, name } = state.itemToDelete

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Log the attempt
      await logDeleteActivity(
        config.entityType,
        id,
        name,
        state.willSoftDelete ? "soft_delete" : "hard_delete",
        { dependencies: state.dependencies }
      )

      // Perform the delete
      await config.deleteFunction(id)

      // Success!
      toast({
        title: config.successMessage || `${config.entityType} deleted successfully`,
        description: state.willSoftDelete 
          ? `"${name}" has been marked as unavailable.`
          : `"${name}" has been permanently deleted.`,
      })

      // Callback
      if (config.onSuccess) {
        await config.onSuccess()
      }

      // Reset state
      setState({
        isLoading: false,
        isDialogOpen: false,
        itemToDelete: null,
        dependencies: [],
        willSoftDelete: false,
        error: null,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      
      // Log failed attempt
      await logDeleteActivity(config.entityType, id, name, "delete_attempted", {
        error: errorMessage,
        dependencies: state.dependencies,
      })

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))

      // Determine error type for better messaging
      let title = config.errorMessagePrefix || `Error deleting ${config.entityType}`
      let description = errorMessage

      if (errorMessage.includes("foreign key constraint")) {
        title = `Cannot delete ${config.entityType}`
        description = `This ${config.entityType} has related records that must be removed first.`
      } else if (errorMessage.includes("permission denied")) {
        title = "Permission Denied"
        description = `You don't have permission to delete this ${config.entityType}.`
      } else if (errorMessage.includes("not found") || errorMessage.includes("No rows")) {
        title = `${config.entityType} Not Found`
        description = `This ${config.entityType} may have already been deleted. Try refreshing the page.`
      }

      toast({
        title,
        description,
        variant: "destructive",
      })
    }
  }, [state, config, toast])

  const cancelDelete = useCallback(() => {
    setState({
      isLoading: false,
      isDialogOpen: false,
      itemToDelete: null,
      dependencies: [],
      willSoftDelete: false,
      error: null,
    })
  }, [])

  const setDialogOpen = useCallback((open: boolean) => {
    if (!open) {
      cancelDelete()
    } else {
      setState(prev => ({ ...prev, isDialogOpen: true }))
    }
  }, [cancelDelete])

  return {
    state,
    initiateDelete,
    confirmDelete,
    cancelDelete,
    setDialogOpen,
  }
}

// ============================================================================
// CONVENIENCE HOOKS FOR SPECIFIC ENTITIES
// ============================================================================

export function useServiceDelete(
  deleteFunction: (id: string) => Promise<void>,
  onSuccess?: () => void | Promise<void>
) {
  return useDeleteOperation({
    entityType: "Service",
    fetchDependencies: getServiceDependencies,
    deleteFunction,
    onSuccess,
    supportsSoftDelete: true,
    successMessage: "Service deleted successfully",
  })
}

export function useRoomDelete(
  deleteFunction: (id: string) => Promise<void>,
  onSuccess?: () => void | Promise<void>
) {
  return useDeleteOperation({
    entityType: "Room",
    fetchDependencies: getRoomDependencies,
    deleteFunction,
    onSuccess,
    supportsSoftDelete: true,
    successMessage: "Room deleted successfully",
  })
}

export function useRoomTypeDelete(
  deleteFunction: (id: string) => Promise<void>,
  onSuccess?: () => void | Promise<void>
) {
  return useDeleteOperation({
    entityType: "Room Type",
    fetchDependencies: getRoomTypeDependencies,
    deleteFunction,
    onSuccess,
    supportsSoftDelete: false,
    successMessage: "Room type deleted successfully",
  })
}

export function useFloorDelete(
  deleteFunction: (id: string) => Promise<void>,
  onSuccess?: () => void | Promise<void>
) {
  return useDeleteOperation({
    entityType: "Floor",
    fetchDependencies: getFloorDependencies,
    deleteFunction,
    onSuccess,
    supportsSoftDelete: false,
    successMessage: "Floor deleted successfully",
  })
}

export function useServiceCategoryDelete(
  deleteFunction: (id: string) => Promise<void>,
  onSuccess?: () => void | Promise<void>
) {
  return useDeleteOperation({
    entityType: "Service Category",
    fetchDependencies: getServiceCategoryDependencies,
    deleteFunction,
    onSuccess,
    supportsSoftDelete: false,
    successMessage: "Service category deleted successfully",
  })
}
