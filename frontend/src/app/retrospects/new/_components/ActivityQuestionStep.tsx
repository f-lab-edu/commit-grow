"use client";

import { useEffect, useState } from "react";
import { ArrowClockwiseIcon } from "@/components/icons/ArrowClockwiseIcon";
import { WarningCircleIcon } from "@/components/icons/WarningCircleIcon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GitActivityCard } from "./GitActivityCard";
import {
	type ActivityAndQuestions,
	fetchMockActivityAndQuestions,
	type MockScenario,
} from "./mock-data";
import { QuestionCard } from "./QuestionCard";

type Phase = "loading" | "error" | "ready";

function ActivitySkeletonCard() {
	return (
		<Card>
			<div className="flex flex-col gap-3">
				{[0, 1, 2].map((row) => (
					<div
						key={row}
						className="flex flex-col gap-2.5 rounded-[var(--radius-lg)] border border-[color:var(--border-subtle)] p-3.5"
					>
						<div className="flex items-center justify-between">
							<Skeleton className="h-5 w-18 rounded-full" />
							<Skeleton className="h-3 w-12" />
						</div>
						<Skeleton className="h-4 w-3/5" />
						<Skeleton className="h-4.5 w-24 rounded-full" />
					</div>
				))}
			</div>
		</Card>
	);
}

function QuestionSkeletonCard() {
	return (
		<Card>
			<div className="flex flex-col gap-3">
				<Skeleton className="h-4.5 w-80" />
				<Skeleton className="h-24 w-full rounded-[var(--radius-md)]" />
			</div>
		</Card>
	);
}

export function ActivityQuestionStep({ scenario }: { scenario: MockScenario }) {
	const [phase, setPhase] = useState<Phase>("loading");
	const [data, setData] = useState<ActivityAndQuestions | null>(null);
	const [answers, setAnswers] = useState<Record<string, string>>({});
	// 첫 로드가 error 시나리오면 실패시키고, "다시 시도" 클릭 시엔 항상 성공시켜 복구 흐름을 QA할 수 있게 함
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		let cancelled = false;
		const effectiveScenario =
			attempt > 0 && scenario === "error" ? "default" : scenario;

		setPhase("loading");
		fetchMockActivityAndQuestions(effectiveScenario)
			.then((result) => {
				if (cancelled) return;
				setData(result);
				setAnswers(Object.fromEntries(result.questions.map((q) => [q.id, ""])));
				setPhase("ready");
			})
			.catch(() => {
				if (cancelled) return;
				setPhase("error");
			});
		return () => {
			cancelled = true;
		};
	}, [scenario, attempt]);

	const questions = data?.questions ?? [];
	const answeredCount = questions.filter(
		(q) => (answers[q.id] ?? "").trim() !== "",
	).length;
	const allAnswered =
		questions.length > 0 && answeredCount === questions.length;

	const description =
		phase === "loading"
			? "Git 활동과 질문을 불러오고 있어요"
			: phase === "error"
				? "Git 활동과 질문을 불러오는 중 문제가 생겼어요"
				: data && data.activity.length > 0
					? "활동 카드는 참고용이라 답변을 자동으로 채우지 않아요. 질문 전체를 한 화면에서 받아요 — 단계별로 나뉘어 있지 않아요"
					: "오늘은 확인할 Git 활동이 없어요. 기본 질문 하나에만 답하면 다음으로 넘어가요";

	return (
		<div className="flex flex-1 flex-col gap-4.5 p-8 pt-8">
			<div className="flex flex-col gap-1.5">
				<h1 className="font-bold text-2xl tracking-tight">
					오늘 활동을 확인하고, 질문에 답해볼까요?
				</h1>
				<p className="text-muted-foreground text-sm">{description}</p>
			</div>

			{phase === "loading" && (
				<>
					<ActivitySkeletonCard />
					<div className="flex flex-col gap-3.5">
						<QuestionSkeletonCard />
						<QuestionSkeletonCard />
						<QuestionSkeletonCard />
					</div>
				</>
			)}

			{phase === "error" && (
				<Card>
					<div className="flex flex-col items-center justify-center gap-3.5 py-12 text-center">
						<WarningCircleIcon className="size-6.5 text-muted-foreground" />
						<span className="text-sm">활동과 질문을 불러오지 못했어요</span>
						<span className="text-muted-foreground text-xs">
							인터넷 연결을 확인하고 다시 시도해주세요
						</span>
						<Button
							variant="secondary"
							size="sm"
							onClick={() => setAttempt((n) => n + 1)}
						>
							<ArrowClockwiseIcon
								data-icon="inline-start"
								className="size-3.5"
							/>
							다시 시도
						</Button>
					</div>
				</Card>
			)}

			{phase === "ready" && data && (
				<>
					{data.activity.length > 0 && (
						<GitActivityCard groups={data.activity} />
					)}

					<div className="flex flex-col gap-3.5">
						<div className="flex items-baseline justify-between">
							<span className="font-semibold text-xl">질문에 답해주세요</span>
							<span className="text-muted-foreground text-xs">
								{data.activity.length > 0
									? "질문 순서는 상관없어요 · 전체 답변을 마치면 다음으로 넘어가요"
									: "Git 활동이 없을 땐 기본 질문 1개로 대신해요"}
							</span>
						</div>
						{questions.map((question, index) => (
							<QuestionCard
								key={question.id}
								question={question}
								index={index}
								answer={answers[question.id] ?? ""}
								onChange={(value) =>
									setAnswers((prev) => ({ ...prev, [question.id]: value }))
								}
							/>
						))}
					</div>
				</>
			)}

			<div className="mt-auto flex flex-none items-center justify-between">
				<span className="text-muted-foreground text-xs">
					{phase === "ready"
						? `${answeredCount} / ${questions.length}개 답변 완료`
						: ""}
				</span>
				<Button
					size="lg"
					disabled={!allAnswered}
					onClick={() => {
						// TODO: S-06 KPT 작성 화면 연결 — 위저드 상태 공유는 S-04/S-06 구현 시 결정
						console.log("answers", answers);
					}}
				>
					다음
				</Button>
			</div>
		</div>
	);
}
