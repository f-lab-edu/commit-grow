import { CaretLeftIcon } from "@/components/icons/CaretLeftIcon";
import { CaretRightIcon } from "@/components/icons/CaretRightIcon";

import { MiniHeatmap } from "./MiniHeatmap";
import { StatCard } from "./StatCard";

const stats = [
	{ label: "연속 회고", value: "7", unit: "일" },
	{ label: "전체 회고", value: "23", unit: "회" },
	{ label: "완료 액션포인트", value: "12", unit: "개" },
];

export function OnboardingPreview() {
	return (
		<div className="flex flex-1 flex-col justify-between border-r border-[color:var(--border-subtle)] bg-card p-12">
			<div className="flex items-center gap-2">
				<div className="flex size-7 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground text-sm">
					C
				</div>
				<span className="font-bold text-base">Commit Grow</span>
			</div>

			<div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-6 shadow-[var(--shadow-floating)]">
				<div className="grid grid-cols-3 gap-3">
					{stats.map((stat) => (
						<StatCard key={stat.label} {...stat} />
					))}
				</div>
				<div className="h-px bg-[color:var(--border-subtle)]" />
				<div className="flex flex-col gap-2">
					<span className="text-xs text-muted-foreground">
						회고 히트맵 · 최근 12주
					</span>
					<MiniHeatmap />
				</div>
			</div>

			<div className="flex flex-col gap-3.5">
				<div className="flex flex-col gap-2">
					<h2 className="font-semibold text-lg">활동에서 시작하는 회고</h2>
					<p className="max-w-[420px] text-muted-foreground text-sm">
						GitHub 커밋과 PR을 바탕으로 질문을 받고, 답변은 Keep · Problem ·
						Try로 자동 정리돼요
					</p>
				</div>
				<div className="flex items-center gap-3.5">
					<CaretLeftIcon className="size-4 text-[color:var(--text-disabled)]" />
					<div className="flex items-center gap-1.5">
						<span className="size-1.5 rounded-full bg-[color:var(--neutral-200)]" />
						<span className="h-1.5 w-4 rounded-full bg-primary" />
						<span className="size-1.5 rounded-full bg-[color:var(--neutral-200)]" />
					</div>
					<CaretRightIcon className="size-4 text-muted-foreground" />
				</div>
			</div>
		</div>
	);
}
