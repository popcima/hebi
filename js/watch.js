/* Watch page — no ES modules */
var params = new URLSearchParams(location.search);
var watchId = params.get('id');
var main = document.getElementById('mainContent');
var watchEp = parseInt(params.get('ep')) || 1;
var watchLang = params.get('lang') || 'sub';
var watchData = null;

function escH(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

if (!watchId) {
  main.innerHTML = '<div class="error-wrap" style="padding-top:120px"><h3>No anime specified</h3><a href="index.html">Go Home</a></div>';
}

function updateUrl() {
  history.replaceState({}, '', 'watch.html?id=' + watchId + '&ep=' + watchEp + '&lang=' + watchLang);
}

function buildSidebarEps(totalEp) {
  var count = totalEp || 50;
  var html = '';
  for (var i = 1; i <= count; i++) {
    html += '<div class="sidebar-ep' + (i === watchEp ? ' active' : '') + '" id="sep-' + i + '" data-ep="' + i + '">' +
      '<div class="ep-num">' + i + '</div>' +
      '<div class="ep-label"><strong>Episode ' + i + '</strong></div>' +
    '</div>';
  }
  return html;
}

function renderWatch(media) {
  var title = getTitle(media);
  document.title = 'Ep ' + watchEp + ' — ' + title + ' — AniStream';

  var poster = media.coverImage.extraLarge || media.coverImage.large;
  var banner = media.bannerImage || poster;
  var totalEp = media.episodes || (media.nextAiringEpisode ? media.nextAiringEpisode.episode - 1 : null);
  var streamUrl = getStreamUrl(watchId, watchEp, watchLang);

  main.innerHTML =
    '<div class="watch-layout">' +
      '<div>' +
        '<div class="player-wrap">' +
          '<iframe id="playerIframe" src="' + escH(streamUrl) + '" allowfullscreen scrolling="no" allow="autoplay; fullscreen"></iframe>' +
        '</div>' +
        '<div class="player-controls">' +
          '<div class="player-title">' + escH(title) + '</div>' +
          '<div class="player-ep-info" id="playerInfo">Episode ' + watchEp + (totalEp ? ' of ' + totalEp : '') + ' · ' + watchLang.toUpperCase() + '</div>' +
          '<div class="player-nav">' +
            '<button class="btn btn-secondary btn-sm" id="prevEpBtn"' + (watchEp <= 1 ? ' disabled style="opacity:.4"' : '') + '>← Prev</button>' +
            '<button class="btn btn-secondary btn-sm" id="nextEpBtn"' + (totalEp && watchEp >= totalEp ? ' disabled style="opacity:.4"' : '') + '>Next →</button>' +
            '<div class="lang-toggle" style="margin-left:auto">' +
              '<button class="lang-btn' + (watchLang === 'sub' ? ' active' : '') + '" id="subBtn">SUB</button>' +
              '<button class="lang-btn' + (watchLang === 'dub' ? ' active' : '') + '" id="dubBtn">DUB</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div>' +
        '<div class="sidebar-card" onclick="location.href=\'anime.html?id=' + watchId + '\'" style="cursor:pointer;margin-bottom:12px">' +
          '<img class="sidebar-anime-thumb" src="' + escH(banner) + '" alt="' + escH(title) + '" />' +
          '<div class="sidebar-anime-info">' +
            '<div class="sidebar-anime-title">' + escH(title) + '</div>' +
            '<div class="sidebar-anime-meta">' + formatStatus(media.status) + (totalEp ? ' · ' + totalEp + ' eps' : '') + ' · ★ ' + formatScore(media.averageScore) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="sidebar-card">' +
          '<div class="sidebar-header"><span>Episodes</span><span style="color:var(--text-muted);font-size:.75rem" id="langLabel">' + watchLang.toUpperCase() + '</span></div>' +
          '<div class="sidebar-ep-list" id="sidebarEpList">' + buildSidebarEps(totalEp) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  attachWatchEvents(totalEp);
  scrollToActiveEp();
}

function reloadPlayer() {
  var iframe = document.getElementById('playerIframe');
  if (iframe) iframe.src = getStreamUrl(watchId, watchEp, watchLang);

  var title = getTitle(watchData);
  var totalEp = watchData.episodes || (watchData.nextAiringEpisode ? watchData.nextAiringEpisode.episode - 1 : null);
  document.title = 'Ep ' + watchEp + ' — ' + title + ' — AniStream';

  var info = document.getElementById('playerInfo');
  if (info) info.textContent = 'Episode ' + watchEp + (totalEp ? ' of ' + totalEp : '') + ' · ' + watchLang.toUpperCase();

  var prevBtn = document.getElementById('prevEpBtn');
  var nextBtn = document.getElementById('nextEpBtn');
  if (prevBtn) { prevBtn.disabled = watchEp <= 1; prevBtn.style.opacity = watchEp <= 1 ? '0.4' : '1'; }
  if (nextBtn) { nextBtn.disabled = !!(totalEp && watchEp >= totalEp); nextBtn.style.opacity = (totalEp && watchEp >= totalEp) ? '0.4' : '1'; }

  var subBtn = document.getElementById('subBtn');
  var dubBtn = document.getElementById('dubBtn');
  if (subBtn) subBtn.classList.toggle('active', watchLang === 'sub');
  if (dubBtn) dubBtn.classList.toggle('active', watchLang === 'dub');

  var langLabel = document.getElementById('langLabel');
  if (langLabel) langLabel.textContent = watchLang.toUpperCase();

  document.querySelectorAll('.sidebar-ep').forEach(function(el) {
    var ep = parseInt(el.dataset.ep);
    el.classList.toggle('active', ep === watchEp);
  });
  scrollToActiveEp();
  updateUrl();
}

function scrollToActiveEp() {
  var active = document.getElementById('sep-' + watchEp);
  if (active) active.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function attachWatchEvents(totalEp) {
  document.getElementById('prevEpBtn') && document.getElementById('prevEpBtn').addEventListener('click', function() {
    if (watchEp > 1) { watchEp--; reloadPlayer(); }
  });
  document.getElementById('nextEpBtn') && document.getElementById('nextEpBtn').addEventListener('click', function() {
    if (!totalEp || watchEp < totalEp) { watchEp++; reloadPlayer(); }
  });
  document.getElementById('subBtn') && document.getElementById('subBtn').addEventListener('click', function() { watchLang = 'sub'; reloadPlayer(); });
  document.getElementById('dubBtn') && document.getElementById('dubBtn').addEventListener('click', function() { watchLang = 'dub'; reloadPlayer(); });

  var epList = document.getElementById('sidebarEpList');
  if (epList) {
    epList.addEventListener('click', function(e) {
      var el = e.target.closest('.sidebar-ep');
      if (el) { watchEp = parseInt(el.dataset.ep); reloadPlayer(); }
    });
  }
}

document.addEventListener('keydown', function(e) {
  if (!watchData) return;
  var totalEp = watchData.episodes;
  if (e.key === 'ArrowRight' && (!totalEp || watchEp < totalEp)) { watchEp++; reloadPlayer(); }
  if (e.key === 'ArrowLeft' && watchEp > 1) { watchEp--; reloadPlayer(); }
});

if (watchId) {
  getAnimeById(watchId).then(function(media) {
    watchData = media;
    renderWatch(media);
  }).catch(function(err) {
    main.innerHTML = '<div class="error-wrap" style="padding-top:120px"><h3>Failed to load</h3><p>' + err.message + '</p><a class="btn btn-primary" href="index.html" style="margin-top:14px">Go Home</a></div>';
  });
}
