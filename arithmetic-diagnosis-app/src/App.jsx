import { useEffect, useState } from "react";
import StartScreen from "./components/StartScreen.jsx";
import TestLayout from "./components/TestLayout.jsx";
import QuestionCard from "./components/QuestionCard.jsx";
import CAreaIntro from "./components/CAreaIntro.jsx";
import RetryModal from "./components/RetryModal.jsx";
import ReportModal from "./components/ReportModal.jsx";
import {
  createBlankResponses,
  flattenQuestions,
  normalizeAreas,
} from "./utils/assessment.js";
import { generateReport, isAnswerCorrect } from "./utils/scoring.js";

const initialStudent = { name: "", grade: "", semester: "" };

function getQuestionFile(student) {
  const dataGrade = Number(student.grade) === 1 ? 3 : student.grade;
  return `./questions/grade${dataGrade}-semester${student.semester}.json`;
}

function findFirstIndexByArea(questions, area) {
  return questions.findIndex((question) => question.area === area);
}

export default function App() {
  const [student, setStudent] = useState(initialStudent);
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [showCIntro, setShowCIntro] = useState(false);
  const [cStarted, setCStarted] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const [retryQuestionId, setRetryQuestionId] = useState(null);
  const [retryModalOpen, setRetryModalOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState("");
  const [cAreaStartedAt, setCAreaStartedAt] = useState(null);
  const [cAreaElapsedSeconds, setCAreaElapsedSeconds] = useState(null);
  const [cAreaTimedOut, setCAreaTimedOut] = useState(false);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    let cancelled = false;

    async function buildReport() {
      if (!finished) {
        setReport(null);
        setReportLoading(false);
        return;
      }

      setReportLoading(true);
      const cAreaTimeLimitSeconds = normalizeAreas(assessment?.areas)?.C?.timeLimitSeconds ?? 60;
      const nextReport = await generateReport(student, assessment, questions, responses, {
        cAreaElapsedSeconds,
        cAreaTimeLimitSeconds,
        cAreaTimedOut,
      });

      if (!cancelled) {
        setReport(nextReport);
        setReportLoading(false);
      }
    }

    buildReport();

    return () => {
      cancelled = true;
    };
  }, [finished, student, assessment, questions, responses, cAreaElapsedSeconds, cAreaTimedOut]);

  useEffect(() => {
    if (!cStarted || !currentQuestion || currentQuestion.area !== "C") {
      return undefined;
    }

    if (remainingSeconds <= 0) {
      moveToDAreaByTimeout();
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setRemainingSeconds((seconds) => seconds - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cStarted, currentQuestion, remainingSeconds]);

  async function startAssessment() {
    setError("");

    try {
      const response = await fetch(getQuestionFile(student));

      if (!response.ok) {
        throw new Error("question-file-not-found");
      }

      const data = await response.json();
      const loadedQuestions = flattenQuestions(data.areas);

      if (loadedQuestions.length !== 16) {
        throw new Error("invalid-question-count");
      }

      setAssessment(data);
      setQuestions(loadedQuestions);
      setResponses(createBlankResponses(loadedQuestions));
      setCurrentIndex(0);
      setCurrentAnswer("");
      setShowCIntro(false);
      setCStarted(false);
      setRemainingSeconds(normalizeAreas(data.areas)?.C?.timeLimitSeconds ?? 60);
      setRetryQuestionId(null);
      setFinished(false);
      setReport(null);
      setReportLoading(false);
      setCAreaStartedAt(null);
      setCAreaElapsedSeconds(null);
      setCAreaTimedOut(false);
    } catch {
      setError("선택한 학년/학기의 문제 파일을 불러오지 못했습니다. 문제 JSON을 확인해 주세요.");
    }
  }

  function updateResponse(question, patch) {
    setResponses((items) =>
      items.map((item) => (item.questionId === question.id ? { ...item, ...patch } : item))
    );
  }

  function moveToIndex(nextIndex) {
    setCurrentIndex(nextIndex);
    setCurrentAnswer("");
  }

  function recordCAreaTiming(timedOut = false) {
    const timeLimitSeconds = normalizeAreas(assessment?.areas)?.C?.timeLimitSeconds ?? 60;
    const elapsedSeconds =
      typeof cAreaStartedAt === "number"
        ? Math.ceil((Date.now() - cAreaStartedAt) / 1000)
        : timeLimitSeconds - remainingSeconds;

    setCAreaElapsedSeconds(Math.max(0, elapsedSeconds));
    setCAreaTimedOut((current) => current || timedOut);
    setCAreaStartedAt(null);
  }

  function moveToDAreaByTimeout() {
    setResponses((items) =>
      items.map((item) =>
        item.area === "C" && !item.answer ? { ...item, skippedByTimer: true } : item
      )
    );
    recordCAreaTiming(true);
    setCStarted(false);
    moveToIndex(findFirstIndexByArea(questions, "D"));
  }

  function finishAssessment() {
    setFinished(true);
    setShowReport(true);
    setCStarted(false);
  }

  function moveNextAfterQuestion(question) {
    const nextIndex = currentIndex + 1;

    if (question.area === "B") {
      const nextQuestion = questions[nextIndex];
      if (nextQuestion?.area === "C") {
        setShowCIntro(true);
        return;
      }
    }

    if (question.area === "C") {
      const nextQuestion = questions[nextIndex];
      if (!nextQuestion || nextQuestion.area !== "C") {
        recordCAreaTiming(false);
        setCStarted(false);
        moveToIndex(findFirstIndexByArea(questions, "D"));
        return;
      }
    }

    if (nextIndex >= questions.length) {
      finishAssessment();
      return;
    }

    moveToIndex(nextIndex);
  }

  function submitCurrentAnswer() {
    if (!currentQuestion) {
      return;
    }

    if (currentQuestion.area === "D") {
      submitDAreaAnswer(currentQuestion);
      return;
    }

    updateResponse(currentQuestion, {
      questionId: currentQuestion.id,
      area: currentQuestion.area,
      answer: currentAnswer,
      isCorrect: isAnswerCorrect(currentQuestion, currentAnswer),
    });
    moveNextAfterQuestion(currentQuestion);
  }

  function submitDAreaAnswer(question) {
    const response = responses.find((item) => item.questionId === question.id);
    const retrying = retryQuestionId === question.id;
    const correct = isAnswerCorrect(question, currentAnswer);

    if (!retrying && !correct) {
      updateResponse(question, {
        questionId: question.id,
        area: question.area,
        firstAnswer: currentAnswer,
        finalAnswer: currentAnswer,
        retryUsed: true,
        firstIsCorrect: false,
        isCorrect: false,
      });
      setRetryQuestionId(question.id);
      setRetryModalOpen(true);
      return;
    }

    updateResponse(question, {
      questionId: question.id,
      area: question.area,
      firstAnswer: response?.firstAnswer || currentAnswer,
      finalAnswer: currentAnswer,
      retryUsed: Boolean(response?.retryUsed),
      firstIsCorrect: response?.firstIsCorrect ?? correct,
      isCorrect: correct,
    });
    setRetryQuestionId(null);
    moveNextAfterQuestion(question);
  }

  function startCArea() {
    const firstCIndex = findFirstIndexByArea(questions, "C");
    setShowCIntro(false);
    setCStarted(true);
    setRemainingSeconds(normalizeAreas(assessment?.areas)?.C?.timeLimitSeconds ?? 60);
    setCAreaStartedAt(Date.now());
    setCAreaElapsedSeconds(null);
    setCAreaTimedOut(false);
    moveToIndex(firstCIndex);
  }

  function restart() {
    setStudent(initialStudent);
    setAssessment(null);
    setQuestions([]);
    setResponses([]);
    setCurrentIndex(0);
    setCurrentAnswer("");
    setShowCIntro(false);
    setCStarted(false);
    setRemainingSeconds(60);
    setRetryQuestionId(null);
    setRetryModalOpen(false);
    setFinished(false);
    setShowReport(false);
    setReport(null);
    setReportLoading(false);
    setError("");
    setCAreaStartedAt(null);
    setCAreaElapsedSeconds(null);
    setCAreaTimedOut(false);
  }

  if (!assessment) {
    return (
      <div className="app-shell">
        <StartScreen student={student} onChange={setStudent} onStart={startAssessment} error={error} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TestLayout
        student={student}
        currentQuestion={showCIntro || finished ? null : currentQuestion}
        questionNumber={currentIndex + 1}
        totalQuestions={questions.length}
      >
        {showCIntro ? (
          <CAreaIntro onStart={startCArea} />
        ) : (
          <QuestionCard
            question={currentQuestion}
            answer={currentAnswer}
            onAnswerChange={setCurrentAnswer}
            onNext={submitCurrentAnswer}
            isLast={currentIndex === questions.length - 1}
            remainingSeconds={remainingSeconds}
            showTimer={cStarted && currentQuestion?.area === "C"}
            retryMode={retryQuestionId === currentQuestion?.id}
          />
        )}
      </TestLayout>

      {retryModalOpen ? <RetryModal onRetry={() => setRetryModalOpen(false)} /> : null}
      {finished && showReport && reportLoading ? (
        <div className="modal-backdrop" role="status" aria-live="polite">
          <div className="modal-card">
            <p className="eyebrow">Diagnosis Report</p>
            <h2>결과 리포트 준비 중</h2>
            <p>채점 결과와 처방 데이터를 불러오고 있습니다.</p>
          </div>
        </div>
      ) : null}
      {finished && showReport && report ? (
        <ReportModal report={report} onClose={restart} onRestart={restart} />
      ) : null}
    </div>
  );
}
