export default function TestLayout({ children, student, currentQuestion, questionNumber, totalQuestions }) {
  return (
    <main className="test-shell">
      <header className="test-header">
        <div>
          <p className="eyebrow">MATHDOING CENTER</p>
          <h1>연산 오류 원인 분석</h1>
        </div>
        <div className="student-chip">
          <strong>{student.name}</strong>
          <span>초등 {student.grade}학년 {student.semester}학기</span>
        </div>
      </header>
      {currentQuestion ? (
        <div className="progress-info">
          <span>{currentQuestion.area} 영역</span>
          <strong>{questionNumber} / {totalQuestions}</strong>
        </div>
      ) : null}
      {children}
    </main>
  );
}
