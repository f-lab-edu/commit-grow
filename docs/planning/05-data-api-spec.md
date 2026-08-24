# 데이터 / API 명세

## 1. 엔티티 설계 (ERD)

```
User (구현됨)
 ├─ 1:N → GitActivity
 ├─ 1:N → Retrospect
 ├─ 1:N → RetrospectQuestion
 ├─ 1:N → Purpose
 └─ 1:N → ActionPoint

Retrospect
 ├─ 1:N → RetrospectQuestion
 ├─ 1:N → GitActivity
 ├─ 1:N → KptItem
 └─ 1:N → ActionPoint (sourceRetrospectId로 역참조)

Purpose
 └─ 1:N → ActionPoint
```

### User

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | PK |
| userName | varchar(100) | GitHub username |
| email | varchar(100) | GitHub 이메일 |
| githubId | varchar(255) | GitHub 고유 ID, unique index |

### Retrospect

일별 회고 정보

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | PK |
| userId | uuid (FK → User) | 작성자 |
| retrospectDate | date | 회고 대상 일자 |
| summaryStatus | enum(`ANALYZING`, `COMPLETED`, `FAILED`) | 비동기 분석 상태 |
| title | varchar(100), nullable | AI 생성 제목 (분석 완료 시, FT-08) |
| summaryText | text, nullable | AI 요약 (분석 완료 시) |
| insightText | text, nullable | AI 인사이트 (분석 완료 시) |
| analyzedAt | datetime, nullable | 분석 완료 시각 |
| createdAt | datetime | 생성 시각 |
| updatedAt | datetime | 수정 시각 |
| deletedAt | datetime, nullable | 삭제 시각 |

- unique index: (`userId`, `retrospectDate`) — 하루 1회고 원칙
- **수정 불가.** `DELETE`만 허용 (soft delete: `isDeleted`)

### GitActivity

회고 작성시 사용한 Git 활동

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | PK |
| userId | uuid (FK → User) | 소유자 ID |
| retrospectId | uuid (FK → Retrospect) | 회고 ID |
| activityAt | date | 활동 시간 |
| git_id | varchar | git 기준 id | 
| summary | varchar | 활동 요약 |
| type | varchar | 활동 타입 (`COMMIT`, `ISSUE`, `PULL_REQUEST`, `CODE_REVIEW`) | 
| repoName | varchar | 레포명 |

- unique index: (git_id)

### RetrospectQuestion
회고시 사용한 질문

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | PK |
| retrospectId | uuid (FK → Retrospect) | 소속 회고 ID |
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

### 1.6 Purpose (제안)

액션포인트를 묶는 목적(Purpose) 그룹. S-07에서만 생성·수정하며 별도 관리 화면은 없다. 회고 1회성이 아니라 사용자에 귀속되어 이후 회고에서도 재사용됨(실패·루틴 항목이 원본 목적 그룹 아래 이어지므로).

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | PK |
| userId | uuid (FK → User) | 소유자 |
| content | varchar(100) | 목적 문구 |
| createdAt | datetime | 생성 시각 |

- 생성·문구 수정 모두 S-07 화면에서만 로컬로 반영되다가 `POST /retrospects` 저장 시 함께 반영됨(전용 CRUD API 없음)
- 액션포인트가 하나도 연결되지 않는 신규 목적은 저장되지 않음(S-07 비고 참고)

### 1.7 ActionPoint (제안)

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| id | uuid | PK |
| userId | uuid (FK → User) | 소유자 |
| sourceRetrospectId | uuid (FK → Retrospect) | 생성 원본 회고 |
| purposeId | uuid (FK → Purpose) | 소속 목적 그룹. 생성 시 확정, 이후 변경 불가(그룹 이동은 저장 전 로컬 드래그 앤 드롭에서만 가능, FT-06-6) |
| content | text | 실행 단위 내용 (짧은 문장). 생성 시점 입력 그대로 저장(존댓말·표준어 보정 없음). **생성 후 수정 불가** — 조정이 필요하면 새 액션포인트를 추가 |
| source | enum(`AI_SUGGESTED`, `MANUAL`, `CARRIED_OVER`) | 출처 배지("AI 제안"/"직접 추가"/"실패·루틴에서 이어짐"). 생성 시점에 확정, 이후 변경 불가 |
| status | enum(`TODO`, `DONE`, `FAILED`, `ROUTINE`, `REMOVED`) | 진행 상태 (FT-04) |
| failureCount | int, default 0 | `FAILED` 처리될 때마다 +1. 별도 이력 테이블 없이 카운트만 유지 |
| completedAt | datetime, nullable | `DONE` 처리 시각 |
| reviewedAt | datetime, nullable | 리뷰 단계 4개 결정(`DONE`/`FAILED`/`ROUTINE`/`REMOVED`) 공통 갱신 시각 |

