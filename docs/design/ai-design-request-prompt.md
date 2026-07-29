# Commit Grow 디자인 시스템 요청 프롬프트 (v2, 2026-07-28)

`03-workflow.md` 2단계(Claude Design 2.1 세팅)에서 그대로 복사해 붙여넣는 프롬프트다. v1(전체 8화면 목업 요청)은 디자인 시스템 없이 화면부터 요청해 "개성 없음" 문제가 발생했던 버전이라 폐기하고, 이번엔 디자인 시스템만 먼저 확정한다.

**같이 첨부**: `01-feature-spec.md`, `04-screen-spec.md`, `00-overview.md`(톤앤매너 섹션), 참고 서비스 분석 4개(`codeit-design.md`, `linear-design.md`, `toss-tds.md`, `github_DESIGN_TOKENS_GUIDE.md`)

---

## 프롬프트 본문

```
Commit Grow는 GitHub 활동을 자동 수집해 AI가 질문형으로 회고 작성을 돕고,
회고마다 AI 분석·액션포인트를 제공하는 개발자 개인 성장 기록 서비스입니다.
혼자 회고를 지속하기 어려운 문제(백지 공포, 피드백 부재)를 해결하는 게 핵심입니다.

전체 화면이 아니라 지금은 "디자인 시스템(토큰)"만 먼저 확정합니다.
첨부한 기능명세서(01)·화면정의서(04)는 구조 파악용 참고 자료입니다.

## 톤앤매너 (반드시 반영)
- 차분한 (반대: 화려한/장난스러운) — 포인트 컬러는 면적용으로만, 채도 높은 배경/그라디언트 금지
- 담백한, 데이터 중심적 (반대: 감성적/과장된) — 숫자·그래프가 주인공, 장식적 일러스트 최소화
- 다정한, 응원하는 (반대: 사무적/평가하는) — 톤은 차분하되 문구·인터랙션은 딱딱하지 않게
- 문체: 해요체, 존댓말 유지하되 부드럽게 ("작성해주세요"보다 "오늘 하루 어땠나요?")
- 금지어: "실패", "미완료" 등 평가적 단어를 UI 텍스트에 노출하지 않음

## 참고 요소 (첨부 파일에서 아래 항목만 발췌, 통째로 베끼지 않음)
- 히트맵 색상 단계/스케일 구조: GitHub Primer 공식 토큰(첨부 github_DESIGN_TOKENS_GUIDE.md의 시맨틱 네이밍 방식 — bgColor/fgColor 페어링 규칙)
- 활동 트래킹 대시보드 레이아웃 밀도: WakaTime (첨부 없음, 설명만 참고: 카드형 위젯이 낮은 밀도로 나열되는 방식)
- 톤·색 구조·절제된 UX 라이팅: 첨부 codeit-design.md — 단일 액센트 색 + 무채색 베이스 + "권장/비권장/금지" 3단 규칙 강도 구분 방식을 참고
- 컴포넌트 상태 처리 로직: 첨부 toss-tds.md 중 색상·타이포·spacing·radius·motion 토큰과 상태 처리 규칙만 사용 (pressed는 별도 색이 아니라 검정 저투명도 오버레이, disabled는 컴포넌트 전체 노드에 opacity 적용). **모바일 전용 컴포넌트(bottom-sheet, bottom-cta 등)는 desktop-only 서비스라 제외**
- 절제된 정보 배치 철학: 첨부 linear-design.md 중 "제품 화면이 주인공, 장식 최소화" 철학만 참고. **이 파일은 Linear 마케팅 랜딩페이지 분석이라 다크 캔버스 톤은 그대로 가져오지 않음**
- 질문 하나씩 답하는 위저드 폼 UX: Typeform (첨부 없음, 설명만 참고: 한 화면에 질문 하나, 진행률 표시)

## 디자인 토큰 (고정값, 그대로 사용)
- Point #18F293 (텍스트 색상 금지, 버튼/배지 등 면적용만)
- Background #FFFFFF / Surface #FBFBFC, #FEFEFE / Text #3E3E40
- Font: Pretendard
- H1 24px/700, H2 18px/600, Body 14px/400, Caption 12px/400

이 5개 원시값만으로는 hover/active/disabled 변형이 없습니다.
첨부 파일들의 시맨틱 토큰 네이밍 방식(예: fill-primary/fill-secondary, txt-primary/txt-disabled)을 참고해서
위 5개 값에서 파생되는 시맨틱 색상 스케일(하버/액티브/디스에이블드 변형 포함)을 만들어주세요.

## 인터랙션 원칙 (첨부 github_DESIGN_TOKENS_GUIDE.md 기준 수치화)
- 모든 인터랙티브 요소는 5개 상태를 반드시 정의: rest / hover / focus-visible(:focus 단독 금지) / active(pressed) / disabled
- 모션 duration: hover·focus 같은 미세 반응은 100ms, 상태 변경은 200ms, UI 인터랙션은 300ms를 넘기지 않음(500ms 초과 금지)
- prefers-reduced-motion 환경에서는 모션 없이 즉시 상태 전환
- disabled는 부분 회색 처리가 아니라 컴포넌트 전체 노드에 opacity 적용 (Toss 방식)
- pressed는 별도 색상 토큰이 아니라 검정 15~25% 저투명도 오버레이로 표현 (Toss 방식)
- 대비: 일반 텍스트 4.5:1, 큰 텍스트/UI 요소 3:1 (WCAG AA) 이상 확보
- 로딩: 스켈레톤 UI 우선, 스피너는 보조 수단으로만

## 플랫폼
데스크톱 웹 전용, Chrome 기준, 1440px 고정. 반응형 대응 없음.

## 요청 사항
1. 위 5개 원시 토큰을 기반으로 시맨틱 색상 스케일(hover/active/disabled 변형 포함), 타이포, spacing, radius, shadow, motion 값을 포함한 디자인 시스템으로 확장해주세요.
2. 각 확장 값이 위 톤앤매너 키워드 중 무엇 때문에 그렇게 정했는지 짧게 근거를 남겨주세요.
3. 버튼/카드/뱃지/모달 등 공통 컴포넌트에 위 인터랙션 원칙(5개 상태, motion 수치)이 어떻게 적용되는지 예시를 보여주세요.
4. 참고 요소로 지정한 부분 외에는(특히 Toss의 모바일 패턴, Linear의 다크 톤) 가져오지 말아주세요.
```

---

## 왜 이렇게 구성했는지 (기록용)

- v1은 색상 hex·폰트만 넣고 화면부터 요청해 "개성 없다"는 평가를 받음 → v2는 톤앤매너·참고 요소·인터랙션 수치를 먼저 채워 넣어 재발 방지
- 참고 서비스 4개(codeit/linear/toss/github)는 성격이 달라 통째로 첨부하지 않고 요소 단위로 지정 — linear는 마케팅 사이트 분석, toss는 모바일 전용이라 그대로 쓰면 방향이 틀어짐
- 인터랙션 원칙은 "느낌"이 아니라 github_DESIGN_TOKENS_GUIDE.md의 MUST/SHOULD/NEVER 규칙에서 수치를 그대로 가져와 확정함
