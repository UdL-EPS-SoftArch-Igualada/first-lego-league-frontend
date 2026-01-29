"use client";

import { UsersService } from "@/api/userApi";
import { useAuth } from "@/app/components/authentication";
import { Avatar } from "@/components/ui/avatar";
import { AUTH_COOKIE_NAME, clientAuthProvider } from "@/lib/authProvider";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { deleteCookie } from "cookies-next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Loginbar() {
    const router = useRouter();

    function logout() {
        deleteCookie(AUTH_COOKIE_NAME);
        setUser(null);
        router.push("/");
    }

    const { user, setUser } = useAuth();

    useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                const service = new UsersService(clientAuthProvider());
                const user = await service.getCurrentUser();
                setUser(user ?? null);
            } catch {
                if (mounted) setUser(null);
            }
        }

        load();
        return () => {
            mounted = false;
        };
    }, []);

    if (user) {
        return (
            <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                    <Avatar className="rounded-lg flex items-center justify-center bg-gray-200">
                        <FontAwesomeIcon icon={faUser} className="h-4 w-4" />
                    </Avatar>
                    <Link href={`/users/${user.username}`}
                        className="text-blue-600 text-md font-medium"> {user.username ?? "User"} </Link>
                </div>
                <button
                    onClick={logout}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                    Logout
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <Link href="/login"
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"> Login </Link>
            <Link href="/users/register"
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"> Register </Link>
        </div>
    )

}
