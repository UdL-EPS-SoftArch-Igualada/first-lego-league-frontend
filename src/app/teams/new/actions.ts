"use server";

import { TeamsService } from "@/api/teamApi";
import { UsersService } from "@/api/userApi";
import { serverAuthProvider } from "@/lib/authProvider";
import { isAdmin } from "@/lib/authz";
import { isValidEmailAddress } from "@/lib/validation";
import {
    ApiError,
    AuthenticationError,
    ConflictError,
    ValidationError,
} from "@/types/errors";
import {
    DEFAULT_TEAM_MEMBER_ROLE,
    MAX_TEAM_MEMBERS,
    TEAM_CATEGORY_OPTIONS,
    TEAM_MEMBER_GENDER_OPTIONS,
    Team,
    TeamCategory,
    TeamCoach,
    TeamMemberGender,
} from "@/types/team";
import { revalidatePath } from "next/cache";

type TeamMemberInput = {
    name: string;
    age: string;
    gender: string;
    tShirtSize: string;
};

type CoachInput = {
    name: string;
    emailAddress: string;
    phoneNumber: string;
};

export type CreateTeamFormPayload = {
    name: string;
    educationalCenter: string;
    location: string;
    inscriptionDate: string;
    foundationYear: string;
    category: string;
    members: TeamMemberInput[];
    coaches: CoachInput[];
};

type NormalizedTeamMemberInput = {
    name: string;
    age: number;
    gender: TeamMemberGender;
    tShirtSize: string;
};

type NormalizedCoachInput = {
    name: string;
    emailAddress: string;
    phoneNumber: string;
};

type ValidatedTeamPayload = {
    name: string;
    educationalCenter: string;
    location: string;
    inscriptionDate: string;
    foundationYear: number;
    category: TeamCategory;
    members: NormalizedTeamMemberInput[];
    coaches: NormalizedCoachInput[];
};

const validTeamCategories = new Set<string>(TEAM_CATEGORY_OPTIONS);
const validTeamMemberGenders = new Set<string>(TEAM_MEMBER_GENDER_OPTIONS);

function normalizeRequiredString(value: unknown, message: string) {
    if (typeof value !== "string") {
        throw new ValidationError(message);
    }

    const normalized = value.trim();

    if (!normalized) {
        throw new ValidationError(message);
    }

    return normalized;
}

function parseInteger(value: unknown, message: string) {
    if (typeof value !== "string") {
        throw new ValidationError(message);
    }

    if (!/^\d+$/.test(value.trim())) {
        throw new ValidationError(message);
    }

    return Number.parseInt(value, 10);
}

function ensureIsoDate(value: string, message: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new ValidationError(message);
    }

    const parsedDate = new Date(`${value}T00:00:00Z`);

    if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== value
    ) {
        throw new ValidationError(message);
    }

    return parsedDate;
}

function getTodayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}

function deriveBirthDate(age: number, inscriptionDate: string) {
    const referenceYear = Number.parseInt(inscriptionDate.slice(0, 4), 10);
    return `${referenceYear - age}-01-01`;
}

