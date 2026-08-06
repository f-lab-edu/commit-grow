import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "대시보드",
};

export default function DashboardPage() {
	return (
		<div className="flex flex-1 items-center justify-center">
			<p className="text-sm text-muted-foreground">대시보드 준비중입니다</p>
		</div>
	);
}
