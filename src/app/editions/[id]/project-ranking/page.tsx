import { EditionsService } from "@/api/editionApi";
import { fetchHalResource } from "@/api/halClient";
import { ScientificProjectsService } from "@/api/scientificProjectApi";
import { UsersService } from "@/api/userApi";
import EmptyState from "@/app/components/empty-state";
import ErrorAlert from "@/app/components/error-alert";
import PageShell from "@/app/components/page-shell";
import { serverAuthProvider } from "@/lib/authProvider";
import { isAdmin } from "@/lib/authz";
import { getEncodedResourceId } from "@/lib/halRoute";
import { getTeamDisplayName } from "@/lib/teamUtils";
import { Edition } from "@/types/edition";
import { NotFoundError, parseErrorMessage } from "@/types/errors";
import { ScientificProject } from "@/types/scientificProject";
import { Team } from "@/types/team";
import { User } from "@/types/user";
import type { Resource } from "halfred";
import Link from "next/link";

interface ProjectRankingPageProps {
    readonly params: Promise<{ id: string }>;
}

interface ProjectRankingRow {
    readonly project: ScientificProject;
    readonly teamName: string;
    readonly teamHref: string | null;
    readonly score: number | null;
    readonly room: string;
    readonly rank: number;
}

function isFinished(edition: Edition | null): boolean {
    return edition?.state?.toUpperCase() === "FINISHED";
}

function getEditionTitle(edition: Edition | null, id: string): string {
    if (edition?.year) {
        return `${edition.year} Project Ranking`;
    }

    return `Edition ${id} Project Ranking`;
}

