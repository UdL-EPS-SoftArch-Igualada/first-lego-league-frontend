import { Resource } from "halfred";

export interface AuthorityEntity {
    authority: string;
}

export interface UserEntity {
    uri?: string;
    username: string;
    email?: string;
    password?: string;
    authorities?: AuthorityEntity[];
}

export type User = UserEntity & Resource;
