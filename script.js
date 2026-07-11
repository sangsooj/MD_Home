const openingEventModal = document.querySelector("[data-opening-event-modal]");

function initAnnualSchedule() {
  const grid = document.querySelector("[data-schedule-grid]");
  const monthNav = document.querySelector("[data-schedule-month-nav]");
  if (!grid || !monthNav) return;

  const months = [[2026, 6], [2026, 7], [2026, 8], [2026, 9], [2026, 10], [2026, 11], [2027, 0], [2027, 1]];
  const closures = new Set(["2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27", "2026-12-25", "2027-01-01", "2027-02-06", "2027-02-07", "2027-02-08", "2027-02-09"]);
  const holidayClasses = new Set(["2026-07-17", "2026-10-05", "2026-10-09"]);
  const mockExams = new Set(["2026-08-01", "2026-08-22", "2026-09-19", "2026-10-31", "2026-11-28", "2026-12-26", "2027-01-30", "2027-02-27"]);
  const holidays = new Map([["2026-07-17", "제헌절"], ["2026-08-15", "광복절"], ["2026-09-24", "추석 연휴"], ["2026-09-25", "추석"], ["2026-09-26", "추석 연휴"], ["2026-09-27", "추석 연휴"], ["2026-10-03", "개천절"], ["2026-10-05", "공휴일"], ["2026-10-09", "한글날"], ["2026-12-25", "성탄절"], ["2027-01-01", "신정"], ["2027-02-06", "설 연휴"], ["2027-02-07", "설날"], ["2027-02-08", "설 연휴"], ["2027-02-09", "설 연휴"]]);
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const toKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const now = new Date();
  const currentIndex = months.findIndex(([year, month]) => year === now.getFullYear() && month === now.getMonth());

  months.forEach(([year, month], index) => {
    const canonicalId = `schedule-${year}-${String(month + 1).padStart(2, "0")}`;
    const id = index === currentIndex || (currentIndex < 0 && index === 0) ? "schedule-current" : canonicalId;
    const navLink = document.createElement("a");
    navLink.href = `#${id}`;
    navLink.textContent = `${month + 1}월`;
    if (index === currentIndex) navLink.setAttribute("aria-current", "date");
    monthNav.append(navLink);

    const card = document.createElement("article");
    card.className = "schedule-month";
    card.id = id;
    if (id === "schedule-current") card.dataset.current = "true";
    const title = document.createElement("h3");
    title.innerHTML = `<strong>${month + 1}월</strong><span>${year}</span>`;
    card.append(title);
    const calendar = document.createElement("div");
    calendar.className = "schedule-calendar";
    calendar.setAttribute("role", "grid");
    calendar.setAttribute("aria-label", `${year}년 ${month + 1}월 수업일정`);
    dayNames.forEach((name) => {
      const header = document.createElement("span");
      header.className = "schedule-weekday";
      header.textContent = name;
      header.setAttribute("role", "columnheader");
      calendar.append(header);
    });
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    for (let blank = 0; blank < firstDay; blank += 1) {
      const cell = document.createElement("span");
      cell.className = "schedule-day is-empty";
      cell.setAttribute("aria-hidden", "true");
      calendar.append(cell);
    }
    for (let day = 1; day <= lastDate; day += 1) {
      const date = new Date(year, month, day);
      const key = toKey(date);
      const weekday = date.getDay();
      const isClass = key >= "2026-07-06" && key <= "2027-02-26" && weekday >= 1 && weekday <= 5 && !closures.has(key);
      const cell = document.createElement("span");
      cell.className = "schedule-day";
      if (isClass) cell.classList.add("is-class");
      if (holidays.has(key)) cell.classList.add("is-holiday");
      if (mockExams.has(key)) cell.classList.add("is-exam");
      cell.innerHTML = `<b>${day}</b>`;
      cell.setAttribute("role", "gridcell");
      const description = [`${month + 1}월 ${day}일`];
      if (holidays.has(key)) description.push(holidays.get(key));
      if (isClass) description.push("수업일");
      if (mockExams.has(key)) description.push("모의평가, 사전 예약 필요");
      cell.setAttribute("aria-label", description.join(", "));
      calendar.append(cell);
    }
    card.append(calendar);
    grid.append(card);
  });
}

initAnnualSchedule();
const consultationReservationModal = document.querySelector("[data-consultation-reservation-modal]");
const consultationReservationStart = new Date("2026-06-06T00:00:00+09:00");
const openingDate = new Date("2026-07-06T00:00:00+09:00");
const openingEventModalEnd = new Date("2026-07-07T00:00:00+09:00");

