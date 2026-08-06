---
name: design-reference
description: 프론트엔드 UI 구현/수정 시 디자인 목업(Claude Design) 참고용. "디자인 목업", "목업 참고", "V1.dc.html", "피그마 대신" 등 화면 디자인을 확인해야 할 때 사용.
---

# 디자인 참고 (Claude Design MCP)

디자인은 Figma 아님, Claude Design에 있음. 목업 내용 추측 금지 — 매번 MCP로 직접 읽고 구현.

- project_id: `cb3076cd-70f8-4ff6-82a0-d45df794cbc8`
- 참고 파일: `디자인 목업 V1.dc.html`
- 토큰: `_ds/commit-grow-design-system-*/tokens/*.css`

절차: (로그인 필요시 `/design-login`) → `read_design_skill`(hifi-design) → `read_file(project_id, "디자인 목업 V1.dc.html")` → 구현 → `render_preview`로 대조.
