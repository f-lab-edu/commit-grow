"use client";

import { useState } from "react";

import { GithubIcon } from "@/components/icons/GithubIcon";
import { Button } from "@/components/ui/button";

export function LoginPanel() {
	const [isRedirecting, setIsRedirecting] = useState(false);

	function handleLogin() {
		setIsRedirecting(true);
		window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/github`;
	}

	return (
		<div className="flex w-85 flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-bold">로그인</h1>
				<p className="text-sm text-muted-foreground">
					오늘의 커밋에서 시작해 혼자서도 꾸준히 회고해요
				</p>
			</div>
			<Button
				size="lg"
				className="w-full"
				disabled={isRedirecting}
				onClick={handleLogin}
			>
				<GithubIcon data-icon="inline-start" className="size-4" />
				{isRedirecting ? "GitHub으로 이동하고 있어요" : "GitHub으로 로그인"}
			</Button>
			<span className="text-xs text-muted-foreground">
				로그인하면 서비스 이용약관에 동의하게 돼요
			</span>
		</div>
	);
}
