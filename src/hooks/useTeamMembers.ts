'use client';
import { TeamsService } from '@/api/teamApi';
import { clientAuthProvider } from '@/lib/authProvider';
import { MAX_TEAM_MEMBERS, TeamMember, TeamMemberGender, TeamMemberSnapshot } from '@/types/team';
import { useCallback, useMemo, useState } from 'react';

function hasHalSelfLink(member: TeamMember | TeamMemberSnapshot): member is TeamMember {
    return "link" in member && typeof member.link === "function";
}

function toTeamMemberSnapshot(member: TeamMember | TeamMemberSnapshot): TeamMemberSnapshot {
    const selfHref = hasHalSelfLink(member)
        ? member.link("self")?.href
        : undefined;

    return {
        id: member.id,
        name: member.name,
        birthDate: member.birthDate,
        gender: member.gender,
        tShirtSize: member.tShirtSize,
        role: member.role,
        uri: member.uri ?? selfHref,
    };
}

export function useTeamMembers(teamId: string, initialMembers: TeamMemberSnapshot[] = []) {
    const [members, setMembers] = useState<TeamMemberSnapshot[]>(() =>
        initialMembers.map(toTeamMemberSnapshot)
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const service = useMemo(
        () => new TeamsService(clientAuthProvider),
        []
    );

    const addMember = useCallback(
        async (name: string, role: string, birthDate: string, gender: TeamMemberGender, tShirtSize: string) => {
            if (!teamId) {
                setError('Missing teamId');
                return false;
            }
            setIsLoading(true);
            setError(null);
            try {
                if (members.length >= MAX_TEAM_MEMBERS) {
                    setError('Team has reached maximum members');
                    return false;
                }
                const newMember = await service.addTeamMember(teamId, {
                    name,
                    role,
                    birthDate,
                    gender,
                    tShirtSize
                });
                setMembers(prev => [...prev, toTeamMemberSnapshot(newMember)]);
                return true;
            } catch {
                setError('Failed to add member');
                return false;
            } finally {
                setIsLoading(false);
            }
        },
        [teamId, members.length, service]
    );

    const removeMember = useCallback(
        (memberUri: string) => {
            if (!memberUri) return;
            setMembers(prev => prev.filter(m => m.uri !== memberUri));
        },
        []
    );

    return {
        members: members ?? [],
        isLoading,
        error,
        addMember,
        removeMember,
        isFull: (members ?? []).length >= MAX_TEAM_MEMBERS,
    };
}
