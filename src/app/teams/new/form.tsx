"use client";

import { Button } from "@/app/components/button";
import { Input } from "@/app/components/input";
import { Label } from "@/app/components/label";
import { isValidEmailAddress } from "@/lib/validation";
import { parseErrorMessage } from "@/types/errors";
import {
    MAX_TEAM_MEMBERS,
    TEAM_CATEGORY_OPTIONS,
    TEAM_MEMBER_GENDER_OPTIONS,
} from "@/types/team";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { SubmitHandler, useFieldArray, useForm } from "react-hook-form";
import { CreateTeamFormPayload, createTeam } from "./actions";

const selectClassName =
    "border-input h-11 w-full border bg-card px-4 py-2 text-base outline-none " +
    "focus-visible:border-ring focus-visible:ring-ring/35 focus-visible:ring-[3px] " +
    "aria-invalid:border-destructive md:text-sm disabled:pointer-events-none disabled:opacity-50";

const genderLabels: Record<string, string> = {
    MALE: "Male",
    FEMALE: "Female",
    NON_BINARY: "Non-binary",
    OTHER: "Other",
    PREFER_NOT_TO_SAY: "Prefer not to say",
};

function createEmptyMember() {
    return {
        name: "",
        age: "",
        gender: "",
        tShirtSize: "",
    };
}

function createEmptyCoach() {
    return {
        name: "",
        emailAddress: "",
        phoneNumber: "",
    };
}

function FieldError({ message }: Readonly<{ message?: string }>) {
    if (!message) {
        return null;
    }

    return (
        <p className="text-sm text-destructive" role="alert">
            {message}
        </p>
    );
}

function SectionCard({
    title,
    description,
    children,
}: Readonly<{
    title: string;
    description: string;
    children: ReactNode;
}>) {
    return (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-5 space-y-1">
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {children}
        </section>
    );
}

