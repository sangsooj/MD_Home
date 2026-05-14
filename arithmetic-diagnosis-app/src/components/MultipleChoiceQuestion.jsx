export default function MultipleChoiceQuestion({ question, value, onChange }) {
  return (
    <div className="choice-grid" role="radiogroup" aria-label="객관식 선택지">
      {question.choices.map((choice) => (
        <button
          key={choice}
          type="button"
          className={value === choice ? "choice is-selected" : "choice"}
          onClick={() => onChange(choice)}
          aria-pressed={value === choice}
        >
          {choice}
        </button>
      ))}
    </div>
  );
}