- 회고 삭제 시 `sourceRetrospectId`가 가리키는 액션포인트도 함께 삭제 ([[03-user-flow]] 참고)
- 리뷰 결정은 화면(S-04)에서 즉시 반영되지 않고 로컬 상태로만 보관되다가, 회고 최종 저장(`POST /retrospects`) 시 다른 변경사항과 함께 한 번에 반영됨(전용 리뷰 반영 API 없음)
- 상태 전이 제한 없음 — 리뷰 단계에서는 현재 상태와 무관하게 4개 결정 모두 선택 가능(예: `ROUTINE` → `FAILED` 가능)
- `REMOVED`는 소프트 삭제이자 유일한 삭제 경로(리뷰 단계 "철회" 선택으로만 발생). 작성 단계의 신규 후보는 저장 전 로컬 상태라 별도 삭제 개념 없이 목록에서 빼면 됨
- 리뷰에서 "실패"/"루틴"을 선택해도 해당 항목은 상태만 `FAILED`/`ROUTINE`으로 바뀌고 content는 그대로 유지됨(수정 불가 원칙과 일관). 내용을 조정하고 싶으면(강도 조절 등) 그 항목을 참고해 작성 단계에서 **새 액션포인트**를 추가하는 방식으로 처리(source=`CARRIED_OVER`, 원본과 동일한 `purposeId`) — 원본 액션포인트와 FK 연결은 두지 않고, 맥락 추적은 `sourceRetrospectId`로 원본 회고를 따라가는 것으로 충분하다고 판단
- 사용자당 활성(`TODO`+`FAILED`+`ROUTINE`) 액션포인트 최대 16개. 초과 시 저장 단계에서 신규 액션포인트 생성을 생략(회고 저장 자체는 정상 진행)

### 1.8 저장하지 않는 값 (파생 데이터)

아래는 별도 테이블 없이 조회 시점에 계산한다 (YAGNI 원칙).

- **스트릭**: `Retrospect.retrospectDate` 연속 여부로 계산
- **히트맵**: `GitActivity` + `Retrospect` 존재 여부 조합으로 계산

성능 이슈가 확인되면 캐시 테이블 도입을 후순위로 검토한다.

---

## 2. API 명세

기본 경로: `/api/v1` (Swagger: `/api-docs`, non-production 한정). 인증은 세션 쿠키(`express-session`) 기반이며, 인증 필요 API는 `Auth: 필요`로 표기한다. 에러 응답은 NestJS 기본 예외 필터 포맷(`statusCode`, `message`)을 따른다.

### 2.0 공통 응답 형식

성공 응답은 모두 아래 포맷으로 감싼다(`NestJS` 공통 인터셉터로 일괄 적용, 엔드포인트별 구현 불필요).

```json
{
  "status": "OK",
  "timestamp": "2026-08-08T09:50:02.841Z",
  "data": { }
}
```

- `data`는 이 문서 각 API의 "응답 예시"에 있는 내용 그대로(아래 예시들은 `data` 내부만 표기, 감싸는 형태는 생략)
- 에러 응답은 이 포맷을 따르지 않고 2.7 포맷(`statusCode`, `message`) 그대로 유지 — NestJS 예외 필터가 별도 처리

### 2.1 인증 (구현됨)

| Method | Path | Auth | 설명 |
| --- | --- | --- | --- |
| GET | `/auth/github` | 불필요 | GitHub OAuth 리다이렉트 시작 |
| GET | `/auth/github/callback` | 불필요 | OAuth 콜백, 세션 발급 후 `/` 리다이렉트 |
| GET | `/auth/signout` | 필요 | 로그아웃, 세션 파기 후 `/` 리다이렉트 |

### 2.2 대시보드 (제안)

| Method | Path | Auth | 설명 |
| --- | --- | --- | --- |
| GET | `/dashboard` | 필요 | 스트릭, 회고/완료 액션포인트 개수, 회고·Git 활동 히트맵(각 위젯 FT-08-4/5), TODO 액션포인트, 최근 회고 요약 카드(최근 5개)를 한 번에 반환 |

응답 예시:

```json
{
  "streak": { "current": 5, "badge": "5일 연속" },
  "retrospectCount": 42,
  "completedActionPointCount": 12,
  "retrospectHeatmap": [{ "date": "2026-07-15", "hasRetrospect": true }],
  "gitActivityHeatmap": [{ "date": "2026-07-15", "commitCount": 4 }],
  "actionPoints": [{ "id": "...", "content": "...", "status": "TODO" }],
  "recentRetrospects": [
    { "id": "...", "retrospectDate": "2026-07-15", "summaryStatus": "ANALYZING", "summaryText": null }
  ]
}
```