export default function NewTeamForm() {
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const router = useRouter();
    const {
        control,
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<CreateTeamFormPayload>({
        defaultValues: {
            name: "",
            educationalCenter: "",
            location: "",
            inscriptionDate: "",
            foundationYear: "",
            category: TEAM_CATEGORY_OPTIONS[0],
            members: [createEmptyMember()],
            coaches: [createEmptyCoach()],
        },
    });

    const {
        fields: memberFields,
        append: appendMember,
        remove: removeMember,
    } = useFieldArray({
        control,
        name: "members",
    });
    const {
        fields: coachFields,
        append: appendCoach,
        remove: removeCoach,
    } = useFieldArray({
        control,
        name: "coaches",
    });

    const canAddMember = memberFields.length < MAX_TEAM_MEMBERS;
    const canAddCoach = coachFields.length < 2;

    const onSubmit: SubmitHandler<CreateTeamFormPayload> = async (data) => {
        setSubmitError(null);

        try {
            const destination = await createTeam(data);
            setIsRedirecting(true);
            router.push(destination);
        } catch (error) {
            setIsRedirecting(false);
            setSubmitError(parseErrorMessage(error));
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="mx-auto grid max-w-4xl gap-6">
            {submitError && (
                <p
                    className="border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                    role="alert"
                    aria-live="assertive"
                >
                    {submitError}
                </p>
            )}

            <SectionCard
                title="Team details"
                description="Define the core registration data that identifies the team."
            >
                <div className="grid gap-5 md:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Team name</Label>
                        <Input
                            id="name"
                            {...register("name", {
                                required: "Team name is required",
                                minLength: {
                                    value: 3,
                                    message: "Team name must be at least 3 characters",
                                },
                                maxLength: {
                                    value: 50,
                                    message: "Team name must be 50 characters or fewer",
                                },
                            })}
                        />
                        <FieldError message={errors.name?.message} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="category">Category</Label>
                        <select
                            id="category"
                            className={selectClassName}
                            aria-invalid={!!errors.category}
                            {...register("category", { required: "Category is required" })}
                        >
                            {TEAM_CATEGORY_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                        <FieldError message={errors.category?.message} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="educationalCenter">Educational center</Label>
                        <Input
                            id="educationalCenter"
                            {...register("educationalCenter", {
                                required: "Educational center is required",
                                maxLength: {
                                    value: 100,
                                    message: "Educational center must be 100 characters or fewer",
                                },
                            })}
                        />
                        <FieldError message={errors.educationalCenter?.message} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                            id="location"
                            {...register("location", {
                                required: "Location is required",
                                maxLength: {
                                    value: 100,
                                    message: "Location must be 100 characters or fewer",
                                },
                            })}
                        />
                        <FieldError message={errors.location?.message} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="inscriptionDate">Inscription date</Label>
                        <Input
                            id="inscriptionDate"
                            type="date"
                            {...register("inscriptionDate", {
                                required: "Inscription date is required",
                            })}
                        />
                        <FieldError message={errors.inscriptionDate?.message} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="foundationYear">Foundation year</Label>
                        <Input
                            id="foundationYear"
                            type="number"
                            inputMode="numeric"
                            min={1998}
                            {...register("foundationYear", {
                                required: "Foundation year is required",
                                validate: (value) =>
                                    /^\d{4}$/.test(value) || "Foundation year must be a valid year",
                            })}
                        />
                        <FieldError message={errors.foundationYear?.message} />
                    </div>
                </div>
            </SectionCard>

            <SectionCard
                title="Team members"
                description="Add between one and ten members. The submitted age is converted into a birth year for the API."
            >
                <div className="grid gap-4">
                    {memberFields.map((field, index) => (
                        <div key={field.id} className="rounded-lg border border-border/70 p-4">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <h3 className="text-sm font-semibold text-foreground">
                                    Member {index + 1}
                                </h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeMember(index)}
                                    disabled={memberFields.length === 1}
                                >
                                    Remove
                                </Button>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="grid gap-2">
                                    <Label htmlFor={`member-name-${index}`}>Name</Label>
                                    <Input
                                        id={`member-name-${index}`}
                                        {...register(`members.${index}.name`, {
                                            required: "Member name is required",
                                            minLength: {
                                                value: 2,
                                                message: "Member name must be at least 2 characters",
                                            },
                                            maxLength: {
                                                value: 100,
                                                message: "Member name must be 100 characters or fewer",
                                            },
                                        })}
                                    />
                                    <FieldError message={errors.members?.[index]?.name?.message} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor={`member-age-${index}`}>Age</Label>
                                    <Input
                                        id={`member-age-${index}`}
                                        type="number"
                                        inputMode="numeric"
                                        min={1}
                                        max={99}
                                        {...register(`members.${index}.age`, {
                                            required: "Member age is required",
                                            validate: (value) => {
                                                if (!/^\d+$/.test(value)) {
                                                    return "Member age must be a valid number";
                                                }

                                                const parsedAge = Number.parseInt(value, 10);
                                                return (
                                                    (parsedAge >= 1 && parsedAge <= 99) ||
                                                    "Member age must be between 1 and 99"
                                                );
                                            },
                                        })}
                                    />
                                    <FieldError message={errors.members?.[index]?.age?.message} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor={`member-gender-${index}`}>Gender</Label>
                                    <select
                                        id={`member-gender-${index}`}
                                        className={selectClassName}
                                        aria-invalid={!!errors.members?.[index]?.gender}
                                        {...register(`members.${index}.gender`, {
                                            required: "Member gender is required",
                                        })}
                                    >
                                        <option value="">Select a gender...</option>
                                        {TEAM_MEMBER_GENDER_OPTIONS.map((option) => (
                                            <option key={option} value={option}>
                                                {genderLabels[option]}
                                            </option>
                                        ))}
                                    </select>
                                    <FieldError message={errors.members?.[index]?.gender?.message} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => appendMember(createEmptyMember())}
                        disabled={!canAddMember}
                    >
                        Add member
                    </Button>
                    <p className="text-sm text-muted-foreground">
                        {memberFields.length} / {MAX_TEAM_MEMBERS} members added
                    </p>
                </div>
            </SectionCard>

            <SectionCard
                title="Coaches"
                description="Add one or two coaches with their contact information."
            >
                <div className="grid gap-4">
                    {coachFields.map((field, index) => (
                        <div key={field.id} className="rounded-lg border border-border/70 p-4">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <h3 className="text-sm font-semibold text-foreground">
                                    Coach {index + 1}
                                </h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeCoach(index)}
                                    disabled={coachFields.length === 1}
                                >
                                    Remove
                                </Button>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="grid gap-2">
                                    <Label htmlFor={`coach-name-${index}`}>Name</Label>
                                    <Input
                                        id={`coach-name-${index}`}
                                        {...register(`coaches.${index}.name`, {
                                            required: "Coach name is required",
                                        })}
                                    />
                                    <FieldError message={errors.coaches?.[index]?.name?.message} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor={`coach-email-${index}`}>Email address</Label>
                                    <Input
                                        id={`coach-email-${index}`}
                                        type="email"
                                        {...register(`coaches.${index}.emailAddress`, {
                                            required: "Coach email address is required",
                                            validate: (value) =>
                                                isValidEmailAddress(value) ||
                                                "Please enter a valid email address",
                                        })}
                                    />
                                    <FieldError
                                        message={errors.coaches?.[index]?.emailAddress?.message}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor={`coach-phone-${index}`}>Phone number</Label>
                                    <Input
                                        id={`coach-phone-${index}`}
                                        type="tel"
                                        {...register(`coaches.${index}.phoneNumber`, {
                                            required: "Coach phone number is required",
                                        })}
                                    />
                                    <FieldError
                                        message={errors.coaches?.[index]?.phoneNumber?.message}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => appendCoach(createEmptyCoach())}
                        disabled={!canAddCoach}
                    >
                        Add coach
                    </Button>
                    <p className="text-sm text-muted-foreground">
                        {coachFields.length} / 2 coaches added
                    </p>
                </div>
            </SectionCard>

            <Button
                type="submit"
                className="w-full"
                loading={isSubmitting || isRedirecting}
                loadingText={isRedirecting ? "Redirecting..." : "Creating team..."}
            >
                Create team
            </Button>
        </form>
    );
}
