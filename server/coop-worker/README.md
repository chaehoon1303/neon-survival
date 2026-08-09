# NEON SURVIVOR 협동 방 서버

이 폴더는 최대 5인 파티의 **방 생성·참가·준비·시작 승인**을 처리하는 Cloudflare Worker + Durable Object다. 아직 전투 시뮬레이션을 동기화하지 않으며, 싱글플레이에 영향을 주지 않는다.

## 배포

1. [Cloudflare](https://dash.cloudflare.com/sign-up) 계정을 만든다.
2. 터미널에서 이 저장소 루트로 이동해 `npx wrangler@3.114.12 login`을 실행한다. 브라우저에서 Cloudflare 로그인을 승인한다.
3. `npm run coop:deploy`를 실행한다.
4. 출력된 주소에 `/ws`를 붙여 `coop-config.js`의 `serverUrl`에 넣는다.

예: `wss://neon-survivor-coop.<계정>.workers.dev/ws`

`workers.dev` 주소와 브라우저용 설정은 공개해도 되지만, Cloudflare API 토큰·계정 비밀번호·Supabase 서비스 키는 이 파일이나 Git에 넣지 않는다.

## 현재 메시지 계약

- 클라이언트 → 서버: `create-room`, `join-room`, `set-ready`, `request-start`
- 서버 → 클라이언트: `room-state`, `room-error`, `start-approved`

방 서버는 플레이어 ID 중복과 방 인원 5명 제한을 막고, 방장이면서 모든 인원이 준비된 경우에만 시작을 승인한다. 정식 계정과 연결할 때는 현재의 임시 `profile.id`를 서버가 검증한 Supabase JWT의 `sub`로 바꾸고, 전투 권한 서버를 별도로 추가해야 한다.
