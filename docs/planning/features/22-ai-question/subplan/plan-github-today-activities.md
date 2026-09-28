# githubClient 구현 - 오늘의 Git 활동 조회 (#32)

**Goal:** `GithubClientService`에 사용자의 공개 Git 활동(commit/issue/PR/PR 리뷰)을 기간 범위로 조회해 유형별 집계 가능한 배열로 반환하는 메서드 추가("오늘" 조회는 호출자가 KST 자정~자정 범위를 넘기는 방식으로 구현)

**Spec:** [05-data-api-spec.md - 2.3 Git 활동](../../../05-data-api-spec.md) / [01-feature-spec.md - FT-04-1](../../../01-feature-spec.md)

---

## 설계 메모

- GitHub `GET /users/{username}/events/public` (Octokit `activity.listPublicEventsForUser`) 사용. "공개된" 활동이라는 이슈 요구사항과 정확히 일치하고, PR 리뷰까지 커버 가능한 유일한 API(Search API는 리뷰 이벤트를 못 가져옴). 커밋/이슈/PR/PR리뷰 4종류 모두 이 API 하나로 커버됨.
- 사용자 accessToken을 요청 헤더에 실어 인증된 요청으로 호출(레이트리밋 상향). 기존 `revokeAccessToken`과 동일하게 accessToken을 인자로 받는 패턴 유지.
- 메서드는 `getActivities(accessToken, username, startedAt: Date, endedAt: Date)` 형태로 기간 범위를 받는다(사용자 요청 반영). "오늘이 언제부터 언제까지인가"(타임존 정책)는 이 라이브러리가 알 필요 없는 호출자 책임 — 05-spec의 `/git-activities/:date`(특정 일자 조회) 같은 다른 기간 조회에도 그대로 재사용 가능. github-client는 `[startedAt, endedAt)` 범위로 이벤트의 `created_at`만 비교하는 순수 필터 역할만 한다.
  - `/git-activities/today` 호출 시(27번 이슈 스코프): KST 자정을 UTC로 환산해 `startedAt`/`endedAt`으로 넘기면 됨(KST는 서머타임 없이 UTC+9 고정이라 별도 라이브러리 없이 계산 가능).
- PushEvent는 `payload.commits[]`를 펼쳐 커밋별로 개별 활동 생성(사용자 확인 완료) — `githubNodeId`는 커밋 sha.
- 반환 타입의 `type` 필드는 신규 타입을 만들지 않고 기존 `libs/entity`의 `GitActivityTypeEnum` 재사용(`@app/entity` path alias로 이미 접근 가능, DB 저장 없이 값만 사용). 이슈 #27(API 구현)에서 이 반환값을 그대로 `GitActivity` 엔티티에 매핑하기 쉬워짐.
- 매핑 대상 이벤트 타입:
  - `PushEvent` → `COMMIT` (커밋별 1건)
  - `IssuesEvent` (action=`opened`) → `ISSUE`
  - `PullRequestEvent` (action=`opened`) → `PULL_REQUEST`
  - `PullRequestReviewEvent` (action=`created`) → `CODE_REVIEW`
  - 그 외 이벤트 타입은 무시
- GitHub API 실패는 예외 그대로 전파(이슈 요구사항, 정책은 TODO).
- 페이지네이션: 첫 페이지(`per_page` 기본값)만 조회. 이벤트는 최신순이라 `startedAt`보다 오래된 이벤트를 만나면 그 이후는 볼 필요 없음 — 여러 페이지를 순회해야 할 만큼 짧은 기간에 활동이 많은 경우는 없다고 가정. `ponytail: 단일 페이지만 조회, 기간 내 활동이 100건 넘는 극단 케이스 발견되면 페이지네이션 추가`

---

**Files:**

- Create: `backend/libs/github-client/src/GitActivity.dto.ts` — `GitActivityDto` (type/summary/repoName/activityAt/githubNodeId)
- Modify: `backend/libs/github-client/src/github-client.service.ts` — `getActivities(accessToken, username, startedAt, endedAt): Promise<GitActivityDto[]>` 메서드 추가
- Modify: `backend/libs/github-client/src/index.ts` — `GitActivityDto` export 추가
- Test: `backend/libs/github-client/src/github-client.service.spec.ts` — 신규 메서드 테스트 추가

- [x] **Step 1: 실패하는 테스트 작성**

개요: `getActivities` 시나리오 — (1) PushEvent 커밋 여러 개가 개별 COMMIT 활동으로 분리되는지, (2) IssuesEvent/PullRequestEvent/PullRequestReviewEvent가 각각 올바른 type으로 매핑되는지, (3) `[startedAt, endedAt)` 범위 밖 이벤트는 제외되는지, (4) 관심 없는 이벤트 타입(WatchEvent 등)은 무시되는지, (5) API 실패 시 에러가 그대로 전파되는지. 기존 spec처럼 octokit은 목킹하지 않고 최하단 `fetch`만 mock.

- [x] **Step 2: 테스트 실행해서 실패 확인** — `getActivities is not a function`으로 6개 테스트 실패 확인

