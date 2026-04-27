'use server';

import { AwardsService } from "@/api/awardApi";
import { EditionsService } from "@/api/editionApi";
import { TeamsService } from "@/api/teamApi";
import { UsersService } from "@/api/userApi";
import { serverAuthProvider } from "@/lib/authProvider";
import { isAdmin } from "@/lib/authz";
import { getEncodedResourceId } from "@/lib/halRoute";
import { getResourceUri, getTeamEditionUri, normalizeUri } from "@/lib/awardUtils";
import { ApiError, AuthenticationError, ValidationError } from "@/types/errors";
import type { Award } from "@/types/award";
import type { Team } from "@/types/team";

type CreateAwardInput = Readonly<{
    teamId: string;
    editionUri: string;
    name: string;
    title: string;
    category: string;
}>;

function getResourceId(resourceUri: string): string | null {
    return getEncodedResourceId(resourceUri);
}

export async function createAwardForTeam(input: CreateAwardInput): Promise<Award> {
    const auth = await serverAuthProvider.getAuth();
    if (!auth) {
        throw new AuthenticationError();
    }

    const usersService = new UsersService(serverAuthProvider);
    const currentUser = await usersService.getCurrentUser();
    if (!isAdmin(currentUser)) {
        throw new AuthenticationError("You are not allowed to create awards.", 403);
    }

    const name = input.name.trim();
    const title = input.title.trim();
    const category = input.category.trim();

    if (!name) {
        throw new ValidationError("Award name is required.");
    }

    const teamResourceId = getResourceId(input.teamId.trim());
    const editionResourceId = getResourceId(input.editionUri.trim());

    if (!teamResourceId) {
        throw new ValidationError("A valid team is required.");
    }

    if (!editionResourceId) {
        throw new ValidationError("A valid edition is required.");
    }

    const teamsService = new TeamsService(serverAuthProvider);
    const editionsService = new EditionsService(serverAuthProvider);
    const awardsService = new AwardsService(serverAuthProvider);

    const [team, edition] = await Promise.all([
        teamsService.getTeamById(teamResourceId),
        editionsService.getEditionById(editionResourceId),
    ]);

    const teamEditionUri = getTeamEditionUri(team);
    const selectedEditionUri = getResourceUri(edition);
    const teamUri = getResourceUri(team);

    if (!teamEditionUri) {
        throw new ValidationError("The selected team is not linked to an edition.");
    }

    if (!selectedEditionUri) {
        throw new ApiError("The selected edition could not be resolved.", 500, false);
    }

    if (normalizeUri(teamEditionUri) !== normalizeUri(selectedEditionUri)) {
        throw new ValidationError("The selected edition does not match the team's edition.");
    }

    if (!teamUri) {
        throw new ApiError("The selected team could not be resolved.", 500, false);
    }

    return awardsService.createAward({
        name,
        title,
        category,
        edition: selectedEditionUri,
        winner: teamUri,
    });
}
