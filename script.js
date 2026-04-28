const revealTargets = document.querySelectorAll(
  ".hero, .feature-card, .philosophy, .program-card, .stat-item, .journey-banner, .director, .report-highlight, .section-heading, .testimonial-card, .consultation-action, .location, .site-footer"
);

revealTargets.forEach((element, index) => {
  element.setAttribute("data-reveal", "");
  element.style.transitionDelay = `${index * 45}ms`;
});

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

  if (!mapElement || !window.naver?.maps) {
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
    title: "매쓰두잉",
  });

  mapElement.dataset.mapReady = "true";
};

window.setTimeout(showMapFallback, 3000);
