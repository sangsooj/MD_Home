export default function TimerBar({ remainingSeconds, totalSeconds }) {
  const percent = Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100));

  return (
    <div className="timer" aria-label={`남은 시간 ${remainingSeconds}초`}>
      <div className="timer-head">
        <span>남은 시간</span>
        <strong>{remainingSeconds}초</strong>
      </div>
      <div className="timer-track">
        <div className="timer-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