function padCountdownNumber(value) {
  return String(value).padStart(2, "0");
}

function initOpeningCountdown() {
  const countdown = document.querySelector("[data-opening-countdown]");

  if (!countdown) {
    return;
  }

  const daysElement = countdown.querySelector("[data-countdown-days]");
  const hoursElement = countdown.querySelector("[data-countdown-hours]");
  const minutesElement = countdown.querySelector("[data-countdown-minutes]");
  const secondsElement = countdown.querySelector("[data-countdown-seconds]");

  if (!daysElement || !hoursElement || !minutesElement || !secondsElement) {
    return;
  }

  const updateCountdown = () => {
    const remainingMs = Math.max(0, openingDate.getTime() - Date.now());

    if (remainingMs === 0) {
      countdown.classList.add("is-open");
      countdown.innerHTML = '<p class="opening-countdown-complete">매쓰두잉 센터 오픈</p>';
      window.clearInterval(countdownTimer);
      return;
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    daysElement.textContent = padCountdownNumber(days);
    hoursElement.textContent = padCountdownNumber(hours);
    minutesElement.textContent = padCountdownNumber(minutes);
    secondsElement.textContent = padCountdownNumber(seconds);
  };

  const countdownTimer = window.setInterval(updateCountdown, 1000);
  updateCountdown();
}

function isConsultationReservationOpen() {
  return Date.now() >= consultationReservationStart.getTime();
}

function shouldShowOpeningEventModal() {
  return Date.now() < openingEventModalEnd.getTime();
}

function closeOpeningEventModal() {
  if (!openingEventModal) {
    return;
  }

  openingEventModal.hidden = true;
}

function initOpeningEventModal() {
  if (!openingEventModal || !shouldShowOpeningEventModal()) {
    return;
  }

  const closeButtons = openingEventModal.querySelectorAll("[data-opening-event-modal-close]");

  closeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.matches(".button[href='#consultation']") && !isConsultationReservationOpen()) {
        return;
      }

      closeOpeningEventModal();
    });
  });

  openingEventModal.addEventListener("click", (event) => {
    if (event.target === openingEventModal) {
      closeOpeningEventModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !openingEventModal.hidden) {
      closeOpeningEventModal();
    }
  });

  window.setTimeout(() => {
    openingEventModal.hidden = false;
    const closeButton = openingEventModal.querySelector(".modal-close");

    if (closeButton) {
      closeButton.focus();
    }
  }, 700);
}

initOpeningEventModal();
initOpeningCountdown();

function closeConsultationReservationModal() {
  if (!consultationReservationModal) {
    return;
  }

  consultationReservationModal.hidden = true;
}

function openConsultationReservationModal() {
  if (!consultationReservationModal) {
    return;
  }

  consultationReservationModal.hidden = false;
  const closeButton = consultationReservationModal.querySelector(".modal-close");

  if (closeButton) {
    closeButton.focus();
  }
}

function initConsultationReservationModal() {
  if (!consultationReservationModal) {
    return;
  }

  const openButtons = document.querySelectorAll("[data-consultation-reservation-modal-open]");
  const closeButtons = consultationReservationModal.querySelectorAll("[data-consultation-reservation-modal-close]");

  openButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      openConsultationReservationModal();
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", closeConsultationReservationModal);
  });

  consultationReservationModal.addEventListener("click", (event) => {
    if (event.target === consultationReservationModal) {
      closeConsultationReservationModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !consultationReservationModal.hidden) {
      closeConsultationReservationModal();
    }
  });

  if (window.location.hash === "#consultation-reservation") {
    openConsultationReservationModal();
  }
}

initConsultationReservationModal();

const revealTargets = document.querySelectorAll(
  ".opening-banner, .hero, .opening-event, .arithmetic-hero, .numbered-content-card, .program-cause-grid article, .bottom-cta, .program-hero, .program-section, .program-cta, .feature-card, .book-cover-showcase, .philosophy, .program-card, .diagnosis, .stat-item, .journey-banner, .director, .report-highlight, .section-heading, .testimonial-card, .center-lead, .consultation-action, .location, .site-footer"
);

revealTargets.forEach((element, index) => {
  element.setAttribute("data-reveal", "");
  element.style.transitionDelay = `${index * 45}ms`;
});

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18,
    }
  );

  revealTargets.forEach((element) => observer.observe(element));
} else {
  revealTargets.forEach((element) => element.classList.add("is-visible"));
}

const eventErrorCards = document.querySelectorAll(".event-error-card");

eventErrorCards.forEach((card) => {
  const button = card.querySelector(".event-error-trigger");

  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    const isOpen = card.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(isOpen));
  });
});