- [x] **Step 3: 최소 구현 작성**

개요: `otokit.rest.activity.listPublicEventsForUser({ username, headers: { authorization: \`token ${accessToken}\` } })` 호출 → 이벤트 배열을 `[startedAt, endedAt)` 범위로 필터링 → 이벤트 타입별로 매핑해 `GitActivityDto[]` 반환.

- [x] **Step 4: 테스트 실행해서 통과 확인** — 10개 전부 통과, eslint/biome 클린(사전 존재하던 `validate()` 관련 tsc 에러 1건은 이번 변경과 무관, main에도 동일하게 존재)

- [x] **Step 5: 커밋** — `docs: ...` + `feat(github-client): ...` (2개 커밋)

---

## Task 2: Date → Temporal.Instant 전환 + fetch mock 타입 개선

**Goal:** `getActivities`의 시간 파라미터를 `Date`에서 `Temporal.Instant`로 교체하고, 테스트의 fetch mock을 `vitest-mock-extended`로 타입 안전하게 개선

**Spec:** 브레인스토밍 결과(사용자 요청) — Task 1의 후속 개선

- 추가 의존성: `@js-temporal/polyfill`(dependencies), `vitest-mock-extended@3.1.1`(devDependencies — vitest 3.x와 호환되는 버전으로 고정, 최신 5.x는 vitest >=4.0.0 요구해서 설치 불가했음)
- `GitActivityDto.activityAt`, `getActivities`의 `startedAt`/`endedAt`: `Date` → `Temporal.Instant`
- 범위 비교: `Temporal.Instant.compare()` 정적 메서드 사용(연산자 비교 불가)
- spec.ts: `fetchMock = vi.fn()` → `fetchMock = mockFn<typeof fetch>()`로 교체해 `fetch(input, init)` 인자/응답 타입 체크 활성화. 이 과정에서 `requestInit.headers.authorization` 직접 접근이 타입 에러가 나서 `new Headers(requestInit?.headers).get('authorization')`로 수정(HeadersInit이 여러 형태를 허용하는 유니온이라 정규화 필요) — Octokit을 mock하지 않고 fetch만 mock하는 기존 전략(헤더 병합 버그를 실제 요청 조립 로직으로 잡기 위함)은 그대로 유지

- [x] **Step 1~4: TDD로 테스트/구현 동시 치환** — 기존 테스트를 Temporal 타입으로 다시 작성 → 컴파일 에러로 실패 확인 → 서비스/DTO 타입 교체 → 10개 전부 통과, eslint/biome 클린
- [x] **Step 5: 커밋**

---

## Task 3: GitHub 이벤트 payload class-validator 검증 DTO 도입

**Goal:** GitHub API 응답 payload(외부 신뢰 경계)를 로컬 인터페이스 캐스팅 대신 class-validator DTO로 검증, 실패 시 로그 남기고 해당 이벤트만 skip

**Spec:** 브레인스토밍 결과(사용자 요청) — 기존 `apps/api/src/auth/dto/GithubOauthCallbackResponseDto.ts` 패턴(`static of(raw)` 팩토리 + 호출부 `validateSync()`) 재사용

- `dto/GithubEvent.dto.ts` 신규 — payload만 검증 대상(이벤트 최상위 `type`/`repo`/`created_at`은 Octokit이 이미 타입 보장해서 중복 검증 불필요). service.ts가 실제로 쓰는 최상위 4개만 `export`(ResponseDto 접미사), 내부 조립에만 쓰는 리프 타입은 비-export + `Item` 접미사로 구분(사용자 피드백 반영):
  - `export GithubPushEventPayloadResponseDto` ← (비공개)`GithubCommitItem`
  - `export GithubIssuesEventPayloadResponseDto` ← (비공개)`GithubIssueItem`
  - `export GithubPullRequestEventPayloadResponseDto` ← (비공개)`GithubPullRequestItem`
  - `export GithubPullRequestReviewEventPayloadResponseDto` ← (비공개)`GithubPullRequestItem`, `GithubReviewItem`
- `github-client.service.ts`: 이벤트 타입별로 해당 payload DTO `.of(rawPayload)` 생성 → `hasValidationError()` 헬퍼(`validateSync` + 실패시 `logger.error` 후 true 반환)로 검증 → 실패시 `continue`(skip)
- `dto/GitActivity.dto.ts`도 `dto/` 폴더로 함께 이동(신규 컨벤션)

- [x] **Step 1: 실패하는 테스트 작성** — payload 필수 필드(sha/title/node_id 등) 누락된 이벤트 4종류(PushEvent/IssuesEvent/PullRequestEvent/PullRequestReviewEvent)가 skip되고 `logger.error`가 4번 호출되는지 검증
- [x] **Step 2: 테스트 실행해서 실패 확인** — 검증 로직 없어서 4개 이벤트가 그대로 통과되어 실패
- [x] **Step 3: 최소 구현 작성** — `GithubEvent.dto.ts` DTO 8개 + service의 `hasValidationError()` 헬퍼로 교체
- [x] **Step 4: 테스트 실행해서 통과 확인** — 11개 전부 통과(기존 PullRequestReviewEvent 정상 케이스 fixture에 `pull_request.node_id` 누락돼있던 것도 이번에 발견해 실제 GitHub API 형태에 맞게 수정), eslint/biome 클린
- [x] **Step 5: 커밋**

