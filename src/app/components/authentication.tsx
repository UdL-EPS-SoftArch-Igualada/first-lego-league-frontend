"use client";
import { User } from "@/types/user";
import { createContext, useContext, useState } from "react";

type AuthContextType = {
    user: User | null;
    setUser: (u: User | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, }: Readonly<{ children: React.ReactNode; }>) {
    const [user, setUser] = useState<User | null>(null);
    return (
        <AuthContext.Provider value={{ user, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be inside AuthProvider");
    return ctx;
}
