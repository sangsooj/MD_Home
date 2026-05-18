import { AREA_ORDER } from "./assessment.js";
import { evaluateDiagnosisRules } from "./diagnosisRuleEngine.js";
import { loadPrescriptionData } from "./prescriptionLoader.js";

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

export async function generateReport(studentInfo, testData, questions, responses) {
  const areaResults = calculateAreaResults(questions, responses);
  const dAnalysis = analyzeDArea(responses.filter((response) => response.area === "D"));
  const totalCorrect = AREA_ORDER.reduce((sum, area) => sum + areaResults[area].correct, 0);
  const totalQuestions = AREA_ORDER.reduce((sum, area) => sum + areaResults[area].total, 0);
  const grade = Number(studentInfo.grade || testData?.grade);
  const semester = Number(studentInfo.semester || testData?.semester);
  const prescriptionData = await loadPrescriptionData(grade, semester);
  const reportBase = {
    areaResults,
    dAnalysis,
    responses,
    testMeta: {
      grade,
      semester,
      testData,
      questions,
    },
  };
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
  };
}
