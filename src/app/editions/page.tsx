import { EditionsService } from "@/api/editionApi";
import { serverAuthProvider } from "@/lib/authProvider";
import { Edition } from "@/types/edition";

export default async function EditionsPage() {
    let editions: Edition[] = [];
    let error: string | null = null;

    try {
        const service = new EditionsService(serverAuthProvider);
        editions = await service.getEditions();
    } catch (e) {
        console.error("Failed to fetch editions:", e);
        error = "Failed to load editions.";
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
                <div className="flex flex-col items-center w-full gap-6 text-center sm:items-start sm:text-left">
                    <h1 className="text-2xl font-semibold mb-6">Editions</h1>

                    {error && (
                        <p className="text-red-600">{error}</p>
                    )}

                    {!error && editions.length === 0 && (
                        <p className="text-zinc-500">No editions found.</p>
                    )}

                    <ul className="space-y-3 w-full">
                        {editions.map((edition, index) => (
                            <li
                                key={edition.uri ?? index}
                                className="p-4 w-full border rounded-lg bg-white shadow-sm hover:shadow transition dark:bg-black"
                            >
                                <span className="font-medium">{edition.year}</span>
                                {edition.venueName && (
                                    <div className="text-gray-600 text-sm">{edition.venueName}</div>
                                )}
                                {edition.description && (
                                    <div className="text-gray-500 text-sm mt-1">{edition.description}</div>
                                )}
                                {edition.state && (
                                    <div className="text-xs mt-2 inline-block rounded px-2 py-0.5 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                        {edition.state}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </main>
        </div>
    );
}
