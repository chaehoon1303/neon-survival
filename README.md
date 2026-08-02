# NEON SURVIVOR

브라우저 Canvas와 바닐라 JavaScript로 만든 탑다운 생존 액션 로그라이크다. 웹에서 바로 실행할 수 있고 Capacitor를 통해 iOS 앱으로 패키징할 수 있다.

## 시작하기

Node.js와 Python 3가 준비된 환경에서 다음 명령을 실행한다.

```bash
npm run dev
```

브라우저에서 `http://localhost:8080`을 열고, 상자에서 무기를 얻어 장착한 뒤 전투를 시작한다. 이동은 `WASD` 또는 모바일 조이스틱을 사용한다.

## 검증

```bash
npm run check
```

이 명령은 JavaScript 문법, `docs.json`, Mintlify 문서의 내부 링크와 내비게이션을 검사한다.

## 문서

- 게임의 확정 규칙: [`GAME_SPEC.md`](GAME_SPEC.md)
- 기여/에이전트 규칙: [`AGENTS.md`](AGENTS.md)
- Mintlify 문서 소스: [`docs/`](docs/)
- 로컬 문서 미리보기: `npm run docs:dev`
- 코드 지식 그래프: `npm run graph:build` 또는 `npm run graph:update`

Graphify는 Python 3.10 이상이 필요하며, `uv`가 격리된 Python 환경을 자동으로 준비한다. 설치와 활용법은 `docs/tooling/graphify.mdx`에 정리되어 있다.
