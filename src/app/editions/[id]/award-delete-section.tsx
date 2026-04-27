"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/app/components/button";
import ConfirmDestructiveDialog from "@/app/components/confirm-destructive-dialog";
import { deleteAward } from "./actions";

interface AwardDeleteSectionProps {
  readonly editionId: string;
  readonly awardLabel: string;
  readonly awardUri: string;
}

export default function AwardDeleteSection({
  editionId,
  awardLabel,
  awardUri,
}: AwardDeleteSectionProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="ml-1 h-6 w-6 rounded-full border-0 text-amber-900 hover:bg-amber-200 hover:text-destructive"
        aria-label={`Delete ${awardLabel}`}
        title={`Delete ${awardLabel}`}
        onClick={() => setIsDialogOpen(true)}
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
      </Button>

      {isDialogOpen && (
        <ConfirmDestructiveDialog
          title="Delete award"
          description={
            <p>
              Are you sure you want to delete <span className="font-semibold text-foreground">{awardLabel}</span>?
              This action cannot be undone.
            </p>
          }
          confirmLabel="Delete award"
          pendingLabel="Deleting..."
          onConfirm={async () => {
            const result = await deleteAward(editionId, awardUri);
            if (!result.success) {
              throw new Error(result.error ?? "Error deleting the award");
            }

            setIsDialogOpen(false);
            router.refresh();
          }}
          onCancel={() => setIsDialogOpen(false)}
        />
      )}
    </>
  );
}
