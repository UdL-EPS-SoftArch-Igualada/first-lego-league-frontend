import { Team } from "@/types/team";
import Link from "next/link";
import { getTeamDisplayName } from "@/lib/teamUtils";

export function TeamCard({ team, label }: Readonly<{ team: Team; label: string }>) {
    const selfHref = team.link("self")?.href ?? team.uri;
    const teamId = selfHref?.split(/[?#]/, 1)[0]?.split("/").findLast(Boolean) ?? null;

    const cardContent = (
        <div className={`module-card flex flex-col gap-2 rounded-lg border border-border bg-card p-5 transition-colors${teamId ? " hover:bg-secondary/30" : ""}`}>
            <div className="page-eyebrow">{label}</div>
            <p className="list-title">{getTeamDisplayName(team)}</p>
            <div className="space-y-1">
                {team.city && <p className="list-support">{team.city}</p>}
                {team.category && <span className="status-badge inline-block">{team.category}</span>}
            </div>
            {teamId && (
                <p className="mt-1 text-xs font-medium text-primary underline-offset-2 hover:underline">
                    View team details →
                </p>
            )}
        </div>
    );

    if (teamId) {
        return <Link href={`/teams/${encodeURIComponent(decodeURIComponent(teamId))}`}>{cardContent}</Link>;
    }
    return cardContent;
}