function normalizeUri(resourceUri: string | null | undefined): string | null {
    if (!resourceUri) {
        return null;
    }

    const sanitizedUri = resourceUri.split(/[?#]/, 1)[0] ?? null;
    if (!sanitizedUri) {
        return null;
    }

    return sanitizedUri.replace(/^https?:\/\/[^/]+/i, "");
}

function getUriLabel(resourceUri: string | null | undefined, fallback: string): string {
    const id = getEncodedResourceId(resourceUri ?? undefined);
    if (!id) {
        return fallback;
    }

    try {
        return decodeURIComponent(id);
    } catch {
        return id;
    }
}

function getProjectTeamUri(project: ScientificProject): string | null {
    return project.link("team")?.href ?? project.team ?? null;
}

function getProjectRoomUri(project: ScientificProject): string | null {
    return project.link("projectRoom")?.href
        ?? project.link("room")?.href
        ?? project.projectRoom
        ?? project.room
        ?? null;
}

function getResourceLabel(resource: Resource | null, fallback: string): string {
    if (!resource) {
        return fallback;
    }

    const label = Reflect.get(resource, "name")
        ?? Reflect.get(resource, "title")
        ?? Reflect.get(resource, "id");

    return typeof label === "string" && label.length > 0 ? label : fallback;
}

async function getProjectRoomLabel(project: ScientificProject): Promise<string> {
    const roomUri = getProjectRoomUri(project);
    if (!roomUri) {
        return "Unassigned";
    }

    const fallback = getUriLabel(roomUri, "Assigned room");

    try {
        const room = await fetchHalResource<Resource>(roomUri, serverAuthProvider);
        return getResourceLabel(room, fallback);
    } catch (e) {
        console.error("Failed to fetch project room:", e);
        return fallback;
    }
}

function sortProjects(projects: ScientificProject[], teamsByUri: Map<string, Team>): ScientificProject[] {
    return [...projects].sort((a, b) => {
        const scoreA = a.score ?? Number.NEGATIVE_INFINITY;
        const scoreB = b.score ?? Number.NEGATIVE_INFINITY;
        if (scoreA !== scoreB) {
            return scoreB - scoreA;
        }

        const teamA = teamsByUri.get(normalizeUri(getProjectTeamUri(a)) ?? "");
        const teamB = teamsByUri.get(normalizeUri(getProjectTeamUri(b)) ?? "");
        return getTeamDisplayName(teamA).localeCompare(getTeamDisplayName(teamB));
    });
}

async function buildRows(projects: ScientificProject[], teams: Team[]): Promise<ProjectRankingRow[]> {
    const teamsByUri = new Map(
        teams
            .map((team) => [normalizeUri(team.uri ?? team.link("self")?.href), team] as const)
            .filter((entry): entry is readonly [string, Team] => !!entry[0])
    );
    const sortedProjects = sortProjects(projects, teamsByUri);
    let previousScore: number | null = null;
    let previousRank = 0;

    return Promise.all(sortedProjects.map(async (project, index) => {
        const score = project.score ?? null;
        const rank = score !== null && previousScore === score ? previousRank : index + 1;
        previousScore = score;
        previousRank = rank;

        const teamUri = normalizeUri(getProjectTeamUri(project));
        const team = teamsByUri.get(teamUri ?? "");
        const teamId = getEncodedResourceId(team?.uri ?? team?.link("self")?.href ?? teamUri ?? undefined);

        return {
            project,
            teamName: getTeamDisplayName(team),
            teamHref: teamId ? `/teams/${teamId}` : null,
            score,
            room: await getProjectRoomLabel(project),
            rank,
        };
    }));
}

function ProjectRankingTable({ rows }: Readonly<{ rows: ProjectRankingRow[] }>) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                        <th scope="col" className="pb-3 pr-4 font-medium">#</th>
                        <th scope="col" className="pb-3 pr-4 font-medium">Team</th>
                        <th scope="col" className="pb-3 pr-4 font-medium text-right">Project Score</th>
                        <th scope="col" className="pb-3 font-medium">ProjectRoom</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => {
                        const isTop3 = row.rank <= 3 && row.score !== null;
                        return (
                            <tr key={row.project.uri ?? row.project.link("self")?.href ?? index} className="border-b border-border last:border-0">
                                <td className={`py-3 pr-4 text-sm ${isTop3 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                                    {row.rank}
                                </td>
                                <td className={`py-3 pr-4 ${isTop3 ? "font-semibold text-foreground" : ""}`}>
                                    {row.teamHref ? (
                                        <Link href={row.teamHref} className="hover:underline">
                                            {row.teamName}
                                        </Link>
                                    ) : (
                                        <span>{row.teamName}</span>
                                    )}
                                </td>
                                <td className={`py-3 pr-4 text-right ${isTop3 ? "font-semibold text-foreground" : ""}`}>
                                    {row.score ?? "Not scored"}
                                </td>
                                <td className="py-3 text-muted-foreground">{row.room}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default async function ProjectRankingPage(props: Readonly<ProjectRankingPageProps>) {
    const { id } = await props.params;
    const editionsService = new EditionsService(serverAuthProvider);
    const projectsService = new ScientificProjectsService(serverAuthProvider);
    const usersService = new UsersService(serverAuthProvider);

    let currentUser: User | null = null;
    let edition: Edition | null = null;
    let rows: ProjectRankingRow[] = [];
    let error: string | null = null;
    let rankingError: string | null = null;

    try {
        edition = await editionsService.getEditionById(id);
    } catch (e) {
        console.error("Failed to fetch edition:", e);
        error = e instanceof NotFoundError
            ? "This edition does not exist."
            : parseErrorMessage(e);
    }

    try {
        currentUser = await usersService.getCurrentUser();
    } catch (e) {
        console.error("Failed to fetch current user:", e);
    }

    const canViewScores = isAdmin(currentUser) || isFinished(edition);

    if (!error && edition && canViewScores) {
        try {
            const [projects, teams] = await Promise.all([
                projectsService.getScientificProjectsByEdition(id),
                editionsService.getEditionTeams(id),
            ]);
            rows = await buildRows(projects, teams);
        } catch (e) {
            console.error("Failed to fetch project ranking:", e);
            rankingError = parseErrorMessage(e);
        }
    }

    return (
        <PageShell
            eyebrow="Innovation project"
            title={getEditionTitle(edition, id)}
            description="Scientific projects ranked by score for this edition."
        >
            <div className="space-y-6">
                {error && <ErrorAlert message={error} />}

                {!error && !canViewScores && (
                    <EmptyState
                        title="Project scores are not public yet"
                        description="Administrators can review this ranking before the edition is marked as finished."
                    />
                )}

                {!error && canViewScores && rankingError && <ErrorAlert message={rankingError} />}

                {!error && canViewScores && !rankingError && rows.length === 0 && (
                    <EmptyState
                        title="No scientific projects found"
                        description="There are no scored scientific projects for this edition yet."
                    />
                )}

                {!error && canViewScores && !rankingError && rows.length > 0 && (
                    <ProjectRankingTable rows={rows} />
                )}
            </div>
        </PageShell>
    );
}
