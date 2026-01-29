import { Resource } from "halfred";

export interface RecordEntity {
    uri: string;
    name: string;
    description?: string;
    created?: Date;
    modified?: Date;
}

export type Record = RecordEntity & Resource;
