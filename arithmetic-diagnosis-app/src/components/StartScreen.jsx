const availableAssessments = [
  { grade: 1, semester: 1 },
  { grade: 1, semester: 2 },
  { grade: 4, semester: 1 },
  { grade: 4, semester: 2 },
  { grade: 5, semester: 1 },
  { grade: 5, semester: 2 },
  { grade: 6, semester: 1 },
  { grade: 6, semester: 2 },
];

const availableGrades = [...new Set(availableAssessments.map((assessment) => assessment.grade))];

function getAvailableSemesters(grade) {
  const selectedGrade = Number(grade);

  return availableAssessments
    .filter((assessment) => assessment.grade === selectedGrade)
    .map((assessment) => assessment.semester);
}

function isAssessmentAvailable(grade, semester) {
  return availableAssessments.some(
    (assessment) =>
      assessment.grade === Number(grade) && assessment.semester === Number(semester)
  );
}

export default function StartScreen({ student, onChange, onStart, error }) {
  const semesters = getAvailableSemesters(student.grade);
  const solvingTime = Number(student.grade) === 1 ? "20~25분" : "25~30분";
  const isReady =
    student.name.trim() &&
    student.grade &&
    student.semester &&
    isAssessmentAvailable(student.grade, student.semester);

  return (
    <section className="start-card" aria-labelledby="start-title">
      <p className="eyebrow">Arithmetic Diagnosis</p>
      <h1 id="start-title">연산 오류 원인 분석</h1>
      <p>
        이름과 학년, 학기를 선택하면 해당 과정의 연산 진단 문항을 불러옵니다.
        한 화면에 한 문제씩 차분하게 진행됩니다.
      </p>

      <div className="start-notice" aria-label="검사 전 준비 안내">
        <strong>검사 전 준비 안내</strong>
        <p>
          검사가 시작되기 전, 연필과 공책을 준비하고 문제를 풀어서 답을 컴퓨터에 입력합니다.
          검사가 시작되면 시간이 적용되므로 미리 준비합니다.
        </p>
        <dl>
          <div>
            <dt>문항 수</dt>
            <dd>16문항 (영역별 4문항)</dd>
          </div>
          <div>
            <dt>풀이 시간</dt>
            <dd>{solvingTime}, 학생 단독</dd>
          </div>
          <div>
            <dt>C 영역</dt>
            <dd>60초 제한</dd>
          </div>
          <div>
            <dt>D 영역</dt>
            <dd>오답의 경우에 1회에 한해 수정할 기회 부여</dd>
          </div>
        </dl>
      </div>

      <div className="form-grid">
        <label>
          학생 이름
          <input
            type="text"
            value={student.name}
            onChange={(event) => onChange({ ...student, name: event.target.value })}
            placeholder="이름을 입력하세요"
          />
        </label>
        <label>
          학년
          <select
            value={student.grade}
            onChange={(event) => {
              const nextGrade = event.target.value;
              const nextSemesters = getAvailableSemesters(nextGrade);
              const nextSemester = nextSemesters.includes(Number(student.semester))
                ? student.semester
                : "";

              onChange({ ...student, grade: nextGrade, semester: nextSemester });
            }}
          >
            <option value="">학년 선택</option>
            {availableGrades.map((grade) => (
              <option key={grade} value={grade}>초등 {grade}학년</option>
            ))}
          </select>
        </label>
        <label>
          학기
          <select
            value={student.semester}
            onChange={(event) => onChange({ ...student, semester: event.target.value })}
            disabled={!student.grade}
          >
            <option value="">학기 선택</option>
            {semesters.map((semester) => (
              <option key={semester} value={semester}>{semester}학기</option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="error-message">{error}</p> : null}

      <button className="primary-button" type="button" disabled={!isReady} onClick={onStart}>
        진단 시작
      </button>
    </section>
  );
}