- `actionPoints`는 TODO 상태만 반환(FT-08-6). FAILED·ROUTINE 포함 조회는 2.4의 `GET /action-points`(S-04 리뷰 화면 전용) 사용
- `retrospectHeatmap`/`gitActivityHeatmap`은 최근 1년(52주) 기준, 두 위젯 모두 GitHub 컨트리뷰션 그래프 형태로 별도 렌더링(S-03 구성요소 참고)

### 2.3 Git 활동 (제안)

| Method | Path | Auth | 설명 |
| --- | --- | --- | --- |
| GET | `/git-activities/today` | 필요 | 오늘 활동 즉시 조회(미수집 시 즉시 수집 후 반환) |
| GET | `/git-activities/:date` | 필요 | 특정 일자 활동 조회 (히트맵 상세 팝업용) |

### 2.4 액션포인트 (제안)

| Method | Path | Auth | 설명 |
| --- | --- | --- | --- |
| GET | `/action-points?status=TODO,FAILED,ROUTINE` | 필요 | 상태별 액션포인트 목록, 항목마다 소속 목적(`purpose: { id, content }`) 포함 (복수 상태 동시 조회 가능 — S-04 리뷰 화면은 TODO+FAILED+ROUTINE 조회, 목적별 그룹 카드는 클라이언트에서 `purpose.id` 기준으로 묶어 표시) |
| POST | `/retrospects/action-points/generate` | 필요 | S-07 진입 시 확정된 Try 목록 기반으로 목적·액션포인트 후보를 함께 생성(신규 목적 후보) + 로컬에서 "실패"/"루틴" 리뷰된 항목의 이어짐 후보를 원본 목적 그룹에 배치(저장 없음) |

응답 예시:

```json
{
  "aiSuggestedGroups": [
    { "purposeContent": "코드 리뷰 습관화", "actionPoints": ["..."] }
  ],
  "carriedOverGroups": [
    { "purposeId": "existing-purpose-uuid", "purposeContent": "테스트 커버리지 확보", "actionPoints": ["..."] }
  ]
}
```

리뷰 단계(S-04)의 완료/실패/루틴/철회 결정은 별도 API 없이 로컬 상태로 보관되다가 `POST /retrospects`에 `actionPointDecisions`로 포함되어 한 번에 반영된다(2.5 참고).

### 2.5 회고 (제안)

| Method | Path | Auth | 설명 |
| --- | --- | --- | --- |
| POST | `/retrospects/questions/generate` | 필요 | 활동 또는 직접 입력 기반 질문 생성 (최대 3개, 저장 없음) |
| POST | `/retrospects/kpt/reconstruct` | 필요 | 답변 1건을 K/P/T로 재구성해 누적 결과 반환 (저장 없음) |
| POST | `/retrospects` | 필요 | 회고 최종 저장. 액션포인트 리뷰 결정 반영 + 신규 액션포인트 생성 + 분석 job 비동기 적재 |
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
  "actionPointDecisions": [
    { "id": "existing-uuid-1", "decision": "DONE" },
    { "id": "existing-uuid-2", "decision": "FAILED" },
    { "id": "existing-uuid-3", "decision": "ROUTINE" },
    { "id": "existing-uuid-4", "decision": "REMOVED" }
  ],
  "purposeUpdates": [
    { "id": "existing-purpose-uuid", "content": "수정된 목적 문구" }
  ],
  "purposes": [
    { "tempId": "local-1", "content": "신규 목적(그룹) 문구" }
  ],
  "actionPoints": [
    {
      "content": "신규 액션포인트 (Try 기반 AI 후보 확정 / 실패·루틴 항목을 참고해 조정한 후속 항목 / 사용자 직접 추가 — 전부 동일하게 처리)",
      "source": "AI_SUGGESTED",
      "purposeId": "existing-purpose-uuid",
      "purposeTempId": null
    }
  ]
}

// Response
{
  "retrospectId": "...",
  "actionPoints": [{ "id": "...", "content": "...", "status": "TODO", "purposeId": "..." }],
  "summaryStatus": "ANALYZING"
}
```

처리 규칙: `actionPointDecisions`는 기존 액션포인트의 `decision`에 따라 상태 갱신(`DONE`→완료+`completedAt`, `FAILED`→`failureCount` +1, `ROUTINE`/`REMOVED`는 상태만 전환), 4개 결정 공통으로 `reviewedAt` 갱신. `purposeUpdates`는 기존 Purpose의 `content`만 갱신. `purposes`는 신규 목적 그룹 생성 — 클라이언트가 부여한 `tempId`를 `actionPoints[].purposeTempId`로 참조해 방금 만든 그룹에 연결(기존 그룹은 `purposeId`로 참조). `actionPoints`는 전부 신규 생성(`status: TODO`), 단 사용자의 활성 액션포인트 총량이 16개를 넘기면 초과분은 생성하지 않음. 액션포인트가 하나도 연결되지 않는 `purposes` 항목은 애초에 요청에 포함하지 않음(클라이언트에서 필터링, S-07 비고).

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
