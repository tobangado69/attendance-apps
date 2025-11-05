"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message: string;
}

/**
 * Error Dialog component for displaying errors in a centered modal
 *
 * @example
 * ```tsx
 * <ErrorDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Error"
 *   message="Your account is inactive. Please contact HR for assistance."
 *   errorCode="EMPLOYEE_INACTIVE"
 * />
 * ```
 */
export function ErrorDialog({
  open,
  onOpenChange,
  title = "Error",
  message,
}: ErrorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle className="text-left">{title}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="pt-2">
          <p className="text-base text-gray-900">{message}</p>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="default">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
