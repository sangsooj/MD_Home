import MathText from "./MathText.jsx";

export default function MultipleChoiceQuestion({ question, value, onChange }) {
  const isMultipleSelect = question.type === "multipleSelect";
  const selectedValues = Array.isArray(value) ? value : [];
  const renderChoice = (choice) => {
    return <MathText text={choice} />;
  };

  return (
    <div className="choice-grid" role={isMultipleSelect ? "group" : "radiogroup"} aria-label="객관식 선택지">
      {question.choices.map((choice) => (
        <button
          key={choice}
          type="button"
          className={
            isMultipleSelect
              ? selectedValues.includes(choice)
                ? "choice is-selected"
                : "choice"
              : value === choice
                ? "choice is-selected"
                : "choice"
          }
          onClick={() => {
            if (!isMultipleSelect) {
              onChange(choice);
              return;
            }

            onChange(
              selectedValues.includes(choice)
                ? selectedValues.filter((selectedValue) => selectedValue !== choice)
                : [...selectedValues, choice]
            );
          }}
          aria-pressed={isMultipleSelect ? selectedValues.includes(choice) : value === choice}
        >
          {renderChoice(choice)}
        </button>
      ))}
    </div>
  );
}
