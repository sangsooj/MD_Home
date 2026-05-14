export const AREA_ORDER = ["A", "B", "C", "D"];

export function normalizeAreas(areas) {
  if (Array.isArray(areas)) {
    return areas.reduce((items, area) => {
      if (area?.area) {
        items[area.area] = area;
      }

      return items;
    }, {});
  }

  return areas ?? {};
}

export function normalizeAnswer(value) {
  return String(value ?? "").trim();
}

export function isAnswerCorrect(question, answer) {
  const normalizedAnswer = normalizeAnswer(answer);
  const acceptedAnswers = [question.answer, ...(question.acceptedAnswers ?? [])];

  return acceptedAnswers.some((acceptedAnswer) => normalizedAnswer === normalizeAnswer(acceptedAnswer));
}

export function flattenQuestions(areas) {
  const normalizedAreas = normalizeAreas(areas);

  return AREA_ORDER.flatMap((areaKey) =>
    (normalizedAreas?.[areaKey]?.questions ?? []).map((question, index) => ({
      ...question,
      area: areaKey,
      areaTitle: normalizedAreas[areaKey]?.title ?? `${areaKey} 영역`,
      areaIndex: index,
      timeLimitSeconds: normalizedAreas[areaKey]?.timeLimitSeconds,
      retryOnWrong: Boolean(normalizedAreas[areaKey]?.retryOnWrong),
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
