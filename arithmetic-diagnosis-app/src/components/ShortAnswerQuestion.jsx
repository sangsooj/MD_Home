import MathText from "./MathText.jsx";

function ChoiceBank({ question }) {
  if (!Array.isArray(question.choices) || question.choices.length === 0) {
    return null;
  }

  const renderChoice = (choice) => {
    return <MathText text={choice} />;
  };

  return (
    <div className="choice-bank" aria-label="보기">
      {question.choices.map((choice) => (
        <span key={choice} className="choice-token">
          {renderChoice(choice)}
        </span>
      ))}
    </div>
  );
}

export default function ShortAnswerQuestion({ question, value, onChange }) {
  const inputId = `answer-${question.id}`;
  const answerFields = Array.isArray(question.answerFields) ? question.answerFields : [];
  const hasMultipleFields = answerFields.length > 0;
  const fieldValues = Array.isArray(value) ? value : [];

  const updateFieldValue = (index, nextValue) => {
    const nextValues = answerFields.map((_, fieldIndex) => fieldValues[fieldIndex] ?? "");
    nextValues[index] = nextValue;
    onChange(nextValues);
  };

  return (
    <div className="short-answer">
      {!hasMultipleFields ? <label htmlFor={inputId}>답 입력</label> : null}
      <ChoiceBank question={question} />
      {hasMultipleFields ? (
        <div className="answer-field-grid">
          {answerFields.map((field, index) => {
            const fieldId = `${inputId}-${index}`;

            return (
              <label key={fieldId} htmlFor={fieldId}>
                {field.label}
                <div className="answer-field-row">
                  <input
                    id={fieldId}
                    type="text"
                    value={fieldValues[index] ?? ""}
                    onChange={(event) => updateFieldValue(index, event.target.value)}
                    placeholder={field.placeholder ?? "답"}
                  />
                  {field.suffix ? <span>{field.suffix}</span> : null}
                </div>
              </label>
            );
          })}
        </div>
      ) : (
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="답을 입력하세요"
        />
      )}
    </div>
  );
}
