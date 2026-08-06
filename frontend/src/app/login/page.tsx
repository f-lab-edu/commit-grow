import type { Metadata } from "next";

import { LoginPanel } from "./_components/LoginPanel";

export const metadata: Metadata = {
	title: "로그인",
};

export default function LoginPage() {
	return (
		<div className="flex flex-1 items-center justify-center">
			<LoginPanel />
		</div>
	);
}
