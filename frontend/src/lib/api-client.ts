// 뼈대만 — 실구현은 backend API 준비 후.
// 세션 쿠키 인증(Passport GitHub OAuth)이므로 credentials: "include" 필수.
export async function apiClient(path: string, init?: RequestInit) {
	const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
		...init,
		credentials: "include",
	});
	return res;
}
