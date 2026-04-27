import { MatchesService } from "@/api/matchesApi";
import { TeamsService } from "@/api/teamApi";
import { UsersService } from "@/api/userApi";
import ErrorAlert from "@/app/components/error-alert";
import PageShell from "@/app/components/page-shell";
import { serverAuthProvider } from "@/lib/authProvider";
import { isAdmin } from "@/lib/authz";
import { getTeamDisplayName } from "@/lib/teamUtils";
import { CompetitionTable } from "@/types/competitionTable";
import { AuthenticationError, parseErrorMessage } from "@/types/errors";
import { Referee } from "@/types/referee";
import { Round } from "@/types/round";
import { Team } from "@/types/team";
import { User } from "@/types/user";
import { redirect } from "next/navigation";
import NewMatchForm from "./form";

type Option = {
    label: string;
    value: string;
};

export const dynamic = "force-dynamic";

function getUriLabel(resourceUri?: string, fallbackPrefix: string = "Item") {
    const uri = resourceUri ?? "";
    let decodedId = uri.split("/").findLast(Boolean) ?? "";

    try {
        decodedId = decodeURIComponent(decodedId);
    } catch {
    }

    return decodedId ? `${fallbackPrefix} ${decodedId}` : fallbackPrefix;
}

function getRoundOption(round: Round): Option | null {
    const resourceUri = round.link("self")?.href ?? round.uri;
    if (!resourceUri) {
        return null;
    }

    const label =
        round.number === undefined ? getUriLabel(resourceUri, "Round") : `Round ${round.number}`;
    return { label, value: resourceUri };
}

function getCompetitionTableOption(table: CompetitionTable): Option | null {
    const resourceUri = table.link("self")?.href ?? table.uri;
    if (!resourceUri) {
        return null;
    }

    return {
        label: getUriLabel(resourceUri, "Table"),
        value: resourceUri,
    };
}

function getRefereeOption(referee: Referee): Option | null {
    const resourceUri = referee.link("self")?.href ?? referee.uri;
    if (!resourceUri) {
        return null;
    }

    return {
        label: referee.name ?? referee.emailAddress ?? getUriLabel(resourceUri, "Referee"),
        value: resourceUri,
    };
}

function getTeamOption(team: Team): Option | null {
    const resourceUri = team.link("self")?.href ?? team.uri;
    if (!resourceUri) {
        return null;
    }

    return {
        label: getTeamDisplayName(team),
        value: resourceUri,
    };
}

function compactOptions(options: Array<Option | null>) {
    return options.filter((option): option is Option => option !== null);
}

function sortOptions(options: Option[]) {
    return options.toSorted((left, right) => left.label.localeCompare(right.label));
}

export default async function NewMatchPage() {
    const auth = await serverAuthProvider.getAuth();
    if (!auth) redirect("/login");

    let currentUser: User | null = null;
    let error: string | null = null;
    let roundOptions: Option[] = [];
    let competitionTableOptions: Option[] = [];
    let refereeOptions: Option[] = [];
    let teamOptions: Option[] = [];

    try {
        currentUser = await new UsersService(serverAuthProvider).getCurrentUser();
    } catch (e) {
        if (e instanceof AuthenticationError) {
            redirect("/login");
        }

        error = parseErrorMessage(e);
    }

    if (!error && !currentUser) {
        redirect("/login");
    }

    if (!error && !isAdmin(currentUser)) {
        redirect("/");
    }

    if (!error) {
        try {
            const matchesService = new MatchesService(serverAuthProvider);
            const teamsService = new TeamsService(serverAuthProvider);

            const [rounds, competitionTables, referees, teams] = await Promise.all([
                matchesService.getRounds(),
                matchesService.getCompetitionTables(),
                matchesService.getReferees(),
                teamsService.getTeams(),
            ]);

            roundOptions = sortOptions(compactOptions(rounds.map(getRoundOption)));
            competitionTableOptions = sortOptions(
                compactOptions(competitionTables.map(getCompetitionTableOption))
            );
            refereeOptions = sortOptions(compactOptions(referees.map(getRefereeOption)));
            teamOptions = sortOptions(compactOptions(teams.map(getTeamOption)));
        } catch (e) {
            error = parseErrorMessage(e);
        }
    }

    return (
        <PageShell
            eyebrow="Competition schedule"
            title="New Match"
            description="Create a scheduled match by assigning timing, round, table, teams, and referee."
        >
            {error ? (
                <ErrorAlert message={error} />
            ) : (
                <NewMatchForm
                    roundOptions={roundOptions}
                    competitionTableOptions={competitionTableOptions}
                    refereeOptions={refereeOptions}
                    teamOptions={teamOptions}
                />
            )}
        </PageShell>
    );
}
