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
- [ ] **Step 5: 커밋**
