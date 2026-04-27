import { EditionsService } from "@/api/editionApi";
import { API_BASE_URL } from "@/api/halClient";
import { MatchesService } from "@/api/matchesApi";
import { TeamsService } from "@/api/teamApi";
import { UsersService } from "@/api/userApi";
import ErrorAlert from "@/app/components/error-alert";
import PageShell from "@/app/components/page-shell";
import { serverAuthProvider } from "@/lib/authProvider";
import { isAdmin, isReferee } from "@/lib/authz";
import { getTeamDisplayName } from "@/lib/teamUtils";
import { getEncodedResourceId } from "@/lib/halRoute";
import { formatMatchTime } from "@/lib/matchUtils";
import { Edition } from "@/types/edition";
import { NotFoundError, parseErrorMessage } from "@/types/errors";
import { Match } from "@/types/match";
import { MatchResult } from "@/types/matchResult";
import { Round } from "@/types/round";
import { Team } from "@/types/team";
import { User } from "@/types/user";
import Link from "next/link";
import MatchDeleteSection from "./match-delete-section";
import RecordResultForm from "./record-result-form";

export const dynamic = "force-dynamic";

interface MatchDetailPageProps {
    readonly params: Promise<{ id: string }>;
    readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getMatchTitle(match: Match | null, id: string) {
    if (!match) {
        let decodedId = id;
        try {
            decodedId = decodeURIComponent(id);
        } catch {
            // use raw id if decodeURIComponent fails
        }
        return `Match ${decodedId}`;
    }

    const parts: string[] = [];
    if (match.round) parts.push(`Round ${match.round}`);
    if (match.competitionTable) parts.push(`Table ${match.competitionTable}`);
    return parts.length > 0 ? parts.join(" | ") : `Match ${match.id}`;
}

function getUriLabel(resourceUri?: string, fallbackPrefix: string = "Item") {
    const uri = resourceUri ?? "";
    let decodedId = uri.split("/").findLast(Boolean) ?? "";

    try {
        decodedId = decodeURIComponent(decodedId);
    } catch {
        // Keep the raw value when it cannot be decoded.
    }

    return decodedId ? `${fallbackPrefix} ${decodedId}` : fallbackPrefix;
}

function getEditionLabel(edition: Edition | null) {
    if (!edition) {
        return "Edition unavailable";
    }

    if (edition.year && edition.venueName) {
        return `${edition.year} - ${edition.venueName}`;
    }

    if (edition.year) {
        return String(edition.year);
    }

    if (edition.venueName) {
        return edition.venueName;
    }

    return getUriLabel(edition.link("self")?.href ?? edition.uri, "Edition");
}

function getRoundLabel(round: Round | null, fallbackRound?: string) {
    if (round?.number !== undefined) {
        return `Round ${round.number}`;
    }

    if (fallbackRound) {
        return /^round\s+/i.test(fallbackRound) ? fallbackRound : getUriLabel(fallbackRound, "Round");
    }

    return "Round unavailable";
}

function InfoRow({ label, value }: Readonly<{ label: string; value: string }>) {
    return (
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
            <span className="min-w-36 text-sm font-medium text-foreground">{label}</span>
            <span className="text-sm text-muted-foreground">{value}</span>
        </div>
    );
}

function TeamCard({ team, label, yearQuery }: Readonly<{ team: Team; label: string; yearQuery: string }>) {
    const teamId = getEncodedResourceId(team.uri ?? team.link("self")?.href);

    const cardContent = (
        <div
            className={`module-card flex flex-col gap-2 rounded-lg border border-border bg-card p-5 transition-colors${teamId ? " hover:bg-secondary/30" : ""}`}
        >
            <div className="page-eyebrow">{label}</div>
            <p className="list-title">{getTeamDisplayName(team)}</p>
            <div className="space-y-1">
                {team.city && <p className="list-support">{team.city}</p>}
                {team.category && (
                    <span className="status-badge inline-block">{team.category}</span>
                )}
            </div>
            {teamId && (
                <p className="mt-1 text-xs font-medium text-accent-foreground underline-offset-2 hover:underline">
                    {"View team details ->"}
                </p>
            )}
        </div>
    );

    if (teamId) {
        return <Link href={`/teams/${teamId}${yearQuery}`}>{cardContent}</Link>;
    }

    return cardContent;
}

function UnknownTeamCard({ label, name }: Readonly<{ label: string; name?: string }>) {
    return (
        <div className="module-card flex flex-col gap-2 rounded-lg border border-border bg-card p-5">
            <div className="page-eyebrow">{label}</div>
            <p className="list-title">{name ?? "Unknown team"}</p>
        </div>
    );
}

export default async function MatchDetailPage(props: Readonly<MatchDetailPageProps>) {
    const { id } = await props.params;
    const searchParams = await props.searchParams;
    const yearParam = searchParams.year;
    const year = Array.isArray(yearParam) ? yearParam[0] : yearParam;
    const yearQuery = year ? `?year=${year}` : "";

    const service = new MatchesService(serverAuthProvider);

    let match: Match | null = null;
    let teams: Team[] = [];
    let currentUser: User | null = null;
    let matchError: string | null = null;
    let teamsError: string | null = null;
    let isAuthorized = false;
    let formTeamA: Team | null = null;
    let formTeamB: Team | null = null;
    let round: Round | null = null;
    let edition: Edition | null = null;
    let matchResults: MatchResult[] = [];
    let teamAId = "";
    let teamBId = "";
    let teamADisplayName = "Team A";
    let teamBDisplayName = "Team B";

    try {
        currentUser = await new UsersService(serverAuthProvider).getCurrentUser();
        isAuthorized = isAdmin(currentUser) || isReferee(currentUser);
    } catch (e) {
        console.error("[MatchDetail] getCurrentUser failed:", e);
    }

    try {
        match = await service.getMatchById(id);
    } catch (e) {
        console.error("Failed to fetch match:", e);
        matchError =
            e instanceof NotFoundError
                ? "This match does not exist."
                : `Could not load match details. ${parseErrorMessage(e)}`;
    }

    if (match && !matchError) {
        const matchUri = `${API_BASE_URL}/matches/${decodeURIComponent(id)}`;

        const teamsService = new TeamsService(serverAuthProvider);
        const editionsService = new EditionsService(serverAuthProvider);
        const roundDetailsPromise = service.getMatchRound(id).then((resolvedRound) => {
            const editionUri =
                resolvedRound.link("edition")?.href ??
                (resolvedRound.uri ? `${resolvedRound.uri}/edition` : null);

            if (!editionUri) {
                return { round: resolvedRound, edition: null as Edition | null };
            }

            return editionsService.getEditionByUri(editionUri).then((resolvedEdition) => ({
                round: resolvedRound,
                edition: resolvedEdition,
            })).catch((e) => {
                console.error("Failed to fetch match edition:", e);
                return { round: resolvedRound, edition: null as Edition | null };
            });
        }).catch((e) => {
            console.error("Failed to fetch match round:", e);
            return { round: null as Round | null, edition: null as Edition | null };
        });

        const [, roundDetails] = await Promise.all([
            teamsService.getTeams().then((t) => {
                teams = t;
            }).catch((e) => {
                console.error("Failed to fetch match teams:", e);
                teamsError = `Could not load team information. ${parseErrorMessage(e)}`;
            }),
            roundDetailsPromise,
            service.getMatchTeamA(id).then((t) => {
                formTeamA = t;
                const raw = t as unknown as { name?: string; id?: string; uri?: string };
                teamADisplayName = raw.name ?? raw.id ?? "Team A";
                const href = t.link("self")?.href ?? raw.uri ?? "";
                teamAId = decodeURIComponent(href.split("/").pop() ?? "");
            }).catch(() => null),
            service.getMatchTeamB(id).then((t) => {
                formTeamB = t;
                const raw = t as unknown as { name?: string; id?: string; uri?: string };
                teamBDisplayName = raw.name ?? raw.id ?? "Team B";
                const href = t.link("self")?.href ?? raw.uri ?? "";
                teamBId = decodeURIComponent(href.split("/").pop() ?? "");
            }).catch(() => null),
            service.getMatchResults(matchUri).then((r) => {
                matchResults = r;
            }).catch(() => null),
        ]);

        round = roundDetails.round;
        edition = roundDetails.edition;
    }

    const resolveTeam = (rel: "teamA" | "teamB", fallbackName: string | undefined) => {
        if (!match) return null;

        const halLink = match.link(rel)?.href;
        const targetId = getEncodedResourceId(halLink);
        
        if (targetId) {
            const linkedTeam = teams.find((t) => getEncodedResourceId(t.link("self")?.href ?? t.uri) === targetId);
            if (linkedTeam) return linkedTeam;
        }

        if (halLink) {
            console.warn(`HAL link for ${rel} present (${halLink}) but team not found in collection. Falling back to name comparison for "${fallbackName}".`);
        } else {
            console.warn(`HAL link for ${rel} absent. Falling back to name comparison for "${fallbackName}".`);
        }
        
        return teams.find((t) => t.name === fallbackName) ?? null;
    };

    const teamA = resolveTeam("teamA", match?.teamA);
    const teamB = resolveTeam("teamB", match?.teamB);
    const roundFallback = (match as (Match & { round?: string }) | null)?.round;
    const numericMatchId = Number.parseInt(decodeURIComponent(id), 10) || null;
    const displayTeamA = teamA ?? formTeamA;
    const displayTeamB = teamB ?? formTeamB;
    const displayEdition = getEditionLabel(edition);
    const displayRound = getRoundLabel(round, roundFallback);
    const displayState = matchResults.length > 0 ? "COMPLETED" : match?.state;

    return (
        <PageShell
            eyebrow="Match details"
            title={getMatchTitle(match, id)}
            description={displayState ? `Status: ${displayState}` : undefined}
        >
            {matchError && <ErrorAlert message={matchError} />}

            {!matchError && match && isAdmin(currentUser) && (
                <div className="flex justify-end">
                    <MatchDeleteSection matchId={id} />
                </div>
            )}

            {!matchError && match && (
                <div className="space-y-8">
                    {/* Match info */}
                    <section aria-labelledby="match-info-heading">
                        <div className="mb-4 space-y-1">
                            <div className="page-eyebrow">Schedule</div>
                            <h2 id="match-info-heading" className="section-title">
                                Match information
                            </h2>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-5">
                            <div className="space-y-3">
                                <InfoRow label="Start time" value={formatMatchTime(match.startTime)} />
                                <InfoRow label="End time" value={formatMatchTime(match.endTime)} />
                                <InfoRow label="Edition" value={displayEdition} />
                                <InfoRow label="Round" value={displayRound} />
                                {match.competitionTable && (
                                    <InfoRow label="Competition table" value={match.competitionTable} />
                                )}
                                {displayState && <InfoRow label="State" value={displayState} />}
                                {match.referee && <InfoRow label="Referee" value={match.referee} />}
                            </div>
                        </div>
                    </section>

                    {/* Teams */}
                    <section aria-labelledby="teams-heading">
                        <div className="mb-4 space-y-1">
                            <div className="page-eyebrow">Participating teams</div>
                            <h2 id="teams-heading" className="section-title">
                                Teams
                            </h2>
                        </div>
                        
                        {teamsError && <ErrorAlert message={teamsError} />}

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {displayTeamA ? (
                                <TeamCard team={displayTeamA} label="Team A" yearQuery={yearQuery} />
                            ) : (
                                <UnknownTeamCard label="Team A" name={match.teamA} />
                            )}
                            {displayTeamB ? (
                                <TeamCard team={displayTeamB} label="Team B" yearQuery={yearQuery} />
                            ) : (
                                <UnknownTeamCard label="Team B" name={match.teamB} />
                            )}
                        </div>
                    </section>

                    {/* Match Results */}
                    {matchResults.length > 0 && formTeamA && formTeamB && (
                        <section aria-labelledby="results-heading">
                            <div className="mb-4 space-y-1">
                                <div className="page-eyebrow">Scores</div>
                                <h2 id="results-heading" className="section-title">
                                    Match Results
                                </h2>
                            </div>
                            <div className="rounded-lg border border-border bg-card p-5">
                                <div className="space-y-3">
                                    {matchResults.map((result, i) => {
                                        const team = i === 0 ? formTeamA : formTeamB;
                                        const teamName = team?.name ?? team?.id ?? (i === 0 ? "Team A" : "Team B");
                                        return (
                                            <div
                                                key={result.link("self")?.href ?? i}
                                                className="flex flex-col gap-0.5 sm:flex-row sm:gap-2"
                                            >
                                                <span className="min-w-36 text-sm font-medium text-foreground">{teamName}</span>
                                                <span className="text-sm text-muted-foreground">{result.score} pts</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Referee actions */}
                    {isAuthorized && formTeamA && formTeamB && numericMatchId && (
                        <section aria-labelledby="record-result-heading">
                            <div className="mb-4 space-y-1">
                                <div className="page-eyebrow">Referee actions</div>
                                <h2 id="record-result-heading" className="section-title">
                                    {matchResults.length > 0 ? "Edit Result" : "Record Result"}
                                </h2>
                            </div>
                            {matchResults.length > 0 ? (
                                // TODO: implement edit result form (new issue)
                                <button
                                    disabled
                                    className="rounded border border-border bg-card px-4 py-2 text-sm text-muted-foreground opacity-50 cursor-not-allowed"
                                >
                                    Edit Result (coming soon)
                                </button>
                            ) : (
                                <RecordResultForm
                                    matchId={numericMatchId}
                                    teamAId={teamAId}
                                    teamBId={teamBId}
                                    teamAName={teamADisplayName}
                                    teamBName={teamBDisplayName}
                                />
                            )}
                        </section>
                    )}
                </div>
            )}
        </PageShell>
    );
}
