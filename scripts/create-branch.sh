#!/usr/bin/env zsh
#
# 열린 이슈를 기반으로 컨벤션에 맞는 브랜치를 생성한다.
# 사용법: scripts/create-branch.sh

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

if ! command -v jq >/dev/null 2>&1; then
  echo "jq가 설치되어 있지 않습니다." >&2
  exit 1
fi

git fetch --quiet

ISSUES_JSON="$(gh issue list --state open --json number,title --limit 50)"
ISSUE_COUNT="$(echo "$ISSUES_JSON" | jq 'length')"
if [[ "$ISSUE_COUNT" -eq 0 ]]; then
  echo "열린 이슈가 없습니다." >&2
  exit 1
fi

typeset -a ISSUE_NUMBERS
typeset -a ISSUE_TITLES
while IFS=$'\t' read -r num title; do
  ISSUE_NUMBERS+=("$num")
  ISSUE_TITLES+=("$title")
done < <(echo "$ISSUES_JSON" | jq -r '.[] | "\(.number)\t\(.title)"')

echo "이슈를 선택해주세요."
for i in {1..${#ISSUE_NUMBERS[@]}}; do
  echo "  $i. #${ISSUE_NUMBERS[$i]} ${ISSUE_TITLES[$i]}"
done
read "issue_choice?선택: "

if [[ ! "$issue_choice" =~ ^[0-9]+$ ]] || (( issue_choice < 1 || issue_choice > ${#ISSUE_NUMBERS[@]} )); then
  echo "잘못된 선택입니다: $issue_choice" >&2
  exit 1
fi

SELECTED_NUMBER="${ISSUE_NUMBERS[$issue_choice]}"
SELECTED_TITLE="${ISSUE_TITLES[$issue_choice]}"

case "$SELECTED_TITLE" in
  '[✨ Feature]'*) BRANCH_TYPE="feat" ;;
  '[🐛 Bug]'*) BRANCH_TYPE="fix" ;;
  '[🔧 Refactor]'*) BRANCH_TYPE="refactor" ;;
  '[💬 Consulting]'*)
    echo "이 이슈 유형(Consulting)은 브랜치 생성 대상이 아닙니다." >&2
    exit 1
    ;;
  *)
    echo "이슈 제목에서 유형을 인식할 수 없습니다: $SELECTED_TITLE" >&2
    exit 1
    ;;
esac

CURRENT_BRANCH="$(git branch --show-current)"

typeset -a BRANCHES_BY_DATE
while IFS= read -r b; do
  BRANCHES_BY_DATE+=("$b")
done < <(git for-each-ref --sort=-creatordate --format='%(refname:short)' refs/heads/)

typeset -a LOCAL_BRANCHES
typeset -A SEEN_BRANCH

if [[ -n "$CURRENT_BRANCH" ]]; then
  LOCAL_BRANCHES+=("$CURRENT_BRANCH")
  SEEN_BRANCH[$CURRENT_BRANCH]=1
fi
if git show-ref --verify --quiet refs/heads/main && [[ -z "${SEEN_BRANCH[main]:-}" ]]; then
  LOCAL_BRANCHES+=("main")
  SEEN_BRANCH[main]=1
fi
for b in "${BRANCHES_BY_DATE[@]}"; do
  if [[ -z "${SEEN_BRANCH[$b]:-}" ]]; then
    LOCAL_BRANCHES+=("$b")
    SEEN_BRANCH[$b]=1
  fi
done

echo "어떤 브랜치에서 분기를 만들까요?"
for i in {1..${#LOCAL_BRANCHES[@]}}; do
  echo "  $i. ${LOCAL_BRANCHES[$i]}"
done
read "base_choice?선택: "

if [[ ! "$base_choice" =~ ^[0-9]+$ ]] || (( base_choice < 1 || base_choice > ${#LOCAL_BRANCHES[@]} )); then
  echo "잘못된 선택입니다: $base_choice" >&2
  exit 1
fi

BASE_BRANCH="${LOCAL_BRANCHES[$base_choice]}"

UPSTREAM_REF="refs/remotes/origin/$BASE_BRANCH"
if git show-ref --verify --quiet "$UPSTREAM_REF"; then
  BEHIND_COUNT="$(git rev-list --count "$BASE_BRANCH..origin/$BASE_BRANCH")"
  if [[ "$BEHIND_COUNT" -gt 0 ]]; then
    echo "경고: 로컬 '$BASE_BRANCH'가 origin보다 ${BEHIND_COUNT}커밋 뒤처져 있습니다."
    read "proceed?계속하시겠습니까? (y/N): "
    if [[ "$proceed" != "y" && "$proceed" != "Y" ]]; then
      echo "취소되었습니다."
      exit 1
    fi
  fi
fi

read "branch_desc?브랜치 설명을 입력해주세요 (예: github-oauth): "
if [[ -z "$branch_desc" ]]; then
  echo "브랜치 설명은 비워둘 수 없습니다." >&2
  exit 1
fi

BRANCH_NAME="${BRANCH_TYPE}/${SELECTED_NUMBER}-${branch_desc}"

if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
  echo "브랜치가 이미 존재합니다: $BRANCH_NAME" >&2
  exit 1
fi

git checkout -b "$BRANCH_NAME" "$BASE_BRANCH"

echo "\"$BRANCH_NAME\"을(를) \"$BASE_BRANCH\" 기준으로 생성했습니다."
