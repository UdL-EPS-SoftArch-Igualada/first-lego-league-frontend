'use client';

import { Button } from '@/app/components/button';
import { AVAILABLE_MEMBER_ROLES, TEAM_MEMBER_GENDER_OPTIONS, TeamMemberGender, TSHIRT_SIZES, TShirtSize } from '@/types/team';
import { useId, useState } from 'react';

type AddMemberFormProps = Readonly<{
    onSubmit: (
        name: string,
        role: string,
        birthDate: string,
        gender: TeamMemberGender,
        tShirtSize: string,
    ) => Promise<boolean> | void;
    onCancel: () => void;
    isLoading?: boolean;
}>;

export function AddMemberForm({
    onSubmit,
    onCancel,
    isLoading = false
}: AddMemberFormProps) {
    const nameInputId = useId();
    const roleSelectId = useId();
    const birthDateInputId = useId();
    const genderSelectId = useId();
    const tShirtSizeSelectId = useId();

    const [name, setName] = useState('');
    const [role, setRole] = useState<string>(AVAILABLE_MEMBER_ROLES[0]);
    const [birthDate, setBirthDate] = useState('');
    const [gender, setGender] = useState<TeamMemberGender>(TEAM_MEMBER_GENDER_OPTIONS[0]);
    const [tShirtSize, setTShirtSize] = useState<TShirtSize>(TSHIRT_SIZES[2]); // Default 'M'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim() || !birthDate) return;

        const success = await onSubmit(name.trim(), role, birthDate, gender, tShirtSize);

        if (success) {
            setName('');
            setRole(AVAILABLE_MEMBER_ROLES[0]);
            setBirthDate('');
            setGender(TEAM_MEMBER_GENDER_OPTIONS[0]);
            setTShirtSize(TSHIRT_SIZES[2]);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 border p-4 rounded bg-white dark:bg-zinc-900 shadow-sm">
            <div>
                <label
                    htmlFor={nameInputId}
                    className="block text-xs font-medium uppercase text-zinc-500 mb-1"
                >
                    Name
                </label>
                <input
                    id={nameInputId}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Albert"
                    className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label
                        htmlFor={roleSelectId}
                        className="block text-xs font-medium uppercase text-zinc-500 mb-1"
                    >
                        Role
                    </label>
                    <select
                        id={roleSelectId}
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        className="border p-2 w-full rounded bg-white dark:bg-zinc-800"
                        disabled={isLoading}
                    >
                        {AVAILABLE_MEMBER_ROLES.map(r => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label 
                        htmlFor={birthDateInputId}
                        className="block text-xs font-medium uppercase text-zinc-500 mb-1"
                    >
                        Birth Date
                    </label>
                    <input
                        id={birthDateInputId}
                        type="date"
                        value={birthDate}
                        onChange={e => setBirthDate(e.target.value)}
                        className="border p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label 
                        htmlFor={genderSelectId}
                        className="block text-xs font-medium uppercase text-zinc-500 mb-1"
                    >
                        Gender
                    </label>
                    <select
                        id={genderSelectId}
                        value={gender}
                        onChange={e => setGender(e.target.value as TeamMemberGender)}
                        className="border p-2 w-full rounded bg-white dark:bg-zinc-800"
                        disabled={isLoading}
                    >
                        {TEAM_MEMBER_GENDER_OPTIONS.map(g => (
                            <option key={g} value={g}>
                                {g}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label 
                        htmlFor={tShirtSizeSelectId}
                        className="block text-xs font-medium uppercase text-zinc-500 mb-1"
                    >
                        T-Shirt Size
                    </label>
                    <select
                        id={tShirtSizeSelectId}
                        value={tShirtSize}
                        onChange={e => setTShirtSize(e.target.value as TShirtSize)}
                        className="border p-2 w-full rounded bg-white dark:bg-zinc-800"
                        disabled={isLoading}
                    >
                        {TSHIRT_SIZES.map(s => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex gap-2 pt-2">
                <Button
                    type="submit"
                    loading={isLoading}
                    loadingText="Adding member..."
                    disabled={!name.trim() || !role || !birthDate}
                >
                    Add Member
                </Button>

                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}
