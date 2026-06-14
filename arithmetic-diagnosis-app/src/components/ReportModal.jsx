import { useState } from "react";
import MaintenancePlan from "./MaintenancePlan.jsx";
import PrescriptionDetail from "./PrescriptionDetail.jsx";

const AREA_LABELS = {
  A: "A 영역",
  B: "B 영역",
  C: "C 영역",
  D: "D 영역",
};

function getStatusClassName(status) {
  return `status-pill status-${String(status).replace(/\s+/g, "-")}`;
}

function StudentSummary({ report }) {
  return (
    <div className="report-student">
      <strong>{report.studentName}</strong>
      <span>초등 {report.grade}학년 {report.semester}학기</span>
    </div>
  );
}

function AreaResultTable({ areaResults }) {
  return (
    <div className="report-table-wrap">
      <table className="report-table">
        <thead>
          <tr>
            <th>영역명</th>
            <th>정답 수</th>
            <th>틀린 개수</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(areaResults).map(([area, result]) => (
            <tr key={area}>
              <td>{result.name ? `${area} ${result.name}` : AREA_LABELS[area]}</td>
              <td>{result.correct} / {result.total}</td>
              <td>{result.wrong}</td>
              <td>
                <span className={getStatusClassName(result.status)} title={result.meaning || undefined}>
                  {result.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiagnosisNotices({ notices }) {
  if (!Array.isArray(notices) || notices.length === 0) {
    return null;
  }

  return (
    <section className="report-section">
      <h3>보조 안내</h3>
      <div className="notice-list">
        {notices.map((notice) => (
          <article className="notice-card" key={notice.code}>
            <strong>{notice.title}</strong>
            <p>{notice.message}</p>
            {notice.recommendation ? <p className="recommendation">{notice.recommendation}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function DiagnosisSummary({ diagnosis }) {
  return (
    <section className="diagnosis-summary">
      <span>최종 진단 유형</span>
      <strong>{diagnosis.typeName}</strong>
      {diagnosis.summary ? <p>{diagnosis.summary}</p> : null}
      {diagnosis.recommendation ? <p className="recommendation">{diagnosis.recommendation}</p> : null}
    </section>
  );
}

export default function ReportModal({ report, onClose, onRestart }) {
  const [showDetail, setShowDetail] = useState(false);
  const isPerfectScore = report?.isPerfectScore === true || report?.diagnosis?.flags?.includes("PERFECT_SCORE");

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className="modal-card report-card">
        {showDetail ? (
          <>
            <p className="eyebrow">{isPerfectScore ? "Maintenance Plan" : "Prescription Detail"}</p>
            <h2 id="report-title">{isPerfectScore ? "유지·확장 계획" : "유형판정 상세페이지"}</h2>
            <StudentSummary report={report} />
            <DiagnosisSummary diagnosis={report.diagnosis} />
            <DiagnosisNotices notices={report.diagnosis?.notices} />
            {isPerfectScore ? <MaintenancePlan report={report} /> : <PrescriptionDetail report={report} />}
          </>
        ) : (
          <>
            <p className="eyebrow">Diagnosis Report</p>
            <h2 id="report-title">결과 리포트</h2>
            <StudentSummary report={report} />
            <div className="score-total">
              <span>전체 점수</span>
              <strong>{report.totalCorrect} / {report.totalQuestions}</strong>
            </div>
            <section className="report-section">
              <h3>영역별 결과</h3>
              <AreaResultTable areaResults={report.areaResults} />
            </section>
            <DiagnosisSummary diagnosis={report.diagnosis} />
            <DiagnosisNotices notices={report.diagnosis?.notices} />
          </>
        )}
        <div className="report-actions">
          {showDetail ? (
            <button className="secondary-button" type="button" onClick={() => setShowDetail(false)}>
              결과로 돌아가기
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={() => setShowDetail(true)}>
              {isPerfectScore ? "유지·확장 계획 보기" : "상세 처방 보기"}
            </button>
          )}
          <button className="secondary-button" type="button" onClick={onClose}>
            진단 화면으로 돌아가기
          </button>
          <button className={showDetail ? "primary-button" : "secondary-button"} type="button" onClick={onRestart}>
            다시 검사하기
          </button>
        </div>
      </div>
    </div>
  );
}
