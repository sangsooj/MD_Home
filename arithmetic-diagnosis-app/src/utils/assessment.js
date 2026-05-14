export const AREA_ORDER = ["A", "B", "C", "D"];

export function normalizeAnswer(value) {
  return String(value ?? "").trim();
}

export function isAnswerCorrect(question, answer) {
  return normalizeAnswer(answer) === normalizeAnswer(question.answer);
}

export function flattenQuestions(areas) {
  return AREA_ORDER.flatMap((areaKey) =>
    (areas?.[areaKey]?.questions ?? []).map((question, index) => ({
      ...question,
      area: areaKey,
      areaTitle: areas[areaKey]?.title ?? `${areaKey} 영역`,
      areaIndex: index,
      timeLimitSeconds: areas[areaKey]?.timeLimitSeconds,
      retryOnWrong: Boolean(areas[areaKey]?.retryOnWrong),
    }))
  );
}

export function createBlankResponses(questions) {
  return questions.map((question) => ({
    questionId: question.id,
    area: question.area,
    answer: "",
    firstAnswer: "",
    finalAnswer: "",
    retryUsed: false,
    isCorrect: false,
    skippedByTimer: false,
  }));
}

export function scoreAssessment(questions, responses) {
  const byQuestionId = new Map(responses.map((response) => [response.questionId, response]));
  const areaScores = AREA_ORDER.reduce((scores, area) => {
    scores[area] = { correct: 0, total: questions.filter((question) => question.area === area).length };
    return scores;
  }, {});

  let totalCorrect = 0;

  questions.forEach((question) => {
    const response = byQuestionId.get(question.id);
    const answer = question.area === "D" ? response?.finalAnswer : response?.answer;
    const isCorrect = isAnswerCorrect(question, answer);

    if (isCorrect) {
      totalCorrect += 1;
      areaScores[question.area].correct += 1;
    }
  });

  return {
    totalCorrect,
    totalQuestions: questions.length,
    areaScores,
  };
}
