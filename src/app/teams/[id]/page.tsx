import { AwardsService } from "@/api/awardApi";
import { EditionsService } from "@/api/editionApi";
import { ScientificProjectsService } from "@/api/scientificProjectApi";
import { TeamsService } from "@/api/teamApi";
import { UsersService } from "@/api/userApi";
import EmptyState from "@/app/components/empty-state";
import ErrorAlert from "@/app/components/error-alert";
import { ScientificProjectCardLink } from "@/app/components/scientific-project-card";
import { TeamMembersManager } from "@/app/components/team-member-manager";
import TeamEditSection from "@/app/components/team-edit-section";
import { serverAuthProvider } from "@/lib/authProvider";
import { getAwardLabel, getAwardWinnerTeamUri, getResourceUri, getTeamEditionUri, normalizeUri } from "@/lib/awardUtils";
import { isAdmin } from "@/lib/authz";
import { Award } from "@/types/award";
import { Edition } from "@/types/edition";
import { NotFoundError, parseErrorMessage } from "@/types/errors";
import { ScientificProject } from "@/types/scientificProject";
import { Team, TeamCoach, TeamMember, TeamMemberSnapshot } from "@/types/team";
import { User } from "@/types/user";
import AddAwardForm from "./_add-award-form";

interface TeamDetailPageProps {
    readonly params: Promise<{ id: string }>;
}

function toTeamMemberSnapshot(member: TeamMember): TeamMemberSnapshot {
    return {
        id: member.id,
        name: member.name,
        birthDate: member.birthDate,
        gender: member.gender,
        tShirtSize: member.tShirtSize,
        role: member.role,
        uri: member.uri ?? member.link("self")?.href,
    };
}

function getTeamDisplayName(team: Team | null): string | null {
    if (!team) return null;
    return team.name ?? team.id ?? null;
}

const awardBadgeClassName =
    "rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-xs font-medium text-amber-900";