function extractLastPathSegment(value: string | undefined) {
    if (!value) {
        return undefined;
    }

    const sanitizedValue = value.split(/[?#]/, 1)[0];
    return sanitizedValue.split("/").findLast(Boolean);
}

function decodeUriComponentSafely(value: string) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function resolveTeamId(team: Team) {
    const resolved =
        team.id ??
        extractLastPathSegment(team.link("self")?.href) ??
        extractLastPathSegment(team.uri);

    if (!resolved) {
        throw new ApiError("The team was created, but its identifier could not be resolved.", 500, true);
    }

    return decodeUriComponentSafely(resolved);
}

function resolveCoachId(coach: TeamCoach) {
    const resolved =
        coach.id ??
        extractLastPathSegment(coach.link("self")?.href) ??
        extractLastPathSegment(coach.uri);

    if (resolved === undefined || resolved === null) {
        throw new ApiError("The coach identifier could not be resolved.", 500, true);
    }

    const parsedId =
        typeof resolved === "number" ? resolved : Number.parseInt(String(resolved), 10);

    if (!Number.isInteger(parsedId)) {
        throw new ApiError("The coach identifier could not be resolved.", 500, true);
    }

    return parsedId;
}

async function resolveCoachForAssignment(
    service: TeamsService,
    coach: NormalizedCoachInput,
    coachLabel: string
) {
    const existingCoach = await service.getCoachByEmail(coach.emailAddress);
    if (existingCoach) {
        return {
            coachId: resolveCoachId(existingCoach),
            wasCreated: false,
        };
    }

    try {
        const createdCoach = await service.createCoach(coach);

        return {
            coachId: resolveCoachId(createdCoach),
            wasCreated: true,
        };
    } catch (error) {
        if (!(error instanceof ConflictError)) {
            throw error;
        }

        const conflictedCoach = await service.getCoachByEmail(coach.emailAddress);
        if (conflictedCoach) {
            return {
                coachId: resolveCoachId(conflictedCoach),
                wasCreated: false,
            };
        }

        throw new ValidationError(`${coachLabel} email address is already registered.`);
    }
}

function validateTeamPayload(data: CreateTeamFormPayload): ValidatedTeamPayload {
    const name = normalizeRequiredString(data.name, "Team name is required.");
    const educationalCenter = normalizeRequiredString(
        data.educationalCenter,
        "Educational center is required."
    );
    const location = normalizeRequiredString(data.location, "Location is required.");
    const inscriptionDate = normalizeRequiredString(
        data.inscriptionDate,
        "Inscription date is required."
    );
    const normalizedCategoryValue = normalizeRequiredString(data.category, "Category is required.")
        .toUpperCase();

    if (!validTeamCategories.has(normalizedCategoryValue)) {
        throw new ValidationError("Please select a valid team category.");
    }

    const normalizedCategory = normalizedCategoryValue as TeamCategory;

    const parsedInscriptionDate = ensureIsoDate(
        inscriptionDate,
        "Please provide a valid inscription date."
    );
    const today = ensureIsoDate(getTodayIsoDate(), "Unable to validate the inscription date.");

    if (parsedInscriptionDate > today) {
        throw new ValidationError("Inscription date cannot be in the future.");
    }

    const foundationYear = parseInteger(
        data.foundationYear,
        "Foundation year must be a valid number."
    );

    if (foundationYear < 1998) {
        throw new ValidationError("Foundation year must be 1998 or later.");
    }

    if (foundationYear > parsedInscriptionDate.getUTCFullYear()) {
        throw new ValidationError("Foundation year cannot be later than the inscription date.");
    }

    if (!Array.isArray(data.members) || data.members.length === 0) {
        throw new ValidationError("Please add at least one team member.");
    }

    if (data.members.length > MAX_TEAM_MEMBERS) {
        throw new ValidationError(`A team cannot have more than ${MAX_TEAM_MEMBERS} members.`);
    }

    const members = data.members.map((member, index) => {
        const nameValue = normalizeRequiredString(
            member.name,
            `Member ${index + 1} name is required.`
        );
        const age = parseInteger(member.age, `Member ${index + 1} age must be a valid number.`);
        const tShirtSize = normalizeRequiredString(
            member.tShirtSize,
            `Member ${index + 1} t-shirt size is required.`
        );

        if (age < 1 || age > 99) {
            throw new ValidationError(`Member ${index + 1} age must be between 1 and 99.`);
        }

        const normalizedGender = normalizeRequiredString(
            member.gender,
            `Member ${index + 1} gender is required.`
        );

        if (!validTeamMemberGenders.has(normalizedGender)) {
            throw new ValidationError(`Member ${index + 1} gender is invalid.`);
        }

        return {
            name: nameValue,
            age,
            gender: normalizedGender as TeamMemberGender,
            tShirtSize,
        };
    });

    if (!Array.isArray(data.coaches) || data.coaches.length === 0) {
        throw new ValidationError("Please add at least one coach.");
    }

    if (data.coaches.length > 2) {
        throw new ValidationError("A team can only have up to two coaches.");
    }

    const coaches = data.coaches.map((coach, index) => {
        const nameValue = normalizeRequiredString(coach.name, `Coach ${index + 1} name is required.`);
        const emailAddress = normalizeRequiredString(
            coach.emailAddress,
            `Coach ${index + 1} email address is required.`
        );

        if (!isValidEmailAddress(emailAddress)) {
            throw new ValidationError(`Coach ${index + 1} email address is invalid.`);
        }

        return {
            name: nameValue,
            emailAddress,
            phoneNumber: normalizeRequiredString(
                coach.phoneNumber,
                `Coach ${index + 1} phone number is required.`
            ),
        };
    });

    const seenCoachEmails = new Set<string>();
    for (const [index, coach] of coaches.entries()) {
        const normalizedEmail = coach.emailAddress.toLowerCase();

        if (seenCoachEmails.has(normalizedEmail)) {
            throw new ValidationError(`Coach ${index + 1} email address duplicates another coach.`);
        }

        seenCoachEmails.add(normalizedEmail);
    }

    return {
        name,
        educationalCenter,
        location,
        inscriptionDate,
        foundationYear,
        category: normalizedCategory,
        members,
        coaches,
    };
}

async function cleanupFailedCreation(
    service: TeamsService,
    teamId: string,
    createdCoachIds: number[]
) {
    await service.deleteTeam(teamId).catch(() => undefined);

    if (createdCoachIds.length === 0) {
        return;
    }

    await Promise.allSettled(createdCoachIds.map((coachId) => service.deleteCoach(coachId)));
}

export async function createTeam(data: CreateTeamFormPayload) {
    const auth = await serverAuthProvider.getAuth();
    if (!auth) {
        throw new AuthenticationError();
    }

    const currentUser = await new UsersService(serverAuthProvider).getCurrentUser();

    if (!isAdmin(currentUser)) {
        throw new AuthenticationError("You are not allowed to create teams.", 403);
    }

    const validatedData = validateTeamPayload(data);
    const teamsService = new TeamsService(serverAuthProvider);

    const createdTeam = await teamsService.createTeam({
        name: validatedData.name,
        city: validatedData.location,
        foundationYear: validatedData.foundationYear,
        educationalCenter: validatedData.educationalCenter,
        category: validatedData.category,
        inscriptionDate: validatedData.inscriptionDate,
    });

    const createdCoachIds: number[] = [];
    const assignedCoachIds = new Set<number>();
    const teamId = resolveTeamId(createdTeam);
    const teamReference = `/teams/${encodeURIComponent(teamId)}`;

    try {
        for (const member of validatedData.members) {
            await teamsService.createTeamMember({
                name: member.name,
                birthDate: deriveBirthDate(member.age, validatedData.inscriptionDate),
                gender: member.gender,
                role: DEFAULT_TEAM_MEMBER_ROLE,
                team: teamReference,
                tShirtSize: member.tShirtSize,
            });
        }

        for (const [index, coach] of validatedData.coaches.entries()) {
            const { coachId, wasCreated } = await resolveCoachForAssignment(
                teamsService,
                coach,
                `Coach ${index + 1}`
            );

            if (assignedCoachIds.has(coachId)) {
                throw new ValidationError(`Coach ${index + 1} email address duplicates another coach.`);
            }

            if (wasCreated) {
                createdCoachIds.push(coachId);
            }

            assignedCoachIds.add(coachId);
            await teamsService.assignCoach(teamId, coachId);
        }
    } catch (error) {
        await cleanupFailedCreation(teamsService, teamId, createdCoachIds);
        throw error;
    }

    revalidatePath("/teams");

    return "/teams";
}

export type UpdateTeamFormPayload = {
    id: string;
    name: string;
    city?: string | null;
    educationalCenter?: string | null;
    category: string;
    foundationYear?: number | null;
    inscriptionDate?: string | null;
};

function validateUpdateTeamPayload(data: UpdateTeamFormPayload) {
    // El name es opcional en actualización, usa el id como fallback
    const name = data.name?.trim() || data.id;

    const city = data.city?.toString().trim() || null;
    const educationalCenter = data.educationalCenter?.toString().trim() || null;

    const rawCategory = normalizeRequiredString(data.category, "Category is required.");
    const matchedCategory = TEAM_CATEGORY_OPTIONS.find(
        (c) => c.toUpperCase() === rawCategory.toUpperCase()
    );

    if (!matchedCategory) {
        throw new ValidationError("Please select a valid team category.");
    }

    let foundationYear: number | null = null;

    if (data.foundationYear !== undefined && data.foundationYear !== null) {
        foundationYear = Number(data.foundationYear);

        if (Number.isNaN(foundationYear)) {
            throw new ValidationError("Foundation year must be a valid number.");
        }

        if (foundationYear < 1998) {
            throw new ValidationError("Foundation year must be 1998 or later.");
        }
    }

    let inscriptionDate: string | null = null;

    if (data.inscriptionDate) {
        ensureIsoDate(data.inscriptionDate, "Invalid inscription date format.");
        inscriptionDate = data.inscriptionDate;
    }

    return {
        id: data.id,
        name,
        city,
        educationalCenter,
        category: matchedCategory as TeamCategory,
        foundationYear,
        inscriptionDate,
    };
}

export async function updateTeam(data: UpdateTeamFormPayload) {
    const auth = await serverAuthProvider.getAuth();
    if (!auth) {
        throw new AuthenticationError();
    }

    const currentUser = await new UsersService(serverAuthProvider).getCurrentUser();

    if (!isAdmin(currentUser)) {
        throw new AuthenticationError("You are not allowed to update teams.", 403);
    }

    const validated = validateUpdateTeamPayload(data);

    const service = new TeamsService(serverAuthProvider);

    const team = await service.getTeamById(validated.id);

    if (!team) {
        throw new ApiError("Team not found.", 404);
    }

    await service.updateTeam(validated.id, {
        name: validated.name,
        city: validated.city ?? undefined,
        educationalCenter: validated.educationalCenter ?? undefined,
        category: validated.category,
        foundationYear: validated.foundationYear ?? undefined,
        inscriptionDate: validated.inscriptionDate ?? undefined,
    });

    revalidatePath(`/teams/${validated.id}`);
    revalidatePath("/teams");

    return { success: true };
}
