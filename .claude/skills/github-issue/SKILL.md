---
name: github-issue
description: GitHub 이슈 생성·서브이슈 연결 방식. feature.md/bug.md 템플릿 기반 이슈 작성하거나 특정 이슈 아래 서브이슈 만들 때 사용.
---

# GitHub 이슈 생성

## 템플릿 확인

`.github/ISSUE_TEMPLATE/`에서 해당 타입 템플릿(`feature.md`, `bug.md` 등) 먼저 읽고 그 구조(섹션, 체크박스) 그대로 따른다.

## 내용 근거

이슈 본문은 추측으로 채우지 않는다. `docs/planning/` 문서(화면 명세, 데이터/API 명세, 유저플로우 등) 또는 이미 존재하는 이슈(예: 상위 이슈, 유사 이슈)에서 실제 근거 찾아 반영. 참고한 문서는 "관련 이슈 / 참고" 섹션에 상대경로 링크로 남긴다.

## 생성 명령

```bash
gh issue create --repo <owner>/<repo> \
  --title "[✨ Feature] <제목>" \
  --label "✨ feature" \
  --body "$(cat <<'EOF'
<템플릿 구조 그대로 채운 본문>
EOF
)"
```

## 서브이슈로 연결

상위 이슈 아래 종속시키려면 생성 후 REST sub-issues API로 별도 연결(단순 "관련 이슈" 텍스트 언급만으로는 GitHub 서브이슈 UI에 반영 안 됨).

```bash
# 1. 서브이슈 생성 (본문 "관련 이슈 / 참고"에도 상위 이슈 번호 명시)
gh issue create --repo <owner>/<repo> --title "..." --label "✨ feature" --body "..."
# → 새로 생긴 이슈 번호 확인 (예: 23)

# 2. 상위 이슈의 numeric id 조회 후 sub_issue_id로 연결
gh api repos/<owner>/<repo>/issues/<상위이슈번호>/sub_issues \
  -X POST -F sub_issue_id="$(gh api repos/<owner>/<repo>/issues/<서브이슈번호> --jq .id)"
```

주의:
- `sub_issue_id`는 이슈 **number**가 아니라 REST 응답의 `id`(전역 numeric id). `-f`(문자열)가 아니라 `-F`(타입 추론) 사용 — 안 그러면 `Invalid property /sub_issue_id: is not of type integer` 에러.
- 연결 확인: 응답의 `sub_issues_summary.total` 값으로 확인 가능.
