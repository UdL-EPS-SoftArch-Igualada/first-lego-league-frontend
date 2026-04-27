import { RecordService } from "@/api/recordApi";
import { UsersService } from "@/api/userApi";
import { Card, CardHeader, CardTitle } from "@/app/components/card";
import PageShell from "@/app/components/page-shell";
import ErrorAlert from "@/app/components/error-alert";
import EmptyState from "@/app/components/empty-state";
import EditProfileForm from "@/app/components/edit-profile-form";
import { serverAuthProvider } from "@/lib/authProvider";
import { Record } from "@/types/record";
import { parseErrorMessage, NotFoundError } from "@/types/errors";
import Link from "next/link";
import { User } from "@/types/user";
import { buttonVariants } from "@/app/components/button";

interface UsersPageProps {
    readonly params: Promise<{ id: string }>;
}

function getRecordHref(recordUri: string) {
    const sanitizedUri = recordUri.split(/[?#]/, 1)[0] ?? "";
    const segments = sanitizedUri.split("/").filter(Boolean);
    const recordId = segments.at(-1);
    return recordId ? `/records/${recordId}` : recordUri;
}

export default async function UsersPage(props: Readonly<UsersPageProps>) {
    const { id } = await props.params;

    const userService = new UsersService(serverAuthProvider);
    const recordService = new RecordService(serverAuthProvider);

    let user: User | null = null;
    let currentUser: User | null = null;
    let records: Record[] = [];
    let error: string | null = null;
    let recordsError: string | null = null;

    try {
        user = await userService.getUserById(id);
    } catch (e) {
        console.error("Failed to fetch user:", e);
        error =
            e instanceof NotFoundError
                ? "This user does not exist."
                : parseErrorMessage(e);
    }

    try {
        currentUser = await userService.getCurrentUser();
    } catch (e) {
        console.error("Failed to fetch current user:", e);
    }

    const isOwner =
        !!(currentUser && user && currentUser.username === user.username);

    const isCurrentUserAdmin =
        !!currentUser?.authorities?.some(
            (authority) => authority.authority === "ROLE_ADMIN"
        );

    if (user && !error) {
        try {
            records = await recordService.getRecordsByOwnedBy(user);
        } catch (e) {
            console.error("Failed to fetch user records:", e);
            recordsError = parseErrorMessage(e);
        }
    }

    if (error) {
        return (
            <PageShell
                eyebrow="Participant profile"
                title="User not found"
                description="The user you're looking for could not be found."
            >
                <ErrorAlert message={error} />
            </PageShell>
        );
    }

    return (
        <PageShell
            eyebrow="Participant profile"
            title={user?.username || "User"}
            description="Profile information and related records for this participant."
        >
            <div className="space-y-8">
                <div className="space-y-3">
                    <div className="page-eyebrow">User details</div>
                    <h2 className="section-title">{user?.username}</h2>

                    {user?.email && (
                        <p className="section-copy">
                            <strong>Email:</strong> {user.email}
                        </p>
                    )}
                </div>

                <div className="editorial-divider" />

                {isOwner && user && (
                    <>
                        <EditProfileForm
                            userId={id}
                            currentEmail={user.email}
                        />

                        {isCurrentUserAdmin && (
                            <div className="mt-4">
                                <Link
                                    href="/administrators"
                                    className={buttonVariants({
                                        variant: "secondary",
                                    })}
                                >
                                    view and create other administrators
                                </Link>
                            </div>
                        )}

                        <div className="editorial-divider" />
                    </>
                )}

                <div className="space-y-4">
                    <div className="page-eyebrow">Records</div>
                    <h2 className="section-title">Records</h2>

                    {recordsError && <ErrorAlert message={recordsError} />}

                    {!recordsError && records.length === 0 && (
                        <EmptyState
                            title="No records found"
                            description="This user has not created any records yet."
                        />
                    )}

                    {!recordsError && records.length > 0 && (
                        <div className="grid gap-4">
                            {records.map((record) => (
                                <Card
                                    key={record.uri}
                                    className="border-border/90"
                                >
                                    <CardHeader>
                                        <div className="list-kicker">
                                            Record
                                        </div>
                                        <CardTitle className="text-xl">
                                            <Link
                                                href={getRecordHref(
                                                    record.uri
                                                )}
                                                className="hover:text-primary"
                                            >
                                                {record.name}
                                            </Link>
                                        </CardTitle>
                                    </CardHeader>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </PageShell>
    );
}