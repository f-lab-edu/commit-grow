import { type NextRequest, NextResponse } from "next/server";

// 세션 쿠키 존재 여부만 확인(값 유효성 검증 아님) — 백엔드 session.cookieName과 값 동기화 필요.
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "local-sid";

export function proxy(request: NextRequest) {
	const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
	const { pathname } = request.nextUrl;

	if (pathname === "/login" && hasSession) {
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}
	if (
		(pathname.startsWith("/dashboard") ||
			pathname.startsWith("/retrospects")) &&
		!hasSession
	) {
		return NextResponse.redirect(new URL("/login", request.url));
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/login", "/dashboard/:path*", "/retrospects/:path*"],
};
