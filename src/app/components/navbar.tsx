"use client";

import { useAuth } from "@/app/components/authentication";
import Loginbar from "@/app/components/loginbar";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const pathname = usePathname();
    const { user } = useAuth();

    const navLinks = [
        { href: "/", label: "Home" },
        { href: "/users", label: "Users", roles: ["ROLE_USER"] },
        { href: "/teams", label: "Teams" },
        { href: "/editions", label: "Editions" },
        { href: "/scientific-projects", label: "Scientific Projects" }
    ];

    return (
        <nav className="border-b bg-white shadow-sm dark:bg-black">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
                <div className="flex gap-2 font-bold w-auto">
                    <Image
                        className="dark:invert"
                        src="/next.svg"
                        alt="Next.js logo"
                        width={80}
                        height={16}
                        priority
                    /> Template
                </div>

                <div className="flex flex-1 flex-wrap items-center gap-2">
                    {navLinks
                        .filter(({ roles }) =>
                            !roles || user?.authorities?.some(
                                userAuth => roles.includes(userAuth.authority)))
                        .map(({ href, label }) => {
                            const active = href === "/"
                                ? pathname === "/"
                                : pathname === href || pathname.startsWith(`${href}/`);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={
                                        active
                                            ? "rounded-md border border-blue-600 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition dark:bg-blue-950 dark:text-blue-300"
                                            : "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                                    }
                                >
                                    {label}
                                </Link>
                            );
                        })}
                </div>

                <div className="ml-auto">
                    <Loginbar />
                </div>

            </div>
        </nav>
    );
}
