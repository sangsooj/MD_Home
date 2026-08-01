const articleElement = document.getElementById("article");
const dateFormatter = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" });

function escapeHtml(value) {
  const node = document.createElement("div");
  node.textContent = value ?? "";
  return node.innerHTML;
}

async function loadPost() {
  const pathId = location.pathname.match(/\/notices\/(\d+)\/?$/)?.[1];
  const queryId = new URLSearchParams(location.search).get("id");
  const id = pathId || queryId;
  if (!id || !/^\d+$/.test(id)) {
    articleElement.innerHTML = '<div class="state error">올바르지 않은 공지사항 주소입니다.</div>';
    return;
  }

  try {
    const response = await fetch(`/api/notices/${encodeURIComponent(id)}`);
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "요청 실패");
    const post = data.post;
    const sourceLink = post.source === "naver" && post.source_url
      ? `<a class="button secondary" href="${escapeHtml(post.source_url)}" target="_blank" rel="noopener noreferrer">네이버 원문 보기</a>`
      : "<span></span>";

    document.title = `${post.title} | 매쓰두잉 센터`;
    articleElement.innerHTML = `
      <header class="article-head">
        <span class="eyebrow">Notice</span>
        <h1>${escapeHtml(post.title)}</h1>
        <div class="meta">
          <span>매쓰두잉 센터</span>
          <time datetime="${escapeHtml(post.published_at)}">${dateFormatter.format(new Date(post.published_at))}</time>
        </div>
      </header>
      <div class="article-body">${post.body_html}</div>
      <div class="article-actions">
        <a class="button" href="/notices">목록으로</a>
        ${sourceLink}
      </div>`;
  } catch (error) {
    console.error(error);
    articleElement.innerHTML = '<div class="state error">공지사항을 불러오지 못했습니다.<br><a href="/notices">목록으로 돌아가기</a></div>';
  }
}

loadPost();
