import { RecordService } from "@/api/recordApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { serverAuthProvider } from "@/lib/authProvider";
import { Record } from "@/types/record";
import { User } from "@/types/user";
import Link from "next/link";

interface RecordPageProps {
    params: Promise<{ id: string }>;
}

export default async function RecordPage(props: Readonly<RecordPageProps>) {
    const recordService = new RecordService(serverAuthProvider)
    const record: Record = await recordService.getRecordById((await props.params).id);
    const owner: User = await recordService.getRecordRelation<User>(record, "ownedBy");

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <main
                className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
                <div className="flex flex-col items-center w-full gap-6 text-center sm:items-start sm:text-left">
                    <div className="space-y-4 w-full">
                        <h1 className="text-2xl font-semibold">Record</h1>

                        <div className="space-y-3 w-full">
                            <Card className="w-full">
                                <CardHeader>
                                    <CardTitle>{record.name}</CardTitle>
                                    {record.description && (
                                        <CardDescription>{record.description}</CardDescription>
                                    )}

                                </CardHeader>
                                <CardContent>
                                    {record.created && (
                                        <p className="text-sm text-gray-500">
                                            Created: {new Date(record.created).toLocaleString()}
                                        </p>
                                    )}
                                    {record.modified && (
                                        <p className="text-sm text-gray-500">
                                            Last Modified: {new Date(record.modified).toLocaleString()}
                                        </p>
                                    )}
                                    {owner && (
                                        <>
                                            <p className="text-sm text-gray-500 mt-2">
                                                Owner: <Link href={`/users/${owner.username}`} className="text-blue-600 hover:underline">{owner.username}</Link>
                                            </p>
                                            {owner.email && (
                                                <p className="text-sm text-gray-500">
                                                    Email: {owner.email}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
