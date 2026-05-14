export default function ReportModal({ student, score, onRestart }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className="modal-card report-card">
        <p className="eyebrow">Diagnosis Report</p>
        <h2 id="report-title">임시 결과 리포트</h2>
        <div className="report-student">
          <strong>{student.name}</strong>
          <span>초등 {student.grade}학년 {student.semester}학기</span>
        </div>
        <div className="score-total">
          <span>전체 점수</span>
          <strong>{score.totalCorrect} / {score.totalQuestions}</strong>
        </div>
        <div className="score-grid">
          {["A", "B", "C", "D"].map((area) => (
            <article key={area}>
              <span>{area} 영역</span>
              <strong>{score.areaScores[area].correct} / {score.areaScores[area].total}</strong>
            </article>
          ))}
        </div>
        <button className="primary-button" type="button" onClick={onRestart}>
          처음으로
        </button>
      </div>
    </div>
  );
}
