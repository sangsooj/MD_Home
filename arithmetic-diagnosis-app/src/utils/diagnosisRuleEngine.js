import { AREA_ORDER } from "./assessment.js";
import { getDiagnosisRules, getMixedRules } from "./prescriptionLoader.js";

const DATA_UNAVAILABLE_MESSAGE = "이 평가의 상세 처방 데이터가 아직 준비되지 않았습니다.";

export const DEFAULT_PERFECT_SCORE_RESULT = {
  diagnosis: {
    typeName: "안정형(유지·확장형)",
    summary: "해당 학기 핵심 내용에서 개념 이해, 계산 절차, 기초사실, 자기점검이 모두 안정적으로 나타났습니다.",
    description: "현재는 교정 중심의 처방보다 정확성을 유지하면서 설명력과 적용력, 유연성을 넓히는 학습이 적절합니다.",
    recommendation: "가정에서는 주 2~3회, 10분 내외의 짧은 복습과 응용·설명 활동으로 학습을 유지해 주세요.",
  },
  parentMessage:
    "이 학생은 해당 학기 수학 내용에 대해 안정적으로 이해하고 수행하고 있습니다. 현재는 교정보다 유지와 확장이 더 중요한 단계입니다. 가정에서는 많은 양의 반복학습보다, 짧은 복습과 설명하기, 약간의 응용 문제를 통해 정확성과 자신감을 함께 유지하도록 도와주세요.",
  detailMessage:
    "이 학생은 해당 학기 핵심 내용에서 개념 이해, 계산 절차, 기초사실, 자기점검이 모두 안정적으로 나타났습니다. 현재는 교정 중심의 처방보다 정확성을 유지하면서 설명력과 응용력을 넓히는 학습이 적절합니다. 가정에서는 주 2~3회, 10분 내외의 짧은 복습과 응용·설명 활동으로 학습을 유지해 주세요.",
  maintenancePlan: {
    title: "유지·확장 계획",
    summary: "교정 처방보다 정확성을 유지하면서 설명력과 응용력을 넓히는 방향이 적절합니다.",
    maintenanceItems: [
      "주 2~3회, 10분 내외 짧은 복습",
      "이미 맞힌 문제 중 1~2문항을 골라 풀이 과정을 말로 설명하기",
      "쉬운 반복 문제 70%, 약간 높은 응용·설명 문제 30% 비율로 운영하기",
    ],
    extensionItems: [
      "같은 개념의 약간 변형된 문제 풀기",
      "계산 전 어림값 말하기",
      "정답을 낸 뒤 다른 풀이 방법이 있는지 생각하기",
    ],
    items: [
      "주 2~3회, 10분 내외 짧은 복습",
      "이미 맞힌 문제 중 1~2문항을 골라 풀이 과정을 말로 설명하기",
      "같은 개념의 약간 변형된 문제 풀기",
      "계산 전 어림값 말하기",
      "정답을 낸 뒤 다른 풀이 방법이 있는지 생각하기",
      "쉬운 반복 문제 70%, 약간 높은 응용·설명 문제 30% 비율로 운영하기",
    ],
  },
};

const PERFECT_SCORE_NOTICE_DEFINITIONS = {
  FLUENCY_SPEED: {
    title: "유창성 보강 권장",
    typeName: "안정형(유창성 보강 권장)",
    message: "정확성은 안정적이지만 기본 계산 사실을 떠올리는 속도는 조금 더 자동화할 필요가 있습니다.",
    recommendation: "1~3분 단위의 짧은 시간 제한 계산 활동을 추가합니다.",
  },
  SELF_CHECK_INDEPENDENCE: {
    title: "자기점검 독립성 보강 권장",
    typeName: "안정형(자기점검 독립성 보강 권장)",
    message:
      "결과적으로는 모두 맞혔지만, 다시 확인 안내 후 고쳐 맞힌 문항이 있어 자기점검 독립성은 조금 더 훈련할 필요가 있습니다.",
    recommendation: "문제 풀이 후 스스로 체크리스트를 읽고 수정하는 연습을 합니다.",
  },
  EXPLANATION_EXTENSION: {
    title: "설명력 확장 권장",
    typeName: "안정형(설명력 확장 권장)",
    message: "정답을 맞히는 수행은 안정적이지만, 왜 그렇게 풀었는지 말로 설명하는 힘은 더 확장할 필요가 있습니다.",
    recommendation: "정답보다 풀이 이유를 말하게 하고, '왜?' 질문을 통해 개념의 언어화를 연습합니다.",
  },
};

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

