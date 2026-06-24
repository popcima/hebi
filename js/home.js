/* Home page logic — no ES modules */
var heroItems = [], heroIdx = 0, heroTimer = null;

function escH(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function dotCls(status) {
  if (status === 'RELEASING') return 'g';
  if (status === 'NOT_YET_RELEASED') return 'o';
  return 'd';
}

/* ─── HERO ─────────────────────────────────────────── */
function buildHeroSlide(media, idx) {
  var title = getTitle(media);
  var bg = media.bannerImage || media.coverImage.extraLarge || media.coverImage.large;
  var score = formatScore(media.averageScore);
  var ep = media.episodes || (media.nextAiringEpisode ? (media.nextAiringEpisode.episode - 1) + '+' : '');
  var studio = media.studios && media.studios.nodes[0] ? media.studios.nodes[0].name : '';
  var genres = (media.genres || []).slice(0, 3);
  var desc = (media.description || '').replace(/<[^>]*>/g, '').slice(0, 200);
  var format = (media.format || 'TV').replace(/_/g, ' ');

  var div = document.createElement('div');
  div.className = 'hero-slide' + (idx === 0 ? ' active' : '');
  div.innerHTML =
    '<img src="' + escH(bg) + '" alt="' + escH(title) + '" loading="' + (idx === 0 ? 'eager' : 'lazy') + '" />' +
    '<div class="hero-overlay"></div>' +
    '<div class="hero-content">' +
      '<div class="hero-info-row">' +
        '<span>' + format + '</span>' +
        (ep ? '<span><i class="fa-solid fa-tv"></i> ' + ep + ' eps</span>' : '') +
        (score !== 'N/A' ? '<span><i class="fa-solid fa-star"></i> ' + score + '</span>' : '') +
        (media.duration ? '<span><i class="fa-regular fa-clock"></i> ' + media.duration + 'm</span>' : '') +
      '</div>' +
      '<div class="hero-title">' + escH(title) + '</div>' +
      '<div class="hero-tags">' +
        genres.map(function(g) { return '<span>' + escH(g) + '</span>'; }).join('') +
        (studio ? '<span>' + escH(studio) + '</span>' : '') +
      '</div>' +
      (desc ? '<p class="hero-desc">' + escH(desc) + (desc.length >= 200 ? '…' : '') + '</p>' : '') +
      '<div class="hero-btns">' +
        '<a class="hero-btn hero-btn-watch" href="watch.html?id=' + media.id + '&ep=1&lang=sub"><i class="fa-solid fa-play"></i> Watch Now</a>' +
        '<a class="hero-btn" href="anime.html?id=' + media.id + '"><i class="fa-solid fa-circle-info"></i> Details</a>' +
      '</div>' +
    '</div>';
  return div;
}

function showHeroSlide(idx) {
  heroIdx = ((idx % heroItems.length) + heroItems.length) % heroItems.length;
  document.querySelectorAll('.hero-slide').forEach(function(s, i) { s.classList.toggle('active', i === heroIdx); });
  document.querySelectorAll('.hero-dot').forEach(function(d, i) { d.classList.toggle('active', i === heroIdx); });
}

function startHeroTimer() {
  clearInterval(heroTimer);
  heroTimer = setInterval(function() { showHeroSlide(heroIdx + 1); }, 7000);
}

function initHero(items) {
  heroItems = items.filter(function(m) { return m.bannerImage || m.coverImage.extraLarge; }).slice(0, 11);
  if (!heroItems.length) return;
  var container = document.getElementById('heroSlides');
  heroItems.forEach(function(m, i) { container.appendChild(buildHeroSlide(m, i)); });

  var dotsEl = document.getElementById('heroDots');
  heroItems.forEach(function(_, i) {
    var d = document.createElement('button');
    d.className = 'hero-dot' + (i === 0 ? ' active' : '');
    d.setAttribute('aria-label', 'Slide ' + (i + 1));
    d.onclick = function() { showHeroSlide(i); startHeroTimer(); };
    dotsEl.appendChild(d);
  });

  document.getElementById('heroCounter').style.display = 'flex';
  document.getElementById('heroPrev').onclick = function() { showHeroSlide(heroIdx - 1); startHeroTimer(); };
  document.getElementById('heroNext').onclick = function() { showHeroSlide(heroIdx + 1); startHeroTimer(); };
  startHeroTimer();
}

/* ─── GENRE ROW ─────────────────────────────────────── */
function initGenreRow() {
  var row = document.getElementById('genreRow');
  row.innerHTML = GENRES.map(function(g) {
    return '<div class="genre-tab" data-genre="' + g + '">' + g + '</div>';
  }).join('');
  row.querySelectorAll('.genre-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      location.href = 'search.html?genre=' + encodeURIComponent(tab.dataset.genre);
    });
  });
  document.getElementById('genreL').onclick = function() { row.scrollBy({ left: -200, behavior: 'smooth' }); };
  document.getElementById('genreR').onclick = function() { row.scrollBy({ left: 200, behavior: 'smooth' }); };
}

