import { getDiagnosisRules, getMixedRules } from "./prescriptionLoader.js";

const DATA_UNAVAILABLE_MESSAGE = "이 평가의 상세 처방 데이터가 아직 준비되지 않았습니다.";

function compareNumber(value, condition, gteKey, lteKey) {
  if (typeof condition?.[gteKey] === "number" && value < condition[gteKey]) {
    return false;
  }

  if (typeof condition?.[lteKey] === "number" && value > condition[lteKey]) {
    return false;
  }

  return true;
}

function sortIds(ids) {
  return [...ids].sort().join("|");
}

function getScopedResponses(condition, responses) {
  const ids = Array.isArray(condition?.specificQuestionIds) ? condition.specificQuestionIds : null;

  return responses.filter((response) => {
    if (condition?.area && response.area !== condition.area) {
      return false;
    }

    if (ids && !ids.includes(response.questionId)) {
      return false;
    }

    return true;
  });
}

function getWrongCount(condition, areaResults, responses) {
  const scopedResponses = getScopedResponses(condition, responses);

  if (Array.isArray(condition?.specificQuestionIds)) {
    return scopedResponses.filter((response) => {
      if (response.skippedByTimer && condition.includeTimeout !== true) {
        return false;
      }

      return !response.isCorrect;
    }).length;
  }

  const areaWrong = condition?.area ? areaResults?.[condition.area]?.wrong ?? 0 : 0;

  if (condition?.includeTimeout === true) {
    return areaWrong;
  }

  const timedOutWrong = scopedResponses.filter(
    (response) => response.skippedByTimer && !response.isCorrect
  ).length;

  return Math.max(0, areaWrong - timedOutWrong);
}

export function evaluateCondition(condition, areaResults, dAnalysis, responses = [], testMeta = {}) {
  if (!condition || typeof condition !== "object") {
    return false;
  }

  if (condition.area && !areaResults?.[condition.area]) {
    return false;
  }

  const wrongCount = getWrongCount(condition, areaResults, responses);
  const scopedResponses = getScopedResponses(condition, responses);
  const firstWrongCount =
    condition.area || condition.specificQuestionIds
      ? scopedResponses.filter((response) => response.firstIsCorrect === false).length
      : dAnalysis?.firstWrongCount ?? 0;
  const retryCorrectedCount =
    condition.area || condition.specificQuestionIds
      ? scopedResponses.filter((response) => response.firstIsCorrect === false && response.isCorrect).length
      : dAnalysis?.retryCorrectedCount ?? 0;
  const finalWrongCount =
    condition.area || condition.specificQuestionIds
      ? scopedResponses.filter((response) => !response.isCorrect).length
      : dAnalysis?.finalWrongCount ?? 0;

  if (!compareNumber(wrongCount, condition, "wrongCountGte", "wrongCountLte")) {
    return false;
  }

  if (
    typeof condition.firstWrongCountGte === "number" &&
    firstWrongCount < condition.firstWrongCountGte
  ) {
    return false;
  }

  if (
    typeof condition.retryCorrectedCountGte === "number" &&
    retryCorrectedCount < condition.retryCorrectedCountGte
  ) {
    return false;
  }

  if (
    typeof condition.finalWrongCountGte === "number" &&
    finalWrongCount < condition.finalWrongCountGte
  ) {
    return false;
  }

  if (condition.includeTimeout === true && testMeta.requireTimeoutForRule === true) {
    return scopedResponses.some((response) => response.skippedByTimer);
  }

  return true;
}

function createUnavailableDiagnosis() {
  return {
    typeName: "상세 처방 준비 중",
    summary: DATA_UNAVAILABLE_MESSAGE,
    description: DATA_UNAVAILABLE_MESSAGE,
  };
}

function createStableDiagnosis(stableResult = {}) {
  if (!stableResult.typeName) {
    return createUnavailableDiagnosis();
  }

  return {
    typeName: stableResult.typeName,
    summary: stableResult.summary ?? "",
    description: stableResult.description ?? "",
  };
}

function findMixedRule(candidateRuleIds, mixedRules) {
  const candidateKey = sortIds(candidateRuleIds);
  return mixedRules.find((rule) => Array.isArray(rule.ids) && sortIds(rule.ids) === candidateKey);
}

export function evaluateDiagnosisRules(prescriptionData, reportBase) {
  const diagnosisRules = getDiagnosisRules(prescriptionData);

  if (!prescriptionData || diagnosisRules.length === 0) {
    return {
      candidateRuleIds: [],
      diagnosis: createUnavailableDiagnosis(),
      prescriptionIds: [],
      prescriptionDataAvailable: false,
    };
  }

  const candidates = diagnosisRules.filter((rule) =>
    evaluateCondition(
      rule.condition,
      reportBase.areaResults,
      reportBase.dAnalysis,
      reportBase.responses,
      reportBase.testMeta
    )
  );
  const candidateRuleIds = candidates.map((rule) => rule.id);

  if (candidates.length === 0) {
    return {
      candidateRuleIds,
      diagnosis: createStableDiagnosis(prescriptionData.stableResult),
      prescriptionIds: [],
      prescriptionDataAvailable: true,
    };
  }

  if (candidates.length === 1) {
    const rule = candidates[0];

    return {
      candidateRuleIds,
      diagnosis: {
        typeName: rule.typeName,
        summary: rule.summary,
        description: rule.description ?? "",
      },
      prescriptionIds: [rule.id],
      prescriptionDataAvailable: true,
    };
  }

  const mixedRule = findMixedRule(candidateRuleIds, getMixedRules(prescriptionData));

  if (mixedRule) {
    return {
      candidateRuleIds,
      diagnosis: {
        typeName: mixedRule.typeName,
        summary: mixedRule.summary,
        description: mixedRule.description ?? "",
      },
      prescriptionIds: mixedRule.prescriptionIds ?? mixedRule.ids ?? [],
      prescriptionDataAvailable: true,
    };
  }

  const defaultMixed = prescriptionData.defaultMixed ?? {};

  return {
    candidateRuleIds,
    diagnosis: {
      typeName: defaultMixed.typeName ?? "복합 보강형",
      summary: defaultMixed.summary ?? "",
      description: defaultMixed.description ?? "",
    },
    prescriptionIds: defaultMixed.useCandidatePrescriptions ? candidateRuleIds : defaultMixed.prescriptionIds ?? [],
    prescriptionDataAvailable: true,
  };
}
