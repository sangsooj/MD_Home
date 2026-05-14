const grades = [1, 2, 3, 4, 5, 6];

export default function StartScreen({ student, onChange, onStart, error }) {
  const isReady = student.name.trim() && student.grade && student.semester;

  return (
    <section className="start-card" aria-labelledby="start-title">
      <p className="eyebrow">Arithmetic Diagnosis</p>
      <h1 id="start-title">연산 오류 원인 분석</h1>
      <p>
        이름과 학년, 학기를 선택하면 해당 과정의 연산 진단 문항을 불러옵니다.
        한 화면에 한 문제씩 차분하게 진행됩니다.
      </p>

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
            onChange={(event) => onChange({ ...student, grade: event.target.value })}
          >
            <option value="">학년 선택</option>
            {grades.map((grade) => (
              <option key={grade} value={grade}>초등 {grade}학년</option>
            ))}
          </select>
        </label>
        <label>
          학기
          <select
            value={student.semester}
            onChange={(event) => onChange({ ...student, semester: event.target.value })}
          >
            <option value="">학기 선택</option>
            <option value="1">1학기</option>
            <option value="2">2학기</option>
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
