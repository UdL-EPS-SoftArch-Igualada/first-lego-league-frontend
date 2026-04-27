'use client';

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/button";
import ErrorAlert from "@/app/components/error-alert";
import { Input } from "@/app/components/input";
import { Label } from "@/app/components/label";
import { getEncodedResourceId } from "@/lib/halRoute";
import { Edition } from "@/types/edition";
import { createAwardForTeam } from "./_add-award-actions";

type AddAwardFormProps = Readonly<{
    teamId: string;
    teamEditionUri: string | null;
    editions: Edition[];
}>;

function getEditionLabel(edition: Edition): string {
    const parts = [edition.year ? String(edition.year) : null, edition.venueName ?? null].filter(Boolean);
    return parts.length > 0 ? parts.join(" - ") : edition.uri ?? "Edition";
}

const editionSelectClassName =
    "border-input h-11 w-full rounded-md border bg-card px-4 py-2 text-sm outline-none " +
    "focus-visible:border-ring focus-visible:ring-ring/35 focus-visible:ring-[3px] " +
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

export default function AddAwardForm({ teamId, teamEditionUri, editions }: AddAwardFormProps) {
    const router = useRouter();
    const nameId = useId();
    const titleId = useId();
    const categoryId = useId();
    const editionId = useId();

    const initialEditionUri =
        getEncodedResourceId(teamEditionUri ?? "") ??
        getEncodedResourceId(editions[0]?.uri ?? "") ??
        teamEditionUri ??
        editions[0]?.uri ??
        "";

    const [name, setName] = useState("");
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [editionUri, setEditionUri] = useState(initialEditionUri);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        const trimmedName = name.trim();
        const trimmedTitle = title.trim();
        const trimmedCategory = category.trim();

        if (!trimmedName) {
            setError("Award name is required.");
            return;
        }

        if (!editionUri) {
            setError("Please select an edition.");
            return;
        }

        setIsLoading(true);

        try {
            await createAwardForTeam({
                teamId,
                editionUri,
                name: trimmedName,
                title: trimmedTitle,
                category: trimmedCategory,
            });

            setName("");
            setTitle("");
            setCategory("");
            setSuccess("Award created successfully.");
            router.refresh();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Failed to create award.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">Add Award</h3>
                <p className="text-sm text-muted-foreground">
                    Create a new award for this team and link it to the selected edition.
                </p>
            </div>

            {error && <ErrorAlert message={error} />}
            {success && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
                    {success}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor={nameId}>Name</Label>
                <Input
                    id={nameId}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Best Innovation"
                    disabled={isLoading}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor={titleId}>Title</Label>
                <Input
                    id={titleId}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. Judges' Choice"
                    disabled={isLoading}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor={categoryId}>Category</Label>
                <Input
                    id={categoryId}
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    placeholder="e.g. Innovation"
                    disabled={isLoading}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor={editionId}>Edition</Label>
                <select
                    id={editionId}
                    value={editionUri}
                    onChange={(event) => setEditionUri(event.target.value)}
                    className={editionSelectClassName}
                    disabled={isLoading || editions.length === 0}
                >
                    {editions.length === 0 ? (
                        <option value="">No editions available</option>
                    ) : (
                        editions.map((edition) => (
                            <option
                                key={edition.uri ?? edition.year}
                                value={getEncodedResourceId(edition.uri ?? "") ?? edition.uri ?? ""}
                            >
                                {getEditionLabel(edition)}
                            </option>
                        ))
                    )}
                </select>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    type="submit"
                    loading={isLoading}
                    loadingText="Saving award..."
                    disabled={!name.trim() || !editionUri}
                >
                    Add Award
                </Button>
            </div>
        </form>
    );
}
