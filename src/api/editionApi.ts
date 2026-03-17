import type { AuthStrategy } from "@/lib/authProvider";
import { Edition } from "@/types/edition";
import { getHal, mergeHalArray } from "./halClient";

export class EditionsService {
    constructor(private readonly authStrategy: AuthStrategy) {}

    async getEditions(): Promise<Edition[]> {
        const resource = await getHal('/editions', this.authStrategy);
        const embedded = resource.embeddedArray('editions') || [];
        return mergeHalArray<Edition>(embedded);
    }
}
