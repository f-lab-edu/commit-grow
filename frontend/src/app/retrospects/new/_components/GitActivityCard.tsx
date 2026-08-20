import { BugIcon } from "@/components/icons/BugIcon";
import { EyeIcon } from "@/components/icons/EyeIcon";
import { GitBranchIcon } from "@/components/icons/GitBranchIcon";
import { GitCommitIcon } from "@/components/icons/GitCommitIcon";
import { GitPullRequestIcon } from "@/components/icons/GitPullRequestIcon";
import { Card } from "@/components/ui/card";
import type { GitActivityGroup, GitActivityType } from "./mock-data";

const TYPE_ICON: Record<GitActivityType, typeof GitCommitIcon> = {
	commit: GitCommitIcon,
	issue: BugIcon,
	pr: GitPullRequestIcon,
	review: EyeIcon,
};

const TYPE_TINT: Record<GitActivityType, string> = {
	commit: "var(--gitact-commit-100)",
	issue: "var(--gitact-issue-100)",
	pr: "var(--gitact-pr-100)",
	review: "var(--neutral-100)",
};

const TYPE_ACCENT: Record<GitActivityType, string> = {
	commit: "var(--gitact-commit-600)",
	issue: "var(--gitact-issue-600)",
	pr: "var(--gitact-pr-600)",
	review: "var(--text-disabled)",
};

function ActivityGroupCard({ group }: { group: GitActivityGroup }) {
	const TypeIcon = TYPE_ICON[group.type];

	return (
		<div
			className="flex flex-col gap-3 rounded-lg border border-(--border-subtle) p-3.5"
			style={{ background: TYPE_TINT[group.type] }}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="flex size-7.5 flex-none items-center justify-center rounded-md">
						<TypeIcon
							className="size-3.5"
							style={{ color: TYPE_ACCENT[group.type] }}
						/>
					</div>
					<span className="font-semibold text-[13px]">{group.label}</span>
				</div>
				<span
					className="font-bold text-lg tabular-nums"
					style={{
						color: group.count === 0 ? "var(--text-disabled)" : undefined,
					}}
				>
					{group.count}
				</span>
			</div>
			{group.items.length === 0 ? (
				<div className="flex flex-1 items-center justify-center py-2 text-center">
					<span className="text-muted-foreground text-xs">
						{group.emptyLabel}
					</span>
				</div>
			) : (
				<div className="flex flex-col gap-2">
					{group.items.map((item) => (
						<div
							key={item.title}
							className="flex flex-col gap-1.5 rounded-md border border-(--border-subtle) bg-background p-2.5"
						>
							<span className="font-semibold text-[12.5px] leading-snug">
								{item.title}
							</span>
							<span
								className="flex w-fit items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-[10px]"
								style={{
									background: TYPE_TINT[group.type],
									color: TYPE_ACCENT[group.type],
								}}
							>
								<GitBranchIcon className="size-2.5" />
								{item.ref}
							</span>
						</div>
					))}
				</div>
			)}
			{group.moreCount > 0 && (
				<span className="text-muted-foreground text-xs">
					+{group.moreCount}개 더 있어요
				</span>
			)}
		</div>
	);
}

export function GitActivityCard({ groups }: { groups: GitActivityGroup[] }) {
	return (
		<Card>
			<div className="flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<GitBranchIcon className="size-[15px] text-muted-foreground" />
						<span className="font-semibold text-[15px]">오늘의 Git 활동</span>
					</div>
					<span className="text-muted-foreground text-xs">
						조회 전용 참고 자료
					</span>
				</div>
				<div className="grid grid-cols-4 items-stretch gap-3">
					{groups.map((group) => (
						<ActivityGroupCard key={group.type} group={group} />
					))}
				</div>
			</div>
		</Card>
	);
}
