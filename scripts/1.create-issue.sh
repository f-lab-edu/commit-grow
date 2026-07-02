#!/usr/bin/env zsh
#
# .github/ISSUE_TEMPLATE 를 기반으로 GitHub 이슈를 생성한다.
# 사용법: scripts/create-issue.sh

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

TEMPLATE_DIR="$REPO_ROOT/.github/ISSUE_TEMPLATE"
typeset -A TEMPLATE_FILES=(
  1 "feature.md"
  2 "bug.md"
  3 "refactor.md"
  4 "consulting.md"
)

echo "어떤 이슈 유형입니까?"
echo "  1. feature (기본값)"
echo "  2. bug"
echo "  3. refactor"
echo "  4. consulting"
read "choice?선택 [1-4]: "
choice="${choice:-1}"

TEMPLATE_FILE="${TEMPLATE_FILES[$choice]:-}"
if [[ -z "$TEMPLATE_FILE" ]]; then
  echo "잘못된 선택입니다: $choice" >&2
  exit 1
fi

TEMPLATE_PATH="$TEMPLATE_DIR/$TEMPLATE_FILE"
if [[ ! -f "$TEMPLATE_PATH" ]]; then
  echo "템플릿 파일을 찾을 수 없습니다: $TEMPLATE_PATH" >&2
  exit 1
fi

TITLE_PREFIX="$(sed -n 's/^title: "\(.*\)"$/\1/p' "$TEMPLATE_PATH")"
LABEL="$(sed -n 's/^labels: "\(.*\)"$/\1/p' "$TEMPLATE_PATH")"
BODY_TEMPLATE="$(awk '/^---$/{c++; next} c>=2' "$TEMPLATE_PATH")"

TMP_BODY="$(mktemp)"
trap 'rm -f "$TMP_BODY"' EXIT
print -r -- "$BODY_TEMPLATE" > "$TMP_BODY"

gh issue create --web --title "$TITLE_PREFIX" --body-file "$TMP_BODY" --label "$LABEL"

echo "브라우저에서 이슈 생성 페이지를 열었습니다. 확인 후 생성해주세요."
