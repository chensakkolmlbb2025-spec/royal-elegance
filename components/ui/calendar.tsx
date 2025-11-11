"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type DayPickerProps } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = DayPickerProps

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-foreground",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-0"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "hidden",
        head_cell: "hidden",
        row: "flex w-full mt-2 gap-1",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-full p-0 font-normal hover:bg-accent/50 transition-all duration-200"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-black text-white hover:bg-gray-800 hover:text-white focus:bg-black focus:text-white font-semibold",
        day_today: "bg-accent text-accent-foreground font-semibold border border-gray-300",
        day_outside:
          "day-outside text-muted-foreground/40 opacity-50",
        day_disabled: "text-muted-foreground/30 opacity-30 cursor-not-allowed",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          return orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )
        },
      }}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"