function mergePerfectScoreOverrides(stablePerfectResult = {}) {
  return {
    diagnosis: {
      ...DEFAULT_PERFECT_SCORE_RESULT.diagnosis,
      ...(stablePerfectResult.diagnosis ?? stablePerfectResult),
    },
    parentMessage: stablePerfectResult.parentMessage ?? DEFAULT_PERFECT_SCORE_RESULT.parentMessage,
    detailMessage: stablePerfectResult.detailMessage ?? DEFAULT_PERFECT_SCORE_RESULT.detailMessage,
    maintenancePlan: {
      ...DEFAULT_PERFECT_SCORE_RESULT.maintenancePlan,
      ...(stablePerfectResult.maintenancePlan ?? {}),
    },
  };
}

function isAreaPerfect(areaResults) {
  return AREA_ORDER.every((area) => {
    const result = areaResults?.[area];
    return result && result.total > 0 && result.correct === result.total;
  });
}

function createNotice(code) {
  const notice = PERFECT_SCORE_NOTICE_DEFINITIONS[code];
  return notice ? { code, title: notice.title, message: notice.message, recommendation: notice.recommendation } : null;
}

export function detectPerfectScoreResult(
  reportBase,
  timingInfo = {},
  dAnalysis = reportBase?.dAnalysis,
  explanationInfo = {},
  stablePerfectResult = {}
) {
  const isPerfectScore =
    reportBase?.totalQuestions > 0 &&
    reportBase.totalCorrect === reportBase.totalQuestions &&
    isAreaPerfect(reportBase.areaResults);

  if (!isPerfectScore) {
    return {
      isPerfectScore: false,
      prescriptionIds: [],
    };
  }

  const resultText = mergePerfectScoreOverrides(stablePerfectResult);
  const notices = [];
  const cAreaElapsedSeconds = Number(timingInfo?.cAreaElapsedSeconds);
  const cAreaTimeLimitSeconds = Number(timingInfo?.cAreaTimeLimitSeconds);
  const cAreaTimedOut = timingInfo?.cAreaTimedOut === true;
  const isCAreaDelayed =
    cAreaTimedOut ||
    (Number.isFinite(cAreaElapsedSeconds) &&
      Number.isFinite(cAreaTimeLimitSeconds) &&
      cAreaElapsedSeconds > cAreaTimeLimitSeconds);

  if (isCAreaDelayed) {
    notices.push(createNotice("FLUENCY_SPEED"));
  }

  if ((dAnalysis?.retryCorrectedCount ?? 0) >= 1) {
    notices.push(createNotice("SELF_CHECK_INDEPENDENCE"));
  }

  if (explanationInfo?.hasExplanationWeakness === true) {
    notices.push(createNotice("EXPLANATION_EXTENSION"));
  }

  const filteredNotices = notices.filter(Boolean);
  const singleNoticeTypeName =
    filteredNotices.length === 1
      ? PERFECT_SCORE_NOTICE_DEFINITIONS[filteredNotices[0].code]?.typeName
      : null;

  return {
    isPerfectScore: true,
    diagnosis: {
      ...resultText.diagnosis,
      typeName: singleNoticeTypeName ?? resultText.diagnosis.typeName,
      flags: ["PERFECT_SCORE", ...filteredNotices.map((notice) => notice.code)],
      notices: filteredNotices,
      parentMessage: resultText.parentMessage,
      detailMessage: resultText.detailMessage,
    },
    prescriptionIds: [],
    maintenancePlan: resultText.maintenancePlan,
  };
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
