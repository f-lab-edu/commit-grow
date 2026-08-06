import type { Metadata } from "next";

import { LoginPanel } from "./_components/LoginPanel";
import { OnboardingPreview } from "./_components/OnboardingPreview";

export const metadata: Metadata = {
	title: "로그인",
};

export default function LoginPage() {
	return (
		<div className="flex flex-1">
			<OnboardingPreview />
			<div className="flex flex-1 items-center justify-center p-16">
				<LoginPanel />
			</div>
		</div>
	);
}
