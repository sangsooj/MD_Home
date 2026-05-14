import { InlineMath } from "react-katex";

export default function MultipleChoiceQuestion({ question, value, onChange }) {
  const renderChoice = (choice) => {
    if (question.choiceRenderType === "math") {
      return <InlineMath math={choice} />;
    }

    return choice;
  };

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
          {renderChoice(choice)}
        </button>
      ))}
    </div>
  );
}
