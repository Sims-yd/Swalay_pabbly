import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/signup", "/_next", "/favicon.ico", "/api"];
const TOKEN_COOKIE = "access_token";

export async function middleware(req: NextRequest) {
    const { pathname, search } = req.nextUrl;

    if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    const token = req.cookies.get(TOKEN_COOKIE)?.value;
    if (!token) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("redirect", pathname + search);
        return NextResponse.redirect(loginUrl);
    }

    const secret = process.env.AUTH_JWT_SECRET;
    if (!secret) {
        // Allow request if secret is missing, but surface need for configuration in logs.
        console.warn("AUTH_JWT_SECRET is not set; middleware is skipping JWT verification.");
        return NextResponse.next();
    }

    try {
        await jwtVerify(token, new TextEncoder().encode(secret));
        return NextResponse.next();
    } catch (err) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("redirect", pathname + search);
        return NextResponse.redirect(loginUrl);
    }
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
