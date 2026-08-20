"use client";

import { ChatCircleTextIcon } from "@/components/icons/ChatCircleTextIcon";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Question } from "./mock-data";

type QuestionCardProps = {
	question: Question;
	index: number;
	answer: string;
	onChange: (value: string) => void;
};

export function QuestionCard({
	question,
	index,
	answer,
	onChange,
}: QuestionCardProps) {
	const answered = answer.trim() !== "";

	return (
		<Card className="relative overflow-visible p-6">
			<span
				className={cn(
					"-top-3.5 -left-3.5 absolute flex size-6.5 items-center justify-center rounded-[var(--radius-md)] font-bold text-xs shadow-[var(--shadow-resting)]",
					answered
						? "bg-primary text-primary-foreground"
						: "border-[1.5px] border-border bg-background text-muted-foreground",
				)}
			>
				{index + 1}
			</span>
			<div className="flex flex-col gap-2.5">
				<div className="flex items-start gap-2.5">
					<span className="flex size-6.5 flex-none items-center justify-center rounded-full bg-[color:var(--bg-accent-muted)]">
						<ChatCircleTextIcon className="size-4" />
					</span>
					<span className="font-semibold text-[15px] leading-[26px]">
						{question.text}
					</span>
				</div>
				<Textarea
					value={answer}
					onChange={(event) => onChange(event.target.value)}
					placeholder="생각나는 대로 편하게 적어보세요"
					className="min-h-24"
				/>
			</div>
		</Card>
	);
}
