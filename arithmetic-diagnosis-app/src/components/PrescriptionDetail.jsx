import { getPrescriptionById } from "../utils/prescriptionLoader.js";

const EMPTY_MESSAGE = "이 평가의 상세 처방 데이터가 아직 준비되지 않았습니다.";

function TextList({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="empty-detail">등록된 내용이 없습니다.</p>;
  }

  return (
    <ul>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function PrescriptionCard({ prescription }) {
  const lessonRoutine = prescription.lessonRoutine ?? prescription.dailyRoutine;
  const parentMessage = prescription.parentMessage ?? prescription.parentQuestion;

  return (
    <article className="prescription-card">
      <h3>{prescription.title}</h3>
      <section>
        <h4>진단 의미</h4>
        <TextList items={prescription.diagnosticMeaning} />
      </section>
      <section>
        <h4>처방 항목</h4>
        <TextList items={prescription.prescriptionItems} />
      </section>
      <section>
        <h4>수업 루틴</h4>
        <TextList items={lessonRoutine} />
      </section>
      {Array.isArray(prescription.checklist) && prescription.checklist.length > 0 ? (
        <section>
          <h4>자가 체크리스트</h4>
          <TextList items={prescription.checklist} />
        </section>
      ) : null}
      {parentMessage ? (
        <section>
          <h4>학부모 안내</h4>
          <p>{parentMessage}</p>
        </section>
      ) : null}
    </article>
  );
}

export default function PrescriptionDetail({ report }) {
  const prescriptionIds = report?.prescriptionIds ?? [];
  const prescriptions = prescriptionIds
    .map((prescriptionId) => getPrescriptionById(report.prescriptionData, prescriptionId))
    .filter(Boolean);
  const stableDescription = report?.diagnosis?.description;

  if (!report?.prescriptionDataAvailable) {
    return <p className="detail-empty-state">{EMPTY_MESSAGE}</p>;
  }

  if (prescriptions.length === 0) {
    return (
      <div className="detail-empty-state">
        <h3>{report?.diagnosis?.typeName}</h3>
        <p>{stableDescription || EMPTY_MESSAGE}</p>
      </div>
    );
  }

  return (
    <div className="prescription-detail-list">
      {prescriptions.map((prescription, index) => (
        <PrescriptionCard key={`${prescription.title}-${index}`} prescription={prescription} />
      ))}
    </div>
  );
}
