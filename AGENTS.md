# AGENTS.md

이 파일은 이 저장소에서 작업하는 사람과 AI 에이전트가 따라야 하는 기본 규칙이다.

## 먼저 읽을 문서

1. 제품 규칙을 바꾸기 전 `GAME_SPEC.md`를 읽는다.
2. 코드 구조는 `docs/architecture.mdx`, 개발 절차는 `docs/development.mdx`를 참고한다.
3. 코드와 문서가 충돌하면 현재 동작을 확인한 뒤 코드와 문서를 같은 변경에서 함께 갱신한다.

## 프로젝트 구조

- `index.html`, `style.css`, `game.js`: 브라우저 게임의 셸, 스타일, 핵심 전투/메타 시스템
- `base.js`: 기지 성장 기능. `game.js`의 전역 함수를 감싸 확장한다.
- `modes.js`: 정복, 무한, 보스 러시 모드. `game.js`/`base.js`가 만든 전역 함수를 감싸 확장한다.
- `assets/`: 웹 원본 이미지
- `mobile-web/`: Capacitor가 패키징하는 웹 스냅샷
- `docs/`, `docs.json`: Mintlify 문서와 사이트 설정
- `GAME_SPEC.md`: 구현 시 보존해야 하는 확정 게임 규칙

## 변경 규칙

- 프레임워크나 번들러를 도입하지 않는다. 별도 합의가 없는 한 브라우저에서 직접 실행되는 바닐라 JavaScript를 유지한다.
- 스크립트 로드 순서는 `game.js` → `base.js` → `modes.js`다. 뒤 스크립트는 앞 스크립트의 전역 심볼에 의존한다.
- `base.js`와 `modes.js`에서 기존 함수를 감쌀 때 원본 함수를 상수에 저장하고 반환값과 호출 순서를 보존한다.
- 주무기는 마지막 이동 방향을 사용한다. 자동 스킬만 적을 자동 조준할 수 있다.
- 저장 데이터는 `localStorage`에 있으므로 기존 키를 삭제하거나 자료형을 바꾸지 않는다. 변경이 필요하면 마이그레이션과 문서화를 추가한다.
- 원본 웹 파일을 모바일에 반영할 때 `mobile-web/`의 대응 파일과 에셋도 동기화한다.
- 생성물인 `graphify-out/`, Capacitor 네이티브 프로젝트, 의존성 폴더는 직접 편집하거나 커밋하지 않는다.

## 검증

코드 변경 후 최소한 다음을 실행한다.

```bash
npm run check
```

UI나 게임플레이 변경은 로컬 서버에서 직접 확인한다.

```bash
npm run dev
```

문서를 바꾸면 `npm run docs:check`를 실행하고, 가능하면 `npm run docs:dev`로 Mintlify 미리보기도 확인한다.

## 문서와 그래프 갱신

- 새 시스템, 저장 키, 실행 절차, 파일 책임이 생기면 관련 `docs/*.mdx`와 필요 시 `GAME_SPEC.md`를 갱신한다.
- 아키텍처 탐색 전 `npm run graph:update`를 실행하면 Graphify가 변경된 저장소 그래프를 `graphify-out/`에 다시 만든다.
- Graphify가 설치되지 않은 환경은 `docs/tooling/graphify.mdx`의 설치 절차를 따른다.
