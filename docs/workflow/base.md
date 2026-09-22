# 기본 작업 순서

## 브래인 스토밍

어떤 기능을 어떻게 만들건지 생각하고 평가해서 문서로 정리하는 단계
클로드 코드 `/superpowers:brainstorming` 사용
`docs/planning/features/<이슈번호>-<기능-slug>/` 디렉토리에 문서 작성
`readme.md` 내용 근거로 `github-issue` 스킬 사용해 git issue 생성

### 작성 문서

문서 작성 순서: readme.md → api-spec.md / page-spec.md → plan.md

#### readme.md

템플릿: [template/readme.md](./template/readme.md)

#### api-spec.md

템플릿: [template/api-spec.md](./template/api-spec.md)

#### page-spec.md

템플릿: [template/page-spec.md](./template/page-spec.md)

#### plan.md

plan은 diff_code가 200줄 미만으로 생성되게 작업해야함

템플릿: [template/plan.md](./template/plan.md)

### 완료 기준

- 어떤 기능을 만들어 어떤 문제를 해결할 것인지 정의 되었는가?
- 유저 플로우를 보고 사용자에 니즈를 해결하는가?
- 데이터가 필요하면 어떤 API를 만들것인가? 테스트 케이스는?
- 화면이 필요하면 어떤 페이지를 만들것인가? 테스트 케이스는?
- git issue 생성 되었는가?
- plan.md 각 작업 단위가 diff 200줄 미만으로 쪼개졌는가?
