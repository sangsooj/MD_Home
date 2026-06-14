import { AREA_ORDER } from "./assessment.js";
import { detectPerfectScoreResult, evaluateDiagnosisRules } from "./diagnosisRuleEngine.js";
import { loadCommonCriteria, loadPrescriptionData } from "./prescriptionLoader.js";

export function normalizeAnswer(answer, answerType) {
  if (answerType === "multipleSelect") {
    return Array.isArray(answer)
      ? answer.map((item) => normalizeAnswer(item)).sort().join("|")
      : String(answer ?? "")
          .split(",")
          .map((item) => normalizeAnswer(item))
          .filter(Boolean)
          .sort()
          .join("|");
  }

  if (Array.isArray(answer)) {
    return answer.map((item) => normalizeAnswer(item)).join("|");
  }

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

function isInRange(value, rangeText) {
  const [min, max] = String(rangeText ?? "").split("~").map((item) => Number(item.trim()));

  return Number.isFinite(min) && Number.isFinite(max) && value >= min && value <= max;
}

export function getAreaStatus(correctCount, wrongCount, commonCriteria) {
  if (wrongCount === 0) {
    return { status: "안정", meaning: "" };
  }

  const areaJudgement = commonCriteria?.commonCriteria?.areaJudgement;

  if (Array.isArray(areaJudgement)) {
    const matched = areaJudgement.find((judgement) => {
      const correctMatches =
        typeof judgement.correctCount === "number"
          ? judgement.correctCount === correctCount
          : judgement.correctCountRange
            ? isInRange(correctCount, judgement.correctCountRange)
            : true;
      const wrongMatches =
        typeof judgement.wrongCount === "number"
          ? judgement.wrongCount === wrongCount
          : judgement.wrongCountRange
            ? isInRange(wrongCount, judgement.wrongCountRange)
            : true;

      return correctMatches && wrongMatches;
    });

    if (matched) {
      return {
        status: matched.status,
        meaning: matched.meaning ?? "",
      };
    }
  }

  if (wrongCount <= 1) {
    return { status: "안정", meaning: "" };
  }

  if (wrongCount === 2) {
    return { status: "보강", meaning: "" };
  }

  return { status: "우세 가능", meaning: "" };
}

export function calculateAreaResults(questions, responses, commonCriteria = null) {
  const byQuestionId = new Map(responses.map((response) => [response.questionId, response]));

  return AREA_ORDER.reduce((results, area) => {
    const areaQuestions = questions.filter((question) => question.area === area);
    const correct = areaQuestions.filter((question) => {
      const response = byQuestionId.get(question.id);
      return Boolean(response?.isCorrect);
    }).length;
    const total = areaQuestions.length;
    const wrong = total - correct;
    const { status, meaning } = getAreaStatus(correct, wrong, commonCriteria);
    const areaCriteria = commonCriteria?.commonCriteria?.areas?.[area];

    results[area] = {
      name: areaCriteria?.name ?? areaQuestions[0]?.areaTitle ?? `${area} 영역`,
      description: areaCriteria?.description ?? "",
      correct,
      wrong,
      total,
      status,
      meaning,
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

export async function generateReport(studentInfo, testData, questions, responses, testMeta = {}) {
  const commonCriteria = await loadCommonCriteria();
  const areaResults = calculateAreaResults(questions, responses, commonCriteria);
  const dAnalysis = analyzeDArea(responses.filter((response) => response.area === "D"));
  const totalCorrect = AREA_ORDER.reduce((sum, area) => sum + areaResults[area].correct, 0);
  const totalQuestions = AREA_ORDER.reduce((sum, area) => sum + areaResults[area].total, 0);
  const grade = Number(studentInfo.grade || testData?.grade);
  const semester = Number(studentInfo.semester || testData?.semester);
  const prescriptionData = await loadPrescriptionData(grade, semester);
  const reportBase = {
    totalCorrect,
    totalQuestions,
    areaResults,
    dAnalysis,
    responses,
    testMeta: {
      grade,
      semester,
      testData,
      questions,
      ...testMeta,
    },
  };
  const perfectScoreResult = detectPerfectScoreResult(
    reportBase,
    reportBase.testMeta,
    dAnalysis,
    testMeta.explanationInfo,
    prescriptionData?.stablePerfectResult
  );

  if (perfectScoreResult.isPerfectScore) {
    return {
      studentName: studentInfo.name,
      grade,
      semester,
      totalCorrect,
      totalQuestions,
      areaResults,
      dAnalysis,
      candidateRuleIds: [],
      diagnosis: perfectScoreResult.diagnosis,
      prescriptionIds: [],
      maintenancePlan: perfectScoreResult.maintenancePlan,
      isPerfectScore: true,
      prescriptionData,
      prescriptionDataAvailable: Boolean(prescriptionData),
      commonCriteria,
      testMeta: reportBase.testMeta,
    };
  }

  const { candidateRuleIds, diagnosis, prescriptionIds, prescriptionDataAvailable } =
    evaluateDiagnosisRules(prescriptionData, reportBase);

  return {
    studentName: studentInfo.name,
    grade,
    semester,
    totalCorrect,
    totalQuestions,
    areaResults,
    dAnalysis,
    candidateRuleIds,
    diagnosis,
    prescriptionIds,
    prescriptionData,
    prescriptionDataAvailable,
    commonCriteria,
    testMeta: reportBase.testMeta,
  };
}
