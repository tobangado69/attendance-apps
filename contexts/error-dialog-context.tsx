"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { ErrorDialog } from "@/components/ui/error-dialog";
import { ApiError, handleApiError } from "@/lib/error-handler";

interface ErrorDialogContextType {
  showError: (error: unknown, title?: string) => void;
}

const ErrorDialogContext = createContext<ErrorDialogContextType | undefined>(
  undefined
);

export function ErrorDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [errorData, setErrorData] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const showError = useCallback((error: unknown, title: string = "Error") => {
    const apiError = handleApiError(error);
    setErrorData({
      title,
      message: apiError.message,
    });
    setIsOpen(true);
  }, []);

  // Listen for custom events from showErrorToast
  useEffect(() => {
    const handleShowErrorDialog = (event: Event) => {
      const customEvent = event as CustomEvent<{ error: ApiError; title?: string }>;
      const { error, title } = customEvent.detail;
      setErrorData({
        title: title || "Error",
        message: error.message,
      });
      setIsOpen(true);
    };

    window.addEventListener('show-error-dialog', handleShowErrorDialog);
    
    return () => {
      window.removeEventListener('show-error-dialog', handleShowErrorDialog);
    };
  }, []);

  return (
    <ErrorDialogContext.Provider value={{ showError }}>
      {children}
      {errorData && (
        <ErrorDialog
          open={isOpen}
          onOpenChange={setIsOpen}
          title={errorData.title}
          message={errorData.message}
        />
      )}
    </ErrorDialogContext.Provider>
  );
}

export function useErrorDialog() {
  const context = useContext(ErrorDialogContext);
  if (!context) {
    throw new Error("useErrorDialog must be used within ErrorDialogProvider");
  }
  return context;
}

