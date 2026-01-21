import { useState } from 'react';
import { useFacebookSDK } from '@/hooks/useFacebookSDK';
import { useRouter } from 'next/navigation';
import { facebookLogin } from '@/api/auth';
import { Facebook } from 'lucide-react';

export default function FacebookLoginButton() {
    const { isLoaded, login } = useFacebookSDK();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const authResponse = await login();
            const { accessToken, userID } = authResponse;

            // Call backend
            await facebookLogin({
                access_token: accessToken,
                facebook_id: userID
            });

            router.replace('/dashboard');
        } catch (err: any) {
            console.error("Facebook login error:", err);
            setError(err.message || "Failed to login with Facebook");
        } finally {
            setLoading(false);
        }
    };

    if (!isLoaded) return null; // Or a loading spinner

    return (
        <div className="w-full">
            {error && <p className="text-red-500 text-sm mb-2 text-center">{error}</p>}
            <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold py-3.5 rounded-full shadow-md transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-70"
            >
                <Facebook className="w-5 h-5 fill-current" />
                <span>{loading ? "Connecting..." : "Continue with Facebook"}</span>
            </button>
        </div>
    );
}