/* ─── MAIN GRID ─────────────────────────────────────── */
var currentTab = 'trending', currentPage = 1;

function skeletons(n) {
  var html = '';
  for (var i = 0; i < (n || 20); i++) {
    html += '<div class="m-card"><div class="skel skel-poster"></div><div class="m-card-body"><div class="skel skel-line"></div><div class="skel skel-line s"></div></div></div>';
  }
  return html;
}

function mCard(media) {
  var title = getTitle(media);
  var score = formatScore(media.averageScore);
  var img = media.coverImage.large || media.coverImage.medium;
  var dot = dotCls(media.status);
  var ep = media.episodes ? '<i class="fa-solid fa-tv"></i> ' + media.episodes : '';
  var year = media.seasonYear || '';
  var format = (media.format || '').replace(/_/g, ' ');
  return '<div class="m-card fade-in" onclick="location.href=\'anime.html?id=' + media.id + '\'">' +
    '<div class="m-card-poster">' +
      '<img src="' + escH(img) + '" alt="' + escH(title) + '" loading="lazy" />' +
      (score !== 'N/A' ? '<div class="m-score-badge"><i class="fa-solid fa-star"></i> ' + score + '</div>' : '') +
      '<div class="m-dot ' + dot + '"></div>' +
    '</div>' +
    '<div class="m-card-body">' +
      '<div class="m-card-title">' + escH(title) + '</div>' +
      '<div class="m-card-meta">' +
        (format ? '<span>' + format + '</span>' : '') +
        (year ? '<span>' + year + '</span>' : '') +
        (ep ? '<span>' + ep + '</span>' : '') +
      '</div>' +
    '</div>' +
  '</div>';
}

async function loadGrid(tab, page) {
  var grid = document.getElementById('mainGrid');
  grid.innerHTML = skeletons(20);
  currentPage = page || 1;
  var fetchFn = { trending: getTrending, popular: getPopular, toprated: getTopRated }[tab || 'trending'];
  var items = (await fetchFn(currentPage, 20)).filter(function(m) { return m.type === 'ANIME'; });
  grid.innerHTML = items.map(mCard).join('');
  document.getElementById('pageNum').textContent = currentPage;
  document.getElementById('pagePrev').disabled = currentPage <= 1;
  document.getElementById('pageNext').disabled = items.length < 20;
}

function initTabs() {
  document.querySelectorAll('.tab-pill').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-pill').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      loadGrid(currentTab, 1);
    });
  });
  document.getElementById('pagePrev').addEventListener('click', function() {
    if (currentPage > 1) loadGrid(currentTab, currentPage - 1);
  });
  document.getElementById('pageNext').addEventListener('click', function() {
    loadGrid(currentTab, currentPage + 1);
  });
}

/* ─── BOTTOM LISTS ──────────────────────────────────── */
function bItem(media) {
  var title = getTitle(media);
  var img = media.coverImage.medium || media.coverImage.large;
  var dot = dotCls(media.status);
  var year = media.seasonYear || '';
  var ep = media.episodes || '';
  var score = formatScore(media.averageScore);
  var format = (media.format || 'TV').replace(/_/g, ' ');
  var statusLabel = { RELEASING: 'Airing', FINISHED: 'Finished', NOT_YET_RELEASED: 'Upcoming' }[media.status] || '';
  return '<div class="b-item" onclick="location.href=\'anime.html?id=' + media.id + '\'">' +
    '<div class="b-thumb"><img src="' + escH(img) + '" alt="' + escH(title) + '" loading="lazy" /></div>' +
    '<div class="b-body">' +
      '<div class="b-status"><div class="b-dot ' + dot + '"></div>' + statusLabel + '</div>' +
      '<div class="b-title">' + escH(title) + '</div>' +
      '<div class="b-meta">' + format + (year ? ' · ' + year : '') + (ep ? ' · <i class="fa-solid fa-tv"></i> ' + ep : '') + (score !== 'N/A' ? ' · <i class="fa-solid fa-star"></i> ' + score : '') + '</div>' +
    '</div>' +
  '</div>';
}

async function loadBottomLists() {
  var results = await Promise.all([getFinished(1, 8), getMovies(1, 8)]);
  document.getElementById('finishedList').innerHTML = results[0].filter(function(m) { return m.type === 'ANIME'; }).map(bItem).join('');
  document.getElementById('moviesList').innerHTML = results[1].filter(function(m) { return m.type === 'ANIME'; }).map(bItem).join('');
}

