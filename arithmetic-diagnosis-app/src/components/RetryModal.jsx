export default function RetryModal({ onRetry }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="retry-title">
      <div className="modal-card retry-card">
        <h2 id="retry-title">다시 풀어보세요</h2>
        <p>한 번 더 생각해 볼 수 있습니다. 풀이 과정을 차분히 확인해 보세요.</p>
        <button className="primary-button" type="button" onClick={onRetry}>
          다시 풀기
        </button>
      </div>
    </div>
  );
}
