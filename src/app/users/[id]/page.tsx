import { RecordService } from "@/api/recordApi";
import { UsersService } from "@/api/userApi";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { serverAuthProvider } from "@/lib/authProvider";
import { Record } from "@/types/record";
import Link from "next/link";

interface UsersPageProps {
    params: Promise<{ id: string }>;
}

export default async function UsersPage(props: Readonly<UsersPageProps>) {
    const userService = new UsersService(serverAuthProvider)
    const recordService = new RecordService(serverAuthProvider)
    const user = await userService.getUserById((await props.params).id);
    let records: Record[] = [];
    try {
        records = await recordService.getRecordsByOwnedBy(user);
    } catch (error) {
        console.log(error);
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <main
                className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
                <div className="flex flex-col items-center w-full gap-6 text-center sm:items-start sm:text-left">
                    <div className="space-y-4 w-full">
                        <h1 className="text-2xl font-semibold">{user.username}</h1>

                        {user.email && (
                            <p className="text-gray-700">
                                <strong>Email:</strong> {user.email}
                            </p>
                        )}

                        <h2 className="text-xl font-semibold mt-8">Records</h2>

                        <div className="space-y-3 w-full">
                            {records.map((record) => (
                                <Card key={record.uri} className="w-full">
                                    <CardHeader>
                                        <CardTitle><Link href={record.uri} className="hover:underline">
                                            {record.name}
                                        </Link></CardTitle>
                                    </CardHeader>
                                </Card>
                            ))}
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
