# 유저플로우

## 1. 로그인 / 온보딩

```
[S-01 로그인] "GitHub으로 로그인" 클릭
  → GET /auth/github (GitHub OAuth 리다이렉트)
  → GitHub 인증 완료
  → GET /auth/github/callback
      - 최초 로그인: User 레코드 생성
      - 재로그인: 기존 User 조회
      - 세션 발급
  → [S-03 대시보드] 리다이렉트
      - 최초 로그인: Empty 상태로 온보딩 안내 노출 (FT-02)
      - 재로그인: 일반 대시보드
```

- 실패 시 [공통 에러 정책](#5-공통-에러-정책) 적용

## 2. 회고 작성 플로우 (핵심)

```
[S-03 대시보드] "오늘의 회고 작성하기" 클릭
  ↓
[S-04 진입] 액션포인트 리뷰
  GET /action-points?status=TODO,FAILED,ROUTINE
  - TODO·FAILED·ROUTINE 액션포인트 있음 → 항목별 "완료"/"실패"/"루틴"/"철회" 선택 UI 노출(전이 제한 없음)
      선택 → 로컬 상태로만 보관(API 호출 없음, 회고 최종 저장 시 함께 반영)
  - TODO·FAILED·ROUTINE 액션포인트 없음 → 이 단계 스킵
  ↓
Git 활동 자동 수집
  GET /git-activities/today
  - 활동 있음 → 활동 요약 확보, 다음 단계로
  - 활동 없음 → "오늘 무엇을 했나요?" 직접 입력 폼 노출 → 사용자 입력 확보
  ↓
AI 질문 생성
  POST /retrospects/questions/generate
  body: { source: 'ACTIVITY' | 'MANUAL', activitySummary? , manualInput? }
  → 최대 3개 질문 목록 응답
  ↓
[S-05 질문답변] 단계형 폼 (회원가입 마법사 스타일, 챗봇 UI 아님)
  질문 1개씩 노출, 진행률 표시 (예: 1/3)
  각 답변 제출마다:
    POST /retrospects/kpt/reconstruct
    body: { question, answer, currentKpt }
    → 갱신된 K/P/T 누적 결과 응답 (클라이언트 상태로 보관, 서버 저장 아님)
  마지막 질문 답변 제출 → 다음 단계로
  ↓
[S-06 최종확인] 누적 K/P/T 전체 검토 + 액션포인트 작성
  사용자가 직접 K/P/T 항목 추가/수정/삭제 가능 (클라이언트 로컬 편집)
  진입 시 POST /retrospects/action-points/generate (확정된 Try 기반 후보 생성, 저장 없음)
    → 신규 후보 목록 구성: Try 기반 AI 후보 + S-04에서 "실패"/"루틴"으로 결정한 항목을 참고해 만든 파생 초안("루틴/실패 생성 액션", 내용 미리 채움) + 사용자 직접 추가
    → 이 목록의 모든 항목은 저장 전 로컬 상태로 동일하게 자유 편집·제거 가능 (아직 API에 반영 안 된 상태이므로 삭제 개념 없이 목록에서 빼면 됨)
    → S-04에서 리뷰한 기존 액션포인트 자체(원본 row)는 여기서 수정하지 않음 — 내용은 그대로 두고 상태만 최종 저장 시 반영됨
  "저장" 클릭
  ↓
POST /retrospects
  body: { retrospectDate, sourceType, activitySnapshot | manualInput,
          answers: [...], kpt: { keep: [...], problem: [...], try: [...] },
          actionPointDecisions: [{ id, decision: 'DONE' | 'FAILED' | 'ROUTINE' | 'REMOVED' }],
          actionPoints: [{ content }] }
  서버 처리:
    (동기) actionPointDecisions 반영 — 기존 액션포인트 상태 갱신(DONE은 completedAt도, FAILED는 failureCount +1), reviewedAt 공통 갱신
    (동기) actionPoints 반영 — 전부 신규 생성(TODO), 활성 16개 초과분은 생성 생략
    (동기) Retrospect, RetrospectAnswer, KptItem 저장, 스트릭 +1
    (비동기) 요약/인사이트/제목 분석 job 큐 적재 (summaryStatus = ANALYZING)
  → { retrospectId, actionPoints: [...], summaryStatus: 'ANALYZING' } 응답
  ↓
[S-03 대시보드] 복귀
  - 액션포인트: 즉시 반영
  - 요약 카드: "분석중" 태그로 노출 → 배치 완료 시 폴링/재조회로 갱신
  - 스트릭: +1 반영
```

### 분기 요약

| 조건 | 분기 |
| --- | --- |
| 기존 TODO·FAILED·ROUTINE 액션포인트 존재 | S-04에서 리뷰 UI 노출 / 없으면 스킵 |
| Git 활동 존재 | 활동 기반 질문 생성 / 없으면 직접 입력 후 질문 생성 |
| 질문 답변 완료 여부 | 모두 답변 전에는 다음 단계로 진행 불가 |
| Try 중 실행 가능 항목 유무 | 0개면 Try 기반 후보 없이 진행(실패·루틴 참고 초안/직접 추가는 계속 가능) |
| 활성 액션포인트 총량(16개) 초과 여부 | 초과분은 저장 시 신규 생성 생략 |

### 설계 원칙과의 연결

- 단계형 폼을 쓰는 이유: 챗봇/전체 초안 생성은 "회고의 본질(스스로 사고)"을 흐리므로 배제 ([[00-overview|서비스 개요]] 핵심 가치 참고)
- K/P/T는 사용자 답변의 재구성이며 AI가 처음부터 창작하지 않음 → `POST /retrospects/kpt/reconstruct`는 answer 원문을 반드시 입력으로 받아야 함
- Try(서술형)와 액션포인트(짧은 실행 단위)는 별도 개념. 액션포인트는 최종확인(S-06) 단계에서 Try 기반으로 AI가 후보를 생성하고, 사용자가 확정한 내용이 저장 시점에 반영됨
- 액션포인트는 생성 후 내용이 바뀌지 않음. 리뷰에서 실패·루틴으로 결정된 기존 항목은 상태만 바뀔 뿐 그대로 유지되고, 내용을 조정하고 싶으면 그 항목을 참고한 새 액션포인트를 작성 단계에서 추가하는 방식으로 처리(원본과의 연결 없음, 맥락은 sourceRetrospectId로 추적)

## 3. 회고 기록 조회 / 삭제 플로우

```
[S-07 회고 기록 목록]
  GET /retrospects?q=&page=
  검색어 입력 → 목록 재조회
  항목 클릭 → [S-08 회고 상세]
    GET /retrospects/:id

[S-08 회고 상세]
  "삭제" 클릭
    → 확인 다이얼로그: "이 회고와 연결된 액션포인트도 함께 삭제됩니다"
    → 확인 시 DELETE /retrospects/:id
    → [S-07 목록] 복귀, 목록에서 제거됨
  * 회고는 수정 불가 (수정 버튼 없음)
```

## 4. 히트맵 상세 조회 플로우

```
[S-03 대시보드] 히트맵 특정 날짜 셀 클릭
  → [S-09 히트맵 상세 팝업]
      GET /git-activities/:date
      GET /retrospects?date= (해당일 회고 요약 미리보기, 있을 경우)
  → 팝업 내 "회고 상세 보기" 클릭 시 [S-08 회고 상세]로 이동
  → 팝업 닫기 시 [S-03 대시보드]로 복귀
```

## 5. 공통 에러 정책

```
임의 단계에서 API 요청 실패
  → 에러 메시지 노출 (토스트/얼럿, 목업 단계에서 형태 확정)
  → "/" 로 리다이렉션
```

- 회고 작성 위저드(S-04~S-06)도 예외 없이 동일 정책을 따른다. 중간 저장 기능이 없으므로 에러 발생 시 작성 중이던 내용은 유지되지 않는다.
- 이 정책은 초기 확정안이며, 추후 "재시도" 또는 "임시저장" UX 도입 여부는 미확정 (본 문서 범위 밖)

## 6. 관련 문서

- [화면정의서](./04-screen-spec.md)
- [데이터/API 명세](./05-data-api-spec.md)
