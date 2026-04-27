'use client';

import { Button } from '@/app/components/button';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { TeamMemberSnapshot } from '@/types/team';
import { useState } from 'react';
import { AddMemberForm } from './add-member-form';
import { DeleteMemberDialog } from './delete-member-dialog';

interface TeamMembersManagerProps {
    readonly teamId: string;
    readonly initialMembers: TeamMemberSnapshot[];
    readonly isCoach: boolean;
    readonly isAdmin: boolean;
}

function getMemberKey(member: TeamMemberSnapshot, index: number) {
    if (member.uri !== undefined) {
        return member.uri;
    }

    if (member.id === undefined) {
        return `member-${index}`;
    }

    return String(member.id);
}

export function TeamMembersManager({ teamId, initialMembers, isCoach, isAdmin }: Readonly<TeamMembersManagerProps>) {
    const isAuthorized = isCoach || isAdmin;
    const { members, addMember, removeMember, isFull, isLoading } = useTeamMembers(teamId, initialMembers);
    const [showForm, setShowForm] = useState(false);
    const [selected, setSelected] = useState<{ name: string; uri: string } | null>(null);

    return (
        <div className="space-y-4">
            {isAuthorized && !isFull && (
                <Button onClick={() => setShowForm(true)} disabled={isLoading}>
                    Add Member
                </Button>
            )}

            {showForm && (
                <AddMemberForm
                    onSubmit={async (name, role, birthDate, gender, tShirtSize) => {
                        const success = await addMember(name, role, birthDate, gender, tShirtSize);
                        if (success) setShowForm(false);
                        return success;
                    }}
                    onCancel={() => setShowForm(false)}
                    isLoading={isLoading}
                />
            )}

            <ul className="space-y-2">
                {members.map((m, index) => {
                    const memberUri = m.uri;
                    const memberKey = getMemberKey(m, index);

                    return (
                        <li
                            key={memberKey}
                            className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                        >
                            <div>
                                <span className="block font-medium">{m.name ?? "Unnamed member"}</span>
                                <span className="text-xs text-muted-foreground uppercase">
                                    {m.role ?? "Member"}
                                </span>
                            </div>
                            {isAuthorized && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() =>
                                        memberUri
                                            ? setSelected({
                                                name: m.name ?? "Unnamed member",
                                                uri: memberUri,
                                            })
                                            : null
                                    }
                                    disabled={!memberUri}
                                >
                                    Delete
                                </Button>
                            )}
                        </li>
                    );
                })}
            </ul>

            {selected && (
                <DeleteMemberDialog
                    member={selected}
                    onCancel={() => setSelected(null)}
                    onSuccess={(uri: string) => {
                        removeMember(uri);
                        setSelected(null);
                    }}
                />
            )}
        </div>
    );
}
