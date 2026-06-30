# 파일 네이밍 규칙

프로젝트는 백엔드 / 프론트엔드로 나뉘며, 양쪽에 공통으로 적용되는 규칙과 각 영역별 규칙을 분리해 관리합니다.

---

## 공통

| 대상 | 규칙 | 예시 |
| --- | --- | --- |
| 폴더 | kebab-case (도메인 단위) | `weekly-report/` |
| 클래스 | PascalCase | `WeeklyReportService` |
| 변수 / 함수 | camelCase | `aggregateDailyActivity` |
| 상수 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 테스트 | 원본 파일명 + `.spec` | `retrospect.service.spec.ts` |

---

## 백엔드 (NestJS)

> NestJS 공식 컨벤션을 따릅니다.

### 기본 원칙

파일명은 **`[도메인].[역할].ts`** 형식의 **kebab-case** 로 작성합니다.

```
retrospect.controller.ts
retrospect.service.ts
retrospect.module.ts
retrospect.entity.ts
retrospect.read-repository.ts
retrospect.scheduler.ts
create-retrospect.dto.ts
auth.guard.ts
logging.interceptor.ts
```

### 역할별 suffix

| 역할 | suffix | 예시 |
| --- | --- | --- |
| 컨트롤러 | `.controller.ts` | `retrospect.controller.ts` |
| 서비스 | `.service.ts` | `retrospect.service.ts` |
| 모듈 | `.module.ts` | `retrospect.module.ts` |
| 엔티티 | `.entity.ts` | `retrospect.entity.ts` |
| 레포지토리 | `.read-repository.ts` | `retrospect.read-repository.ts` |
| DTO | `.dto.ts` | `create-retrospect.dto.ts` |
| 스케줄러 | `.scheduler.ts` | `retrospect.scheduler.ts` |
| 가드 | `.guard.ts` | `auth.guard.ts` |
| 인터셉터 | `.interceptor.ts` | `logging.interceptor.ts` |
| 단위 테스트 | `.spec.ts` | `retrospect.service.spec.ts` |
| E2E 테스트 | `.e2e-spec.ts` | `retrospect.e2e-spec.ts` |

### 테스트 파일

- **단위 테스트**(`*.spec.ts`)는 **대상 코드와 같은 폴더**에 둡니다. (colocation)
- **E2E 테스트**(`*.e2e-spec.ts`)는 각 앱의 `e2e-test/` 디렉터리에 둡니다.
- 배치 정책의 상세는 [디렉터리 구조 문서](./directory-structure.md)를 따릅니다.

> 단위/통합/E2E를 어떻게 나눠 작성할지(테스트 전략)는 **미정** — 추후 별도로 정의합니다.
> 여기서는 파일 네이밍·배치 규칙만 정의합니다.

### 참고

- 가능하면 `nest g <schematic> <name>` CLI로 파일을 생성해 규칙을 자동으로 맞춥니다.
  - 예: `nest g service retrospect` → `retrospect.service.ts` + `retrospect.service.spec.ts`

---

## 프론트엔드

> **미정** — 스택(React / Vue 등) 확정 후 별도로 정의합니다.
