---
name: git-workflow
description: 커밋 메시지 형식, type/scope 표, 브랜치 규칙, 작업 흐름. 커밋 작성·브랜치 생성·PR 작업 시 사용.
---

# Git 워크플로우

커밋 형식: `<type>(<scope>): <subject>` — subject는 **한글**로 간결히, 마침표 없이.

| type | 용도 |
|------|------|
| `feat` | 신규 기능 |
| `fix` | 버그 수정 |
| `refactor` | 기능 변경 없는 코드 개선 |
| `test` | 테스트 추가 / 수정 |
| `chore` | 빌드, 설정, 의존성 |
| `docs` | 문서 |

| scope | 대상 |
|-------|------|
| `api` | `apps/api` |
| `batch` | `apps/batch` |
| `domain` | `libs/domain` |
| `frontend` | 프론트엔드 |
| `root` | 루트 공통 설정 (gitignore, CI 등) |

예시:
```
feat(api): GitHub OAuth 로그인 구현
fix(frontend): 히트맵 날짜 오프셋 버그 수정
chore(root): .gitignore 업데이트
docs: README 아키텍처 섹션 추가
```

브랜치: `feat/<이슈번호>-<간단한-설명>`, `fix/<이슈번호>-<간단한-설명>` — 예: `feat/12-github-oauth`

**<간단한-설명>**은 영어만 사용, lower_snake_case

작업 흐름: **이슈 생성 → PR 생성 → 작업 → 리뷰 → Approve → 이슈 close**
