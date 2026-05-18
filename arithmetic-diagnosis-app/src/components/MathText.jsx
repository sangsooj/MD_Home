import { InlineMath } from "react-katex";

const simpleFractionPattern = /(\d+\s*\/\s*\d+)/g;
const simpleFractionOnlyPattern = /^\d+\s*\/\s*\d+$/;

function isLatexMath(text) {
  return /\\[a-zA-Z]+/.test(text);
}

function toLatexFraction(text) {
  const [numerator, denominator] = text.split("/").map((item) => item.trim());
  return `\\frac{${numerator}}{${denominator}}`;
}

export default function MathText({ text }) {
  const value = String(text ?? "");

  if (!value) {
    return null;
  }

  if (isLatexMath(value)) {
    return <InlineMath math={value} />;
  }

  const parts = value.split(simpleFractionPattern);

  if (parts.length === 1) {
    return value;
  }

  return (
    <>
      {parts.map((part, index) =>
        simpleFractionOnlyPattern.test(part) ? (
          <InlineMath key={`${part}-${index}`} math={toLatexFraction(part)} />
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      )}
    </>
  );
}
