(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------- акция: снимается сама после даты в data-until ---------- */
  document.querySelectorAll('[data-until]').forEach(function (el) {
    var until = Date.parse(el.getAttribute('data-until'));
    if (!isNaN(until) && Date.now() >= until) el.remove();
  });

  /* ---------- открыто ли сейчас (время Сургута, UTC+5) ---------- */
  var OPEN_MIN = 10 * 60;
  var CLOSE_MIN = 21 * 60;

  function updateStatus() {
    var d = new Date();
    var m = (d.getUTCHours() * 60 + d.getUTCMinutes() + 5 * 60) % (24 * 60);
    var open = m >= OPEN_MIN && m < CLOSE_MIN;
    var text;
    if (open) text = CLOSE_MIN - m <= 60 ? 'Открыто, закроемся в 21:00' : 'Сейчас открыто до 21:00';
    else text = m < OPEN_MIN ? 'Сейчас закрыто, откроемся в 10:00' : 'Сейчас закрыто, откроемся завтра в 10:00';
    document.querySelectorAll('[data-open-status]').forEach(function (el) {
      el.textContent = text;
      el.classList.toggle('is-open', open);
      el.classList.toggle('is-closed', !open);
    });
  }
  updateStatus();
  setInterval(updateStatus, 60 * 1000);

  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- шапка: стекло после начала прокрутки ---------- */
  var header = document.querySelector('[data-header]');
  function syncHeader() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 12);
  }
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  /* ---------- блик на стекле следует за курсором ---------- */
  if (canHover.matches) {
    document.querySelectorAll('[data-glass]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', Math.round(e.clientX - r.left) + 'px');
        el.style.setProperty('--my', Math.round(e.clientY - r.top) + 'px');
      });
      el.addEventListener('pointerleave', function () {
        el.style.removeProperty('--mx');
        el.style.removeProperty('--my');
      });
    });
  }

  /* ---------- мобильное меню ---------- */
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.getElementById('menu');

  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.menu-toggle-label').textContent = open ? 'Закрыть' : 'Меню';
    menu.hidden = !open;
    body.style.overflow = open ? 'hidden' : '';
    if (header) header.classList.toggle('menu-open', open);
    if (open) {
      var first = menu.querySelector('a');
      if (first) first.focus({ preventScroll: true });
    }
  }

  if (toggle && menu) {
    menu.querySelectorAll('.menu-nav a, .menu-foot').forEach(function (el, i) {
      el.style.setProperty('--i', String(i));
    });
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) {
        setMenu(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 1100px)').addEventListener('change', function (e) {
      if (e.matches) setMenu(false);
    });
  }

  /* ---------- бегущая лента: копия списка для бесшовного цикла ---------- */
  var track = document.querySelector('[data-marquee]');
  if (track) {
    var list = track.querySelector('.band-list');
    if (list) {
      var copy = list.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      track.appendChild(copy);
    }
  }

  /* ---------- вкладки прайса со скользящей плашкой ---------- */
  var tablist = document.querySelector('[data-tabs]');
  var tabs = tablist ? Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]')) : [];
  var ink = tablist ? tablist.querySelector('.tab-ink') : null;

  function moveInk(tab) {
    if (!ink || !tab) return;
    ink.style.width = tab.offsetWidth + 'px';
    ink.style.transform = 'translateX(' + tab.offsetLeft + 'px)';
  }

  function activateTab(tab, focus) {
    tabs.forEach(function (t) {
      var selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.classList.toggle('is-active', selected);
    });
    moveInk(tab);
    if (focus) tab.focus({ preventScroll: true });
    /* прокручиваем только ряд вкладок, страницу не трогаем */
    var tr = tab.getBoundingClientRect();
    var lr = tablist.getBoundingClientRect();
    if (tr.left < lr.left || tr.right > lr.right) {
      tablist.scrollBy({ left: tr.left - lr.left - 16, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }
  }

  function tabForPanel(id) {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('aria-controls') === id) return tabs[i];
    }
    return null;
  }

  function currentTab() {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('aria-selected') === 'true') return tabs[i];
    }
    return tabs[0];
  }

  if (tabs.length) {
    if (ink) tablist.classList.add('has-ink');
    activateTab(tabForPanel((location.hash || '').slice(1)) || tabs[0], false);

    tablist.addEventListener('click', function (e) {
      var tab = e.target.closest('[role="tab"]');
      if (tab) activateTab(tab, false);
    });
    tablist.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      var next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) {
        e.preventDefault();
        activateTab(next, true);
      }
    });

    /* плашка пересчитывается, когда догрузились шрифты и при смене ширины */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { moveInk(currentTab()); });
    window.addEventListener('resize', function () { moveInk(currentTab()); });

    /* ссылки на раздел прайса: открыть вкладку и прокрутить к прайсу */
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#price-"]');
      if (!link) return;
      var tab = tabForPanel(link.getAttribute('href').slice(1));
      if (!tab) return;
      e.preventDefault();
      activateTab(tab, false);
      var prices = document.getElementById('prices');
      if (prices) prices.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', '#' + tab.getAttribute('aria-controls'));
    });
  }

  /* ---------- появление блоков при прокрутке ---------- */
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', '');
        child.style.setProperty('--d', Math.min(i, 7) * 85 + 'ms');
      });
    });
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealIO.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    document.querySelectorAll('[data-reveal]').forEach(function (el) { revealIO.observe(el); });
    root.classList.add('reveal-on');
  }

  /* ---------- нижняя панель записи: видна, когда кнопки первого экрана ушли ---------- */
  var bar = document.querySelector('[data-book-bar]');
  var heroActions = document.querySelector('[data-hero-actions]');
  var footer = document.querySelector('.site-footer');
  if (bar && heroActions && 'IntersectionObserver' in window) {
    var heroVisible = true;
    var footerVisible = false;
    var syncBar = function () {
      bar.classList.toggle('is-visible', !heroVisible && !footerVisible);
    };
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      syncBar();
    }).observe(heroActions);
    if (footer) {
      new IntersectionObserver(function (entries) {
        footerVisible = entries[0].isIntersecting;
        syncBar();
      }, { rootMargin: '0px 0px -120px 0px' }).observe(footer);
    }
  }

  /* ---------- точка завязки ленты на первом экране ---------- */
  var hero = document.querySelector('.hero');
  var sealHero = document.querySelector('.seal-hero');
  if (hero && sealHero && sealHero.offsetWidth) {
    var h = hero.getBoundingClientRect();
    var s = sealHero.getBoundingClientRect();
    hero.style.setProperty('--seal-x', Math.round(s.left + s.width / 2 - h.left) + 'px');
  }

  /* ---------- галерея работ ---------- */
  var gallery = document.querySelector('[data-gallery]');
  var moreBtn = document.querySelector('[data-gallery-more]');
  if (gallery && moreBtn && gallery.children.length > 8) {
    gallery.classList.add('is-collapsed');
    moreBtn.hidden = false;
    moreBtn.addEventListener('click', function () {
      gallery.classList.remove('is-collapsed');
      moreBtn.hidden = true;
      var ninth = gallery.children[8] && gallery.children[8].querySelector('a');
      if (ninth) ninth.focus({ preventScroll: true });
    });
  }

  var lightbox = document.querySelector('[data-lightbox]');
  if (gallery && lightbox && typeof lightbox.showModal === 'function') {
    var links = Array.prototype.slice.call(gallery.querySelectorAll('a'));
    var lbImg = lightbox.querySelector('.lb-img');
    var lbCap = lightbox.querySelector('.lb-caption');
    var current = 0;
    var opener = null;

    var show = function (i) {
      current = (i + links.length) % links.length;
      var a = links[current];
      var thumb = a.querySelector('img');
      lbImg.removeAttribute('src');
      lbImg.width = +a.getAttribute('data-w') || 0;
      lbImg.height = +a.getAttribute('data-h') || 0;
      lbImg.src = a.getAttribute('href');
      lbImg.alt = thumb ? thumb.alt : '';
      lbCap.textContent = (thumb ? thumb.alt + '. ' : '') + (current + 1) + ' из ' + links.length;
    };

    links.forEach(function (a, i) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        opener = a;
        show(i);
        lightbox.showModal();
        body.style.overflow = 'hidden';
      });
    });

    lightbox.querySelector('[data-lb-close]').addEventListener('click', function () { lightbox.close(); });
    lightbox.querySelector('[data-lb-prev]').addEventListener('click', function () { show(current - 1); });
    lightbox.querySelector('[data-lb-next]').addEventListener('click', function () { show(current + 1); });
    lightbox.addEventListener('close', function () {
      body.style.overflow = '';
      if (opener) opener.focus({ preventScroll: true });
    });
    lightbox.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') show(current + 1);
      else if (e.key === 'ArrowLeft') show(current - 1);
    });

    /* свайп на телефоне */
    var startX = null;
    var startY = null;
    var swiped = false;
    lightbox.addEventListener('pointerdown', function (e) {
      swiped = false;
      if (e.pointerType === 'mouse') return;
      startX = e.clientX;
      startY = e.clientY;
    });
    lightbox.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      startX = startY = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        swiped = true;
        show(current + (dx < 0 ? 1 : -1));
      }
    });

    /* тап по фону закрывает просмотр */
    lightbox.addEventListener('click', function (e) {
      if (swiped) { swiped = false; return; }
      if (e.target === lightbox || e.target.classList.contains('lb-stage')) lightbox.close();
    });
  }
})();
