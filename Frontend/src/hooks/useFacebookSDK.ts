import { useState, useEffect } from 'react';

declare global {
    interface Window {
        fbAsyncInit: () => void;
        FB: any;
    }
}

export const useFacebookSDK = () => {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (window.FB) {
            setIsLoaded(true);
            return;
        }

        window.fbAsyncInit = function () {
            window.FB.init({
                appId: process.env.NEXT_PUBLIC_META_APP_ID || "",
                cookie: true,
                xfbml: true,
                version: "v21.0",
            });
            setIsLoaded(true);
        };

        (function (d, s, id) {
            if (d.getElementById(id)) return;
            const fjs = d.getElementsByTagName(s)[0];
            const js = d.createElement(s) as HTMLScriptElement;
            js.id = id;
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            if (fjs && fjs.parentNode) {
                fjs.parentNode.insertBefore(js, fjs);
            }
        })(document, "script", "facebook-jssdk");
    }, []);

    const login = (): Promise<any> => {
        return new Promise((resolve, reject) => {
            if (!window.FB) {
                reject(new Error("Facebook SDK not loaded"));
                return;
            }

            window.FB.login((response: any) => {
                if (response.authResponse) {
                    resolve(response.authResponse);
                } else {
                    reject(new Error("User cancelled login or did not fully authorize."));
                }
            }, { scope: 'email,public_profile' });
        });
    };

    return { isLoaded, login };
};
