import type { AuthStrategy } from "@/lib/authProvider";
import { Record } from "@/types/record";
import { User } from "@/types/user";
import { getHal, mergeHal, mergeHalArray, postHal } from "./halClient";

export class RecordService {
    constructor(private readonly authStrategy: AuthStrategy) {
    }

    async getRecords(): Promise<Record[]> {
        const resource = await getHal('/records', this.authStrategy);
        const embedded = resource.embeddedArray('records') || [];
        return mergeHalArray<Record>(embedded);
    }

    async getRecordById(id: string): Promise<Record> {
        const resource = await getHal(`/records/${id}`, this.authStrategy);
        return mergeHal<Record>(resource);
    }

    async getRecordsByOwnedBy(owner: User): Promise<Record[]> {
        const resource = await getHal(
            `/records/search/findByOwnedBy?user=${owner.uri}`, this.authStrategy);
        const embedded = resource.embeddedArray('records') || [];
        return mergeHalArray<Record>(embedded);
    }

    async createRecord(record: Record): Promise<Record> {
        const resource = await postHal('/records', record, this.authStrategy);
        return mergeHal<Record>(resource);
    }

    async getRecordRelation<T>(record: Record, relation: string): Promise<T> {
        const resource = await getHal(record.link(relation).href, this.authStrategy);
        return mergeHal<T>(resource);
    }
}