export default async function TeamDetailPage(props: Readonly<TeamDetailPageProps>) {
    const { id } = await props.params;

    const teamsService = new TeamsService(serverAuthProvider);
    const awardsService = new AwardsService(serverAuthProvider);
    const editionsService = new EditionsService(serverAuthProvider);
    const scientificProjectsService = new ScientificProjectsService(serverAuthProvider);
    const userService = new UsersService(serverAuthProvider);

    let currentUser: User | null = null;
    let team: Team | null = null;
    let coaches: TeamCoach[] = [];
    let members: TeamMember[] = [];
    let scientificProjects: ScientificProject[] = [];
    let awards: Award[] = [];
    let editions: Edition[] = [];

    let error: string | null = null;
    let membersError: string | null = null;
    let scientificProjectsError: string | null = null;
    let awardsError: string | null = null;
    let editionsError: string | null = null;

    try {
        currentUser = await userService.getCurrentUser().catch(() => null);
        team = await teamsService.getTeamById(id);
    } catch (e) {
        if (e instanceof NotFoundError) {
            return <EmptyState title="Not found" description="Team does not exist" />;
        }
        error = parseErrorMessage(e);
    }

    const teamDisplayName = getTeamDisplayName(team);
    const teamUri = team ? getResourceUri(team) : null;
    const teamEditionUri = team ? getTeamEditionUri(team) : null;
    const canManageAwards = isAdmin(currentUser);

    if (team && !error) {
        const membersPromise = Promise.all([
            teamsService.getTeamCoach(id),
            teamsService.getTeamMembers(id),
        ]);

        const scientificProjectsPromise = teamDisplayName
            ? scientificProjectsService.getScientificProjectsByTeamName(teamDisplayName)
            : Promise.resolve([] as ScientificProject[]);

        const awardsPromise = teamEditionUri
            ? awardsService.getAwardsOfEdition(teamEditionUri)
            : Promise.resolve([] as Award[]);

        const editionsPromise = canManageAwards
            ? editionsService.getEditions()
            : Promise.resolve([] as Edition[]);

        const [membersResult, scientificProjectsResult, awardsResult, editionsResult] = await Promise.allSettled([
            membersPromise,
            scientificProjectsPromise,
            awardsPromise,
            editionsPromise,
        ]);

        if (membersResult.status === "fulfilled") {
            const [coachesData, membersData] = membersResult.value;
            coaches = coachesData ?? [];
            members = membersData ?? [];
        } else {
            console.error("Error loading members:", membersResult.reason);
            membersError = parseErrorMessage(membersResult.reason);
        }

        if (scientificProjectsResult.status === "fulfilled") {
            scientificProjects = scientificProjectsResult.value;
        } else {
            console.error("Error loading scientific projects:", scientificProjectsResult.reason);
            scientificProjectsError = parseErrorMessage(scientificProjectsResult.reason);
        }

        if (awardsResult.status === "fulfilled") {
            awards = awardsResult.value;
        } else {
            console.error("Error loading awards:", awardsResult.reason);
            awardsError = parseErrorMessage(awardsResult.reason);
        }

        if (editionsResult.status === "fulfilled") {
            editions = editionsResult.value;
        } else {
            console.error("Error loading editions:", editionsResult.reason);
            editionsError = parseErrorMessage(editionsResult.reason);
        }
    }

    if (error) return <ErrorAlert message={error} />;
    if (!team) return <EmptyState title="Not found" description="Team does not exist" />;

    const currentUserEmail = currentUser?.email?.trim().toLowerCase();

    const isCoach =
        !!currentUserEmail &&
        coaches.some(
            (coach) =>
                coach.emailAddress?.trim().toLowerCase() === currentUserEmail
        );

    const coachName =
        coaches.length > 0
            ? coaches
                  .map(c => c.name ?? c.emailAddress ?? "Unnamed coach")
                  .join(", ")
            : "No coach assigned";

    const initialMembers = members.map(toTeamMemberSnapshot);

    const membersKey = initialMembers
        .map(m => m.uri ?? String(m.id ?? m.name ?? ""))
        .join("|");

    const teamAwards = teamUri
        ? awards.filter((award) => normalizeUri(getAwardWinnerTeamUri(award)) === normalizeUri(teamUri))
        : [];

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="w-full max-w-3xl px-4 py-10">
                <div className="w-full rounded-lg border border-border bg-card p-6 shadow-sm">

                    <h1 className="mb-2 text-2xl font-semibold text-foreground">
                        {teamDisplayName ?? "Unnamed team"}
                    </h1>

                    <div className="mb-6 space-y-1 text-sm text-muted-foreground">
                        {team.city && (
                            <p><strong>City:</strong> {team.city}</p>
                        )}
                        <p><strong>Coach:</strong> {coachName}</p>
                    </div>

                    {canManageAwards && (
                        <div className="mb-6 rounded-md border border-border p-4">
                            <TeamEditSection
                                team={{
                                    id: team.id!,
                                    name: team.name!,
                                    city: team.city ?? undefined,
                                    educationalCenter: team.educationalCenter ?? undefined,
                                    category: team.category ?? undefined,
                                    foundationYear: team.foundationYear ?? undefined,
                                    inscriptionDate: team.inscriptionDate ?? undefined,
                                }}
                            />
                        </div>
                    )}

                    <h2 className="mt-8 mb-4 text-xl font-semibold">
                        Team Members
                    </h2>

                    {!membersError && (
                        <TeamMembersManager
                            key={`${id}-${membersKey}`}
                            teamId={id}
                            initialMembers={initialMembers}
                            isCoach={isCoach}
                            isAdmin={canManageAwards}
                        />
                    )}

                    {membersError && (
                        <ErrorAlert message={membersError} />
                    )}

                    <section aria-labelledby="team-awards-heading">
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 id="team-awards-heading" className="text-xl font-semibold text-foreground">
                                    Awards
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Awards assigned to this team in its edition.
                                </p>
                            </div>

                            {canManageAwards && teamEditionUri && editions.length > 0 && (
                                <div className="sm:max-w-md">
                                    <AddAwardForm
                                        teamId={id}
                                        teamEditionUri={teamEditionUri}
                                        editions={editions}
                                    />
                                </div>
                            )}
                        </div>

                        {canManageAwards && editionsError && (
                            <div className="mt-4">
                                <ErrorAlert message={`Could not load editions. ${editionsError}`} />
                            </div>
                        )}

                        {awardsError && (
                            <div className="mt-4">
                                <ErrorAlert message={`Could not load awards. ${awardsError}`} />
                            </div>
                        )}

                        {!awardsError && teamAwards.length === 0 && (
                            <div className="mt-4">
                                <EmptyState
                                    title="No awards yet"
                                    description="This team has not been assigned any awards in its edition."
                                />
                            </div>
                        )}

                        {!awardsError && teamAwards.length > 0 && (
                            <ul className="mt-4 space-y-3">
                                {teamAwards.map((award, index) => (
                                    <li
                                        key={award.uri ?? award.link("self")?.href ?? `${id}-${index}`}
                                        className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-medium text-amber-950">
                                                {getAwardLabel(award, index)}
                                            </span>
                                            {award.title && (
                                                <span className={awardBadgeClassName}>
                                                    Title: {award.title}
                                                </span>
                                            )}
                                            {award.category && (
                                                <span className={awardBadgeClassName}>
                                                    Category: {award.category}
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section aria-labelledby="team-projects-heading">
                        <h2 id="team-projects-heading" className="mt-8 mb-4 text-xl font-semibold">
                            Scientific Projects
                        </h2>

                        {scientificProjectsError && (
                            <ErrorAlert message={`Could not load scientific projects. ${scientificProjectsError}`} />
                        )}

                        {!scientificProjectsError && scientificProjects.length === 0 && (
                            <EmptyState
                                title="No scientific projects yet"
                                description="This team has not submitted any scientific projects."
                                className="py-8"
                            />
                        )}

                        {!scientificProjectsError && scientificProjects.length > 0 && (
                            <ul className="space-y-3">
                                {scientificProjects.map((project, index) => (
                                    <li key={project.uri ?? project.link("self")?.href ?? index}>
                                        <ScientificProjectCardLink
                                            project={project}
                                            index={index}
                                            variant="stacked"
                                        />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                </div>
            </div>
        </div>
    );
}
