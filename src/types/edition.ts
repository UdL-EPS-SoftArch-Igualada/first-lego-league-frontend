import { Resource } from "halfred";

export interface EditionEntity {
    uri?: string;
    year?: number;
    venueName?: string;
    description?: string;
    state?: string;
}

export type Edition = EditionEntity & Resource;
