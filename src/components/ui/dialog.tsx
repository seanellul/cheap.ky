"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"
import { useSwipeToDismiss } from "@/lib/hooks/use-swipe-to-dismiss"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/20 backdrop-blur-xs duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  const popupRef = React.useRef<HTMLDivElement>(null)
  const [open, setOpen] = React.useState(false)

  // Track open state from data attribute
  React.useEffect(() => {
    const el = popupRef.current
    if (!el) return
    const obs = new MutationObserver(() => {
      setOpen(el.hasAttribute("data-open"))
    })
    obs.observe(el, { attributes: true, attributeFilter: ["data-open"] })
    setOpen(el.hasAttribute("data-open"))
    return () => obs.disconnect()
  }, [])

  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipeToDismiss(popupRef, {
    onDismiss: () => {
      // Find and click the close button to properly close via base-ui
      popupRef.current?.querySelector<HTMLButtonElement>("[data-slot='dialog-close']")?.click()
    },
  })

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        ref={popupRef}
        data-slot="dialog-content"
        className={cn(
          // Desktop: centered modal
          "fixed z-50 grid w-full gap-4 bg-background text-sm ring-1 ring-foreground/10 outline-none",
          // Mobile: bottom sheet
          "bottom-0 left-0 right-0 max-h-[90vh] rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]",
          "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
          // Mobile: slide up from bottom
          "data-open:slide-in-from-bottom-full data-closed:slide-out-to-bottom-full duration-200",
          // Desktop: centered dialog
          "sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:right-auto sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-4 sm:pb-4",
          "sm:data-open:slide-in-from-bottom-0 sm:data-open:zoom-in-95 sm:data-closed:slide-out-to-bottom-0 sm:data-closed:zoom-out-95",
          className
        )}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        {...props}
      >
        {/* Mobile drag handle */}
        <div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/20 -mt-1 mb-1 sm:hidden cursor-grab" />
        <div className="overflow-y-auto max-h-[calc(90vh-4rem)] sm:max-h-none overscroll-contain">
          {children}
        </div>
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3 sm:top-2 sm:right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        "sm:-mb-4 -mb-[calc(1rem+env(safe-area-inset-bottom))] pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-base leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
