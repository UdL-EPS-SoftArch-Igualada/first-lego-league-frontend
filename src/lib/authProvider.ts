
export const AUTH_COOKIE_NAME = "APP_AUTH"

export type AuthProvider = {
    getAuth(): Promise<string | null>;
};

export const serverAuthProvider: AuthProvider = {
    async getAuth() {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
    },
};

export function clientAuthProvider(): AuthProvider {
    return {
        async getAuth() {
            const cookie = new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`).exec(document.cookie)?.[1];
            if (cookie) return decodeURIComponent(cookie);

            return localStorage.getItem(AUTH_COOKIE_NAME) ?? null;
        },
    };
}