const diagnosisSteps = [
  {
    count: "Step 01",
    title: "기본 정보 수집",
    items: [
      "학부모 설문 (P1~P12): 학습 이력 파악",
      "학생 설문 (S1~S10): 정보인식 유형 + 구체성",
      "수학능력 진단 (M): 객관적 성취도",
    ],
  },
  {
    count: "Step 02",
    title: "학부모 정보 분석 (검증용)",
    items: [
      "P1~P6: 학습 이력 정리",
      "P7~P10: 부모 관찰 → 학생 설문과 비교",
      "P11~P12: 부모 고민 → 지도 방향 파악",
    ],
  },
  {
    count: "Step 03",
    title: "최종 진단점수 계산 (M + S만 사용)",
    items: [
      "학습 단계 (Stage 1~4)",
      "정보인식 유형 (V/L/혼합)",
      "구체성 수준",
    ],
  },
  {
    count: "Step 04",
    title: "학부모 정보 고려하여 미세조정",
    items: [
      "부모 관찰과 학생 설문 불일치 검토",
      "부모 고민을 반영한 교재 난이도 조정",
      "지도 방향 및 전략 수립",
    ],
  },
  {
    count: "Step 05",
    title: "문제집 선정 + 학습 지도 방안 수립",
    items: ["최종 교재 선정", "7~8주 학습 계획", "맞춤형 지도 전략"],
  },
];

const diagnosisButtons = document.querySelectorAll("[data-step]");
const diagnosisTitle = document.querySelector("[data-diagnosis-title]");
const diagnosisCount = document.querySelector("[data-diagnosis-count]");
const diagnosisList = document.querySelector("[data-diagnosis-list]");
const mobileDiagnosisItems = document.querySelectorAll("[data-mobile-step]");
let activeDiagnosisIndex = 0;
let diagnosisRotationTimer;

function setDiagnosisStep(stepIndex) {
  const activeIndex = Math.max(0, Math.min(stepIndex, diagnosisSteps.length - 1));
  const step = diagnosisSteps[activeIndex];
  activeDiagnosisIndex = activeIndex;

  diagnosisButtons.forEach((button) => {
    const isActive = Number(button.dataset.step) === activeIndex;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  if (diagnosisTitle && diagnosisCount && diagnosisList) {
    diagnosisCount.textContent = step.count;
    diagnosisTitle.textContent = step.title;
    diagnosisList.innerHTML = step.items.map((item) => `<li>${item}</li>`).join("");
  }

  mobileDiagnosisItems.forEach((item) => {
    item.classList.toggle("is-open", Number(item.dataset.mobileStep) === activeIndex);
  });
}

diagnosisButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setDiagnosisStep(Number(button.dataset.step));
    restartDiagnosisRotation();
  });
});

mobileDiagnosisItems.forEach((item) => {
  const button = item.querySelector("button");

  if (button) {
    button.addEventListener("click", () => {
      setDiagnosisStep(Number(item.dataset.mobileStep));
      restartDiagnosisRotation();
    });
  }
});

function startDiagnosisRotation() {
  if (!diagnosisButtons.length && !mobileDiagnosisItems.length) {
    return;
  }

  diagnosisRotationTimer = window.setInterval(() => {
    setDiagnosisStep((activeDiagnosisIndex + 1) % diagnosisSteps.length);
  }, 3000);
}

function restartDiagnosisRotation() {
  window.clearInterval(diagnosisRotationTimer);
  startDiagnosisRotation();
}

setDiagnosisStep(0);
startDiagnosisRotation();

function showMapFallback() {
  const mapElement = document.getElementById("naver-map");

  if (!mapElement || mapElement.dataset.mapReady === "true") {
    return;
  }

  mapElement.innerHTML =
    '<div class="map-fallback">지도를 불러오지 못했습니다.<br />네이버 지도에서 보기를 눌러 위치를 확인해 주세요.</div>';
}

window.initNaverMap = function initNaverMap() {
  const mapElement = document.getElementById("naver-map");

  if (!mapElement || !window.naver || !window.naver.maps) {
    showMapFallback();
    return;
  }

  const mathDoingPosition = new naver.maps.LatLng(37.529471, 127.136296);
  const map = new naver.maps.Map(mapElement, {
    center: mathDoingPosition,
    zoom: 16,
    zoomControl: true,
    zoomControlOptions: {
      position: naver.maps.Position.TOP_RIGHT,
    },
  });

  new naver.maps.Marker({
    position: mathDoingPosition,
    map,
    title: "매쓰두잉 센터",
  });

  mapElement.dataset.mapReady = "true";
};

window.setTimeout(showMapFallback, 3000);
