# 커밋 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/) 를 따르며, 모노레포 특성상 **스코프(scope)** 로 변경 영역을 구분합니다.

## 형식

```
<type>(<scope>): <subject>
```

- **type**: 변경 종류 (아래 표 참고)
- **scope**: 변경 영역 — `api`, `batch`, `frontend`, `domain`, `root` 등 (생략 가능)
- **subject**: 한글로 간결하게, 마침표 없이

## 예시

```
feat(api): GitHub OAuth 로그인 구현
fix(frontend): 히트맵 날짜 오프셋 버그 수정
refactor(domain): 회고 집계 로직 분리
chore(root): .gitignore 업데이트
docs: README 아키텍처 섹션 추가
```

## type 목록

| type | 용도 |
| --- | --- |
| `feat` | 신규 기능 |
| `fix` | 버그 수정 |
| `refactor` | 기능 변경 없는 코드 개선 |
| `test` | 테스트 추가 / 수정 |
| `chore` | 빌드, 설정, 의존성 |
| `docs` | 문서 |

## scope 가이드

| scope | 대상 |
| --- | --- |
| `api` | API 서버 (`apps/api`) |
| `batch` | 배치 (`apps/batch`) |
| `domain` | 공유 도메인 (`libs/domain`) |
| `frontend` | 프론트엔드 |
| `root` | 루트 공통 설정 (gitignore, CI 등) |

- 여러 영역을 동시에 건드리는 공통 설정 변경은 스코프 없이 `chore:` 또는 `root` 스코프를 사용합니다.
- 스코프를 붙이면 `git log` 에서 변경 영역을 바로 구분할 수 있습니다.

## 브랜치 네이밍

작업 흐름은 **이슈 생성 → PR 생성 → 작업 → 리뷰 → Approve → 이슈 close** 순서로 진행하며,
브랜치는 이슈 번호를 기준으로 작성합니다.

```
feat/<이슈번호>-<간단한-설명>
fix/<이슈번호>-<간단한-설명>
```

예: `feat/12-github-oauth`
