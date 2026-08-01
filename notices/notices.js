const listElement = document.getElementById("notice-list");
const paginationElement = document.getElementById("pagination");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const dateFormatter = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });

const state = { page: 1, limit: 10, query: "" };
const CACHE_TTL = 10 * 60 * 1000;

function cacheKey() {
  return `mathdoing:notices:${state.page}:${state.limit}:${state.query}`;
}

function readCachedPosts() {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey()) || "null");
    if (!cached || Date.now() - cached.savedAt > CACHE_TTL) return false;
    renderPosts(cached.data.posts);
    renderPagination(cached.data.pagination.total);
    return true;
  } catch {
    return false;
  }
}

function saveCachedPosts(data) {
  try {
    localStorage.setItem(cacheKey(), JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // 저장 공간을 사용할 수 없어도 서버 저장본은 정상적으로 표시된다.
  }
}

function escapeHtml(value) {
  const node = document.createElement("div");
  node.textContent = value ?? "";
  return node.innerHTML;
}

function renderPosts(posts) {
  if (!posts.length) {
    listElement.innerHTML = '<div class="state">등록된 공지사항이 없습니다.</div>';
    return;
  }

  listElement.innerHTML = posts.map((post, index) => {
    const number = (state.page - 1) * state.limit + index + 1;
    const source = post.source === "naver" ? '<span class="source-badge">네이버 공지</span>' : "";
    return `
      <a class="notice-row" href="/notices/${encodeURIComponent(post.id)}">
        <span class="notice-number">${number}</span>
        <div class="notice-content">
          <h2 class="notice-title">${escapeHtml(post.title)}${source}</h2>
          <p class="notice-excerpt">${escapeHtml(post.excerpt)}</p>
        </div>
        <time class="notice-date" datetime="${escapeHtml(post.published_at)}">${dateFormatter.format(new Date(post.published_at))}</time>
      </a>`;
  }).join("");
}

function renderPagination(total) {
  const pages = Math.ceil(total / state.limit);
  paginationElement.innerHTML = "";
  if (pages <= 1) return;

  for (let page = 1; page <= pages; page += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(page);
    button.classList.toggle("active", page === state.page);
    button.setAttribute("aria-label", `${page}페이지`);
    if (page === state.page) button.setAttribute("aria-current", "page");
    button.addEventListener("click", () => { state.page = page; loadPosts(); });
    paginationElement.appendChild(button);
  }
}

async function loadPosts() {
  const hasCachedPosts = readCachedPosts();
  if (!hasCachedPosts) {
    listElement.innerHTML = '<div class="state">공지사항을 불러오는 중입니다.</div>';
    paginationElement.innerHTML = "";
  }
  try {
    const params = new URLSearchParams({ page: state.page, limit: state.limit });
    if (state.query) params.set("q", state.query);
    const response = await fetch(`/api/notices?${params}`);
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "요청 실패");
    saveCachedPosts(data);
    renderPosts(data.posts);
    renderPagination(data.pagination.total);
  } catch (error) {
    console.error(error);
    if (!hasCachedPosts) {
      listElement.innerHTML = '<div class="state error">공지사항을 불러오지 못했습니다.<br>잠시 후 다시 시도해 주세요.</div>';
    }
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.query = searchInput.value.trim();
  state.page = 1;
  loadPosts();
});

loadPosts();
