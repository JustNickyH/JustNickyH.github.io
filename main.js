import Lenis from 'lenis';

    /* STATE & CORE */
    window.scrollTo(0, 0);
    let scrollEnabled = true;
    const lenis = new Lenis({ smoothWheel: true });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

    const sc = {
      stop: () => { lenis.stop(); document.documentElement.classList.add('locked'); scrollEnabled = false; },
      start: () => { lenis.start(); document.documentElement.classList.remove('locked'); scrollEnabled = true; },
      to: (id) => {
        const el = document.getElementById(id);
        if (!el) return;
        sc.stop();
        setTimeout(() => {
          window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset, behavior: 'smooth' });
          setTimeout(() => sc.start(), 100);
        }, 50);
      }
    };
    window.sc = sc;

    /* GLOBALS & FLAGS */
    let introReady = false;
    const q = (s) => document.querySelector(s);
    const qq = (s) => document.querySelectorAll(s);

    /* LOADER LOGIC */
    sc.stop();
    const lFill = q('#l-fill'), lCount = q('#l-count'), loader = q('#loader');
    let startTime = null;
    const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    function tickLoader(t) {
      if (!startTime) startTime = t;
      const p = Math.min((t - startTime) / 1300, 1);
      const e = easeInOutCubic(p);
      lFill.style.width = `${e * 100}%`;
      lCount.textContent = Math.round(e * 100).toString().padStart(3, '0');
      if (p < 1) requestAnimationFrame(tickLoader);
      else {
        loader.classList.add('exit');
        setTimeout(() => {
          introReady = true;
          sc.start();
          loader.remove();
          triggerReveals();
          q('#header').classList.add('ready');
        }, 700);
      }
    }
    requestAnimationFrame(tickLoader);

    /* CLOCK */
    function updateClock() {
      const d = new Date();
      const locStr = d.toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour: 'numeric', minute: '2-digit', hour12: true });
      const timeStr = locStr.replace(' ', '').toLowerCase();
      const dateStr = d.toLocaleString("en-US", { timeZone: "Asia/Jakarta", day: 'numeric', month: 'long', year: 'numeric' });
      if (q('#c-time')) q('#c-time').textContent = timeStr;
      if (q('#c-date')) q('#c-date').textContent = dateStr;
      if (q('#m-time')) q('#m-time').textContent = timeStr;
    }
    updateClock(); setInterval(updateClock, 1000);

    /* TEXT REVEAL PREP */
    qq('.rv-stagger-lines').forEach(el => {
      const text = el.innerHTML;
      el.innerHTML = text.split('<br>').map(line => `<span class="rv-line"><span class="rv-line-inner">${line}</span></span>`).join('');
    });
    qq('.rv-stagger-words').forEach(el => {
      const clone = el.cloneNode(true);
      el.innerHTML = '';
      clone.childNodes.forEach(node => {
        if (node.nodeType === 3) {
          node.textContent.split(' ').filter(w => w).forEach(w => {
            el.innerHTML += `<span class="rv-word"><span class="rv-word-inner">${w}</span></span> `;
          });
        } else {
          const wClass = node.getAttribute('style') ? ` style="${node.getAttribute('style')}"` : '';
          const wClassHtml = node.getAttribute('class') ? ` class="${node.getAttribute('class')}"` : '';
          node.textContent.split(' ').filter(w => w).forEach(w => {
            el.innerHTML += `<span class="rv-word"><span class="rv-word-inner"${wClass}${wClassHtml}>${w}</span></span> `;
          });
        }
      });
    });

    /* INTERSECTION REVEALS */
    const ob = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const el = e.target;
          if (!introReady && (el.closest('#home') || el.closest('#header'))) return;

          if (el.classList.contains('rv-block')) {
            const rv = el.getAttribute('data-rv') || '';
            let d = rv.match(/d:(\d+)/); d = d ? parseInt(d[1]) : 0;
            let t = rv.match(/t:(\d+)/); t = t ? parseInt(t[1]) : 0;
            let fromY = rv.match(/from-y:([\dpxrem-]+)/); fromY = fromY ? fromY[1] : '0px';
            let fromScale = rv.match(/from-scale:([\d.]+)/); fromScale = fromScale ? fromScale[1] : 1;

            if (!el.dataset.init) {
              el.style.transform = `translateY(${fromY}) scale(${fromScale})`;
              if (t) {
                el.style.transition = `transform ${t}ms var(--ease-reveal), opacity ${t}ms var(--ease-reveal)`;
              }
              el.dataset.init = '1';
            }
            setTimeout(() => el.classList.add('in-view'), d);
          } else {
            const d = parseInt(el.getAttribute('data-delay') || '0');
            const stag = parseInt(el.getAttribute('data-stagger') || '100');
            const children = el.querySelectorAll('.rv-line-inner, .rv-word-inner');
            children.forEach((c, i) => { c.style.transitionDelay = `${d + i * stag}ms`; });
            el.classList.add('in-view');
          }
          ob.unobserve(el);
        }
      });
    }, { threshold: 0.1 });

    function triggerReveals() {
      qq('.rv-block, .rv-stagger-lines, .rv-stagger-words').forEach(el => ob.observe(el));
    }

    /* STATS SCROLL COUNT-UP */
    const statOb = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) requestAnimationFrame(trackStats); });
    }, { rootMargin: "0px" });
    qq('.count-up').forEach(el => statOb.observe(el.closest('li')));

    function trackStats() {
      let needsRaf = false;
      qq('.count-up').forEach(el => {
        const rect = el.closest('li').getBoundingClientRect();
        const wh = window.innerHeight;
        const startY = wh;
        const endY = wh / 2;
        let p = (startY - rect.top) / (startY - endY);
        p = Math.max(0, Math.min(1, p));
        const target = parseInt(el.getAttribute('data-val') || '0');
        el.textContent = Math.round(p * target);
        if (rect.top > -rect.height && rect.top < wh) needsRaf = true;
      });
      if (needsRaf && scrollEnabled) requestAnimationFrame(trackStats);
    }
    window.addEventListener('scroll', () => { if (scrollEnabled) requestAnimationFrame(trackStats); });

    /* UI LOGIC (Carousel, Modal, Nav) */
    const ui = {
      carouselIdx: 0,
      carouselItems: qq('.hc-item'),
      carouselDots: qq('.hc-dot'),
      carouselTimer: null,
      carouselStart: () => {
        if(ui.carouselTimer) clearInterval(ui.carouselTimer);
        ui.carouselTimer = setInterval(ui.carouselNext, 5000);
      },
      carouselStop: () => { clearInterval(ui.carouselTimer); },
      carouselNext: () => {
        const n = ui.carouselItems.length;
        const old = ui.carouselIdx;
        ui.carouselIdx = (old + 1) % n;
        ui.carouselItems[old].className = 'hc-item prev';
        ui.carouselItems[ui.carouselIdx].className = 'hc-item active';
        ui.carouselDots[old].classList.remove('active');
        ui.carouselDots[ui.carouselIdx].classList.add('active');
        ui.carouselItems.forEach((c, i) => { if (i !== old && i !== ui.carouselIdx) c.className = 'hc-item next'; });
        ui.carouselStart();
      },
      carouselPrev: () => {
        const n = ui.carouselItems.length;
        const old = ui.carouselIdx;
        ui.carouselIdx = (old - 1 + n) % n;
        ui.carouselItems[old].className = 'hc-item next';
        ui.carouselItems[ui.carouselIdx].className = 'hc-item active';
        ui.carouselDots[old].classList.remove('active');
        ui.carouselDots[ui.carouselIdx].classList.add('active');
        ui.carouselItems.forEach((c, i) => { if (i !== old && i !== ui.carouselIdx) c.className = 'hc-item prev'; });
        ui.carouselStart();
      },
      openMenu: () => {
        sc.stop();
        const m = q('#nav-menu');
        m.classList.add('open');
        qq('.nm-item').forEach((el, i) => { el.style.transitionDelay = `${i * 45 + 80}ms`; });
      },
      closeMenu: () => {
        q('#nav-menu').classList.remove('open');
        setTimeout(() => { if (!q('#modal-backdrop').classList.contains('open')) sc.start(); }, 400);
      },
      openModal: () => {
        sc.stop();
        q('#modal-backdrop').classList.add('open');
      },
      closeModal: () => {
        q('#modal-backdrop').classList.remove('open');
        setTimeout(() => {
          if (!q('#term-modal').classList.contains('open')) sc.start();
          q('#modal-form').classList.add('active');
          q('#modal-success').classList.remove('active');
          q('#submit-txt').textContent = 'Send request';
          q('form').reset();
        }, 400);
      },
      submitForm: async (e) => {
        e.preventDefault();
        const form = e.target;
        const email = form.email.value;
        const msg = form.message.value;
        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return alert("Format email tidak valid.");
        if (msg.length < 10) return alert("Pesan terlalu pendek.");
        
        q('#submit-txt').textContent = 'Authenticating...';
        try {
          const response = await fetch(form.action, {
            method: form.method,
            body: new FormData(form),
            headers: { 'Accept': 'application/json' }
          });
          if (!response.ok) throw new Error("Gagal mengirim pesan");
          setTimeout(() => {
            q('#modal-form').classList.remove('active');
            q('#modal-success').classList.add('active');
          }, 800);
        } catch (error) {
          console.error(error);
          alert("Maaf, terjadi kesalahan saat mengirim pesan. Silakan coba lagi.");
          q('#submit-txt').textContent = 'Send request';
        }
      },
      openTerm: () => {
        sc.stop();
        q('#term-modal').classList.add('open');
        setTimeout(() => q('#term-input').focus(), 100);
      },
      closeTerm: () => {
        q('#term-modal').classList.remove('open');
        setTimeout(() => { if (!q('#modal-backdrop').classList.contains('open')) sc.start(); }, 400);
      },
      handleTerm: (e) => {
        if (e.key === 'Enter') {
          const input = e.target;
          const cmd = input.value.trim().toLowerCase();
          const body = q('#term-body');
          const container = q('#term-input-container');
          
          const echo = document.createElement('div');
          echo.className = 'term-line';
          echo.innerHTML = `<span class="term-prompt">$</span> ${input.value}`;
          body.insertBefore(echo, container);
          
          input.value = '';
          const res = document.createElement('div');
          res.className = 'term-response';
          
          if (cmd === 'help') res.innerHTML = "Commands: whoami, clear, contact, projects, neofetch";
          else if (cmd === 'whoami') res.innerHTML = "root (JustNickyH)";
          else if (cmd === 'contact') { res.innerHTML = "Opening communication channel..."; setTimeout(() => { ui.closeTerm(); ui.openModal(); }, 800); }
          else if (cmd === 'projects') { res.innerHTML = "Navigating to works..."; setTimeout(() => { ui.closeTerm(); sc.to('works'); }, 800); }
          else if (cmd === 'clear') { qq('.term-line, .term-response').forEach(el => el.remove()); }
          else if (cmd === 'neofetch') res.innerHTML = "<pre style='margin:0'>\n   _     _      \n  | |   | |     \n  | |__ | |__   \n  | '_ \\| '_ \\  \n  | | | | | | | \n  |_| |_|_| |_| \n\n  OS: Arch Linux x86_64\n  Host: Qwen-Max-Gateway\n  Kernel: 6.8.0-zen1-1-zen\n  Uptime: 42d 13h 37m\n</pre>";
          else if (cmd !== '') { res.className += ' err'; res.innerHTML = `command not found: ${cmd}`; }
          
          if (cmd !== 'clear') body.insertBefore(res, container);
          body.scrollTop = body.scrollHeight;
        }
      },
      fetchGithubStats: async () => {
        try {
          const res = await fetch('https://api.github.com/users/JustNickyH');
          if(!res.ok) return;
          const data = await res.json();
          if(data.public_repos) q('#gh-repos').setAttribute('data-val', data.public_repos);
          
          const reposRes = await fetch('https://api.github.com/users/JustNickyH/repos?per_page=100');
          if(reposRes.ok) {
            const repos = await reposRes.json();
            const stars = repos.reduce((acc, curr) => acc + curr.stargazers_count, 0);
            q('#gh-stars').setAttribute('data-val', stars);
          }
        } catch(e) {}
      }
    };
    window.ui = ui;
    
    // Init Carousel
    const hc = q('#hero-carousel');
    if (hc) {
      ui.carouselStart();
      hc.addEventListener('mouseenter', ui.carouselStop);
      hc.addEventListener('mouseleave', ui.carouselStart);
      let ts = 0;
      hc.addEventListener('touchstart', e => { ts = e.touches[0].clientX; ui.carouselStop(); }, {passive:true});
      hc.addEventListener('touchend', e => { 
        const te = e.changedTouches[0].clientX;
        if (ts - te > 50) ui.carouselNext();
        else if (te - ts > 50) ui.carouselPrev();
        ui.carouselStart();
      }, {passive:true});
    }

    // Init Github Fetch
    ui.fetchGithubStats();

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (q('#nav-menu').classList.contains('open')) ui.closeMenu();
        if (q('#modal-backdrop').classList.contains('open')) ui.closeModal();
        if (q('#term-modal').classList.contains('open')) ui.closeTerm();
      }
      if (e.key === '\\' && e.ctrlKey) {
        e.preventDefault();
        ui.openTerm();
      }
    });

    /* LIQUID REVEAL CANVAS */
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mediaQuery.matches) {
      const container = q('#liquid-container');
      const canvas = q('#liquid-canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const imgCover = new Image();
      imgCover.crossOrigin = "anonymous";
      // The terminal/code revealed via brush
      imgCover.src = 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?q=80&w=2000&auto=format&fit=crop';

      let cvsCover, ctxCover, cvsBrush, ctxBrush;
      let cw = 0, ch = 0, dpr = 1, radius = 0, diam = 0;
      const config = { brushRadius: 143, decay: 0.016 };

      let points = [];
      let idle = 0;
      let lastPos = null;

      let canvasRect = null;
      function updateCanvasRect() { canvasRect = canvas.getBoundingClientRect(); }

      function initCanvas() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = container.getBoundingClientRect();
        cw = rect.width; ch = rect.height;
        canvas.width = cw * dpr; canvas.height = ch * dpr;

        radius = config.brushRadius * dpr;
        diam = Math.ceil(radius * 2);

        cvsCover = document.createElement('canvas');
        cvsCover.width = canvas.width; cvsCover.height = canvas.height;
        ctxCover = cvsCover.getContext('2d');

        cvsBrush = document.createElement('canvas');
        cvsBrush.width = diam; cvsBrush.height = diam;
        ctxBrush = cvsBrush.getContext('2d');

        drawCover();
        precomputeBrush();
        updateCanvasRect();
      }

      window.addEventListener('scroll', updateCanvasRect, { passive: true });

      function drawCover() {
        if (!imgCover.complete || !imgCover.naturalWidth) return;
        const ir = imgCover.naturalWidth / imgCover.naturalHeight;
        const cr = canvas.width / canvas.height;
        let sx = 0, sy = 0, sw = imgCover.naturalWidth, sh = imgCover.naturalHeight;
        if (ir > cr) { sw = sh * cr; sx = (imgCover.naturalWidth - sw) / 2; }
        else { sh = sw / cr; sy = (imgCover.naturalHeight - sh) / 2; }
        ctxCover.clearRect(0, 0, canvas.width, canvas.height);
        ctxCover.drawImage(imgCover, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      }
      imgCover.onload = drawCover;

      function precomputeBrush() {
        const c = radius;
        ctxBrush.clearRect(0, 0, diam, diam);
        const grad = ctxBrush.createRadialGradient(c, c, 0, c, c, radius);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.55, 'rgba(255,255,255,0.82)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctxBrush.globalCompositeOperation = 'source-over';
        ctxBrush.fillStyle = grad;
        ctxBrush.fillRect(0, 0, diam, diam);
      }

      window.addEventListener('pointermove', e => {
        if (!canvasRect) return;
        const x = (e.clientX - canvasRect.left) * dpr;
        const y = (e.clientY - canvasRect.top) * dpr;
        if (x < -radius || x > canvas.width + radius || y < -radius || y > canvas.height + radius) { lastPos = null; return; }

        if (lastPos) {
          const dx = x - lastPos.x, dy = y - lastPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const step = Math.max(radius * 0.3, 1);
          const n = Math.min(Math.ceil(dist / step), 60);
          for (let i = 1; i <= n; i++) points.push({ x: lastPos.x + dx * (i / n), y: lastPos.y + dy * (i / n) });
        } else {
          points.push({ x, y });
        }
        lastPos = { x, y };
      }, { passive: true });

      function tickCanvas() {
        if (points.length > 0) idle = 0; else idle++;
        if (idle > 120) { if (idle === 121) ctx.clearRect(0, 0, canvas.width, canvas.height); requestAnimationFrame(tickCanvas); return; }

        const fade = points.length > 0 ? config.decay : Math.min(config.decay + idle * 0.004, 0.5);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = `rgba(0,0,0,${fade})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (points.length > 0) {
          ctx.globalCompositeOperation = 'source-over';
          points.forEach(p => {
            const cx = p.x - radius, cy = p.y - radius;
            precomputeBrush();
            ctxBrush.globalCompositeOperation = 'source-in';
            ctxBrush.drawImage(cvsCover, cx, cy, diam, diam, 0, 0, diam, diam);
            ctx.drawImage(cvsBrush, cx, cy);
          });
          points = [];
        }
        requestAnimationFrame(tickCanvas);
      }

      const ro = new ResizeObserver(initCanvas);
      ro.observe(container);
      requestAnimationFrame(tickCanvas);
    }
