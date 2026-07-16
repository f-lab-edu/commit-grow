# 데이터 / API 명세

## 1. 엔티티 설계 (ERD)

```
User (구현됨)
 ├─ 1:N → GitActivity
 ├─ 1:N → Retrospect
 └─ 1:N → ActionPoint

Retrospect
 ├─ 1:N → RetrospectAnswer
 ├─ 1:N → KptItem
 └─ 1:N → ActionPoint (sourceRetrospectId로 역참조)
```

### 1.1 User (구현됨)

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | PK |
| userName | varchar(100) | GitHub username |
| email | varchar(100) | GitHub 이메일 |
| githubId | varchar(255) | GitHub 고유 ID, unique index |

### 1.2 GitActivity (제안)

일별 Git 활동 집계. 배치가 매일 적재하며, 회고 작성 당일("오늘") 데이터는 API 서버가 즉시 조회해 병행 사용한다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | PK |
| userId | uuid (FK → User) | 소유자 |
| activityDate | date | 활동 일자 |
| commitCount | int | 커밋 수 (비공개 레포 포함, 메시지는 미저장) |
| pullRequestCount | int | PR 수 |
| repoSummary | jsonb | 레포별 활동 요약 (레포명, 커밋 수 등) |
| collectedBy | enum(`BATCH`, `ON_DEMAND`) | 배치 수집 vs 회고 작성 시 즉시 조회 |

- unique index: (`userId`, `activityDate`)

### 1.3 Retrospect (제안)

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | PK |
| userId | uuid (FK → User) | 작성자 |
| retrospectDate | date | 회고 대상 일자 |
| sourceType | enum(`ACTIVITY_BASED`, `MANUAL_INPUT`) | 질문 생성 소스 |
| manualInputText | text, nullable | 직접 입력 원문 (`MANUAL_INPUT`일 때만) |
| summaryStatus | enum(`ANALYZING`, `COMPLETED`, `FAILED`) | 비동기 분석 상태 |
| title | varchar(100), nullable | AI 생성 제목 (분석 완료 시, FT-08) |
| summaryText | text, nullable | AI 요약 (분석 완료 시) |
| insightText | text, nullable | AI 인사이트 (분석 완료 시) |
| analyzedAt | datetime, nullable | 분석 완료 시각 |

- unique index: (`userId`, `retrospectDate`) — 하루 1회고 원칙
- **수정 불가.** `DELETE`만 허용 (soft delete: `isDeleted`)

### 1.4 RetrospectAnswer (제안)

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | PK |
| retrospectId | uuid (FK → Retrospect) | 소속 회고 |
| questionText | text | AI가 생성한 질문 |
| answerText | text | 사용자 답변 원문 |
| order | int | 질문 순서 (1~3) |

### 1.5 KptItem (제안)

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | PK |
| retrospectId | uuid (FK → Retrospect) | 소속 회고 |
| type | enum(`KEEP`, `PROBLEM`, `TRY`) | KPT 구분 |
| content | text | 내용 (답변 재구성 결과 또는 사용자 직접 추가/수정) |
| order | int | 표시 순서 |

### 1.6 ActionPoint (제안)

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | PK |
| userId | uuid (FK → User) | 소유자 |
| sourceRetrospectId | uuid (FK → Retrospect) | 추출 원본 회고 (Try 항목 기반) |
| content | text | 실행 단위 내용 (짧은 문장). 사용자 직접 작성/수정 시 보정 없이 입력 그대로 저장 |
| status | enum(`TODO`, `DONE`, `FAILED`, `ROUTINE`, `REMOVED`) | 진행 상태 (FT-04) |
| failureCount | int, default 0 | `FAILED` 처리될 때마다 +1. 별도 이력 테이블 없이 카운트만 유지 |
| completedAt | datetime, nullable | `DONE` 처리 시각 |
| reviewedAt | datetime, nullable | 리뷰 단계 4개 결정(`DONE`/`FAILED`/`ROUTINE`/`REMOVED`) 공통 갱신 시각 |

- 회고 삭제 시 `sourceRetrospectId`가 가리키는 액션포인트도 함께 삭제 ([[03-user-flow]] 참고)
- 상태 전이 제한 없음 — 리뷰 단계에서는 현재 상태와 무관하게 4개 결정 모두 선택 가능(예: `ROUTINE` → `FAILED` 가능)
- `REMOVED`는 소프트 삭제. 리뷰 단계의 "철회" 선택과 작성 단계(FT-07)의 기존 항목 삭제가 동일 메커니즘 사용
- 사용자당 활성(`TODO`+`FAILED`+`ROUTINE`) 액션포인트 최대 16개. 초과 시 저장 단계에서 신규 액션포인트 생성을 생략(회고 저장 자체는 정상 진행)

### 1.7 저장하지 않는 값 (파생 데이터)

아래는 별도 테이블 없이 조회 시점에 계산한다 (YAGNI 원칙).

- **스트릭**: `Retrospect.retrospectDate` 연속 여부로 계산
- **히트맵**: `GitActivity` + `Retrospect` 존재 여부 조합으로 계산

성능 이슈가 확인되면 캐시 테이블 도입을 후순위로 검토한다.

---

## 2. API 명세

기본 경로: `/api/v1` (Swagger: `/api-docs`, non-production 한정). 인증은 세션 쿠키(`express-session`) 기반이며, 인증 필요 API는 `Auth: 필요`로 표기한다. 에러 응답은 NestJS 기본 예외 필터 포맷(`statusCode`, `message`)을 따른다.

### 2.1 인증 (구현됨)

