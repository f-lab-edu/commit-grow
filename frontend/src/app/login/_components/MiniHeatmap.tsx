const WEEKS = 12;
const DAYS = 7;
const HEAT_VARS = ["--heat-0", "--heat-1", "--heat-2", "--heat-3", "--heat-4"];

// 로그인 화면 프리뷰용 정적 목업 데이터 — 실제 히트맵은 S-03 대시보드에서 구현
export function MiniHeatmap() {
	return (
		<div className="grid h-13 w-full auto-cols-fr grid-flow-col grid-rows-7 gap-0.5">
			{Array.from({ length: WEEKS * DAYS }, (_, i) => {
				const week = Math.floor(i / DAYS);
				const day = i % DAYS;
				const level = (week * 3 + day * 5) % 5;
				return (
					<span
						key={i}
						className="rounded-[2px]"
						style={{ background: `var(${HEAT_VARS[level]})` }}
					/>
				);
			})}
		</div>
	);
}
