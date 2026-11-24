/* 매쓰두잉 — 원장 글 관리 */
(function () {
  "use strict";

  var el = function (id) { return document.getElementById(id); };
  var views = ["view-login", "view-setup", "view-password", "view-list", "view-editor"];
  var editingId = null;
  var dateFormat = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  function show(id) {
    views.forEach(function (name) { el(name).classList.toggle("hidden", name !== id); });
    el("bar-nav").classList.toggle("hidden", id === "view-login" || id === "view-setup");
    window.scrollTo(0, 0);
  }

  function say(id, message, kind) {
    var box = el(id);
    box.textContent = message || "";
    box.classList.toggle("hidden", !message);
    if (kind) { box.className = "notice " + kind; if (!message) box.classList.add("hidden"); }
  }

  async function call(path, options) {
    var settings = Object.assign({ credentials: "same-origin", headers: {} }, options || {});
    if (settings.body !== undefined) {
      settings.headers["Content-Type"] = "application/json";
      settings.body = JSON.stringify(settings.body);
    }
    var response = await fetch(path, settings);
    var data = null;
    try { data = await response.json(); } catch (error) { data = null; }
    if (!response.ok || !data || data.ok === false) {
      throw new Error((data && data.error) || "요청을 처리하지 못했습니다.");
    }
    return data;
  }

  /* ── 들어오기 ── */

  async function start() {
    try {
      var status = await call("/api/admin/session");
      el("login-id").value = status.adminId;
      el("login-id-shown").textContent = status.adminId;
      if (!status.passwordSet) return show("view-setup");
      if (status.signedIn) return loadList();
      show("view-login");
    } catch (error) {
      show("view-login");
      say("login-error", error.message + " 잠시 뒤 새로고침해 주세요.", "notice bad");
    }
  }

  el("setup-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    say("setup-error", "");
    if (el("setup-password").value !== el("setup-confirm").value) {
      return say("setup-error", "두 비밀번호가 서로 다릅니다.", "notice bad");
    }
    var button = el("setup-submit");
    button.disabled = true;
    try {
      await call("/api/admin/password", {
        method: "POST",
        body: { setupCode: el("setup-code").value, password: el("setup-password").value },
      });
      el("setup-form").reset();
      await loadList();
    } catch (error) {
      say("setup-error", error.message, "notice bad");
    } finally {
      button.disabled = false;
    }
  });

  el("login-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    say("login-error", "");
    var button = el("login-submit");
    button.disabled = true;
    try {
      await call("/api/admin/session", {
        method: "POST",
        body: { id: el("login-id").value, password: el("login-password").value },
      });
      el("login-password").value = "";
      await loadList();
    } catch (error) {
      say("login-error", error.message, "notice bad");
    } finally {
      button.disabled = false;
    }
  });

  el("sign-out").addEventListener("click", async function () {
    try { await call("/api/admin/session", { method: "DELETE" }); } catch (error) { /* 무시 */ }
    show("view-login");
  });

  /* ── 비밀번호 변경 ── */

  el("to-password").addEventListener("click", function () { say("password-error", ""); show("view-password"); });
  el("password-cancel").addEventListener("click", function () { el("password-form").reset(); loadList(); });

  el("password-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    say("password-error", "");
    if (el("password-next").value !== el("password-confirm").value) {
      return say("password-error", "두 비밀번호가 서로 다릅니다.", "notice bad");
    }
    var button = el("password-submit");
    button.disabled = true;
    try {
      await call("/api/admin/password", {
        method: "POST",
        body: { currentPassword: el("password-current").value, password: el("password-next").value },
      });
      el("password-form").reset();
      await loadList("비밀번호를 바꿨습니다.");
    } catch (error) {
      say("password-error", error.message, "notice bad");
    } finally {
      button.disabled = false;
    }
  });

  /* ── 목록 ── */

  function rowOf(post) {
    var row = document.createElement("div");
    row.className = "row";

    var title = document.createElement("div");
    title.className = "title";
    var name = document.createElement("b");
    name.textContent = post.title;
    var meta = document.createElement("p");
    meta.textContent = dateFormat.format(new Date(post.published_at));
    title.append(name, meta);

    var tags = document.createElement("div");
    tags.style.cssText = "flex:0 0 auto;display:flex;gap:6px;flex-wrap:wrap";
    var state = document.createElement("span");
    state.className = "tag " + (post.is_published ? "on" : "off");
    state.textContent = post.is_published ? "공개" : "숨김";
    tags.append(state);
    if (post.source === "naver") {
      var from = document.createElement("span");
      from.className = "tag naver";
      from.textContent = "네이버";
      tags.append(from);
    }

    var acts = document.createElement("div");
    acts.className = "acts";
    if (post.source !== "naver") {
      var edit = document.createElement("button");
      edit.className = "btn line small";
      edit.type = "button";
      edit.textContent = "고치기";
      edit.addEventListener("click", function () { openEditor(post.id); });
      acts.append(edit);
    }
    var toggle = document.createElement("button");
    toggle.className = "btn line small";
    toggle.type = "button";
    toggle.textContent = post.is_published ? "숨기기" : "다시 공개";
    toggle.addEventListener("click", async function () {
      toggle.disabled = true;
      try {
        await call("/api/admin/notices/" + post.id, {
          method: "PATCH", body: { isPublished: !post.is_published },
        });
        await loadList(post.is_published ? "글을 숨겼습니다." : "글을 다시 공개했습니다.");
      } catch (error) {
        say("list-flash", error.message, "notice bad");
        toggle.disabled = false;
      }
    });
    acts.append(toggle);

    row.append(title, tags, acts);
    return row;
  }

  async function loadList(flash) {
    try {
      var data = await call("/api/admin/posts?limit=50");
      var rows = el("rows");
      rows.textContent = "";
      if (!data.posts.length) {
        var empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "아직 올린 글이 없습니다. 오른쪽 위 ‘새 글 쓰기’로 시작하세요.";
        rows.append(empty);
      } else {
        data.posts.forEach(function (post) { rows.append(rowOf(post)); });
      }
      el("list-count").textContent = "모두 " + data.pagination.total + "건";
      say("list-flash", flash || "", "notice good");
      show("view-list");
    } catch (error) {
      show("view-login");
      say("login-error", error.message, "notice bad");
    }
  }

  /* ── 편집기 ── */

  function focusBody() { el("body").focus(); }

  document.querySelectorAll(".toolbar button[data-cmd]").forEach(function (button) {
    button.addEventListener("click", function () {
      focusBody();
      document.execCommand(button.dataset.cmd, false, null);
    });
  });

  document.querySelectorAll(".toolbar button[data-block]").forEach(function (button) {
    button.addEventListener("click", function () {
      focusBody();
      document.execCommand("formatBlock", false, button.dataset.block);
    });
  });

  el("add-link").addEventListener("click", function () {
    var url = window.prompt("연결할 주소를 https:// 로 시작해 입력하세요.", "https://");
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) return window.alert("https:// 로 시작하는 주소만 넣을 수 있습니다.");
    focusBody();
    document.execCommand("createLink", false, url);
  });

  el("add-image").addEventListener("click", function () {
    var url = window.prompt("이미지 주소를 https:// 로 시작해 입력하세요.", "https://");
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) return window.alert("https:// 로 시작하는 주소만 넣을 수 있습니다.");
    focusBody();
    document.execCommand("insertImage", false, url);
  });

  /* 붙여넣기는 서식 없이 — 서버 sanitize 와 어긋나는 태그가 끼지 않게 한다. */
  el("body").addEventListener("paste", function (event) {
    event.preventDefault();
    var text = (event.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, text);
  });

  function openEditorNew() {
    editingId = null;
    el("editor-title").textContent = "새 글 쓰기";
    el("title").value = "";
    el("body").innerHTML = "";
    el("editor-state").textContent = "";
    say("editor-error", "");
    show("view-editor");
    el("title").focus();
  }

  async function openEditor(id) {
    try {
      var data = await call("/api/admin/post?id=" + id);
      editingId = data.post.id;
      el("editor-title").textContent = "글 고치기";
      el("title").value = data.post.title;
      el("body").innerHTML = data.post.body_html;
      el("editor-state").textContent = "마지막 저장 " + dateFormat.format(new Date(data.post.updated_at));
      say("editor-error", "");
      show("view-editor");
      el("title").focus();
    } catch (error) {
      say("list-flash", error.message, "notice bad");
    }
  }

  el("new-post").addEventListener("click", openEditorNew);
  el("editor-back").addEventListener("click", function () { loadList(); });
  el("cancel").addEventListener("click", function () {
    if (window.confirm("쓴 내용을 버리고 목록으로 갈까요?")) loadList();
  });

  el("save").addEventListener("click", async function () {
    say("editor-error", "");
    var title = el("title").value.trim();
    var bodyHtml = el("body").innerHTML.trim();
    if (!title) return say("editor-error", "제목을 입력해 주세요.", "notice bad");
    if (!bodyHtml || !el("body").textContent.trim()) {
      return say("editor-error", "본문을 입력해 주세요.", "notice bad");
    }
    var button = el("save");
    button.disabled = true;
    el("editor-state").textContent = "저장하는 중…";
    try {
      if (editingId) {
        await call("/api/admin/notices/" + editingId, { method: "PATCH", body: { title: title, bodyHtml: bodyHtml } });
        await loadList("글을 고쳤습니다.");
      } else {
        await call("/api/admin/notices", { method: "POST", body: { title: title, bodyHtml: bodyHtml } });
        await loadList("새 글을 올렸습니다.");
      }
    } catch (error) {
      say("editor-error", error.message, "notice bad");
      el("editor-state").textContent = "";
    } finally {
      button.disabled = false;
    }
  });

  start();
})();