| Method | Path | Auth | 설명 |
| --- | --- | --- | --- |
| GET | `/auth/github` | 불필요 | GitHub OAuth 리다이렉트 시작 |
| GET | `/auth/github/callback` | 불필요 | OAuth 콜백, 세션 발급 후 `/` 리다이렉트 |
| GET | `/auth/signout` | 필요 | 로그아웃, 세션 파기 후 `/` 리다이렉트 |

### 2.2 대시보드 (제안)

| Method | Path | Auth | 설명 |
| --- | --- | --- | --- |
| GET | `/dashboard` | 필요 | 히트맵, 스트릭, TODO·FAILED·ROUTINE 액션포인트, 최근 회고 요약 카드를 한 번에 반환 |

응답 예시:

```json
{
  "heatmap": [{ "date": "2026-07-15", "commitCount": 4, "hasRetrospect": true }],
  "streak": { "current": 5, "badge": "5일 연속" },
  "actionPoints": [{ "id": "...", "content": "...", "status": "TODO" }],
  "recentRetrospects": [
    { "id": "...", "retrospectDate": "2026-07-15", "summaryStatus": "ANALYZING", "summaryText": null }
  ]
}
```

### 2.3 Git 활동 (제안)

| Method | Path | Auth | 설명 |
| --- | --- | --- | --- |
| GET | `/git-activities/today` | 필요 | 오늘 활동 즉시 조회(미수집 시 즉시 수집 후 반환) |
| GET | `/git-activities/:date` | 필요 | 특정 일자 활동 조회 (히트맵 상세 팝업용) |

### 2.4 액션포인트 (제안)

| Method | Path | Auth | 설명 |
| --- | --- | --- | --- |
| GET | `/action-points?status=TODO,FAILED,ROUTINE` | 필요 | 상태별 액션포인트 목록 (복수 상태 동시 조회 가능 — 대시보드·리뷰 화면은 TODO+FAILED+ROUTINE 조회) |
| PATCH | `/action-points/review` | 필요 | 회고 작성 진입(S-04) 시 기존 항목별 완료/실패/루틴/철회 일괄 반영. body: `{ items: [{ id, decision: 'DONE' \| 'FAILED' \| 'ROUTINE' \| 'REMOVED' }] }` |
| POST | `/retrospects/action-points/generate` | 필요 | 최종확인(S-06) 진입 시 확정된 Try 목록 기반 액션포인트 후보 생성 (최대 Try 개수만큼, 저장 없음) |

### 2.5 회고 (제안)

| Method | Path | Auth | 설명 |
| --- | --- | --- | --- |
| POST | `/retrospects/questions/generate` | 필요 | 활동 또는 직접 입력 기반 질문 생성 (최대 3개, 저장 없음) |
| POST | `/retrospects/kpt/reconstruct` | 필요 | 답변 1건을 K/P/T로 재구성해 누적 결과 반환 (저장 없음) |
| POST | `/retrospects` | 필요 | 회고 최종 저장. 클라이언트가 확정한 actionPoints 반영 + 분석 job 비동기 적재 |
| GET | `/retrospects?q=&page=` | 필요 | 목록 조회/검색 |
| GET | `/retrospects/:id` | 필요 | 상세 조회 (질문/답변, K/P/T, 요약/인사이트, 관련 액션포인트 포함) |
| DELETE | `/retrospects/:id` | 필요 | 회고 삭제 (관련 액션포인트 함께 삭제) |

`POST /retrospects` 요청/응답 예시:

```json
// Request
{
  "retrospectDate": "2026-07-16",
  "sourceType": "ACTIVITY_BASED",
  "answers": [{ "questionText": "...", "answerText": "...", "order": 1 }],
  "kpt": {
    "keep": ["..."],
    "problem": ["..."],
    "try": ["..."]
  },
  "actionPoints": [
    { "id": "existing-uuid", "content": "수정된 기존 항목 내용" },
    { "id": "existing-uuid-2", "removed": true },
    { "content": "신규 항목 (AI 후보 확정 또는 사용자 직접 추가, id 없음)" }
  ]
}

// Response
{
  "retrospectId": "...",
  "actionPoints": [{ "id": "...", "content": "..." }],
  "summaryStatus": "ANALYZING"
}
```

`actionPoints` 처리 규칙: `id` 있고 `removed` 없음 → 기존 항목 content 수정. `id` 있고 `removed: true` → 상태를 `REMOVED`로 전환. `id` 없음 → 신규 생성(`status: TODO`), 단 사용자의 활성 액션포인트 총량이 16개를 넘기면 초과분은 생성하지 않음.

### 2.6 배치 (내부, 제안)

REST API가 아닌 `@nestjs/schedule` 크론 진입점. 화면/외부 API 명세 대상이 아니므로 스케줄러 클래스명만 기록한다.

| 스케줄러 | 주기 | 설명 |
| --- | --- | --- |
| `RetrospectAnalysisScheduler` | 큐 기반(주기 폴링 또는 이벤트) | `summaryStatus = ANALYZING`인 회고를 LLM으로 분석 → `summaryText`, `insightText`, `analyzedAt` 갱신 |

### 2.7 공통 에러 응답

모든 API는 실패 시 아래 포맷을 반환하며, 클라이언트는 [[03-user-flow#5-공통-에러-정책]]에 따라 처리한다.

```json
{ "statusCode": 400, "message": "에러 메시지" }
```

## 3. 관련 문서

- [화면정의서](./04-screen-spec.md)
- [유저플로우](./03-user-flow.md)
