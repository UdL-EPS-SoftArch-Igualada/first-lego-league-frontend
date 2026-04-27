import { Team } from "@/types/team";

export function getTeamDisplayName(team: Team | undefined): string {
    return team?.name ?? team?.id ?? "Unnamed team";
}
