import type { AuthStrategy } from "@/lib/authProvider";
import {
    ApiError,
    AuthenticationError,
    ConflictError,
    NetworkError,
    NotFoundError,
    ServerError,
    ValidationError,
} from "@/types/errors";
import type { HalPage } from "@/types/pagination";
import {
    CreateCoachPayload,
    CreateTeamMemberPayload,
    CreateTeamPayload,
    Team,
    TeamCoach,
    TeamMember,
    TeamMemberGender,
} from "@/types/team";
import {
    API_BASE_URL,
    createHalResource,
    deleteHal,
    fetchHalCollection,
    fetchHalPagedCollection,
    fetchHalResource,
} from "./halClient";

function getSafeEncodedId(id: string): string {
    try {
        return encodeURIComponent(decodeURIComponent(id));
    } catch {
        return encodeURIComponent(id);
    }
}

export interface AddMemberPayload {
    name: string;
    role: string;
    birthDate: string;
    gender: TeamMemberGender;
    tShirtSize: string;
}

export class TeamsService {
    constructor(private readonly authStrategy: AuthStrategy) {}

    async getTeams(): Promise<Team[]> {
        return fetchHalCollection<Team>("/teams", this.authStrategy, "teams");
    }

    async getTeamsByEdition(editionUri: string): Promise<Team[]> {
        return fetchHalCollection<Team>(editionUri, this.authStrategy, 'teams');
    }

    async getTeamsPaged(page: number, size: number): Promise<HalPage<Team>> {
        return fetchHalPagedCollection<Team>('/teams', this.authStrategy, 'teams', page, size);
    }

    async getTeamById(id: string): Promise<Team> {
        const teamId = getSafeEncodedId(id);
        return fetchHalResource<Team>(`/teams/${teamId}`, this.authStrategy);
    }

    async createTeam(data: CreateTeamPayload): Promise<Team> {
        return createHalResource<Team>(
            "/teams",
            {
                name: data.name.trim(),
                city: data.city.trim(),
                foundationYear: data.foundationYear,
                educationalCenter: data.educationalCenter.trim(),
                category: data.category,
                inscriptionDate: data.inscriptionDate,
            },
            this.authStrategy,
            "team"
        );
    }

    async getTeamCoach(id: string): Promise<TeamCoach[]> {
        const teamId = getSafeEncodedId(id);
        return fetchHalCollection<TeamCoach>(`/teams/${teamId}/trainedBy`, this.authStrategy, "coaches");
    }

    async getTeamMembers(teamId: string): Promise<TeamMember[]> {
        const safeId = getSafeEncodedId(teamId);
        return fetchHalCollection<TeamMember>(
            `/teams/${safeId}/members`,
            this.authStrategy,
            "teamMembers"
        );
    }

    async createTeamMember(data: CreateTeamMemberPayload): Promise<TeamMember> {
        return createHalResource<TeamMember>(
            "/teamMembers",
            {
                name: data.name.trim(),
                birthDate: data.birthDate,
                gender: data.gender,
                tShirtSize: data.tShirtSize,
                role: data.role.trim(),
                team: data.team,
            },
            this.authStrategy,
            "team member"
        );
    }

    async addTeamMember(teamId: string, data: AddMemberPayload): Promise<TeamMember> {
        const safeId = getSafeEncodedId(teamId);
        return this.createTeamMember({
            name: data.name,
            role: data.role,
            birthDate: data.birthDate,
            gender: data.gender,
            tShirtSize: data.tShirtSize,
            team: `/teams/${safeId}`,
        });
    }

    async createCoach(data: CreateCoachPayload): Promise<TeamCoach> {
        return createHalResource<TeamCoach>(
            "/coaches",
            {
                name: data.name.trim(),
                emailAddress: data.emailAddress.trim(),
                phoneNumber: data.phoneNumber.trim(),
            },
            this.authStrategy,
            "coach"
        );
    }

