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

## 처방 JSON 추가 방법

처방 파일은 `arithmetic-diagnosis-app/public/prescriptions/`에 추가합니다.

파일명 규칙:

```text
grade{학년}-semester{학기}-prescription.json
```

예:

```text
grade5-semester1-prescription.json
```

새로운 학년/학기 평가를 추가할 때 필요한 파일:

```text
arithmetic-diagnosis-app/public/questions/gradeX-semesterY.json
arithmetic-diagnosis-app/public/prescriptions/gradeX-semesterY-prescription.json
```

기본 구조:

```json
{
  "grade": 5,
  "semester": 1,
  "title": "초등 5학년 1학기 진단검사 처방",
  "diagnosisRules": [],
  "mixedRules": [],
  "defaultMixed": {},
  "stableResult": {},
  "prescriptions": {}
}
```

### diagnosisRules 작성 방법

`diagnosisRules`는 단일 유형 후보를 고르는 규칙 배열입니다. 유형명, 해석, 판정 조건은 코드가 아니라 이 JSON에 작성합니다.

```json
{
  "id": "A",
  "typeName": "A 개념·수감각형",
  "condition": {
    "area": "A",
    "wrongCountGte": 3
  },
  "summary": "분수 크기 비교, 어림, 약수·배수 의미가 흔들리는 유형입니다."
}
```

지원 condition 필드:

- `area`: `"A"`, `"B"`, `"C"`, `"D"`
- `wrongCountGte`: 틀린 개수 이상
- `wrongCountLte`: 틀린 개수 이하
- `firstWrongCountGte`: 첫 응답 오답 개수 이상
- `retryCorrectedCountGte`: 재시도 후 맞힌 개수 이상
- `finalWrongCountGte`: 최종 오답 개수 이상
- `includeTimeout`: 제한 시간으로 건너뛴 문항을 오답 수에 포함할지 여부
- `specificQuestionIds`: 특정 문항 id 배열. 지정하면 해당 문항 범위에서 조건을 계산합니다.

### mixedRules 작성 방법

후보 유형이 2개 이상이면 `mixedRules`에서 후보 id 조합과 정확히 일치하는 항목을 찾습니다. 순서는 상관없습니다.

```json
{
  "ids": ["A", "B"],
  "typeName": "개념+절차 혼합형",
  "summary": "개념 이해와 절차 적용이 함께 흔들리는 유형입니다.",
  "prescriptionIds": ["A", "B"]
}
```

일치하는 혼합 규칙이 없으면 `defaultMixed`를 사용합니다. `defaultMixed.useCandidatePrescriptions`가 `true`이면 후보 rule id에 해당하는 처방을 모두 보여줍니다.

### prescriptions 작성 방법

`prescriptions`는 상세 처방 페이지에 표시될 카드 데이터입니다. key는 `diagnosisRules[].id` 또는 `mixedRules[].prescriptionIds`에서 참조하는 id와 맞춰야 합니다.

```json
{
  "A": {
    "title": "개념·수감각 처방",
    "diagnosticMeaning": ["진단 의미 문장"],
    "prescriptionItems": ["처방 항목"],
    "lessonRoutine": ["수업 루틴"],
    "parentMessage": "학부모 안내 문장"
  }
}
```

중요 설계 원칙:

- 코드에 특정 학년/학기의 유형 설명, 처방 문구, 판정 조건을 하드코딩하지 않습니다.
- 모든 유형명, 해석, 처방은 처방 JSON에서 읽습니다.
- 검사 엔진은 공통 채점과 JSON 규칙 평가만 담당합니다.
## 전 문항 정답 안정형 판정

전체 16문항을 모두 맞히고 A, B, C, D 영역이 모두 4/4 정답이면 기존 A/B/C/D 오류형 처방보다 먼저 `안정형(유지·확장형)`으로 판정합니다.

안정형은 교정 처방을 표시하지 않고 `유지·확장 계획`을 표시합니다. 기본 활동은 짧은 복습, 풀이 과정 설명하기, 변형 문제 풀기, 계산 전 어림값 말하기, 다른 풀이 방법 생각하기, 쉬운 반복 70%와 응용·설명 30% 비율 운영입니다.

모두 맞혔더라도 다음 조건이 있으면 안정형 결과에 보조 안내가 추가됩니다.

- C영역 소요 시간이 제한 시간을 넘었거나 시간 초과로 기록된 경우: 유창성 보강 권장
- D영역에서 다시 확인 안내 후 고쳐 맞힌 문항이 있는 경우: 자기점검 독립성 보강 권장
- 추후 설명형 문항 또는 관찰 입력에서 설명 부족이 기록된 경우: 설명력 확장 권장

이 perfect score 판정은 prescription JSON의 오류형 규칙보다 우선합니다. 학년/학기별 문구를 다르게 쓰려면 prescription JSON에 `stablePerfectResult`를 선택적으로 추가할 수 있으며, 없으면 공통 기본 문구를 사용합니다.
