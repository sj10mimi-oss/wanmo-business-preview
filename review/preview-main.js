/* WANMO — минимальный JS: меню, слайдеры, вкладки, аккордеон, попапы, формы, корзина, избранное. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  /* Язык страницы: на /en/ подписи в интерфейсе английские. В CRM всё уходит по-русски, с пометкой (EN). */
  var EN = document.documentElement.lang === 'en';
  var T = function (ru, en) { return EN ? en : ru; };
  var store = {
    get: function (k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* Шапка на главной: прилипает при прокрутке */
  var hdr = $('.hdr.dark');
  if (hdr) {
    var onScroll = function () { hdr.classList.toggle('fixed', window.scrollY > 62); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* Боковое меню */
  var side = $('#side');
  $$('[data-open-menu]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); side.classList.add('open'); }); });
  $$('#side .x, #side .ov, #side a').forEach(function (b) { b.addEventListener('click', function () { side.classList.remove('open'); }); });

  /* Слайдеры: стрелки прокручивают трек на ширину карточки */
  $$('[data-slider]').forEach(function (box) {
    var tr = $('.track', box);
    var step = function () { var c = tr.children[0]; return c ? c.getBoundingClientRect().width + 20 : 300; };
    var prev = $('[data-prev]', box), next = $('[data-next]', box);
    if (prev) prev.addEventListener('click', function () { tr.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { tr.scrollBy({ left: step(), behavior: 'smooth' }); });
  });

  /* Вкладки (FAQ, польза) + select на мобильном */
  $$('[data-tabs]').forEach(function (box) {
    var btns = $$('.tabs button', box), panes = $$('.pane', box), sel = $('.tabsel', box);
    var show = function (i) {
      btns.forEach(function (b, j) { b.classList.toggle('on', i === j); });
      panes.forEach(function (p, j) { p.classList.toggle('on', i === j); });
      if (sel) sel.value = i;
    };
    btns.forEach(function (b, i) { b.addEventListener('click', function () { show(i); }); });
    if (sel) sel.addEventListener('change', function () { show(+sel.value); });
  });

  /* Аккордеон */
  $$('.acc-q').forEach(function (q) {
    q.addEventListener('click', function () {
      var it = q.parentNode; it.classList.toggle('open');
      q.setAttribute('aria-expanded', it.classList.contains('open'));
    });
  });

  /* Отзывы: «Читать далее» */
  $$('.rev .rm').forEach(function (b) {
    var r = b.closest('.rev'), body = $('.body.cut', r);
    /* короткий текст целиком помещается — кнопка не нужна */
    if (body && body.scrollHeight <= body.clientHeight + 2) { body.classList.remove('cut'); b.hidden = true; }
    b.addEventListener('click', function () {
      r.classList.toggle('open');
      var open = r.classList.contains('open');
      b.setAttribute('aria-expanded', open);
      b.textContent = open ? T('Свернуть', 'Show less') : T('Читать далее', 'Read more');
    });
  });

  /* Попапы: ссылки вида #consultation, #order, #opencart, #trial */
  var openPop = function (id) { var p = document.getElementById('pop-' + id); if (p) { p.classList.add('open'); return true; } return false; };
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"], [data-pop]');
    if (!a) return;
    var id = a.getAttribute('data-pop') || a.getAttribute('href').slice(1);
    if (id === 'opencart') renderCart();
    if (openPop(id)) { e.preventDefault(); side && side.classList.remove('open'); }
  });
  $$('.pop').forEach(function (p) {
    p.addEventListener('click', function (e) { if (e.target === p || e.target.classList.contains('x')) p.classList.remove('open'); });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $$('.pop.open').forEach(function (p) { p.classList.remove('open'); }); });

  /* ICE and all bundles containing it are unavailable. Also guard saved carts. */
  function unavailableItem(item) {
    var current = window.WanmoCatalog && window.WanmoCatalog[String(item.id || '').split('-')[0]];
    if (current) return !current.available;
    return /\bICE\b/i.test(item.name || '') || /^(992561481772|773782742022|520715153632|211755436762|164272817722|968316181222)(-|$)/.test(String(item.id || ''));
  }
  function isSteps(item) {
    return String(item.id || '').split('-')[0] === '912100402752' ||
      /-(Надувныеступеньки|InflatableSteps)$/i.test(String(item.id || '')) ||
      /^(Надувные\s+ступеньки|Inflatable\s+steps)$/i.test(item.name || '');
  }
  function currentCartItem(item) {
    var next = Object.assign({}, item);
    if (isSteps(next)) next.id = '912100402752';
    var p = window.WanmoCatalog && window.WanmoCatalog[String(next.id).split('-')[0]];
    if (p) {
      next.price = /-pre$/.test(String(next.id)) && p.preorderPrice != null ? p.preorderPrice : p.price;
      next.img = p.photos[0].src;
      if (String(next.id).indexOf('-') < 0) next.name = EN ? p.nameEn || p.name : p.name;
    }
    return next;
  }
  var savedCart = store.get('wanmo_media_preview_cart', []), repairedCart = [];
  savedCart.forEach(function (raw) {
    var item = currentCartItem(raw);
    if (unavailableItem(item)) return;
    item.q = Number.isInteger(Number(item.q)) && Number(item.q) > 0 ? Number(item.q) : 1;
    var existing = repairedCart.find(function (i) { return i.id === item.id; });
    if (existing) existing.q += item.q; else repairedCart.push(item);
  });
  store.set('wanmo_media_preview_cart', repairedCart);

  /* Размер комплекта: отдельный код XL, цена как у L. */
  $$('[data-kit-size]').forEach(function(select) {
    select.addEventListener('change', function() {
      var area=select.closest('.pcard') || select.closest('.pinfo');
      $$('[data-kit-original]', area).forEach(function(button) {
        var d=JSON.parse(button.getAttribute('data-kit-original'));
        if(select.value==='XL') { d.id=String(d.id).replace(/(-pre)?$/, '-xl$1'); d.name += ' (XL)'; }
        button.setAttribute('data-add', JSON.stringify(d));
      });
    });
  });

  /* Метки рекламы: запоминаем при входе, чтобы дошли до заявки и после перехода по страницам */
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'gclid'];
  var savedUtm = {};
  try { savedUtm = JSON.parse(localStorage.getItem('wanmo_utm') || '{}'); } catch (e) {}
  try {
    var q = new URLSearchParams(location.search || ''), fresh = {};
    UTM_KEYS.forEach(function (k) { var v = q.get(k); if (v) fresh[k] = v.slice(0, 150); });
    if (Object.keys(fresh).length) { savedUtm = fresh; localStorage.setItem('wanmo_utm', JSON.stringify(fresh)); }
  } catch (e) {}

  /* Формы → POST /api/lead */
  $$('form[data-lead]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(f), parts = [];
      var name = (fd.get('name') || '').trim(), phone = (fd.get('phone') || '').replace(/[^\d+]/g, '');
      if (!f.querySelector('[name=agree]').checked) { alert(T('Подтвердите согласие на обработку персональных данных', 'Please confirm your consent to the processing of personal data')); return; }
      if (phone && phone.indexOf('+') !== 0) phone = '+7' + phone;
      ['telegram', 'max', 'city', 'email', 'businessType', 'company', 'model'].forEach(function (k) { var v = (fd.get(k) || '').trim(); if (v) parts.push({ telegram: 'Telegram', max: 'MAX', city: 'Город', email: 'E-mail', businessType: 'Тип объекта', company: 'Компания', model: 'Интересующая модель' }[k] + ': ' + v); });
      UTM_KEYS.forEach(function (k) { if (savedUtm[k]) parts.push(k + ': ' + savedUtm[k]); });
      if (f.dataset.cart) parts.push('Заказ: ' + cartText());
      var comment = (fd.get('comment') || '').trim(); if (comment) parts.push(comment);
      var lead = (f.dataset.lead || '') + (EN && f.dataset.lead ? ' (EN)' : '');
      var body = { name: name, phone: phone, comment: (lead ? '[' + lead + '] ' : '') + parts.join('; '), page: location.pathname, city: (fd.get('city') || '').trim(), use: lead };
      UTM_KEYS.slice(0, 5).forEach(function (k) { if (savedUtm[k]) body[k] = savedUtm[k]; });
      var btn = f.querySelector('button[type=submit]'); btn.disabled = true;
      Promise.resolve({ json: function () { return Promise.resolve({ ok: true, preview: true }); } })
        .then(function (r) { return r.json(); })
        .then(function (r) {
          if (r.ok && /^Для бизнеса/.test(f.dataset.lead || '')) {
            try { if (typeof window.ym === 'function') window.ym(Number(window.mainMetrikaId || 106327080), 'reachGoal', 'b2b_lead_success'); if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', {form_name:'business',page_path:location.pathname}); } catch(ignore) {}
          }
          var m = f.querySelector('.msg');
          m.textContent = r.preview ? 'Предпросмотр: заявка не отправлена.' : r.ok ? T('Спасибо! Данные успешно отправлены. Мы свяжемся с вами.', 'Thank you! Your request has been sent. We will get back to you shortly.') : T('Не удалось отправить. Позвоните нам: +7 (925) 143-18-12', 'Sending failed. Please call us: +7 (925) 143-18-12');
          m.classList.add('on'); if (r.ok) { f.classList.add('done'); if (f.dataset.cart) { store.set('wanmo_media_preview_cart', []); updCount(); } }
        })
        .catch(function () { var m = f.querySelector('.msg'); m.textContent = T('Нет связи с сервером. Позвоните нам: +7 (925) 143-18-12', 'No connection to the server. Please call us: +7 (925) 143-18-12'); m.classList.add('on'); })
        .then(function () { btn.disabled = false; });
    });
  });

  /* Корзина и избранное (в браузере посетителя) */
  var cart = function () { return store.get('wanmo_media_preview_cart', []); };
  var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽'; };
  function cartText() { return cart().map(function (i) { return i.name + ' × ' + i.q + ' (' + fmt(i.price) + ')'; }).join(', '); }
  function updCount() {
    var n = cart().reduce(function (s, i) { return s + i.q; }, 0);
    $$('.cart-cnt').forEach(function (c) { c.textContent = n; c.classList.toggle('on', n > 0); });
    var f = store.get('wanmo_fav', []).length;
    $$('.fav-cnt').forEach(function (c) { c.textContent = f; c.classList.toggle('on', f > 0); });
  }
  function renderCart() {
    var box = $('#cart-list'); if (!box) return;
    var items = cart();
    box.innerHTML = items.length ? '' : '<p>' + T('Корзина пуста', 'Your cart is empty') + '</p>';
    items.forEach(function (i, k) {
      var row = document.createElement('div'); row.className = 'cart-row';
      row.innerHTML = '<img alt=""><span class="nm"></span><span class="q"></span><button type="button" aria-label="' + T('Удалить', 'Remove') + '">×</button>';
      row.querySelector('img').src = i.img; row.querySelector('.nm').textContent = i.name;
      row.querySelector('.q').textContent = i.q + ' × ' + fmt(i.price);
      row.querySelector('button').addEventListener('click', function () { var c = cart(); c.splice(k, 1); store.set('wanmo_media_preview_cart', c); renderCart(); updCount(); });
      box.appendChild(row);
    });
    $('#cart-sum').textContent = T('Сумма: ', 'Total: ') + fmt(items.reduce(function (s, i) { return s + i.q * i.price; }, 0));
  }
  var cartNoticeTimer;
  function showCartNotice(message) {
    var notice = $('#cart-notice');
    if (!notice) {
      notice = document.createElement('div'); notice.id = 'cart-notice'; notice.className = 'cart-notice';
      notice.setAttribute('role', 'status'); notice.setAttribute('aria-live', 'polite');
      notice.innerHTML = '<span class="cart-notice-message"></span><a href="#opencart"></a><button type="button">×</button>';
      notice.querySelector('a').textContent = T('В корзину', 'View cart');
      notice.querySelector('button').setAttribute('aria-label', T('Закрыть уведомление', 'Dismiss notification'));
      notice.querySelector('button').addEventListener('click', function () { notice.hidden = true; });
      notice.querySelector('a').addEventListener('click', function () { notice.hidden = true; });
      document.body.appendChild(notice);
    }
    notice.querySelector('.cart-notice-message').textContent = message;
    notice.hidden = false;
    clearTimeout(cartNoticeTimer);
    cartNoticeTimer = setTimeout(function () { notice.hidden = true; }, 6000);
  }
  $$('[data-add]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      var d = currentCartItem(JSON.parse(b.getAttribute('data-add'))), c = cart(), f = null;
      if (unavailableItem(d)) { alert(T('ICE и комплекты с ним временно отсутствуют в наличии.', 'ICE and its bundles are temporarily out of stock.')); return; }
      c.forEach(function (i) { if (i.id === d.id) f = i; });
      if (f) f.q++; else { d.q = 1; c.push(d); }
      store.set('wanmo_media_preview_cart', c); updCount(); renderCart();
      if (isSteps(d) || b.hasAttribute('data-add-notify')) showCartNotice(T('Надувные ступеньки добавлены в корзину', 'Inflatable steps added to cart'));
      else openPop('opencart');
    });
  });
  $$('.fav').forEach(function (b) {
    var id = b.getAttribute('data-id');
    if (store.get('wanmo_fav', []).indexOf(id) >= 0) b.classList.add('on');
    b.addEventListener('click', function (e) {
      e.preventDefault();
      var f = store.get('wanmo_fav', []), i = f.indexOf(id);
      if (i >= 0) f.splice(i, 1); else f.push(id);
      store.set('wanmo_fav', f); b.classList.toggle('on', i < 0); updCount();
    });
  });
  updCount();

  /* Каталог: фильтр по вкладкам + «Загрузить ещё» */
  var cat = $('[data-catalog]');
  if (cat) {
    var cards = $$('.pcard', cat), more = $('[data-more]', cat), limit = 36, curTab = 'all';
    var apply = function () {
      var shown = 0;
      cards.forEach(function (c) {
        var ok = curTab === 'all' || (' ' + c.getAttribute('data-cats') + ' ').indexOf(' ' + curTab + ' ') >= 0;
        if (ok) shown++;
        c.style.display = ok && shown <= limit ? '' : 'none';
      });
      if (more) more.style.display = shown > limit ? '' : 'none';
    };
    $$('.cat-tabs button', cat).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.cat-tabs button', cat).forEach(function (x) { x.classList.toggle('on', x === b); });
        curTab = b.getAttribute('data-tab'); limit = 36; history.replaceState(null, '', '#' + curTab); apply();
      });
    });
    if (more) more.addEventListener('click', function () { limit += 36; apply(); });
    var h = location.hash.slice(1); var tb = h && $('.cat-tabs [data-tab="' + h + '"]', cat);
    if (tb) tb.click(); else apply();
  }

  /* Популярные модели: точки-страницы под слайдером */
  $$('[data-pager]').forEach(function (box) {
    var tr = $('.prod-grid', box), btns = $$('.pager button', box);
    btns.forEach(function (b, i) { b.addEventListener('click', function () {
      btns.forEach(function (x) { x.classList.toggle('on', x === b); });
      var cs = $$('.pcard', tr); cs.forEach(function (c, j) { c.style.display = (Math.floor(j / 3) === i || window.innerWidth <= 640) ? '' : 'none'; });
    }); });
    if (btns[0]) btns[0].click();
  });

  /* Галерея товара */
  $$('.gal').forEach(function (g) {
    var frame = $('.main', g), main = $('.main img', g), thumbs = $$('.thumbs button', g);
    if (!frame || !main || !thumbs.length) return;
    var index = 0, video = null, touch = null, status = $('.gal-status', g);
    function show(i) {
      index = (i + thumbs.length) % thumbs.length;
      if (video) { video.pause(); video.removeAttribute('src'); video.load(); video.remove(); video = null; }
      var b = thumbs[index], src = b.getAttribute('data-src'), movie = b.getAttribute('data-video');
      main.src = src; main.alt = $('img', b).alt;
      main.style.objectFit = b.getAttribute('data-fit') || 'cover';
      main.style.objectPosition = b.getAttribute('data-position') || '50% 50%';
      main.hidden = !!movie;
      if (movie) {
        video = document.createElement('video');
        video.controls = true; video.preload = 'none'; video.poster = src;
        video.setAttribute('playsinline', ''); video.setAttribute('aria-label', T('Видео товара', 'Product video'));
        video.src = movie; frame.appendChild(video);
      }
      thumbs.forEach(function (x, j) { x.classList.toggle('on', j === index); x.setAttribute('aria-pressed', String(j === index)); });
      if (status) status.textContent = (movie ? T('Видео ', 'Video ') : T('Фото ', 'Photo ')) + (index + 1) + ' / ' + thumbs.length;
    }
    thumbs.forEach(function (b, i) { b.addEventListener('click', function () { show(i); }); });
    var prev = $('[data-gallery-prev]', g), next = $('[data-gallery-next]', g);
    if (prev) prev.addEventListener('click', function () { show(index - 1); });
    if (next) next.addEventListener('click', function () { show(index + 1); });
    g.addEventListener('keydown', function (e) {
      if (e.target.closest('video') || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); show(index + (e.key === 'ArrowLeft' ? -1 : 1)); }
    });
    frame.addEventListener('touchstart', function (e) {
      touch = !e.target.closest('video') && e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    }, { passive: true });
    frame.addEventListener('touchend', function (e) {
      if (!touch || !e.changedTouches.length) return;
      var dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
      touch = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) show(index + (dx < 0 ? 1 : -1));
    }, { passive: true });
    frame.addEventListener('touchcancel', function () { touch = null; }, { passive: true });
    window.addEventListener('pagehide', function () { if (video) video.pause(); });
    if (thumbs[0].hasAttribute('data-video')) show(0);
  });

  /* Cookie-плашка */
  var ck = $('.cookie');
  if (ck && !store.get('wanmo_media_preview_cookie', false)) {
    ck.classList.add('on');
    $('button', ck).addEventListener('click', function () { store.set('wanmo_media_preview_cookie', true); ck.classList.remove('on'); });
  }

  /* Маска телефона: только цифры, формат (000) 000-00-00 */
  $$('input[name=phone]').forEach(function (i) {
    i.addEventListener('input', function () {
      var d = i.value.replace(/\D/g, '').slice(0, 10), o = '';
      if (d.length) o = '(' + d.slice(0, 3);
      if (d.length >= 4) o += ') ' + d.slice(3, 6);
      if (d.length >= 7) o += '-' + d.slice(6, 8);
      if (d.length >= 9) o += '-' + d.slice(8, 10);
      i.value = o;
    });
  });
})();
