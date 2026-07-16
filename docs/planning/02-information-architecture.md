# 정보구조 (IA)

## 1. 사이트맵

```
/ (로그인)                          ─ S-01
└── /auth/github/callback           ─ (리다이렉트 전용, 화면 없음)

/dashboard                          ─ S-03  [로그인 필요, 기본 진입점]
└── (모달) 히트맵 상세 팝업          ─ S-09

/retrospects/new                    ─ S-04 ~ S-06 [로그인 필요, 단계형 위저드]
├── Step 0: 액션포인트 리뷰          ─ S-04 (기존 TODO·FAILED·ROUTINE 있을 때만)
├── Step 1..N: 질문 답변             ─ S-05 (질문 개수만큼 반복, 최대 3)
└── Step N+1: 최종 확인              ─ S-06

/retrospects                        ─ S-07 [로그인 필요]
└── /retrospects/:id                ─ S-08 [로그인 필요]
```

## 2. 라우팅 규칙

| 경로 | 화면 | 인증 | 비고 |
| --- | --- | --- | --- |
| `/` | S-01 로그인 | 불필요 | 로그인 상태면 `/dashboard`로 리다이렉트 |
| `/dashboard` | S-03 대시보드 | 필요 | 기본 진입점(랜딩) |
| `/retrospects/new` | S-04~S-06 | 필요 | 단계는 쿼리스트링/내부 상태로 관리 (예: `?step=1`), 새로고침 시 처음부터 다시 시작 (임시 저장 없음, [[03-user-flow]] 참고) |
| `/retrospects` | S-07 목록 | 필요 | 검색어는 쿼리스트링(`?q=`) |
| `/retrospects/:id` | S-08 상세 | 필요 | 본인 소유 회고가 아니면 접근 불가 |

## 3. 내비게이션 구조

- GNB(전역 상단 내비게이션): 로고, "대시보드", "회고 기록", 프로필/로그아웃
- 대시보드 내 주요 진입점: "오늘의 회고 작성하기" 버튼 → `/retrospects/new`
- 회고 작성 위저드는 GNB를 숨기거나 이탈 방지 UI를 둘지 여부는 목업 단계에서 결정 (기획 미확정 사항으로 표기)

## 4. 화면 간 데이터 의존 관계

```
S-03 대시보드
 ├─ 히트맵 데이터 ← GitActivity(일별) + Retrospect(존재 여부)
 ├─ 스트릭 배지  ← Retrospect 저장 이력(연속일)
 ├─ 액션포인트 목록 ← ActionPoint(status=TODO·FAILED·ROUTINE)
 └─ 회고 요약 카드 ← Retrospect(summaryStatus, summaryText)

S-04 진입(액션포인트 리뷰) ← ActionPoint(status=TODO·FAILED·ROUTINE), GitActivity(오늘)
S-05 질문답변 ← S-04의 활동/입력 데이터로 생성된 질문 목록
S-06 최종확인 ← S-05에서 누적된 K/P/T
저장 시 → Retrospect, RetrospectAnswer, KptItem, ActionPoint 생성

S-09 히트맵 상세 팝업 ← GitActivity(특정일) + Retrospect(특정일 요약)
```

## 5. 관련 문서

- [유저플로우](./03-user-flow.md)
- [화면정의서](./04-screen-spec.md)
