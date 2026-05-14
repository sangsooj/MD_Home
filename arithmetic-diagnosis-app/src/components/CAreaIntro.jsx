import { useState } from "react";

export default function CAreaIntro({ onStart }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <section className="question-card c-intro" aria-labelledby="c-area-title">
      <p className="eyebrow">C 영역 안내</p>
      <h2 id="c-area-title">제한 시간 안내</h2>
      <p>
        C 영역은 4문항을 60초 이내에 풀어야 합니다. 시간이 지나면 남은 문제와 관계없이
        자동으로 다음 영역으로 이동합니다.
      </p>
      <label className="confirm-row">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        내용을 확인했습니다
      </label>
      <button className="primary-button" type="button" disabled={!confirmed} onClick={onStart}>
        C 영역 시작
      </button>
    </section>
  );
}
