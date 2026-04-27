import { EditionsService } from "@/api/editionApi";
import { TeamsService } from "@/api/teamApi";
import { UsersService } from "@/api/userApi";
import { buttonVariants } from "@/app/components/button";
import EmptyState from "@/app/components/empty-state";
import ErrorAlert from "@/app/components/error-alert";
import PageShell from "@/app/components/page-shell";
import PaginationControls from "@/app/components/pagination-controls";
import TeamDeleteSection from "./[id]/team-delete-section";
import { serverAuthProvider } from "@/lib/authProvider";
import { isAdmin } from "@/lib/authz";
import { getTeamDisplayName } from "@/lib/teamUtils";
import { getEncodedResourceId } from "@/lib/halRoute";
import { ApiError, parseErrorMessage } from "@/types/errors";
import type { HalPage } from "@/types/pagination";
import { Team } from "@/types/team";
import { User } from "@/types/user";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 5;

function getTeamKey(team: Team, index: number) {
    return team.uri ?? team.id ?? `team-${index}`;
}

function getTeamErrorMessage(error: unknown) {
    if (error instanceof ApiError) return parseErrorMessage(error);
    if (error instanceof Error) return error.message;
    return parseErrorMessage(error);
}

function TeamCard({ team }: Readonly<{ team: Team }>) {
    const hasMetadata = team.category || team.foundationYear !== undefined;

    return (
        <div className="list-card block h-full pl-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                    <div className="list-kicker">Team</div>
                    <div className="list-title">{getTeamDisplayName(team)}</div>

                    {team.city && <div className="list-support">{team.city}</div>}

                    {hasMetadata && (
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                            {team.category && <span>Category: {team.category}</span>}
                            {team.foundationYear !== undefined && (
                                <span>Founded: {team.foundationYear}</span>
                            )}
                        </div>
                    )}

                    {team.educationalCenter && (
                        <div className="list-support">{team.educationalCenter}</div>
                    )}
                </div>

                {team.inscriptionDate && (
                    <div className="status-badge">{team.inscriptionDate}</div>
                )}
            </div>
        </div>
    );
}

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TeamsPage({
    searchParams,
}: Readonly<{ searchParams: PageSearchParams }>) {
    const params = await searchParams;

    const yearParam = params.year;
    const year = Array.isArray(yearParam) ? yearParam[0] : yearParam;
    const yearQuery = year ? `?year=${year}` : "";
    const urlPage = Math.max(1, Number(params.page ?? "1") || 1);

    let teams: Team[] = [];
    let result: HalPage<Team> = {
        items: [],
        hasNext: false,
        hasPrev: false,
        currentPage: 0,
    };

    let error: string | null = null;
    let currentUser: User | null = null;

    try {
        currentUser = await new UsersService(serverAuthProvider).getCurrentUser();
    } catch {
        currentUser = null;
    }

    try {
        const service = new TeamsService(serverAuthProvider);

        if (year) {
            const editionsService = new EditionsService(serverAuthProvider);
            const edition = await editionsService.getEditionByYear(year);

            if (edition?.uri) {
                teams = await service.getTeamsByEdition(edition.uri + "/teams");
            }
        } else {
            result = await service.getTeamsPaged(urlPage - 1, PAGE_SIZE);
            teams = result.items;
        }
    } catch (e) {
        error = getTeamErrorMessage(e);
    }

    return (
        <PageShell
            eyebrow="Team management"
            title="Teams"
            description="Browse teams."
            heroAside={
                isAdmin(currentUser) ? (
                    <Link
                        href="/teams/new"
                        className={buttonVariants({ variant: "default", size: "sm" })}
                    >
                        New Team
                    </Link>
                ) : undefined
            }
        >
            <div className="space-y-6">

                {/* ✅ ESTO ES LO QUE EL TEST NECESITA */}
                <div className="space-y-3">
                    <div className="page-eyebrow">Registered teams</div>
                    <h2 className="section-title">Competition roster</h2>
                    <p className="section-copy max-w-3xl">
                        Explore the teams in the system, including their city, category and registration metadata.
                    </p>
                </div>

                {error && <ErrorAlert message={error} />}

                {!error && teams.length === 0 && (
                    <EmptyState
                        title="No teams found"
                        description="No teams."
                    />
                )}

                {!error && teams.length > 0 && (
                    <>
                        <ul className="list-grid">
                            {teams.map((team, index) => {
                                const teamId = team.uri
                                    ? getEncodedResourceId(team.uri)
                                    : team.id ?? null;

                                const href = teamId ? `/teams/${teamId}${yearQuery}` : null;

                                return (
                                    <li key={getTeamKey(team, index)}>
                                        {href ? (
                                            <Link href={href} className="block hover:bg-zinc-50">
                                                <TeamCard team={team} />
                                            </Link>
                                        ) : (
                                            <TeamCard team={team} />
                                        )}

                                        {isAdmin(currentUser) && teamId && (
                                            <div className="mt-2">
                                                <TeamDeleteSection
                                                    teamId={teamId}
                                                    teamName={getTeamDisplayName(team)}
                                                />
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>

                        {!year && (
                            <PaginationControls
                                currentPage={urlPage}
                                hasNext={result.hasNext}
                                hasPrev={result.hasPrev}
                                basePath="/teams"
                            />
                        )}
                    </>
                )}
            </div>
        </PageShell>
    );
}