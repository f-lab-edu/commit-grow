#!/usr/bin/env bash
set -euo pipefail

chmod +x .githooks/prepare-commit-msg
git config core.hooksPath .githooks
echo "git hooksPath -> .githooks 설정 완료"

if ! command -v ollama >/dev/null 2>&1; then
  echo "⚠️  Ollama 미설치. https://ollama.com/download 에서 설치 후 다시 실행하세요."
  exit 0
fi

if ! ollama list >/dev/null 2>&1; then
  echo "Ollama 서버 시작 중..."
  nohup ollama serve >/tmp/ollama-serve.log 2>&1 &
  disown
  for i in $(seq 1 10); do
    sleep 1
    ollama list >/dev/null 2>&1 && break
  done
fi

if ! ollama list | grep -q "qwen2.5-coder:7b"; then
  echo "모델 다운로드 중: qwen2.5-coder:7b (수 GB, 시간 걸릴 수 있음)"
  ollama pull qwen2.5-coder:7b
fi
