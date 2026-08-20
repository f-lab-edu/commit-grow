import { CheckIcon } from "@/components/icons/CheckIcon";
import { cn } from "@/lib/utils";

const STEPS = [
	{ label: "액션포인트 리뷰", status: "done" as const },
	{ label: "AI 질문 답변", status: "active" as const },
	{ label: "회고 확인", status: "upcoming" as const },
	{ label: "액션포인트 수정", status: "upcoming" as const },
];

export function WizardSidebar() {
	return (
		<div className="flex w-58 flex-none flex-col border-r border-[color:var(--border-subtle)] bg-card p-4">
			<div className="mb-7 flex items-center gap-2 px-2">
				<div className="flex size-7 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground text-sm">
					C
				</div>
				<span className="font-bold text-base">Commit Grow</span>
			</div>

			<div className="mb-3.5 flex items-center justify-between px-3">
				<span className="font-semibold text-sm">회고 작성 단계</span>
				<span className="text-muted-foreground text-xs tabular-nums">2/4</span>
			</div>

			<div className="flex flex-col gap-1.5 px-2">
				{STEPS.map((step, index) => (
					<div
						key={step.label}
						className={cn(
							"flex items-center gap-2.5 rounded-lg p-3",
							step.status === "active" && "bg-[color:var(--bg-accent-muted)]",
						)}
					>
						<span
							className={cn(
								"flex size-5 flex-none items-center justify-center rounded-full text-[11px] font-bold",
								step.status === "done" && "bg-primary text-primary-foreground",
								step.status === "active" &&
									"bg-primary text-primary-foreground",
								step.status === "upcoming" &&
									"border-[1.5px] border-border text-muted-foreground",
							)}
						>
							{step.status === "done" ? (
								<CheckIcon className="size-[11px]" />
							) : (
								index + 1
							)}
						</span>
						<span
							className={cn(
								"text-sm",
								step.status === "active"
									? "font-semibold text-foreground"
									: "text-muted-foreground",
							)}
						>
							{step.label}
						</span>
					</div>
				))}
			</div>

			<div className="mt-auto flex items-center gap-2.5 rounded-xl border border-[color:var(--border-subtle)] bg-background p-3">
				<div className="size-8 flex-none rounded-full bg-[color:var(--neutral-150)]" />
				<div className="flex flex-col leading-tight">
					<span className="font-semibold text-sm">주열</span>
					<span className="text-muted-foreground text-xs">GitHub 연동됨</span>
				</div>
			</div>
		</div>
	);
}
