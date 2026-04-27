import type { AuthStrategy } from "@/lib/authProvider";
import { Award } from "@/types/award";
import { Team } from "@/types/team";
import { createHalResource, fetchHalCollection, fetchHalResource } from "./halClient";

export interface CreateAwardPayload {
    name: string;
    title?: string;
    category?: string;
    edition: string;
    winner: string;
}

function getResourceUri(resource: Team & { link: (relation: string) => { href?: string } | undefined }): string | null {
    return resource.uri ?? resource.link("self")?.href ?? null;
}

export class AwardsService {
    constructor(private readonly authStrategy: AuthStrategy) {}

    async getAwardsOfEdition(editionUri: string): Promise<Award[]> {
        const encodedEditionUri = encodeURIComponent(editionUri);
        const awards = await fetchHalCollection<Award>(
            `/awards/search/findByEdition?edition=${encodedEditionUri}`,
            this.authStrategy,
            "awards"
        );

        return Promise.all(awards.map(async (award) => {
            const winnerHref = award.link("winner")?.href;
            if (!winnerHref) {
                return award;
            }

            const winner = await fetchHalResource<Team>(winnerHref, this.authStrategy);
            const winnerTeamUri = getResourceUri(winner);

            if (!winnerTeamUri) {
                return award;
            }

            return Object.assign(award, {
                winnerTeam: winnerTeamUri,
            });
        }));
    }

    async createAward(payload: CreateAwardPayload): Promise<Award> {
        return createHalResource<Award>(
            "/awards",
            {
                name: payload.name.trim(),
                title: payload.title?.trim() || undefined,
                category: payload.category?.trim() || undefined,
                edition: payload.edition,
                winner: payload.winner,
            },
            this.authStrategy,
            "award"
        );
    }
}
