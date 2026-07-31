import { type NextRequest, NextResponse } from "next/server";

// 뼈대만 — 실제 인증 검증(세션 쿠키 확인 등)은 API 준비 후.
export function middleware(_request: NextRequest) {
	return NextResponse.next();
}

export const config = {
	matcher: [],
};
