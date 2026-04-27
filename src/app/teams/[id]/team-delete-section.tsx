"use client";

import { useState } from "react";
import { Button } from "@/app/components/button";
import DeleteTeamDialog from "./delete-team-dialog";

interface TeamDeleteSectionProps {
  teamId: string;
  teamName: string;
}

export default function TeamDeleteSection({
  teamId,
  teamName,
}: TeamDeleteSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        Delete
      </Button>

      {isOpen && (
        <DeleteTeamDialog
          teamId={teamId}
          teamName={teamName}
          onCancel={() => setIsOpen(false)}
        />
      )}
    </>
  );
}