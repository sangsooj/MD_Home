import { AREA_ORDER } from "./assessment.js";

const DIAGNOSIS_COPY = {
  stable: {
    type: "안정형",
    title: "전반적으로 안정",
    description: "네 영역 모두에서 큰 어려움은 보이지 않습니다.",
    recommendation: "현재 학습 흐름을 유지하되, 실수를 줄이기 위한 짧은 점검 습관을 이어갑니다.",
  },
  A: {
    type: "A형",
    title: "개념·수감각 보강형",
    description: "수의 의미, 크기 비교, 개념 설명에서 어려움이 나타납니다.",
    recommendation: "계산 훈련보다 먼저 개념을 말로 설명하고 그림이나 수직선으로 표현하는 활동이 필요합니다.",
  },
  B: {
    type: "B형",
    title: "절차·알고리즘 보강형",
    description: "계산 절차나 풀이 알고리즘 적용에서 어려움이 나타납니다.",
    recommendation: "풀이 순서를 단계별로 쓰고, 왜 그 순서로 계산하는지 설명하는 훈련이 필요합니다.",
  },
  C: {
    type: "C형",
    title: "기초 사실 유창성 보강형",
    description: "기본 계산을 빠르고 정확하게 처리하는 능력에서 보강이 필요합니다.",
    recommendation: "짧은 시간 안에 기본 계산을 반복하되, 속도보다 정확도를 먼저 안정시키는 연습이 필요합니다.",
  },
  D: {
    type: "D형",
    title: "자기점검·주의조절 보강형",
    description: "개념을 몰라서라기보다 문제 확인, 계산 검토, 실수 조절에서 흔들림이 나타납니다.",
    recommendation: "풀이 후 다시 읽기, 조건 표시하기, 답의 크기 어림하기 같은 자기점검 루틴이 필요합니다.",
  },
  AB: {
    type: "개념+절차 혼합형",
    title: "개념 이해와 절차 적용이 함께 흔들리는 유형",
    description: "개념 이해와 계산 절차 적용이 함께 보강되어야 합니다.",
    recommendation: "개념 설명 → 예시 풀이 → 유사 문제 적용 순서로 지도하는 것이 좋습니다.",
  },
  BD: {
    type: "절차+자기점검 혼합형",
    title: "풀이 절차와 자기점검이 함께 필요한 유형",
    description: "계산 절차를 익히는 것과 동시에 풀이 후 확인하는 습관이 필요합니다.",
    recommendation: "풀이 과정을 줄 맞춰 쓰고, 마지막에 계산 결과를 다시 확인하는 루틴을 만들어야 합니다.",
  },
  CD: {
    type: "유창성+자기점검 혼합형",
    title: "기초 계산 속도와 주의조절이 함께 필요한 유형",
    description: "기본 계산의 자동화와 실수 점검 훈련이 함께 필요합니다.",
    recommendation: "짧은 계산 훈련과 오답 재확인 훈련을 함께 진행하는 것이 좋습니다.",
  },
  complex: {
    type: "복합 보강형",
    title: "여러 영역에서 보강이 필요한 유형",
    description: "두 개 이상의 영역에서 어려움이 나타나므로 영역별 원인을 나누어 살펴볼 필요가 있습니다.",
    recommendation: "개념, 절차, 유창성, 자기점검 중 어느 부분이 먼저 흔들리는지 추가 관찰이 필요합니다.",
  },
};

export function normalizeAnswer(answer, answerType) {
  const normalized = String(answer ?? "").trim();

  if (answerType === "number") {
    return normalized.replace(/,/g, "");
  }

  return normalized.replace(/\s+/g, " ");
}

export function isAnswerCorrect(question, userAnswer) {
  const normalizedAnswer = normalizeAnswer(userAnswer, question.answerType);
  const acceptedAnswers = [question.answer, ...(question.acceptedAnswers ?? [])];

  return acceptedAnswers.some(
    (acceptedAnswer) => normalizedAnswer === normalizeAnswer(acceptedAnswer, question.answerType)
  );
}

export function getAreaStatus(wrongCount) {
  if (wrongCount <= 1) {
    return "안정";
  }

  if (wrongCount === 2) {
    return "보강";
  }

  return "우세 가능";
}

export function calculateAreaResults(questions, responses) {
  const byQuestionId = new Map(responses.map((response) => [response.questionId, response]));

  return AREA_ORDER.reduce((results, area) => {
    const areaQuestions = questions.filter((question) => question.area === area);
    const correct = areaQuestions.filter((question) => {
      const response = byQuestionId.get(question.id);
      return Boolean(response?.isCorrect);
    }).length;
    const total = areaQuestions.length;
    const wrong = total - correct;

    results[area] = {
      correct,
      wrong,
      total,
      status: getAreaStatus(wrong),
    };

    return results;
  }, {});
}

export function analyzeDArea(dResponses) {
  const firstWrongCount = dResponses.filter((response) => response.firstIsCorrect === false).length;
  const retryCorrectedCount = dResponses.filter(
    (response) => response.firstIsCorrect === false && response.isCorrect
  ).length;
  const finalWrongCount = dResponses.filter((response) => !response.isCorrect).length;

  return {
    firstWrongCount,
    retryCorrectedCount,
    finalWrongCount,
    isDTypeCandidate: firstWrongCount >= 3 && retryCorrectedCount >= 2,
  };
}

export function determineDiagnosisType(areaResults, dAnalysis) {
  const candidateAreas = ["A", "B", "C"].filter((area) => areaResults[area]?.wrong >= 3);

  if (dAnalysis.isDTypeCandidate) {
    candidateAreas.push("D");
  }

  if (candidateAreas.length === 0) {
    return DIAGNOSIS_COPY.stable;
  }

  if (candidateAreas.length === 1) {
    return DIAGNOSIS_COPY[candidateAreas[0]];
  }

  const key = candidateAreas.sort().join("");

  if (key === "AB") {
    return DIAGNOSIS_COPY.AB;
  }

  if (key === "BD") {
    return DIAGNOSIS_COPY.BD;
  }

  if (key === "CD") {
    return DIAGNOSIS_COPY.CD;
  }

  return DIAGNOSIS_COPY.complex;
}

export function generateReport(studentInfo, testData, questions, responses) {
  const areaResults = calculateAreaResults(questions, responses);
  const dAnalysis = analyzeDArea(responses.filter((response) => response.area === "D"));
  const diagnosis = determineDiagnosisType(areaResults, dAnalysis);
  const totalCorrect = AREA_ORDER.reduce((sum, area) => sum + areaResults[area].correct, 0);
  const totalQuestions = AREA_ORDER.reduce((sum, area) => sum + areaResults[area].total, 0);

  return {
    studentName: studentInfo.name,
    grade: Number(studentInfo.grade || testData?.grade),
    semester: Number(studentInfo.semester || testData?.semester),
    totalCorrect,
    totalQuestions,
    areaResults,
    dAnalysis,
    diagnosis,
  };
}
