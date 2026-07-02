#!/usr/bin/env zsh
#
# 현재 브랜치를 기반으로 GitHub PR 생성 페이지를 브라우저에서 연다.
# create-branch.sh 로 만든 브랜치(<type>/<이슈번호>-<설명>)에서 실행해야 한다.
# 사용법: scripts/create-pr.sh

# 셔뱅을 무시하고 bash/sh로 실행되는 경우(에디터의 "실행" 버튼 등)를 대비해 zsh로 재실행한다.
if [ -z "${ZSH_VERSION:-}" ]; then
  exec zsh "$0" "$@"
fi

set -u

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [[ -z "$REPO_ROOT" ]]; then
  echo "git 저장소 안에서 실행해주세요." >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh(GitHub CLI)가 설치되어 있지 않습니다." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh 인증이 필요합니다. 'gh auth login'을 먼저 실행해주세요." >&2
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current)"
if [[ -z "$CURRENT_BRANCH" ]]; then
  echo "브랜치가 아닌 상태(detached HEAD)입니다." >&2
  exit 1
fi

if [[ ! "$CURRENT_BRANCH" =~ ^(feat|fix|refactor)/([0-9]+)-.+$ ]]; then
  echo "브랜치명이 컨벤션에 맞지 않습니다: $CURRENT_BRANCH" >&2
  echo "scripts/create-branch.sh 로 먼저 브랜치를 만들어주세요." >&2
  exit 1
fi
BRANCH_TYPE="$match[1]"
ISSUE_NUMBER="$match[2]"

case "$BRANCH_TYPE" in
  feat) TEMPLATE_FILE="feature.md"; TITLE_PREFIX="[✨ Feature] "; LABEL="✨ feature"; ISSUE_HEADING="배경 및 목적" ;;
  fix) TEMPLATE_FILE="bug.md"; TITLE_PREFIX="[🐛 Bug] "; LABEL="🐛 bug"; ISSUE_HEADING="현상" ;;
  refactor) TEMPLATE_FILE="refactor.md"; TITLE_PREFIX="[🔧 Refactor] "; LABEL="🔧 refactor"; ISSUE_HEADING="배경 및 목적" ;;
esac

TEMPLATE_PATH="$REPO_ROOT/.github/PULL_REQUEST_TEMPLATE/$TEMPLATE_FILE"
if [[ ! -f "$TEMPLATE_PATH" ]]; then
  echo "PR 템플릿 파일을 찾을 수 없습니다: $TEMPLATE_PATH" >&2
  exit 1
fi

if ! git push -u origin "$CURRENT_BRANCH"; then
  echo "브랜치 push에 실패했습니다." >&2
  exit 1
fi

git fetch --quiet

typeset -a BRANCHES_BY_DATE
while IFS= read -r b; do
  [[ "$b" == "HEAD" || "$b" == "origin" || "$b" == "$CURRENT_BRANCH" ]] && continue
  BRANCHES_BY_DATE+=("$b")
done < <(git for-each-ref --sort=-creatordate --format='%(refname:short)' refs/remotes/origin | sed 's#^origin/##')

typeset -a BASE_CANDIDATES
typeset -A SEEN_BRANCH
if [[ " ${BRANCHES_BY_DATE[*]} " == *" main "* ]]; then
  BASE_CANDIDATES+=("main")
  SEEN_BRANCH[main]=1
fi
for b in "${BRANCHES_BY_DATE[@]}"; do
  if [[ -z "${SEEN_BRANCH[$b]:-}" ]]; then
    BASE_CANDIDATES+=("$b")
    SEEN_BRANCH[$b]=1
  fi
done

if [[ ${#BASE_CANDIDATES[@]} -eq 0 ]]; then
  echo "선택 가능한 base 브랜치가 없습니다." >&2
  exit 1
fi

echo "어떤 브랜치로 PR을 보낼까요?"
for i in {1..${#BASE_CANDIDATES[@]}}; do
  echo "  $i. ${BASE_CANDIDATES[$i]}"
done
read "base_choice?선택: "

if [[ ! "$base_choice" =~ ^[0-9]+$ ]] || (( base_choice < 1 || base_choice > ${#BASE_CANDIDATES[@]} )); then
  echo "잘못된 선택입니다: $base_choice" >&2
  exit 1
fi
BASE_BRANCH="${BASE_CANDIDATES[$base_choice]}"

AHEAD_COUNT="$(git rev-list --count "origin/$BASE_BRANCH..$CURRENT_BRANCH")"
if [[ "$AHEAD_COUNT" -eq 0 ]]; then
  echo "'$BASE_BRANCH'와(과) 차이가 없습니다. 커밋을 먼저 만들어주세요." >&2
  exit 1
fi

EXISTING_PR_URL="$(gh pr list --head "$CURRENT_BRANCH" --state open --json url --jq '.[0].url')"
if [[ -n "$EXISTING_PR_URL" ]]; then
  echo "이 브랜치로 이미 열린 PR이 있습니다: $EXISTING_PR_URL" >&2
  exit 1
fi

ISSUE_BODY="$(gh issue view "$ISSUE_NUMBER" --json body --jq '.body')"
ISSUE_SECTION="$(awk -v heading="## ${ISSUE_HEADING}" '
  index($0, heading) == 1 { flag=1; next }
  index($0, "## ") == 1 { flag=0 }
  flag { print }
' <<< "$ISSUE_BODY")"

BODY_CONTENT="$(cat "$TEMPLATE_PATH")"
if [[ -n "${ISSUE_SECTION//[[:space:]]/}" ]]; then
  TMP_ISSUE_SECTION="$(mktemp)"
  print -r -- "$ISSUE_SECTION" > "$TMP_ISSUE_SECTION"
  # PR 템플릿의 "<!-- 주석 -->\n## 헤딩" 구조에서, 이슈 본문의 같은 이름 섹션 내용을
  # 헤딩 바로 아래에 끼워 넣고 기존 주석/placeholder는 제거한다.
  BODY_CONTENT="$(print -r -- "$BODY_CONTENT" | awk -v heading="## ${ISSUE_HEADING}" '
    BEGIN{hold=""}
    {
      if ($0 ~ /^<!--.*-->[ \t]*$/) { hold=$0; next }
      if (index($0, heading) != 1 && hold != "") { print hold }
      hold=""
      print
    }
  ' | awk -v content_file="$TMP_ISSUE_SECTION" -v heading="## ${ISSUE_HEADING}" '
    index($0, heading) == 1 {
      print
      while ((getline line < content_file) > 0) print line
      close(content_file)
      print ""
      skip=1
      next
    }
    index($0, "## ") == 1 { skip=0 }
    skip { next }
    { print }
  ')"
  rm -f "$TMP_ISSUE_SECTION"
fi

TMP_BODY="$(mktemp)"
trap 'rm -f "$TMP_BODY"' EXIT
print -r -- "$BODY_CONTENT" | sed "s/^Closes #\$/Closes #${ISSUE_NUMBER}/" > "$TMP_BODY"

gh pr create --web --title "$TITLE_PREFIX" --body-file "$TMP_BODY" --base "$BASE_BRANCH" --label "$LABEL"

echo "브라우저에서 PR 생성 페이지를 열었습니다. 확인 후 생성해주세요."
