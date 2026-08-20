// 더미데이터 — API(`GET /git-activities/today`, `POST /retrospects/questions/generate` 등) 연동 시 교체

export type GitActivityType = "commit" | "issue" | "pr" | "review";

export type GitActivityItem = {
	title: string;
	ref: string;
};

export type GitActivityGroup = {
	type: GitActivityType;
	label: string;
	count: number;
	items: GitActivityItem[];
	moreCount: number;
	emptyLabel?: string;
};

export type Question = {
	id: string;
	text: string;
};

export type ActivityAndQuestions = {
	activity: GitActivityGroup[];
	questions: Question[];
};

const ACTIVITY_WITH_QUESTIONS: ActivityAndQuestions = {
	activity: [
		{
			type: "commit",
			label: "Commit",
			count: 5,
			items: [
				{ title: "예상 질문 생성 API 성능 개선", ref: "commit-grow" },
				{ title: "히트맵 캐시 무효화 로직 수정", ref: "commit-grow" },
				{ title: "회고 저장 API 트랜잭션 처리 개선", ref: "commit-grow" },
				{ title: "GitHub OAuth 콜백 에러 핸들링 추가", ref: "commit-grow" },
				{ title: "액션포인트 목록 정렬 로직 수정", ref: "commit-grow" },
			],
			moreCount: 0,
		},
		{
			type: "issue",
			label: "Issue",
			count: 4,
			items: [
				{ title: "세션 만료 시 리다이렉트 무한 루프", ref: "commit-grow" },
			],
			moreCount: 3,
		},
		{
			type: "pr",
			label: "PR",
			count: 3,
			items: [
				{ title: "히트맵 API 응답 캐싱 추가", ref: "feature/heatmap-cache" },
			],
			moreCount: 2,
		},
		{
			type: "review",
			label: "코드 리뷰",
			count: 0,
			items: [],
			moreCount: 0,
			emptyLabel: "오늘은 남긴 리뷰가 없어요",
		},
	],
	questions: [
		{ id: "q1", text: "오늘 PR 리뷰에서 어떤 기준으로 코멘트를 남겼나요?" },
		{ id: "q2", text: "테스트를 작성하면서 막혔던 부분이 있었나요?" },
		{ id: "q3", text: "내일 이어서 하고 싶은 작업이 있다면요?" },
	],
};

const NO_ACTIVITY: ActivityAndQuestions = {
	activity: [],
	questions: [{ id: "q1", text: "오늘 무엇을 하셨나요?" }],
};

export type MockScenario = "default" | "noactivity" | "error" | "loading";

export function fetchMockActivityAndQuestions(
	scenario: MockScenario,
): Promise<ActivityAndQuestions> {
	if (scenario === "loading") {
		return new Promise(() => {});
	}
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			if (scenario === "error") {
				reject(new Error("활동과 질문을 불러오지 못했어요"));
				return;
			}
			resolve(
				scenario === "noactivity" ? NO_ACTIVITY : ACTIVITY_WITH_QUESTIONS,
			);
		}, 800);
	});
}
