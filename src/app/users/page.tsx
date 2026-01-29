import { UsersService } from "@/api/userApi";
import { serverAuthProvider } from "@/lib/authProvider";
import Link from "next/link";

export default async function UsersPage() {
    const service = new UsersService(serverAuthProvider)
    const users = await service.getUsers();
    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
                <div className="flex flex-col items-center w-full gap-6 text-center sm:items-start sm:text-left">
                    <h1 className="text-2xl font-semibold mb-6">Users</h1>

                    <ul className="space-y-3 w-full">
                        {users.map((user) => (
                            <li
                                key={user.username}
                                className="p-4 w-full border rounded-lg bg-white shadow-sm hover:shadow transition dark:bg-black"
                            >
                                <Link className="font-medium" href={`/users/${user.username}`}>
                                    {user.username}
                                </Link>

                                {user.email && (
                                    <div className="text-gray-600 text-sm">{user.email}</div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </main>
        </div>
    );
}
