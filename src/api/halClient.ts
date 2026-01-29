import halfred, { Resource } from "halfred";

// Env variables starting with NEXT_PUBLIC_ are available to the client.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export function mergeHal<T>(obj: Resource): (T & Resource) {
    return Object.assign(obj, halfred.parse(obj)) as T & Resource;
}

export function mergeHalArray<T>(objs: Resource[]): (T & Resource)[] {
    return objs.map(o => Object.assign(o, halfred.parse(o)) as T & Resource);
}

export async function getHal(path: string, authProvider: { getAuth: () => Promise<string | null> }) {
    const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
    const authorization = await authProvider.getAuth();
    const res = await fetch(url, {
        headers: {
            "Accept": "application/hal+json",
            ...(authorization ? { Authorization: authorization } : {}),
        },
        cache: "no-store",
    });
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching ${url}`);
    }
    return halfred.parse(await res.json());
}

export async function postHal(path: string, body: Resource, authProvider: { getAuth: () => Promise<string | null> }) {
    const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
    const authorization = await authProvider.getAuth();
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/hal+json",
            ...(authorization ? { Authorization: authorization } : {}),
        },
        body: JSON.stringify(body),
        cache: "no-store",
    });
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} posting ${JSON.stringify(body)}`)
    }
    return halfred.parse(await res.json());
}
