import MultipleChoiceQuestion from "./MultipleChoiceQuestion.jsx";
import ShortAnswerQuestion from "./ShortAnswerQuestion.jsx";
import TimerBar from "./TimerBar.jsx";
import { BlockMath } from "react-katex";

function QuestionPrompt({ question }) {
  const renderType = question.renderType ?? "text";
  const promptText = question.promptText ?? (question.formula ? "" : question.prompt);
  const formula = question.formula ?? (renderType === "math" ? question.prompt : "");

  return (
    <div className="question-prompt" id="question-title">
      {promptText ? <h2>{promptText}</h2> : null}
      {formula ? (
        <div className="question-formula">
          <BlockMath math={formula} />
        </div>
      ) : null}
    </div>
  );
}

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
      <QuestionPrompt question={question} />

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
