import MultipleChoiceQuestion from "./MultipleChoiceQuestion.jsx";
import ShortAnswerQuestion from "./ShortAnswerQuestion.jsx";
import TimerBar from "./TimerBar.jsx";

export default function QuestionCard({
  question,
  answer,
  onAnswerChange,
  onNext,
  isLast,
  remainingSeconds,
  showTimer,
  retryMode,
}) {
  return (
    <section className="question-card" aria-labelledby="question-title">
      {showTimer ? <TimerBar remainingSeconds={remainingSeconds} totalSeconds={question.timeLimitSeconds ?? 60} /> : null}
      <div className="question-meta">
        <span>{question.areaTitle}</span>
        {retryMode ? <strong>다시 풀기</strong> : null}
      </div>
      <h2 id="question-title">{question.prompt}</h2>

      {question.type === "multiple" ? (
        <MultipleChoiceQuestion question={question} value={answer} onChange={onAnswerChange} />
      ) : (
        <ShortAnswerQuestion value={answer} onChange={onAnswerChange} />
      )}

      <button className="primary-button" type="button" onClick={onNext}>
        {isLast ? "결과 보기" : "다음"}
      </button>
    </section>
  );
}
