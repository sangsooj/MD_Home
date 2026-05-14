export default function ShortAnswerQuestion({ value, onChange }) {
  return (
    <label className="short-answer">
      답 입력
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="답을 입력하세요"
      />
    </label>
  );
}
