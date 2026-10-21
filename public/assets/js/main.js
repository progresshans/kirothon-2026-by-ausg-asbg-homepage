(() => {
  "use strict";

  const EVENT_START = new Date("2026-11-14T10:00:00+09:00"); // 입장 시작 시각 (카운트다운 기준)
  const APPLY_DEADLINE = new Date("2026-11-09T23:59:59+09:00"); // 11월 9일(월) 하루 끝까지 신청 가능
  const DAY = 86400000;
  // KST 기준 날짜 번호 (D-day 계산용)
  const kstDay = (d) => Math.floor((d.getTime() + 9 * 3600000) / DAY);

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
  // soon: 링크 없음 / open: 신청 중 / closed: 마감
  const applyUrl = ($('meta[name="kirothon:apply-url"]')?.content || "").trim();
  const applyState = !applyUrl ? "soon" : new Date() > APPLY_DEADLINE ? "closed" : "open";
  $$("[data-apply]").forEach((el) => {
    const label = $("[data-apply-label]", el);
    el.dataset.applyState = applyState;
    if (applyState === "open") {
      el.href = applyUrl;
      el.target = "_blank";
      el.rel = "noopener noreferrer";
      if (label) label.textContent = el.classList.contains("btn--sm") ? "참가 신청" : "참가 신청하기";
      return;
    }
    el.setAttribute("aria-disabled", "true");
    if (applyState === "closed" && label) label.textContent = "신청 마감";
    el.addEventListener("click", (e) => {
      e.preventDefault();
      toast(applyState === "closed" ? "참가 신청이 마감되었어요. 다음에 또 만나요! 👻" : "참가 신청이 곧 열려요. 조금만 기다려 주세요! 👻");
    });
  });

  // 마감일 안내: 신청 중이면 마감까지 남은 날짜를 함께 표시
  const applyLeft = kstDay(APPLY_DEADLINE) - kstDay(new Date());
  $$("[data-apply-note]").forEach((el) => {
    if (applyState === "closed") el.textContent = "참가 신청이 마감되었어요";
    else if (applyState === "open") el.textContent = applyLeft > 0 ? `신청 마감 · 11월 9일(월) · D-${applyLeft}` : "오늘 신청 마감!";
  });

  /* ---------- D-day & countdown ---------- */
  const ddayEls = $$("[data-dday]");
  const cd = $("[data-countdown]");
  const cdParts = cd ? Object.fromEntries($$("[data-cd]", cd).map((el) => [el.dataset.cd, el])) : {};
  const pad = (n) => String(n).padStart(2, "0");

  function tick() {
    const now = new Date();
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

  /* ---------- 타이틀 물결: 크게 일렁이며 등장 → 계속 흐름, 마우스를 올리면 크게 ---------- */
  const wave = $("[data-wave]");
  const noise = $("[data-noise]");
  const title = $(".hero__title");
  if (wave && noise && title && !reduceMotion) {
    const BASE = Number(wave.getAttribute("scale"));
    const [fx, fy] = noise.getAttribute("baseFrequency").split(/\s+/).map(Number);
    let amp = 260; // 등장할 때의 진폭
    let energy = 0; // 0 = 평소, 1 = 마우스를 올렸을 때
    let energyTarget = 0;
    let phase = 0;
    let inView = true;
    let raf = 0;
    let last = 0;

    const frame = (now) => {
      raf = 0;
      if (!inView || document.hidden) return;
      raf = requestAnimationFrame(frame);
      if (now - last < 33) return; // 30fps면 충분 (필터 렌더링 비용 절약)
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const ease = (k) => 1 - Math.exp(-dt * k);
      energy += (energyTarget - energy) * ease(3);
      phase += dt * (1 + energy * 2.5); // 마우스를 올리면 흐름이 빨라짐
      amp += (BASE * (1 + energy * 1.5) - amp) * ease(2.2); // 마우스를 올리면 물결이 커짐
      wave.setAttribute("scale", (amp + Math.sin(phase * 1.7) * 8).toFixed(1));
      noise.setAttribute(
        "baseFrequency",
        `${(fx + Math.sin(phase * 0.6) * 0.00022).toFixed(6)} ${(fy + Math.sin(phase * 0.5 + 1) * 0.0005).toFixed(6)}`
      );
    };
    const start = () => (raf ||= requestAnimationFrame(frame));

    title.addEventListener("pointerenter", () => (energyTarget = 1));
    title.addEventListener("pointerleave", () => (energyTarget = 0));
    // 화면 밖이거나 탭이 숨겨지면 멈춤
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start();
      }).observe(title);
    }
    document.addEventListener("visibilitychange", () => !document.hidden && start());
    wave.setAttribute("scale", amp);
    start();
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
  function say(text, hold = 1600) {
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.add("is-on");
    clearTimeout(bubbleTimer);
    if (hold) bubbleTimer = setTimeout(() => bubble.classList.remove("is-on"), hold); // 0이면 고정
  }

  // 연달아 10번 누르면 Kiro Crew 등장 (3초 넘게 쉬면 다시 처음부터)
  const CREW_CLICKS = 10;
  let crewCount = 0;
  let crewTimer;
  let crewState = "idle"; // idle → assembling(등장 중) → here(활동 중)
  heroGhost?.addEventListener("click", () => {
    heroGhost.classList.remove("is-boo");
    void heroGhost.getBoundingClientRect();
    heroGhost.classList.add("is-boo");
    if (crewState === "assembling") return; // 크루가 다 나올 때까지 메시지 고정

    crewCount += 1;
    clearTimeout(crewTimer);
    crewTimer = setTimeout(() => (crewCount = 0), 3000);

    if (crewCount >= CREW_CLICKS) {
      crewCount = 0;
      if (crewState === "idle") {
        crewState = "assembling";
        say("Kiro Crew, assemble!", 0);
        releaseCrew(() => {
          crewState = "here";
          say("Kiro Crew, assemble!", 1200);
        });
      } else {
        say("Crew's all here!");
      }
    } else if (crewCount === CREW_CLICKS - 1 && crewState === "idle") {
      say("One more...");
    } else {
      say(lines[lineIdx++ % lines.length]);
    }
  });

  /* ---------- Kiro Crew: 화면을 계속 떠다니는 고스트들 ----------
     각자 랜덤한 크기로, 떠다니기·두리번·대시·가장자리에서 빼꼼·한 바퀴·깜짝·사라졌다 나타나기·
     크기와 색 바꾸기·화면 속 콘텐츠 훔쳐 가기(돌려주거나, 아예 가져가 버리거나)를 랜덤하게 반복.
     대시할 때는 앞으로 길게 늘어난 모양(꼬리 물결)으로 바뀜 */
  const SVG_NS = "http://www.w3.org/2000/svg";
  const GHOST_D = $("#i-ghost path")?.getAttribute("d") || "";
  const DASH_D =
    "M245 95C300 95 338 138 338 192C338 248 298 288 242 288C200 288 160 290 120 296C96 300 74 306 60 300C48 294 54 282 66 276C46 278 22 276 14 264C8 254 20 246 34 244C18 238 6 226 10 214C14 202 34 202 50 204C38 194 34 182 42 174C80 140 170 95 245 95Z";
  const eyes = (a, b, cy) =>
    `<g class="crew__eyes"><g class="crew__blink"><ellipse cx="${a}" cy="${cy}" rx="13" ry="21" /><ellipse cx="${b}" cy="${cy}" rx="13" ry="21" /></g></g>`;
  const CREW_MARKUP = `<g class="crew__idle"><path d="${GHOST_D}" />${eyes(214, 260, 161)}</g><g class="crew__dash"><path d="${DASH_D}" />${eyes(268, 306, 176)}</g>`;
  const STAGGER = 0.22; // s, 한 마리씩 등장하는 간격
  const crewSizes = () => (window.innerWidth < 600 ? [24, 72] : [32, 104]); // 고스트 몸통 너비 범위(px), 변신해도 이 안에서만
  const CREW_COLORS = ["#ffffff", "#ffffff", "#ece2ff", "#dccbff", "#c7a6ff"];

  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const ease = {
    linear: (p) => p,
    inOut: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
    in: (p) => p ** 3,
    out: (p) => 1 - (1 - p) ** 3,
    inOutCubic: (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2),
    back: (p) => 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2,
  };

  const crew = [];
  let crewLast = 0;

  function releaseCrew(onArrived) {
    const layer = document.createElement("div");
    layer.className = reduceMotion ? "crew crew--still" : "crew";
    layer.setAttribute("aria-hidden", "true");
    document.body.append(layer);

    const small = window.innerWidth < 600;
    const count = small ? 8 : 12;
    // 크기 구간을 고르게 나눠 섞음: 매번 큰 친구·작은 친구가 비슷한 비율로 나오도록
    const spread = Array.from({ length: count }, (_, i) => (i + Math.random()) / count);
    for (let i = spread.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spread[i], spread[j]] = [spread[j], spread[i]];
    }
    spread.forEach((u, i) => crew.push(spawnGhost(layer, i, small, u)));
    setTimeout(onArrived, ((count - 1) * STAGGER + 1.5) * 1000);

    if (reduceMotion) return;
    crewLast = performance.now();
    requestAnimationFrame(tickCrew);
  }

  function spawnGhost(layer, i, small, u) {
    const [minSize, maxSize] = crewSizes();
    const size = minSize + (maxSize - minSize) * u ** 1.3; // 고스트 몸통 너비(px), 작은 친구가 조금 더 많게
    const el = document.createElementNS(SVG_NS, "svg");
    el.setAttribute("class", "crew__ghost");
    el.setAttribute("viewBox", "-40 40 480 320"); // 기본 모양과 대시 모양이 모두 들어가는 영역, 중심 = 몸통 중심
    el.innerHTML = CREW_MARKUP;
    const g = {
      el,
      size,
      bh: (size * 282) / 232, // 몸통 높이
      w: (size * 480) / 232,
      h: (size * 320) / 232,
      eyes: [...el.querySelectorAll(".crew__eyes")],
      phase: rand(0, Math.PI * 2),
      s: { x: 0, y: 0, rot: 0, sx: 1, sy: 1, k: 1, op: 1, lx: 0, ly: 0 }, // k = 크기 배율
      flip: 1,
      shape: "idle",
      bob: 0,
      queue: [],
      seg: null,
      t: 0,
      nextBlink: rand(1, 4),
    };
    el.style.width = `${g.w}px`;
    el.style.height = `${g.h}px`;
    el.style.setProperty("--crew-body", size < (small ? 38 : 50) ? pick(CREW_COLORS.slice(2)) : "#ffffff"); // 작은 친구들은 보랏빛
    layer.append(el);

    if (reduceMotion) {
      // 움직임 줄이기: 제자리에 하나씩 나타나기만
      [g.s.x, g.s.y] = randomPoint(g);
      g.flip = pick([1, -1]);
      g.s.op = 0;
      render(g, 0);
      setTimeout(() => (el.style.opacity = 1), i * STAGGER * 1000);
      return g;
    }

    // 등장: 화면 밖 아무 가장자리에서 대기하다가 차례로 대시해서 들어옴
    [g.s.x, g.s.y] = outside(g, pick(["left", "right", "top", "bottom"]));
    g.queue.push({ dur: i * STAGGER });
    dash(g, randomPoint(g));
    return g;
  }

  function tickCrew(now) {
    const dt = Math.min((now - crewLast) / 1000, 0.05);
    crewLast = now;
    for (const g of crew) stepGhost(g, dt, now / 1000);
    requestAnimationFrame(tickCrew);
  }

  function stepGhost(g, dt, time) {
    if (!g.seg) nextSegment(g);
    const seg = g.seg;
    g.t += dt;
    const p = seg.dur ? Math.min(g.t / seg.dur, 1) : 1;
    const e = (seg.ease || ease.inOut)(p);
    for (const k in seg.to) g.s[k] = seg.from[k] + (seg.to[k] - seg.from[k]) * e;
    g.bob += ((seg.bob ?? (g.shape === "idle" ? 6 : 0)) - g.bob) * Math.min(1, dt * 4);

    g.nextBlink -= dt;
    if (g.nextBlink <= 0) {
      g.el.classList.add("is-blink");
      setTimeout(() => g.el.classList.remove("is-blink"), 140);
      g.nextBlink = rand(2, 6);
    }

    render(g, time);
    if (p >= 1) g.seg = null;
  }

  // 큐에서 다음 동작을 꺼냄. 함수면 그 시점의 위치를 기준으로 동작을 만들어 넣음
  function nextSegment(g) {
    while (typeof g.queue[0] === "function") g.queue.shift()(g);
    if (!g.queue.length) chooseBehavior(g);
    while (typeof g.queue[0] === "function") g.queue.shift()(g);
    const seg = g.queue.shift();
    if (seg.set) Object.assign(g.s, seg.set);
    if (seg.flip) g.flip = seg.flip;
    if (seg.color) g.el.style.setProperty("--crew-body", seg.color);
    if (seg.shape && seg.shape !== g.shape) {
      g.shape = seg.shape;
      g.el.classList.toggle("is-dashing", seg.shape === "dash");
    }
    seg.to = seg.to || {};
    seg.from = {};
    for (const k in seg.to) seg.from[k] = g.s[k];
    g.seg = seg;
    g.t = 0;
  }

  function render(g, time) {
    const s = g.s;
    const bobY = Math.sin(time * 2.2 + g.phase) * g.bob;
    const bobR = Math.cos(time * 2.2 + g.phase) * g.bob * 0.25;
    g.el.style.transform =
      `translate(${(s.x - g.w / 2).toFixed(1)}px, ${(s.y - g.h / 2 + bobY).toFixed(1)}px) ` +
      `rotate(${(s.rot + bobR).toFixed(2)}deg) scale(${(s.sx * s.k * g.flip).toFixed(3)}, ${(s.sy * s.k).toFixed(3)})`;
    g.el.style.opacity = s.op.toFixed(2);
    if (g.carry) {
      const c = g.carry;
      const tilt = clamp((s.rot + bobR) * 0.4, -10, 10);
      c.el.style.transform = `translate(${(s.x + c.dx).toFixed(1)}px, ${(s.y + c.dy + bobY).toFixed(1)}px) rotate(${tilt.toFixed(2)}deg)`;
    }
    const look = `translate(${(s.lx * 7).toFixed(1)} ${(s.ly * 6).toFixed(1)})`;
    if (look !== g.look) {
      g.look = look;
      g.eyes.forEach((eye) => eye.setAttribute("transform", look));
    }
  }

  const sizeOf = (g) => g.size * g.s.k;
  const heightOf = (g) => g.bh * g.s.k;

  function randomPoint(g) {
    const m = sizeOf(g) * 0.6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return [rand(m, Math.max(m, vw - m)), rand(m, Math.max(m, vh - m))];
  }

  // 화면 밖, 해당 가장자리 바로 바깥 (기본 자세 기준)
  function outside(g, edge) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (edge === "left") return [-sizeOf(g), rand(0.1, 0.9) * vh];
    if (edge === "right") return [vw + sizeOf(g), rand(0.1, 0.9) * vh];
    if (edge === "top") return [rand(0.1, 0.9) * vw, -heightOf(g)];
    return [rand(0.1, 0.9) * vw, vh + heightOf(g)];
  }

  const BEHAVIORS = [
    [4, drift],
    [2, hover],
    [2, (g) => dash(g, farPoint(g))],
    [1, peek],
    [1, twirl],
    [1, boo],
    [1, vanish],
    [1.5, morph],
    [4, heist],
  ];
  const BEHAVIOR_TOTAL = BEHAVIORS.reduce((sum, [w]) => sum + w, 0);
  function chooseBehavior(g) {
    let r = Math.random() * BEHAVIOR_TOTAL;
    for (const [w, fn] of BEHAVIORS) {
      if ((r -= w) < 0) return fn(g);
    }
    drift(g);
  }

  // 느긋하게 떠다니며 다른 곳으로 이동
  function drift(g) {
    const [tx, ty] = randomPoint(g);
    const dist = Math.hypot(tx - g.s.x, ty - g.s.y);
    g.queue.push({
      dur: clamp(dist / rand(45, 100), 2, 7),
      flip: tx < g.s.x ? -1 : 1,
      shape: "idle",
      bob: rand(6, 12),
      to: { x: tx, y: ty, rot: rand(-7, 7), sx: 1, sy: 1, lx: 0.6, ly: ty < g.s.y ? -0.4 : 0.3 },
    });
  }

  // 제자리에서 둥실거리며 두리번
  function hover(g) {
    const n = 1 + Math.floor(rand(1, 3));
    for (let k = 0; k < n; k++) {
      g.queue.push({ dur: rand(0.9, 2), bob: rand(8, 14), to: { lx: rand(-1, 1), ly: rand(-1, 1), rot: rand(-8, 8) } });
    }
  }

  // 움츠렸다가 길게 늘어난 모양으로 휙 날아감
  function dash(g, [tx, ty], recover = true) {
    const dx = tx - g.s.x;
    const dy = ty - g.s.y;
    const flip = dx < 0 ? -1 : 1;
    const r = (Math.atan2(dy * flip, dx * flip) * 180) / Math.PI;
    g.queue.push(
      { dur: 0.26, ease: ease.out, flip, shape: "idle", to: { sx: 1.14, sy: 0.86, lx: 1, ly: 0 } },
      {
        dur: clamp(Math.hypot(dx, dy) / rand(650, 1000), 0.35, 1.1),
        ease: ease.inOutCubic,
        shape: "dash",
        set: { rot: r, sx: 1, sy: 1 },
        to: { x: tx, y: ty, sx: 1.06, sy: 0.94 },
      }
    );
    if (recover) {
      g.queue.push({
        dur: 0.55,
        ease: ease.back,
        shape: "idle",
        set: { rot: clamp(r * 0.3, -18, 18), sx: 0.88, sy: 1.12 },
        to: { rot: 0, sx: 1, sy: 1, lx: 0.4 },
      });
    }
  }

  function farPoint(g) {
    let best = randomPoint(g);
    for (let k = 0; k < 5; k++) {
      const p = randomPoint(g);
      if (Math.hypot(p[0] - g.s.x, p[1] - g.s.y) > Math.hypot(best[0] - g.s.x, best[1] - g.s.y)) best = p;
    }
    return best;
  }

  // 화면 밖으로 사라졌다가 가장자리에서 빼꼼 내다보고, 다시 들어와서 떠다님
  function peek(g) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bh = heightOf(g);
    const size = sizeOf(g);
    const edge = pick(["left", "right", "top", "bottom"]);
    const f = rand(0.35, 0.55); // 보이는 비율
    const along = edge === "left" || edge === "right" ? rand(0.15, 0.85) * vh : rand(0.15, 0.85) * vw;
    // 머리가 화면 안쪽을 향하도록 회전
    const spot = {
      left: { rot: 90, hidden: [-bh / 2 - 10, along], shown: [f * bh - bh / 2, along], exit: [-size, along] },
      right: { rot: -90, hidden: [vw + bh / 2 + 10, along], shown: [vw - f * bh + bh / 2, along], exit: [vw + size, along] },
      top: { rot: 180, hidden: [along, -bh / 2 - 10], shown: [along, f * bh - bh / 2], exit: [along, -bh] },
      bottom: { rot: 0, hidden: [along, vh + bh / 2 + 10], shown: [along, vh - f * bh + bh / 2], exit: [along, vh + bh] },
    }[edge];

    dash(g, spot.exit, false);
    g.queue.push(
      {
        dur: rand(0.4, 1.2),
        shape: "idle",
        flip: pick([1, -1]),
        bob: 0,
        set: { x: spot.hidden[0], y: spot.hidden[1], rot: spot.rot, sx: 1, sy: 1, lx: 0, ly: 0 },
      },
      { dur: 0.8, ease: ease.back, bob: 2, to: { x: spot.shown[0], y: spot.shown[1] } },
      { dur: rand(0.7, 1.3), bob: 2, to: { lx: -0.9, ly: 0.4 } },
      { dur: rand(0.7, 1.3), bob: 2, to: { lx: 0.9, ly: -0.3 } },
      { dur: 0.5, ease: ease.in, bob: 0, to: { x: spot.hidden[0], y: spot.hidden[1] } },
      { dur: rand(0.3, 1), set: { x: spot.exit[0], y: spot.exit[1], rot: 0 } },
      drift
    );
  }

  // 위로 솟으며 한 바퀴
  function twirl(g) {
    const { y, rot } = g.s;
    const top = Math.max(y - 50, heightOf(g) / 2);
    g.queue.push(
      { dur: 0.25, ease: ease.out, to: { sx: 0.88, sy: 1.12 } },
      { dur: 0.9, ease: ease.inOutCubic, bob: 0, to: { rot: rot + 360 * g.flip, y: top, sx: 1, sy: 1 } },
      { dur: 0, set: { rot } },
      { dur: 0.6, ease: ease.back, to: { y } }
    );
  }

  // 메인 고스트를 눌렀을 때처럼 찌그러졌다 튀어오름
  function boo(g) {
    const { y } = g.s;
    g.queue.push(
      { dur: 0.16, ease: ease.out, to: { sx: 1.16, sy: 0.84 } },
      { dur: 0.22, ease: ease.out, to: { sx: 0.9, sy: 1.14, y: y - 18 } },
      { dur: 0.4, ease: ease.back, to: { sx: 1, sy: 1, y } },
      { dur: rand(0.5, 1.2), bob: 10 }
    );
  }

  // 유령답게 스르르 사라졌다가 다른 곳에서 뿅
  function vanish(g) {
    const [nx, ny] = randomPoint(g);
    g.queue.push(
      { dur: 0.7, ease: ease.in, to: { op: 0, sx: 0.85, sy: 1.15, y: g.s.y - 24 } },
      { dur: rand(0.6, 1.6) },
      { dur: 0.7, ease: ease.back, set: { x: nx, y: ny, sx: 0.6, sy: 0.6 }, to: { op: 1, sx: 1, sy: 1 } }
    );
  }

  // 부풀었다 줄었다 하며 크기와 색이 바뀜
  function morph(g) {
    const [min, max] = crewSizes();
    const k = clamp(g.s.k * rand(0.6, 1.6), min / g.size, max / g.size);
    g.queue.push(
      { dur: 0.18, ease: ease.out, to: { sx: 1.12, sy: 0.88 } },
      { dur: 0.7, ease: ease.back, color: pick(CREW_COLORS), to: { k, sx: 1, sy: 1 } },
      { dur: rand(0.4, 1), bob: 10 }
    );
  }

  /* 장난: 지금 보고 있는 화면의 콘텐츠를 집어서 화면 밖으로 들고 감.
     반반 확률로 잠시 뒤 제자리에 돌려놓거나, 아예 가져가 버림(새로고침하면 돌아옴).
     원본은 자리를 지킨 채 숨기고(레이아웃 그대로), 똑같이 생긴 복제본을 고스트가 들고 다님 */
  const LOOT = "h2, h3, p, li, img, dt, dd, .countdown > div";
  const LOOT_SKIP = ".nav, .marquee, .crew, .toast, .hero__ghost, .cta__ghost, [aria-hidden='true'], [data-reveal]";
  const INTERACTIVE = "a, button, summary, input, select, textarea, label";
  const stolen = new Set(); // 지금 들고 다니는 중
  const gone = new Set(); // 아예 가져가 버린 것
  const returnedAt = new WeakMap(); // 방금 돌려준 건 한동안 다시 안 훔침
  let lastHeist = -Infinity;

  // 눈에 보이는 영역: 블록 요소는 글자가 짧아도 줄 전체 폭을 차지하므로(특히 모바일),
  // 배경·테두리가 없으면 실제 글자가 차지하는 영역으로 판단
  function visibleRect(el, cs) {
    const boxed = cs.backgroundColor !== "rgba(0, 0, 0, 0)" || cs.backgroundImage !== "none" || parseFloat(cs.borderTopWidth) > 0;
    if (el.tagName === "IMG" || boxed) return el.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    return r.width ? r : el.getBoundingClientRect();
  }

  function findLoot() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const list = $$(LOOT).filter((el) => {
      if (el.closest(LOOT_SKIP) || el.closest(INTERACTIVE) || el.querySelector(INTERACTIVE)) return false;
      if ([...stolen, ...gone].some((s) => s.contains(el) || el.contains(s))) return false;
      if (performance.now() - (returnedAt.get(el) ?? -Infinity) < 30000) return false;
      const cs = getComputedStyle(el);
      if (cs.visibility !== "visible" || cs.display === "none" || Number(cs.opacity) < 0.5) return false;
      const r = visibleRect(el, cs);
      if (r.width < 24 || r.height < 14) return false;
      if (r.height > vh * 0.45 || r.width * r.height > vw * vh * 0.22) return false; // 너무 큰 덩어리는 제외
      if (r.left < 0 || r.right > vw || r.top < 72 || r.bottom > vh - 8) return false; // 화면 안에 다 보이는 것만
      return true;
    });
    return list.length ? pick(list) : null;
  }

  function heist(g) {
    const now = performance.now();
    if (stolen.size >= 3 || now - lastHeist < 2500) return drift(g); // 한 번에 최대 3개, 2.5초에 한 번
    const el = findLoot();
    if (!el) return drift(g);
    lastHeist = now;
    stolen.add(el);
    const r = visibleRect(el, getComputedStyle(el)); // 고스트는 실제 글자가 있는 쪽으로 날아감
    const half = sizeOf(g) / 2;
    dash(g, [clamp(r.left + r.width * rand(0.25, 0.75), half, window.innerWidth - half), r.top - heightOf(g) * 0.12]);
    g.queue.push((g) => grab(g, el));
  }

  function cloneLoot(el, r) {
    const copy = el.cloneNode(true);
    copy.removeAttribute("id");
    copy.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    const cs = getComputedStyle(el);
    for (const prop of cs) copy.style.setProperty(prop, cs.getPropertyValue(prop));
    // 글자색을 따라가야 하는 속성은 계산된 값이 박히면 자식 요소 색이 깨져서 되돌림
    ["-webkit-text-fill-color", "-webkit-text-stroke-color", "text-emphasis-color", "caret-color"].forEach((prop) =>
      copy.style.setProperty(prop, "currentcolor")
    );
    Object.assign(copy.style, {
      position: "absolute",
      top: "0",
      left: "0",
      right: "auto",
      bottom: "auto",
      margin: "0",
      boxSizing: "border-box",
      width: `${r.width}px`,
      height: `${r.height}px`,
      minWidth: "0",
      minHeight: "0",
      maxWidth: "none",
      maxHeight: "none",
      translate: "none",
      rotate: "none",
      scale: "none",
      transition: "none",
      animation: "none",
      visibility: "visible",
      opacity: "1",
      pointerEvents: "none",
      zIndex: "auto",
      willChange: "transform",
    });
    return copy;
  }

  function grab(g, el) {
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) {
      stolen.delete(el); // 그새 스크롤해서 화면 밖이면 포기
      return;
    }
    const loot = cloneLoot(el, r);
    g.el.before(loot); // 고스트가 앞에서 들고 있도록
    g.carry = { el: loot, src: el, prev: el.style.visibility, dx: r.left - g.s.x, dy: r.top - g.s.y, w: r.width };
    loot.style.transformOrigin = `${-g.carry.dx}px ${-g.carry.dy}px`;
    el.style.visibility = "hidden";

    // 가까운 쪽 화면 밖으로 들고 튐. 반반 확률로 잠시 숨어 있다 돌려주거나, 그대로 가져가 버림
    const left = r.left + r.width / 2 < window.innerWidth / 2;
    const keep = Math.random() < 0.5;
    const ty = clamp(g.s.y + rand(-0.15, 0.1) * window.innerHeight, 40, window.innerHeight - 40);
    g.queue.push(
      { dur: 0.16, ease: ease.out, to: { sx: 1.16, sy: 0.84 } },
      { dur: 0.3, ease: ease.back, to: { sx: 1, sy: 1 } },
      {
        dur: rand(1.6, 2.6),
        flip: left ? -1 : 1,
        shape: "idle",
        bob: 9,
        to: { x: offscreenX(g, left), y: ty, rot: left ? -6 : 6, lx: 1, ly: 0 },
      },
      { dur: rand(2, 4), bob: 0 },
      keep ? keepLoot : (g) => bringBack(g, left)
    );
  }

  // 고스트와 들고 있는 콘텐츠가 모두 화면 밖으로 나가는 x 위치
  function offscreenX(g, left) {
    const c = g.carry;
    const half = sizeOf(g) / 2 + 30;
    const vw = window.innerWidth;
    return left ? Math.min(-(c.dx + c.w), 0) - half : Math.max(vw - c.dx, vw) + half;
  }

  function bringBack(g, left) {
    const c = g.carry;
    const r = c.src.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight || !r.width) {
      // 원래 자리가 화면 밖이면 조용히 돌려놓고 복귀
      dropLoot(g);
      g.queue.push(drift);
      return;
    }
    const tx = r.left - c.dx;
    const ty = r.top - c.dy;
    g.queue.push(
      { dur: 0, set: { x: offscreenX(g, left), y: ty, rot: 0 } },
      { dur: rand(1.4, 2.2), flip: left ? 1 : -1, bob: 6, to: { x: tx, y: ty, lx: 1, ly: 0 } },
      (g) => {
        dropLoot(g);
        boo(g);
      }
    );
  }

  // 그대로 가져가 버리고 빈손으로 돌아옴. 원래 자리는 빈칸으로 남음
  function keepLoot(g) {
    const c = g.carry;
    g.carry = null;
    c.el.remove();
    stolen.delete(c.src);
    gone.add(c.src);
    g.queue.push(drift);
  }

  function dropLoot(g) {
    const c = g.carry;
    if (!c) return;
    g.carry = null;
    c.el.remove();
    c.src.style.visibility = c.prev;
    stolen.delete(c.src);
    returnedAt.set(c.src, performance.now());
    c.src.animate([{ opacity: 0, scale: "0.85" }, { opacity: 1, scale: "1" }], {
      duration: 420,
      easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    });
  }
  // 연속 클릭(더블·트리플 클릭)이 주변 글씨까지 선택하지 않도록
  heroGhost?.addEventListener("mousedown", (e) => {
    if (e.detail > 1) e.preventDefault();
  });
  heroGhost?.addEventListener("animationend", (e) => {
    if (e.animationName === "boo") heroGhost.classList.remove("is-boo");
  });

  /* ---------- 종이 카드: 마우스 위치 쪽으로 입체적으로 기울기 ---------- */
  if (!reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const MAX_TILT = 6; // deg
    $$("[data-tilt]").forEach((card) => {
      let point = null;
      let frame = 0;
      const apply = () => {
        frame = 0;
        if (!point) return;
        const r = card.getBoundingClientRect();
        const x = Math.min(Math.max((point.x - r.left) / r.width, 0), 1) - 0.5;
        const y = Math.min(Math.max((point.y - r.top) / r.height, 0), 1) - 0.5;
        card.style.setProperty("--ry", `${(x * MAX_TILT * 2).toFixed(2)}deg`);
        card.style.setProperty("--rx", `${(-y * MAX_TILT * 2).toFixed(2)}deg`);
      };
      card.addEventListener("pointerenter", () => card.classList.add("is-tilting"));
      card.addEventListener("pointermove", (e) => {
        point = { x: e.clientX, y: e.clientY };
        frame ||= requestAnimationFrame(apply);
      });
      card.addEventListener("pointerleave", () => {
        point = null;
        card.classList.remove("is-tilting");
        card.style.removeProperty("--rx");
        card.style.removeProperty("--ry");
      });
    });
  }

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
