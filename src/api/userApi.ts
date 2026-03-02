import type { AuthStrategy } from "@/lib/authProvider";
import { User } from "@/types/user";
import { getHal, mergeHal, mergeHalArray, postHal } from "./halClient";

export class UsersService {
    constructor(private readonly authStrategy: AuthStrategy) {
    }

    async getUsers(): Promise<User[]> {
        const resource = await getHal('/users', this.authStrategy);
        const embedded = resource.embeddedArray('users') || [];
        return mergeHalArray<User>(embedded);
    }

    async getUserById(id: string): Promise<User> {
        const resource = await getHal(`/users/${id}`, this.authStrategy);
        return mergeHal<User>(resource);
    }

    async getCurrentUser(): Promise<User | null> {
        if (!await this.authStrategy.getAuth()) {
            return null;
        }
        const resource = await getHal('/identity', this.authStrategy);
        return mergeHal<User>(resource);
    }

    async createUser(user: User): Promise<User> {
        const resource = await postHal('/users', user, this.authStrategy);
        return mergeHal<User>(resource);
    }
}
