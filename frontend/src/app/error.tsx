"use client";

import { Button } from "@/components/ui/button";

export default function Error({
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4">
			<p className="text-sm">문제가 발생했습니다.</p>
			<Button onClick={() => reset()}>다시 시도</Button>
		</div>
	);
}
