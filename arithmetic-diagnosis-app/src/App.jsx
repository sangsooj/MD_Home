import { useEffect, useMemo, useState } from "react";
import StartScreen from "./components/StartScreen.jsx";
import TestLayout from "./components/TestLayout.jsx";
import QuestionCard from "./components/QuestionCard.jsx";
import CAreaIntro from "./components/CAreaIntro.jsx";
import RetryModal from "./components/RetryModal.jsx";
import ReportModal from "./components/ReportModal.jsx";
import {
  createBlankResponses,
  flattenQuestions,
  isAnswerCorrect,
  normalizeAreas,
  scoreAssessment,
} from "./utils/assessment.js";

const STORAGE_KEY = "mathdoing-arithmetic-diagnosis";
const initialStudent = { name: "", grade: "", semester: "" };

function getQuestionFile(student) {
  return `./questions/grade${student.grade}-semester${student.semester}.json`;
}

function findFirstIndexByArea(questions, area) {
  return questions.findIndex((question) => question.area === area);
}

function getStoredState() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const savedState = getStoredState();
  const [student, setStudent] = useState(savedState?.student ?? initialStudent);
  const [assessment, setAssessment] = useState(savedState?.assessment ?? null);
  const [questions, setQuestions] = useState(savedState?.questions ?? []);
  const [responses, setResponses] = useState(savedState?.responses ?? []);
  const [currentIndex, setCurrentIndex] = useState(savedState?.currentIndex ?? 0);
  const [currentAnswer, setCurrentAnswer] = useState(savedState?.currentAnswer ?? "");
  const [showCIntro, setShowCIntro] = useState(savedState?.showCIntro ?? false);
  const [cStarted, setCStarted] = useState(savedState?.cStarted ?? false);
  const [remainingSeconds, setRemainingSeconds] = useState(savedState?.remainingSeconds ?? 60);
  const [retryQuestionId, setRetryQuestionId] = useState(savedState?.retryQuestionId ?? null);
  const [retryModalOpen, setRetryModalOpen] = useState(false);
  const [finished, setFinished] = useState(savedState?.finished ?? false);
  const [error, setError] = useState("");

  const currentQuestion = questions[currentIndex];
  const score = useMemo(
    () => (finished ? scoreAssessment(questions, responses) : null),
    [finished, questions, responses]
  );

  useEffect(() => {
    const state = {
      student,
      assessment,
      questions,
      responses,
      currentIndex,
      currentAnswer,
      showCIntro,
      cStarted,
      remainingSeconds,
      retryQuestionId,
      finished,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [
    student,
    assessment,
    questions,
    responses,
    currentIndex,
    currentAnswer,
    showCIntro,
    cStarted,
    remainingSeconds,
    retryQuestionId,
    finished,
  ]);

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

  function moveToDAreaByTimeout() {
    setResponses((items) =>
      items.map((item) =>
        item.area === "C" && !item.answer ? { ...item, skippedByTimer: true } : item
      )
    );
    setCStarted(false);
    moveToIndex(findFirstIndexByArea(questions, "D"));
  }

  function finishAssessment() {
    setFinished(true);
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
      answer: currentAnswer,
      finalAnswer: currentAnswer,
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
        firstAnswer: currentAnswer,
        finalAnswer: currentAnswer,
        retryUsed: true,
        isCorrect: false,
      });
      setRetryQuestionId(question.id);
      setRetryModalOpen(true);
      return;
    }

    updateResponse(question, {
      firstAnswer: response?.firstAnswer || currentAnswer,
      finalAnswer: currentAnswer,
      retryUsed: Boolean(response?.retryUsed),
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
    moveToIndex(firstCIndex);
  }

  function restart() {
    window.localStorage.removeItem(STORAGE_KEY);
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
    setError("");
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
      {finished && score ? <ReportModal student={student} score={score} onRestart={restart} /> : null}
    </div>
  );
}
