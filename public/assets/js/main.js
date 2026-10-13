(() => {
  "use strict";

  const EVENT_START = new Date("2026-11-14T00:00:00+09:00");
  const DAY = 86400000;

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("js");

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ---------- toast ---------- */
  const toastEl = $("[data-toast]");
  let toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 2600);
  }

  /* ---------- 신청 버튼 ---------- */
  const applyUrl = ($('meta[name="kirothon:apply-url"]')?.content || "").trim();
  $$("[data-apply]").forEach((el) => {
    const label = $("[data-apply-label]", el);
    if (applyUrl) {
      el.href = applyUrl;
      el.target = "_blank";
      el.rel = "noopener noreferrer";
      if (label) label.textContent = el.classList.contains("btn--sm") ? "참가 신청" : "참가 신청하기";
    } else {
      el.setAttribute("aria-disabled", "true");
      el.addEventListener("click", (e) => {
        e.preventDefault();
        toast("참가 신청이 곧 열려요. 조금만 기다려 주세요! 👻");
      });
    }
  });

  /* ---------- D-day & countdown ---------- */
  const ddayEls = $$("[data-dday]");
  const cd = $("[data-countdown]");
  const cdParts = cd ? Object.fromEntries($$("[data-cd]", cd).map((el) => [el.dataset.cd, el])) : {};
  const pad = (n) => String(n).padStart(2, "0");

  function tick() {
    const now = new Date();
    // KST 기준 날짜 차이
    const kstDay = (d) => Math.floor((d.getTime() + 9 * 3600000) / DAY);
    const days = kstDay(EVENT_START) - kstDay(now);
    const label = days > 0 ? `D-${days}` : days === 0 ? "D-DAY" : "THANK YOU";
    ddayEls.forEach((el) => (el.textContent = label));

    if (cd) {
      const diff = Math.max(0, EVENT_START - now);
      cdParts.d.textContent = pad(Math.floor(diff / DAY));
      cdParts.h.textContent = pad(Math.floor((diff / 3600000) % 24));
      cdParts.m.textContent = pad(Math.floor((diff / 60000) % 60));
      cdParts.s.textContent = pad(Math.floor((diff / 1000) % 60));
    }
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- nav ---------- */
  const nav = $("[data-nav]");
  const heroTitle = $(".hero__title");
  if (nav && heroTitle && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      nav.classList.toggle("is-visible", !entry.isIntersecting && entry.boundingClientRect.top < 0);
    }).observe(heroTitle);

    const links = $$(".nav__links a");
    const sections = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${entry.target.id}`));
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- reveal on scroll ---------- */
  const reveals = $$("[data-reveal]");
  if (!reduceMotion && "IntersectionObserver" in window) {
    // 같은 부모 안의 형제 요소는 살짝씩 늦게 등장
    reveals.forEach((el) => {
      const siblings = [...el.parentElement.children].filter((c) => c.hasAttribute("data-reveal"));
      const i = siblings.indexOf(el);
      if (i > 0) el.style.setProperty("--delay", `${Math.min(i, 6) * 0.08}s`);
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.classList.add("is-in");
          io.unobserve(el);
          // 등장이 끝나면 hover 효과가 원래 transform을 쓰도록 정리
          setTimeout(() => {
            el.removeAttribute("data-reveal");
            el.classList.remove("is-in");
            el.style.removeProperty("--delay");
          }, 1500);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.removeAttribute("data-reveal"));
  }

  /* ---------- 타이틀 물결 인트로 ---------- */
  const wave = $("[data-wave]");
  if (wave && !reduceMotion) {
    const to = Number(wave.getAttribute("scale"));
    const from = 260;
    const dur = 1600;
    let t0;
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    const step = (now) => {
      t0 ??= now;
      const t = Math.min(1, (now - t0) / dur);
      wave.setAttribute("scale", (from + (to - from) * ease(t)).toFixed(1));
      if (t < 1) requestAnimationFrame(step);
    };
    wave.setAttribute("scale", from);
    requestAnimationFrame(step);
  }

  /* ---------- 고스트: 눈동자가 포인터를 따라감 ---------- */
  const ghosts = $$("[data-ghost]");
  const MAX = 9; // SVG 좌표 기준 최대 이동량
  let pointer = null;
  let raf = 0;

  function look() {
    raf = 0;
    ghosts.forEach((g) => {
      const eyes = $("[data-eyes]", g);
      // 좌우 반전·회전된 고스트도 있으므로 실제 눈 위치를 기준으로 계산
      const r = eyes.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const ex = r.left + r.width / 2;
      const ey = r.top + r.height / 2;
      const target = pointer || { x: ex + 80, y: ey + 20 };
      const dx = target.x - ex;
      const dy = target.y - ey;
      const dist = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, dist / 260) * MAX;
      eyes.style.transform = `translate(${((dx / dist) * k).toFixed(2)}px, ${((dy / dist) * k * 0.8).toFixed(2)}px)`;
    });
  }
  const requestLook = () => (raf ||= requestAnimationFrame(look));

  if (ghosts.length) {
    window.addEventListener(
      "pointermove",
      (e) => {
        pointer = { x: e.clientX, y: e.clientY };
        requestLook();
      },
      { passive: true }
    );
    window.addEventListener("scroll", requestLook, { passive: true });
    document.addEventListener("pointerleave", () => {
      pointer = null;
      requestLook();
    });
    requestLook();

    // 터치 기기에서는 가끔 두리번거리기
    if (!window.matchMedia("(hover: hover)").matches && !reduceMotion) {
      setInterval(() => {
        pointer = { x: Math.random() * innerWidth, y: Math.random() * innerHeight };
        requestLook();
      }, 2400);
    }
  }

  /* ---------- 고스트 클릭 이스터에그 ---------- */
  const heroGhost = $(".hero__ghost .ghost");
  const bubble = $("[data-bubble]");
  const lines = ["BOO!", "Ideas don't sleep", "Build what's next", "See you 11.14", "Good ideas haunt"];
  let lineIdx = 0;
  let bubbleTimer;
  heroGhost?.addEventListener("click", () => {
    heroGhost.classList.remove("is-boo");
    void heroGhost.getBoundingClientRect();
    heroGhost.classList.add("is-boo");
    if (bubble) {
      bubble.textContent = lines[lineIdx++ % lines.length];
      bubble.classList.add("is-on");
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(() => bubble.classList.remove("is-on"), 1600);
    }
  });
  heroGhost?.addEventListener("animationend", (e) => {
    if (e.animationName === "boo") heroGhost.classList.remove("is-boo");
  });

  /* ---------- CTA 고스트: 페이지 끝에 닿으면 오른쪽 아래에서 빼꼼 ---------- */
  const ctaGhost = $(".cta__ghost");
  const sentinel = $(".cta__sentinel");
  if (ctaGhost && sentinel && !reduceMotion && "IntersectionObserver" in window) {
    ctaGhost.classList.add("is-hidden");
    new IntersectionObserver(([entry]) => ctaGhost.classList.toggle("is-hidden", !entry.isIntersecting)).observe(
      sentinel
    );
  }
})();
