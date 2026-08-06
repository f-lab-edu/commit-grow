type StatCardProps = {
	label: string;
	value: string;
	unit: string;
};

export function StatCard({ label, value, unit }: StatCardProps) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-xs text-muted-foreground">{label}</span>
			<span className="flex items-baseline gap-0.5">
				<span className="text-xl font-bold tabular-nums">{value}</span>
				<span className="text-xs text-muted-foreground">{unit}</span>
			</span>
		</div>
	);
}
