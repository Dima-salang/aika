"use client";

import React, { useEffect, useState } from "react";
import { useConfirmStore } from "@/lib/store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ConfirmDialog() {
  const [mounted, setMounted] = useState(false);
  const { open, title, description, onConfirm, hideConfirm } = useConfirmStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) hideConfirm(); }}>
      <AlertDialogContent className="bg-surface border border-outline-variant rounded-xl p-6 z-[100]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-body-lg font-extrabold text-on-surface">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-on-surface-variant">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-2">
          <AlertDialogCancel
            onClick={hideConfirm}
            className="px-4 py-2 border border-outline-variant rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container-high focus:outline-none"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (onConfirm) onConfirm();
              hideConfirm();
            }}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:brightness-105 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
