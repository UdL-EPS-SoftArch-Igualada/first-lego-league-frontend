import { expect, test } from "@playwright/test";
import { getTeamDisplayName } from "../src/lib/teamUtils";

test("getTeamDisplayName falls back consistently", () => {
    expect(getTeamDisplayName(undefined)).toBe("Unnamed team");
    expect(getTeamDisplayName({ id: "team-42" } as Parameters<typeof getTeamDisplayName>[0])).toBe("team-42");
    expect(getTeamDisplayName({ name: "Cyclones" } as Parameters<typeof getTeamDisplayName>[0])).toBe("Cyclones");
    expect(getTeamDisplayName({} as Parameters<typeof getTeamDisplayName>[0])).toBe("Unnamed team");
});
