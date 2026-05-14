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
    firstIsCorrect: null,
    isCorrect: false,
    skippedByTimer: false,
  }));
}
