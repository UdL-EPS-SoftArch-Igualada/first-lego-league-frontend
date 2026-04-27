"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TeamsService } from "@/api/teamApi";
import ConfirmDestructiveDialog from "@/app/components/confirm-destructive-dialog";
import { clientAuthProvider } from "@/lib/authProvider";

interface DeleteTeamDialogProps {
  readonly teamId: string;
  readonly teamName: string;
  readonly onCancel: () => void;
}

function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes("foreign key") ||
    lower.includes("violates") ||
    lower.includes("match_result") ||
    lower.includes("award")
  ) {
    return "This team cannot be deleted because it is used in matches or awards.";
  }

  return "An unexpected database error occurred. Please verify your data and try again.";
}

export default function DeleteTeamDialog({
  teamId,
  teamName,
  onCancel,
}: DeleteTeamDialogProps) {
  const router = useRouter();
  const service = new TeamsService(clientAuthProvider);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDelete() {
    try {
      setErrorMessage(null);

      await service.deleteTeam(teamId);

      router.refresh();
      router.push("/teams");
      onCancel();
    } catch (error) {
      const msg = getErrorMessage(error);
      setErrorMessage(msg);
      throw new Error(msg);
    }
  }

  return (
    <ConfirmDestructiveDialog
      title="Delete team"
      description={
        <div className="space-y-2">
          <p>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              {teamName}
            </span>
            ? This action cannot be undone.
          </p>

          
        </div>
      }
      confirmLabel="Delete team"
      pendingLabel="Deleting..."
      onConfirm={handleDelete}
      onCancel={onCancel}
    />
  );
}