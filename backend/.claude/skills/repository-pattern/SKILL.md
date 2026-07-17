---
name: repository-pattern
description: MikroORM Repository 패턴. *.service.ts, *.read-repository.ts 파일 작성·수정하거나 DB 접근 코드 짤 때 사용.
---

# Repository 패턴
```ts
// retrospection.service.ts
constructor(@InjectRepository(Retrospection) private readonly repo: EntityRepository<Retrospection>) {}

// 쿼리 빌더 필요시 — retrospect.read-repository.ts
export class RetrospectRepository extends EntityReadRepository<Retrospect> {
  findByUserId(userId: string) {
    return this.createQueryBuilder().where({ userId }).orderBy({ createdAt: 'DESC' }).getResultList();
  }
}
```
