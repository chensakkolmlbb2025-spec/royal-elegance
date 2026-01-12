"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertTriangle, Trash2, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DependencyInfo {
  type: string
  count: number
  label: string
}

export interface DeleteConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void> | void
  title: string
  itemName: string
  itemType: string
  description?: string
  dependencies?: DependencyInfo[]
  willSoftDelete?: boolean
  isLoading?: boolean
  variant?: "default" | "danger" | "warning"
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  itemName,
  itemType,
  description,
  dependencies = [],
  willSoftDelete = false,
  isLoading = false,
  variant = "danger",
}: DeleteConfirmationDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)
  
  const hasDependencies = dependencies.some(d => d.count > 0)
  const totalDependencies = dependencies.reduce((sum, d) => sum + d.count, 0)

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
    } finally {
      setIsDeleting(false)
    }
  }

  const variantStyles = {
    default: {
      icon: Info,
      iconColor: "text-blue-500",
      buttonClass: "bg-blue-600 hover:bg-blue-700",
    },
    warning: {
      icon: AlertTriangle,
      iconColor: "text-amber-500",
      buttonClass: "bg-amber-600 hover:bg-amber-700",
    },
    danger: {
      icon: Trash2,
      iconColor: "text-red-500",
      buttonClass: "bg-red-600 hover:bg-red-700 focus:ring-red-600",
    },
  }

  const currentVariant = variantStyles[variant]
  const IconComponent = currentVariant.icon

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              variant === "danger" && "bg-red-100",
              variant === "warning" && "bg-amber-100",
              variant === "default" && "bg-blue-100"
            )}>
              <IconComponent className={cn("h-5 w-5", currentVariant.iconColor)} />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-lg font-semibold">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {description || `Are you sure you want to delete this ${itemType}?`}
                  </p>
                  
                  {/* Item being deleted */}
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {itemName}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {itemType}
                      </Badge>
                    </div>
                  </div>

                  {/* Dependencies Warning */}
                  {hasDependencies && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-800">
                          This item has {totalDependencies} related record{totalDependencies !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <ul className="text-xs text-amber-700 space-y-1 ml-6">
                        {dependencies.filter(d => d.count > 0).map((dep, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {dep.count} {dep.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Soft Delete Notice */}
                  {willSoftDelete && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-blue-800">
                          This item will be marked as <strong>unavailable</strong> instead of permanently deleted to preserve history.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Permanent Delete Warning */}
                  {!willSoftDelete && !hasDependencies && (
                    <p className="text-xs text-red-600 font-medium">
                      ⚠️ This action is permanent and cannot be undone.
                    </p>
                  )}
                </div>
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel disabled={isDeleting || isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={isDeleting || isLoading}
            className={cn(
              "text-white",
              currentVariant.buttonClass
            )}
          >
            {(isDeleting || isLoading) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                {willSoftDelete ? "Disable" : "Delete"}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