/* ─── SIDEBAR ───────────────────────────────────────── */
function sbItem(media, dotClass) {
  var title = getTitle(media);
  var img = media.coverImage.medium || media.coverImage.large;
  var score = formatScore(media.averageScore);
  var format = (media.format || 'TV').replace(/_/g, ' ');
  var year = media.seasonYear || '';
  var ep = media.episodes || (media.nextAiringEpisode ? media.nextAiringEpisode.episode - 1 : '');
  return '<div class="sb-item" onclick="location.href=\'anime.html?id=' + media.id + '\'">' +
    '<div class="sb-thumb"><img src="' + escH(img) + '" alt="' + escH(title) + '" loading="lazy" /></div>' +
    '<div class="sb-body">' +
      '<div class="sb-status"><div class="sb-dot ' + (dotClass || 'g') + '"></div>' + (year || '') + '</div>' +
      '<div class="sb-title">' + escH(title) + '</div>' +
      '<div class="sb-meta">' + format + (ep ? ' · <i class="fa-solid fa-tv"></i> ' + ep : '') + (score !== 'N/A' ? ' · <i class="fa-solid fa-star"></i> ' + score : '') + '</div>' +
    '</div>' +
  '</div>';
}

async function loadSidebar() {
  var results = await Promise.all([getAiring(1, 8), getUpcoming(1, 8)]);
  var airingEl = document.getElementById('topAiringList');
  var upcomingEl = document.getElementById('upcomingList');
  airingEl.innerHTML = results[0].filter(function(m) { return m.type === 'ANIME'; }).map(function(m) { return sbItem(m, 'g'); }).join('') ||
    '<p style="color:var(--text-muted);font-size:.78rem;padding:8px 0">No data</p>';
  upcomingEl.innerHTML = results[1].filter(function(m) { return m.type === 'ANIME'; }).map(function(m) { return sbItem(m, 'o'); }).join('') ||
    '<p style="color:var(--text-muted);font-size:.78rem;padding:8px 0">No data</p>';
}

/* ─── SCHEDULE ──────────────────────────────────────── */
var DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function initScheduleDays() {
  var now = new Date();
  var todayDow = (now.getDay() + 6) % 7;
  var container = document.getElementById('schedDays');
  container.innerHTML = DAYS.map(function(d, i) {
    var date = new Date(now);
    date.setDate(date.getDate() + (i - todayDow));
    var label = date.getDate();
    var month = date.toLocaleString('default', { month: 'short' });
    var isToday = i === todayDow;
    return '<div class="sched-day' + (isToday ? ' active' : '') + '" data-offset="' + (i - todayDow) + '">' + d + '<small>' + month + ' ' + label + '</small></div>';
  }).join('');

  container.querySelectorAll('.sched-day').forEach(function(btn) {
    btn.addEventListener('click', function() {
      container.querySelectorAll('.sched-day').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      loadSchedule(parseInt(btn.dataset.offset));
    });
  });
}

async function loadSchedule(offset) {
  var list = document.getElementById('schedList');
  list.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
  try {
    var items = await getDaySchedule(offset || 0);
    if (!items.length) {
      list.innerHTML = '<p style="color:var(--text-muted);font-size:.75rem;padding:8px 0;text-align:center">No schedule data</p>';
      return;
    }
    var groups = {};
    items.forEach(function(s) {
      var d = new Date(s.airingAt * 1000);
      var h = String(d.getHours()).padStart(2, '0');
      var m = String(d.getMinutes()).padStart(2, '0');
      var time = h + ':' + m;
      if (!groups[time]) groups[time] = [];
      groups[time].push(s);
    });
    list.innerHTML = Object.keys(groups).map(function(time) {
      return '<div class="sched-time-group">' +
        '<div class="sched-time">' + time + '</div>' +
        groups[time].map(function(s) {
          var title = (s.media && (s.media.title.english || s.media.title.romaji)) || 'Unknown';
          var id = s.media ? s.media.id : '';
          return '<div class="sched-ep" onclick="location.href=\'anime.html?id=' + id + '\'">' +
            '<span class="sched-ep-name">' + escH(title) + '</span>' +
            '<span class="sched-ep-badge">EP ' + s.episode + '</span>' +
          '</div>';
        }).join('') +
      '</div>';
    }).join('');
  } catch(e) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:.75rem;padding:8px 0;text-align:center">Schedule unavailable</p>';
  }
}

/* ─── INIT ──────────────────────────────────────────── */
async function homeInit() {
  initGenreRow();
  initTabs();
  initScheduleDays();

  var trendingPromise = getTrending(1, 11);
  loadGrid('trending', 1);
  loadSidebar();
  loadBottomLists();
  loadSchedule(0);

  var trending = await trendingPromise;
  initHero(trending);
}

homeInit().catch(function(err) {
  console.error(err);
  var grid = document.getElementById('mainGrid');
  if (grid) grid.innerHTML = '<div class="error-wrap" style="grid-column:1/-1"><h3>Failed to load</h3><p>' + err.message + '</p></div>';
});