    async getCoachByEmail(emailAddress: string): Promise<TeamCoach | null> {
        const normalizedEmail = emailAddress.trim();

        if (!normalizedEmail) {
            return null;
        }

        try {
            return await fetchHalResource<TeamCoach>(
                `/coaches/search/findByEmailAddress?email=${encodeURIComponent(normalizedEmail)}`,
                this.authStrategy
            );
        } catch (error) {
            if (error instanceof NotFoundError) {
                return null;
            }

            throw error;
        }
    }

    async assignCoach(teamId: string, coachId: number): Promise<void> {
        const authorization = await this.authStrategy.getAuth();

        let response: Response;
        try {
            response = await fetch(`${API_BASE_URL}/teams/assign-coach`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    ...(authorization ? { Authorization: authorization } : {}),
                },
                body: JSON.stringify({
                    teamId,
                    coachId,
                }),
                cache: "no-store",
            });
        } catch (error) {
            if (error instanceof TypeError) {
                throw new NetworkError(undefined, error);
            }

            throw error;
        }

        if (!response.ok) {
            await this.handleAssignCoachError(response);
        }
    }

    private async handleAssignCoachError(response: Response): Promise<never> {
        let errorMessage: string | undefined;

        try {
            const contentType = response.headers.get("content-type");
            if (contentType?.toLowerCase().includes("json")) {
                const body = await response.json();
                errorMessage = body.message || body.error || body.detail;
            }
        } catch {
            errorMessage = undefined;
        }

        switch (response.status) {
            case 400:
                throw new ValidationError(errorMessage);
            case 401:
            case 403:
                throw new AuthenticationError(errorMessage, response.status);
            case 404:
                throw new NotFoundError(errorMessage);
            case 409:
                throw new ConflictError(errorMessage);
            case 500:
            case 502:
            case 503:
            case 504:
                throw new ServerError(errorMessage, response.status);
            default:
                throw new ApiError(
                    errorMessage ?? "Failed to assign coach to team.",
                    response.status,
                    true
                );
        }
    }
    async deleteTeam(id: string): Promise<void> {
        const teamId = getSafeEncodedId(id);
        await deleteHal(`/teams/${teamId}`, this.authStrategy);
    }

    async deleteCoach(id: number): Promise<void> {
        await deleteHal(`/coaches/${id}`, this.authStrategy);
    }

    async removeTeamMember(memberUri: string): Promise<void> {
        await deleteHal(memberUri, this.authStrategy);
    }
    async updateTeam(id: string, data: Partial<CreateTeamPayload>): Promise<Team> {
        const teamId = getSafeEncodedId(id);
        const authorization = await this.authStrategy.getAuth();

        const cleanedData: Partial<CreateTeamPayload> = {
            ...data,
            name: data.name?.trim(),
            city: data.city?.trim() || undefined,
            educationalCenter: data.educationalCenter?.trim() || undefined,
        };

        let response: Response;

        try {
            response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    ...(authorization ? { Authorization: authorization } : {}),
                },
                body: JSON.stringify(cleanedData),
                cache: "no-store",
            });
        } catch (error) {
            if (error instanceof TypeError) {
                throw new NetworkError(undefined, error);
            }
            throw error;
        }

        if (!response.ok) {
            let message: string | undefined;

            try {
                const contentType = response.headers.get("content-type");
                if (contentType?.includes("json")) {
                    const body = await response.json();
                    message = body.message || body.error || body.detail;
                }
            } catch {
                message = undefined;
            }

            switch (response.status) {
                case 400:
                    throw new ValidationError(message);
                case 401:
                case 403:
                    throw new AuthenticationError(message, response.status);
                case 404:
                    throw new NotFoundError(message);
                case 409:
                    throw new ConflictError(message);
                case 500:
                case 502:
                case 503:
                case 504:
                    throw new ServerError(message, response.status);
                default:
                    throw new ApiError(
                        message ?? "Failed to update team.",
                        response.status,
                        true
                    );
            }
        }

        const result = await response.json();
        console.log("UPDATE RESPONSE:", result);
        return result;
    }
}
