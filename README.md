# 매쓰두잉 V2

현재 운영 중인 V2 메인 화면을 유지하면서 Vercel 서버리스 API와 Supabase PostgreSQL 기반 공지사항 게시판을 추가한 프로젝트입니다.

## 구성

- `/` — 기존 매쓰두잉 V2 메인 화면
- `/notices` — 홈페이지 공지사항 목록
- `/notices/:id` — 공지사항 상세
- `/api/notices` — 공개 공지 목록 API
- `/api/notices/:id` — 공개 공지 상세 API
- `/api/sync/naver-notices` — 네이버 공지 동기화 API
- `/api/admin/notices` — 홈페이지 공지 등록 API
- `/api/admin/notices/:id` — 홈페이지 공지 수정·숨김 API

네이버 블로그 `hyunjp88`의 `공지사항(categoryNo=33)`을 원본으로 사용합니다. RSS에서 공지 대상과 발행일을 찾고, 개별 글 페이지에서 전체 본문과 이미지를 가져옵니다. 네이버 글 번호로 중복을 방지하고 본문 해시로 수정 여부를 판별합니다.

## 로컬 확인

Node.js 22를 사용합니다.

```bash
npm install
npm run check
npm run dev
```

`npm run dev`는 최신 Vercel CLI를 일회성으로 실행하므로 최초 실행 시 인터넷 연결, Vercel 로그인 또는 프로젝트 연결을 요구할 수 있습니다. API를 실행하려면 `.env.example`을 참고해 `.env.local`을 구성해야 합니다.

## Vercel 배포 준비

1. GitHub 저장소를 Vercel의 새 프로젝트로 가져옵니다.
2. Framework Preset은 `Other`로 두고 Root Directory는 저장소 루트를 사용합니다.
3. Supabase에서 새 프로젝트를 만들고 안전한 Database Password를 설정합니다.
4. Supabase Dashboard 상단의 **Connect → Transaction pooler**를 선택합니다.
5. 포트가 `6543`인 연결 문자열을 복사하고 `[YOUR-PASSWORD]`를 실제 비밀번호로 바꿉니다.
6. Supabase SQL Editor에서 `db/schema.sql`을 실행합니다. 첫 API 요청도 누락된 테이블을 자동 생성하지만, 배포 전에 명시적으로 실행하는 방식을 권장합니다.
7. 아래 환경변수를 Vercel의 Production·Preview·Development에 필요한 범위로 추가합니다.

| 변수 | 용도 |
|---|---|
| `SUPABASE_DATABASE_URL` | Supabase Transaction pooler PostgreSQL 연결 문자열. Vercel Marketplace가 `POSTGRES_URL`을 자동 등록한 경우 생략 가능 |
| `CRON_SECRET` | Vercel Cron 요청 검증용 비밀키 |
| `ADMIN_TOKEN` | 수동 동기화 및 관리자 API 비밀키 |
| `NAVER_BLOG_ID` | 기본값 `hyunjp88` |
| `NAVER_NOTICE_CATEGORY` | 기본값 `공지사항` |
| `NAVER_NOTICE_CATEGORY_NO` | 기본값 `33` |

`SUPABASE_DATABASE_URL`, `CRON_SECRET`, `ADMIN_TOKEN`은 클라이언트 코드에 넣지 않고 Vercel 서버 환경변수로만 보관합니다. `CRON_SECRET`과 `ADMIN_TOKEN`은 서로 다른 32바이트 이상의 임의 문자열을 권장합니다. 비밀키는 Git에 커밋하지 않습니다.

Database Password에 `@`, `:`, `/`, `#` 같은 문자가 있으면 연결 문자열 안에서는 URL 인코딩된 값으로 넣습니다.

Vercel 서버리스 함수에서는 연결이 짧게 반복되므로 Direct connection이 아니라 Transaction pooler를 사용합니다. 연결 드라이버는 해당 모드에 맞춰 prepared statement를 비활성화하고 함수 인스턴스당 연결 수를 1개로 제한합니다.

## 최초 데이터 가져오기

배포 후 현재 네이버 공지 2건을 가져옵니다.

```bash
curl -X POST "https://배포주소/api/sync/naver-notices" \
  -H "Authorization: Bearer ADMIN_TOKEN값"
```

성공하면 `imported`, `updated`, `unchanged`, `failed` 개수가 JSON으로 반환됩니다. Vercel Hobby의 Cron 주기 제한을 피하기 위해 무료 운영에서는 Supabase Cron이 보호된 동기화 API를 10분 간격으로 호출합니다. Pro로 전환하면 같은 작업을 Vercel Cron으로 옮길 수 있습니다.

## 홈페이지 공지 직접 등록

```bash
curl -X POST "https://배포주소/api/admin/notices" \
  -H "Authorization: Bearer ADMIN_TOKEN값" \
  -H "Content-Type: application/json" \
  -d '{"title":"공지 제목","bodyHtml":"<p>공지 본문</p>"}'
```

직접 등록한 글은 네이버 동기화와 독립적으로 유지됩니다. 네이버에서 가져온 글은 네이버 블로그에서 수정하며, 홈페이지에서는 다음 동기화 때 같은 글이 갱신됩니다.

## 도메인 전환 순서

1. Vercel의 임시 `*.vercel.app` 주소에서 메인·공지·상담·지도 기능을 검수합니다.
2. Vercel 프로젝트 Settings → Domains에 `mathdoing.com`과 `www.mathdoing.com`을 추가합니다.
3. Vercel이 안내하는 DNS 레코드를 현재 DNS 관리 서비스에 적용합니다.
4. SSL과 양쪽 도메인의 리디렉션을 확인한 뒤 GitHub Pages를 중지합니다.

도메인을 먼저 끊지 않고 Vercel 임시 주소에서 검수한 다음 DNS만 전환하면 서비스 중단 시간을 최소화할 수 있습니다.

## 운영 참고

- 네이버 RSS에 오래된 글이 빠졌다는 이유만으로 홈페이지 글을 자동 삭제하지 않습니다.
- 네이버 원문이 수정되면 같은 홈페이지 글을 갱신합니다.
- 네이버 이미지 주소는 현재 원문 URL을 사용합니다. 장기 보존이 필요하면 후속 단계에서 Supabase Storage 복사 기능을 추가합니다.
- 공지 본문은 저장 전에 허용 태그와 속성만 남기도록 정리합니다.
- `board_posts`에는 RLS를 활성화하고 `anon`, `authenticated` 역할의 직접 권한을 제거합니다. 공개 조회와 관리자 변경은 모두 Vercel API를 통합니다.
- `npm audit --omit=dev`로 실제 배포 의존성의 보안 상태를 확인할 수 있습니다.
