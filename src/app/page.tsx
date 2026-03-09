"use client";

import { useAuth } from "@/app/components/authentication";
import Link from "next/link";

export default function Home() {
  const { user } = useAuth();

  const coreModules = [
    {
      href: "/teams",
      title: "Teams",
      description: "Manage participating teams and access their details."
    },
    {
      href: "/editions",
      title: "Editions",
      description: "Explore competition editions and their related data."
    },
    {
      href: "/scientific-projects",
      title: "Scientific Projects",
      description: "Track scientific projects submitted during each edition."
    }
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-5xl p-8 sm:p-12">
        <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            First Lego League Frontend
          </h1>
          {user ? (
            <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-300">
              This is the navigation hub for the core competition entities.
              Use the modules below to start building list, detail, and create flows.
            </p>
          ) : (
            <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-300">
              Please log in to access the core modules from this landing page.
            </p>
          )}

          {user && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {coreModules.map((module) => (
                <Link
                  key={module.href}
                  href={module.href}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 transition hover:border-blue-400 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-500 dark:hover:bg-zinc-800"
                >
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {module.title}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                    {module.description}
                  </p>
                  <span className="mt-4 inline-block text-sm font-medium text-blue-600 dark:text-blue-400">
                    Open module
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
