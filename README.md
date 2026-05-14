README

## 연산 오류 원인 분석 웹앱

React + Vite 기반의 정적 웹앱입니다. 서버 없이 브라우저에서 동작하며, GitHub Pages 배포를 고려해 빌드 결과는 `operation-diagnosis/` 폴더에 생성됩니다.

### 실행 방법

```bash
cd arithmetic-diagnosis-app
npm install
npm run dev
```

### 정적 빌드

```bash
cd arithmetic-diagnosis-app
npm run build
```

빌드 결과는 저장소 루트의 `operation-diagnosis/`에 생성됩니다. GitHub Pages에서 루트 배포를 사용하는 경우 `/operation-diagnosis/` 경로로 접근할 수 있습니다.

### 문제 JSON 추가 방법

문제 파일은 `arithmetic-diagnosis-app/public/questions/`에 둡니다.

파일명 규칙:

```text
grade{학년}-semester{학기}.json
```

예시:

```text
grade4-semester1.json
```

기본 구조:

```json
{
  "grade": 4,
  "semester": 1,
  "title": "초등 4학년 1학기 연산 오류 원인 분석",
  "areas": {
    "A": { "title": "A 영역", "questions": [] },
    "B": { "title": "B 영역", "questions": [] },
    "C": { "title": "C 영역", "timeLimitSeconds": 60, "questions": [] },
    "D": { "title": "D 영역", "retryOnWrong": true, "questions": [] }
  }
}
```

각 영역은 4문항씩, 전체 16문항으로 구성합니다. 문항은 `multiple` 또는 `short` 타입을 사용할 수 있습니다.
