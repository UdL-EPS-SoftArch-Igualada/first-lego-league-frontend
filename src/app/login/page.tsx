"use client";

import { UsersService } from "@/api/userApi";
import { useAuth } from "@/app/components/authentication";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_COOKIE_NAME, clientAuthProvider } from "@/lib/authProvider";
import { deleteCookie, setCookie } from "cookies-next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";

type FormValues = {
    username: string;
    password: string;
};

export default function LoginPage() {
    const router = useRouter();
    const { setUser } = useAuth();
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function login(username: string, password: string) {
        setErrorMessage(null);
        // Use Buffer for base64 encoding (Node.js compatible)
        const base64 = Buffer.from(`${username}:${password}`).toString('base64');
        const authorization = `Basic ${base64}`;
        setCookie(AUTH_COOKIE_NAME, authorization, {
            path: "/",
            secure: true,
            sameSite: "strict",
            httpOnly: false,
        });
        const service = new UsersService(clientAuthProvider());
        const user = await service.getCurrentUser();
        setUser(user);
    }

    const onSubmit: SubmitHandler<FormValues> = (data) => {
        login(data.username, data.password).then(() => {
            router.push(`/users/${data.username}`);
        }).catch(() => {
            deleteCookie(AUTH_COOKIE_NAME);
            setErrorMessage("Login failed");
        });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
                <div className="flex flex-col items-center w-full gap-6 text-center sm:items-start sm:text-left">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>login</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
                                {errorMessage && ( // Display error message if present
                                    <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
                                )}
                                <div>
                                    <Label htmlFor="username">Username</Label> {/* Changed htmlFor to username */}
                                    <Input
                                        id="username"
                                        {...register("username", { required: "Username is required" })}
                                    />
                                    {errors.username && (
                                        <p className="text-sm text-red-600 mt-1">{errors.username.message}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        {...register("password", {
                                            required: "Password is required"
                                        })}
                                    />
                                    {errors.password && (
                                        <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
                                    )}
                                </div>

                                <Button type="submit" className="mt-2" disabled={isSubmitting}>
                                    {isSubmitting ? "logging in..." : "login"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
