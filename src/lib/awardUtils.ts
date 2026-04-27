import { Award } from "@/types/award";
import { Team } from "@/types/team";

type HalResource = {
    uri?: string;
    link?: (relation: string) => { href?: string } | undefined;
};

export function getResourceUri(resource: HalResource | null | undefined): string | null {
    return resource?.uri ?? resource?.link?.("self")?.href ?? null;
}

export function normalizeUri(resourceUri: string | null | undefined): string | null {
    if (!resourceUri) {
        return null;
    }

    const sanitizedUri = resourceUri.split(/[?#]/, 1)[0] ?? null;
    if (!sanitizedUri) {
        return null;
    }

    return sanitizedUri.replace(/^https?:\/\/[^/]+/i, "");
}

export function getTeamEditionUri(team: Team): string | null {
    const editionLink = team.link("edition")?.href;
    if (editionLink) {
        return editionLink;
    }

    const edition = Reflect.get(team, "edition");
    if (typeof edition === "string" && edition.trim()) {
        return edition;
    }

    if (edition && typeof edition === "object") {
        return getResourceUri(edition as HalResource);
    }

    return null;
}

export function getAwardWinnerTeamUri(award: Award): string | null {
    const winnerTeamFromLink = award.link("winnerTeam")?.href;
    if (winnerTeamFromLink) {
        return winnerTeamFromLink;
    }

    if (typeof award.winnerTeam === "string" && award.winnerTeam.length > 0) {
        return award.winnerTeam;
    }

    const winnerFromLink = award.link("winner")?.href;
    if (winnerFromLink) {
        return winnerFromLink;
    }

    const winner = Reflect.get(award, "winner");
    if (typeof winner === "string" && winner.length > 0) {
        return winner;
    }

    return null;
}

export function getAwardLabel(award: Award, fallbackIndex: number): string {
    return award.name ?? award.title ?? award.category ?? `Award ${fallbackIndex + 1}`;
}