#### 후속 반영(사용자 피드백)

- export 범위 축소: service.ts가 실제로 쓰는 최상위 4개 payload DTO만 `export`, 내부 리프 타입(`GithubCommitItem`/`GithubIssueItem`/`GithubPullRequestItem`/`GithubReviewItem`)은 비-export + `Item` 접미사로 구분
- 이벤트 최상위(`type`/`repoName`/`createdAt`)도 `GithubEventResponseDto`로 감싸 검증하도록 확장(기존엔 Octokit 타입만 믿고 `!event.created_at` 수동 체크만 했었음) — 검증 실패시 동일하게 로그 남기고 skip. 테스트 1개 추가(12개 전부 통과)
- `type` 필드 비교용 `GithubEventType` enum 추가(PUSH/ISSUES/PULL_REQUEST/PULL_REQUEST_REVIEW). 처음엔 `libs/entity`의 `BaseEnum.valueOf()`가 매칭 실패시 throw해서 안 맞는다고 보고 native TS enum으로 갔었으나, 최종적으로는 **`BaseEnum`을 유지하되 `valueOfOrUndefined()`(매칭 실패시 throw 대신 `undefined` 반환)를 새로 추가**해서 씀(아래 Task 4 참고) — 기존 `valueOf()`의 throw 동작에 의존하는 다른 도메인 enum(예: `GitActivityTypeEnum`)은 건드리지 않음

---

## Task 4: 동시편집 정합성 복구 + 구조 재편(집계형 반환)

**배경:** Task 3 커밋 이후 여러 파일이 동시에(직접 IDE 편집으로) 빠르게 바뀌면서 tsc 에러 5개 + 런타임 크래시 버그(`type`을 실제 enum 변환 없이 `as` 캐스팅만 해서 `.isEqaul()` 호출시 터짐) + Task 1에서 승인받은 `startedAt`/`endedAt` 범위필터가 통째로 사라진 상태가 됐음. 복구하면서 동시에 사용자가 원하던 구조 개선(파일 분리, 응답 집계 방식)도 함께 반영.

**최종 구조:**

- `backend/libs/entity/src/enums/BaseEnum.ts`: `valueOfOrUndefined()` 추가(매칭 실패시 throw 대신 `undefined`)
- `backend/libs/github-client/src/enum/GithubEventType.ts`: `BaseEnum` 기반, PUSH/ISSUES/PULL_REQUEST/PULL_REQUEST_REVIEW 4개 멤버
- `backend/libs/github-client/src/dto/activity/`: DTO 전부 이 폴더로 통합
  - `GithubEventResponseDto.ts` — `type: GithubEventType | undefined`, `createdAt: string`(파싱은 검증 통과 후 서비스에서 — `.of()` 안에서 바로 `Temporal.Instant.from()` 하면 `created_at: null`류 malformed 이벤트 하나가 전체 `getActivities()` 호출을 통째로 reject시켜서 안 됨)
  - `GithubPushEventPayload.dto.ts` / `GithubIssuesEventPayload.dto.ts` / `GithubPullRequestEventPayload.dto.ts` / `GithubPullRequestReviewEventPayload.dto.ts` — 각 payload별 파일 분리, 클래스명도 `...PayloadDto`(Response 접미사 제거)
  - `GitActivity.dto.ts` — **flat 배열 대신 유형별 집계 객체로 재설계**: `{ commits: [], issues: [], pullRequests: [], codeReviews: [] }`, 각 그룹에 `addByPushPayload()`/`addByIssuesPayload()`/`addByPullRequestPayload()`/`addByPullRequestReviewPayload()` 메서드로 채움(FT-04-1 "유형별 개수 집계" 요구사항에 더 직접 부합 — `type` 필드 자체가 없어져서 `GitActivityTypeEnum` 의존성도 제거됨)
- `github-client.service.ts`: `getActivities()` 반환 타입이 `GitActivityDto[]` → `GitActivityDto`(단일 집계 객체)로 변경. 이벤트를 `.map()` + `.filter()`로 먼저 검증/범위필터링한 뒤, 유효한 이벤트만 순회하며 타입별로 `resultDto.addByXxxPayload()` 호출
- 삭제: `dto/activity/GitActivityPayload.ts`(안 쓰이는 스텁), 정리: `libs/common/src/transformer/ToBaseEnum copy.ts` → `ToTemporalInstant.ts`로 rename(사용자가 직접 처리)

- [x] 테스트 전체를 집계 객체 형태(`expect.objectContaining({ commits: [...], issues: [...], ... })`)로 재작성, 12개 전부 통과
- [x] eslint/biome 클린, github-client + entity + api 전체 tsc 클린(무관한 pre-existing 에러 1건 제외)
- [ ] **커밋**
