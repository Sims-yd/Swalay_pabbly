"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signup } from "@/api/auth";
import { MessageSquare, Mail, Lock, User as UserIcon, ArrowRight, Check } from "lucide-react";

const signupSchema = z
    .object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Enter a valid email"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
        agreeToTerms: z.boolean().refine(val => val === true, {
            message: "You must agree to the terms and conditions",
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords must match",
        path: ["confirmPassword"],
    });

type SignupForm = z.infer<typeof signupSchema>;

function SignupFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Only allow 'redirect' param - ignore any sensitive data in URL
    const redirectPath = searchParams.get("redirect") || "/dashboard";
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Security: Clean up URL if it contains sensitive data
    useEffect(() => {
        const url = new URL(window.location.href);
        const hasEmail = url.searchParams.has("email");
        const hasPassword = url.searchParams.has("password");
        const hasName = url.searchParams.has("name");
        
        if (hasEmail || hasPassword || hasName) {
            // Remove sensitive params from URL without reload
            url.searchParams.delete("email");
            url.searchParams.delete("password");
            url.searchParams.delete("name");
            window.history.replaceState({}, "", url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""));
        }
    }, []);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignupForm>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            agreeToTerms: false,
        },
    });

    const onSubmit = async (values: SignupForm) => {
        setError(null);
        setLoading(true);
        try {
            console.debug('[signup] submitting', { email: values.email, name: values.name });
            const result = await signup({ email: values.email, password: values.password });
            if (result?.access_token) {
                router.replace(redirectPath);
            } else {
                throw new Error("Signup failed - no token received");
            }
        } catch (err: any) {
            console.error('[signup] error:', err);
            setError(err?.message || "Unable to sign up");
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
                        Join thousands of businesses revolutionizing customer engagement through WhatsApp
                    </p>
                    <div className="mt-12 flex flex-col space-y-3 text-blue-100">
                        <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                            <span>Create unlimited broadcast campaigns</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                            <span>Design beautiful message templates</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                            <span>Track engagement in real-time</span>
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
                        <h2 className="text-4xl font-bold text-gray-900 mb-2">Create Your Account</h2>
                        <p className="text-gray-500 text-lg">Start your journey with Swalay today</p>
                    </div>

                    <form 
                        onSubmit={handleSubmit(onSubmit)} 
                        method="post"
                        action="#"
                        className="space-y-5"
                    >
                        {/* Name Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">
                                Full Name
                            </label>
                            <div className="relative">
                                <UserIcon className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="John Doe"
                                    autoComplete="name"
                                    className="w-full pl-8 pr-4 py-3 bg-transparent border-b-2 border-gray-200 focus:border-blue-500 outline-none transition-colors text-gray-900 placeholder:text-gray-400"
                                    {...register("name")}
                                />
                            </div>
                            {errors.name && (
                                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                            )}
                        </div>

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
                                    autoComplete="new-password"
                                    className="w-full pl-8 pr-4 py-3 bg-transparent border-b-2 border-gray-200 focus:border-blue-500 outline-none transition-colors text-gray-900 placeholder:text-gray-400"
                                    {...register("password")}
                                />
                            </div>
                            {errors.password && (
                                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Confirm Password Field */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    className="w-full pl-8 pr-4 py-3 bg-transparent border-b-2 border-gray-200 focus:border-blue-500 outline-none transition-colors text-gray-900 placeholder:text-gray-400"
                                    {...register("confirmPassword")}
                                />
                            </div>
                            {errors.confirmPassword && (
                                <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        {/* Terms Checkbox */}
                        <div className="flex items-start space-x-3 pt-2">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    id="agreeToTerms"
                                    className="peer w-5 h-5 border-2 border-gray-300 rounded cursor-pointer appearance-none checked:bg-blue-500 checked:border-blue-500 transition-all"
                                    {...register("agreeToTerms")}
                                />
                                <Check className="absolute left-0.5 top-0.5 w-4 h-4 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                            </div>
                            <label htmlFor="agreeToTerms" className="text-sm text-gray-600 cursor-pointer select-none">
                                I agree to the{" "}
                                <a href="#" className="text-blue-600 hover:underline">Terms & Conditions</a>
                                {" "}and{" "}
                                <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                            </label>
                        </div>
                        {errors.agreeToTerms && (
                            <p className="text-sm text-red-500 mt-1">{errors.agreeToTerms.message}</p>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Sign Up Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3.5 rounded-full shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mt-6"
                        >
                            <span>{loading ? "Creating account..." : "Sign Up"}</span>
                            {!loading && <ArrowRight className="w-5 h-5" />}
                        </button>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-gray-500">Already have an account?</span>
                            </div>
                        </div>

                        {/* Sign In Link */}
                        <Link
                            href="/login"
                            className="w-full border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold py-3.5 rounded-full transition-all duration-200 flex items-center justify-center"
                        >
                            Sign In
                        </Link>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Loading fallback for Suspense
function SignupFormSkeleton() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-white">
            <div className="animate-pulse flex flex-col items-center">
                <div className="w-20 h-20 bg-blue-200 rounded-2xl mb-6"></div>
                <div className="w-32 h-8 bg-gray-200 rounded mb-4"></div>
                <div className="w-48 h-4 bg-gray-100 rounded"></div>
            </div>
        </div>
    );
}

// Main page export with Suspense boundary for useSearchParams
export default function SignupPage() {
    return (
        <Suspense fallback={<SignupFormSkeleton />}>
            <SignupFormContent />
        </Suspense>
    );
}
