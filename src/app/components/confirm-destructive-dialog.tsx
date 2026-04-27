"use client";

import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/app/components/button";
import ErrorAlert from "@/app/components/error-alert";

interface ConfirmDestructiveDialogProps {
  readonly title: string;
  readonly description: ReactNode;
  readonly confirmLabel: string;
  readonly pendingLabel: string;
  readonly onConfirm: () => Promise<void>;
  readonly onCancel: () => void;
}

export default function ConfirmDestructiveDialog({
  title,
  description,
  confirmLabel,
  pendingLabel,
  onConfirm,
  onCancel,
}: ConfirmDestructiveDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  function closeDialog() {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
  }

  function handleCancel() {
    if (isPending) return;
    closeDialog();
    onCancel();
  }

  async function handleConfirm() {
    setIsPending(true);
    setErrorMessage(null);

    try {
      await onConfirm();
      closeDialog();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred"
      );
      setIsPending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-busy={isPending}
      className="m-auto w-full max-w-md border border-border bg-card px-6 py-6 shadow-lg backdrop:bg-black/50 sm:px-8 sm:py-8"
    >
      <h2
        id={titleId}
        className="text-lg font-semibold text-foreground"
      >
        {title}
      </h2>

      <div className="mt-3 text-sm text-muted-foreground">
        {description}
      </div>

      {errorMessage && (
        <div className="mt-4">
          <ErrorAlert message={errorMessage} />
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={handleCancel}
        >
          Cancel
        </Button>

        <Button
          type="button"
          variant="destructive"
          disabled={isPending}
          onClick={handleConfirm}
        >
          {isPending ? pendingLabel : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}