const revealTargets = document.querySelectorAll(
  ".hero, .feature-card, .philosophy, .program-card, .stat-item, .journey-banner, .director, .report-highlight, .section-heading, .testimonial-card, .consultation-form, .location, .site-footer"
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

const mapElement = document.getElementById("naver-map");

if (mapElement && window.naver?.maps) {
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
}
