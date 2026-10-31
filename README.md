# KIROTHON 2026 — Hackathon using Kiro

2026.11.14에 열리는 Kiro 해커톤 안내 페이지입니다.
빌드 과정 없이 `public/` 폴더를 그대로 배포하는 정적 사이트예요.

```
public/
├── index.html            # 메인 페이지 (내용 수정은 대부분 여기서)
├── 404.html              # 없는 주소로 들어왔을 때
├── favicon.svg
├── apple-touch-icon.png
└── assets/
    ├── css/style.css
    ├── js/main.js        # D-day, 카운트다운, 신청 버튼, 고스트 눈동자 등
    └── img/              # 하프톤 별(star-*.svg), 공유 이미지(og.jpg)
```

## 자주 바꿀 내용

### 참가 신청 구글폼 연결

`public/index.html` 상단의 meta 태그에 구글폼 주소를 넣으면 페이지의 모든 신청 버튼이 활성화됩니다.

```html
<meta name="kirothon:apply-url" content="https://forms.gle/..." />
```

비워 두면 버튼이 `신청 오픈 예정 · SOON` 상태로 표시되고, 누르면 안내 토스트가 뜹니다.

신청 마감일은 `public/assets/js/main.js`의 `APPLY_DEADLINE`(현재 2026-11-09 23:59 KST)입니다.
이 시각이 지나면 모든 신청 버튼이 자동으로 `신청 마감` 상태가 되고, 버튼 아래 안내 문구도 바뀝니다.
마감일을 바꾸면 `index.html`에 적힌 "11월 9일(월)" 문구들도 함께 고쳐 주세요.

### 미정 항목 표시 (TBA)

현재는 미정 항목이 없습니다. 나중에 정해지지 않은 값을 표시해야 하면 `tba` 클래스를 붙이면 외곽선 글씨로 보이고,
값이 정해지면 텍스트를 바꾸고 `tba` 클래스를 지우면 일반 글씨로 바뀝니다.

```html
<!-- 변경 전 -->
<p class="info-cell__value tba">TBA</p>
<!-- 변경 후 -->
<p class="info-cell__value">강남</p>
```

FAQ 답변과 푸터의 주최(`AUSG × ASBG × AWSKRUG`)도 `index.html`에서 바로 고칠 수 있어요.

### 주최 · 후원 로고

`index.html`의 `07 PARTNERS` 섹션에 있고, 로고 파일은 `public/assets/img/partners/`에 있습니다.
어두운 배경용으로 배경을 투명하게 만든 흰색 버전이에요. ASBG 칩 로고는 HTML 안에 SVG로 직접 그려져 있습니다.
AWS 로고는 현재 가이드에 맞춰 주황색 없이 흰색 단색으로 사용합니다.
후원사의 Kiro 로고(`kiro.png`)는 고스트 + 워드마크가 들어간 흰색 가로형 로고예요. 더 큰 원본(SVG 등)을 받으면 같은 이름으로 교체하면 됩니다.

## 로컬에서 보기

```bash
python3 -m http.server 4173 --directory public
```

브라우저에서 http://localhost:4173 을 열면 됩니다. (경로가 `/assets/...` 형태라 파일을 더블클릭해서 열면 스타일이 깨집니다.)

## 배포

### Cloudflare Pages

대시보드에서 Git 저장소를 연결할 때:

- Framework preset: `None`
- Build command: 비워 두기
- Build output directory: `public`

CLI로 바로 올릴 수도 있어요. (`wrangler.toml`에 출력 폴더가 지정되어 있습니다.)

```bash
npx wrangler pages deploy
```

### Vercel

저장소를 Import하면 `vercel.json` 설정(`outputDirectory: public`)대로 그대로 배포됩니다. Framework Preset은 `Other`로 두면 됩니다.

### 도메인 연결 (kirothon.ausg.me)

`index.html`의 대표 주소(`canonical`, `og:url`)와 링크 미리보기 이미지(`og:image`)는 `https://kirothon.ausg.me` 기준으로 적혀 있습니다. 도메인을 바꾸면 이 세 곳도 함께 고쳐 주세요.

- **Cloudflare Pages:** 프로젝트 → Custom domains → `kirothon.ausg.me` 추가. `ausg.me`의 DNS가 Cloudflare에 있으면 레코드가 자동으로 만들어지고, 아니면 DNS에 `kirothon` CNAME → `<프로젝트이름>.pages.dev`를 추가합니다.
- **Vercel:** 프로젝트 → Settings → Domains → `kirothon.ausg.me` 추가 후, 안내되는 CNAME 레코드(`kirothon` → `cname.vercel-dns.com`)를 DNS에 추가합니다.

배포 후에는 [카카오 공유 디버거](https://developers.kakao.com/tool/debugger/sharing)에서 주소를 넣어 미리보기가 잘 나오는지 확인하고, 이미지를 바꾼 뒤에는 같은 곳에서 캐시를 초기화해 주세요.
