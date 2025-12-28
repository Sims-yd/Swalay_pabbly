"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { login } from "@/api/auth";
import { MessageSquare, Mail, Lock, ArrowRight } from "lucide-react";

const loginSchema = z.object({
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get("redirect") || "/dashboard";
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (values: LoginForm) => {
        setError(null);
        setLoading(true);
        try {
            console.debug('[login] submitting', { email: values.email });
            await login(values as { email: string; password: string });
            router.replace(redirectPath);
        } catch (err: any) {
            setError(err?.message || "Unable to login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex overflow-hidden">
            {/* Left Section - Brand */}
            <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                
                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-white">
                    <div className="flex items-center justify-center w-20 h-20 mb-6 bg-white/20 backdrop-blur-sm rounded-2xl">
                        <MessageSquare className="w-10 h-10" strokeWidth={2} />
                    </div>
                    <h1 className="text-5xl font-bold mb-4 tracking-tight">Swalay</h1>
                    <p className="text-xl text-blue-100 text-center max-w-md leading-relaxed">
                        Transform your WhatsApp marketing with powerful automation and engagement tools
                    </p>
                    <div className="mt-12 flex flex-col space-y-3 text-blue-100">
                        <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                            <span>Automated message broadcasting</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                            <span>Smart template management</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                            <span>Real-time analytics & insights</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Section - Form */}
            <div className="w-full lg:w-[55%] bg-white relative flex items-center justify-center px-6 py-12">
                {/* Curved divider - only visible on desktop */}
                <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-12">
                    <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0,0 Q50,50 0,100 L0,0" fill="white" />
                    </svg>
                </div>

                {/* Form Container */}
                <div className="w-full max-w-md relative z-10">
                    <div className="mb-8">
                        <h2 className="text-4xl font-bold text-gray-900 mb-2">Welcome Back</h2>
                        <p className="text-gray-500 text-lg">Sign in to continue to your workspace</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Email Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    className="w-full pl-8 pr-4 py-3 bg-transparent border-b-2 border-gray-200 focus:border-blue-500 outline-none transition-colors text-gray-900 placeholder:text-gray-400"
                                    {...register("email")}
                                />
                            </div>
                            {errors.email && (
                                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full pl-8 pr-4 py-3 bg-transparent border-b-2 border-gray-200 focus:border-blue-500 outline-none transition-colors text-gray-900 placeholder:text-gray-400"
                                    {...register("password")}
                                />
                            </div>
                            {errors.password && (
                                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Sign In Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3.5 rounded-full shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                            <span>{loading ? "Signing in..." : "Sign In"}</span>
                            {!loading && <ArrowRight className="w-5 h-5" />}
                        </button>

                        {/* Divider */}
                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-gray-500">or</span>
                            </div>
                        </div>

                        {/* Sign Up Link */}
                        <Link
                            href="/signup"
                            className="w-full border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold py-3.5 rounded-full transition-all duration-200 flex items-center justify-center"
                        >
                            Create New Account
                        </Link>
                    </form>

                    <p className="mt-8 text-center text-sm text-gray-500">
                        By continuing, you agree to our{" "}
                        <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
                        {" "}and{" "}
                        <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
