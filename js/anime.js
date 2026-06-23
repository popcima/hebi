/* Anime detail page — no ES modules */
var params = new URLSearchParams(location.search);
var animeId = params.get('id');
var main = document.getElementById('mainContent');
var animeLang = 'sub';

function escH(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

if (!animeId) {
  main.innerHTML = '<div class="error-wrap" style="padding-top:120px"><h3>No anime ID</h3><p><a href="index.html">Go Home</a></p></div>';
}

function buildEpisodeGrid(totalEp, id, lang) {
  var count = totalEp || 12;
  var html = '<div class="ep-grid">';
  for (var i = 1; i <= count; i++) {
    html += '<button class="ep-btn" onclick="location.href=\'watch.html?id=' + id + '&ep=' + i + '&lang=' + lang + '\'">' + i + '</button>';
  }
  html += '</div>';
  if (!totalEp) {
    html = '<p style="color:var(--text-muted);font-size:.82rem;margin-bottom:10px">Episode count unknown — showing first 12. More may be available.</p>' + html;
  }
  return html;
}

function renderRecs(recs) {
  if (!recs || !recs.nodes || !recs.nodes.length) return '';
  var items = recs.nodes.filter(function(n) { return n.mediaRecommendation; }).map(function(n) {
    var m = n.mediaRecommendation;
    var t = m.title ? (m.title.english || m.title.romaji || '') : '';
    var img = m.coverImage ? (m.coverImage.large || m.coverImage.medium || '') : '';
    return '<div class="anime-card" onclick="location.href=\'anime.html?id=' + m.id + '\'">' +
      '<div class="card-img-wrap"><img src="' + escH(img) + '" alt="' + escH(t) + '" loading="lazy" />' +
      '<div class="card-score">★ ' + formatScore(m.averageScore) + '</div></div>' +
      '<div class="card-info"><div class="card-title">' + escH(t) + '</div></div>' +
    '</div>';
  }).join('');
  return '<section class="section" style="max-width:1100px;margin:0 auto">' +
    '<div class="section-header"><h2 class="section-title">💡 Recommendations</h2></div>' +
    '<div class="anime-grid">' + items + '</div>' +
  '</section>';
}

function renderPage(media) {
  var title = getTitle(media);
  document.title = title + ' — AniStream';

  var score = formatScore(media.averageScore);
  var status = formatStatus(media.status);
  var banner = media.bannerImage || media.coverImage.extraLarge;
  var poster = media.coverImage.extraLarge || media.coverImage.large;
  var desc = (media.description || '').replace(/<[^>]*>/g, '');
  var studio = media.studios && media.studios.nodes[0] ? media.studios.nodes[0].name : '';
  var genres = media.genres || [];
  var totalEp = media.episodes || (media.nextAiringEpisode ? media.nextAiringEpisode.episode - 1 : null);
  var statusCls = 'status-' + (media.status || 'FINISHED');

  main.innerHTML =
    '<div class="anime-banner"><img src="' + escH(banner) + '" alt="' + escH(title) + '" /></div>' +
    '<div class="anime-detail">' +
      '<div class="anime-poster">' +
        '<img src="' + escH(poster) + '" alt="' + escH(title) + '" />' +
        '<div style="margin-top:14px;display:flex;flex-direction:column;gap:8px">' +
          '<a class="btn btn-primary" href="watch.html?id=' + media.id + '&ep=1&lang=sub">▶ Watch EP 1</a>' +
          '<a class="btn btn-secondary" href="watch.html?id=' + media.id + '&ep=1&lang=dub">🎙 Watch Dub</a>' +
        '</div>' +
      '</div>' +
      '<div class="anime-info-main">' +
        '<h1 class="anime-title-main">' + escH(title) + '</h1>' +
        (media.title.native ? '<p class="anime-title-native">' + escH(media.title.native) + '</p>' : '') +
        '<div class="anime-stats">' +
          (score !== 'N/A' ? '<div class="stat-box"><div class="stat-val">★ ' + score + '</div><div class="stat-lbl">Score</div></div>' : '') +
          '<div class="stat-box"><div class="stat-val">' + status + '</div><div class="stat-lbl">Status</div></div>' +
          (totalEp ? '<div class="stat-box"><div class="stat-val">' + totalEp + '</div><div class="stat-lbl">Episodes</div></div>' : '') +
          (media.duration ? '<div class="stat-box"><div class="stat-val">' + media.duration + 'm</div><div class="stat-lbl">Duration</div></div>' : '') +
          (media.seasonYear ? '<div class="stat-box"><div class="stat-val">' + (media.season ? media.season + ' ' : '') + media.seasonYear + '</div><div class="stat-lbl">Season</div></div>' : '') +
          (studio ? '<div class="stat-box"><div class="stat-val" style="font-size:.82rem">' + escH(studio) + '</div><div class="stat-lbl">Studio</div></div>' : '') +
        '</div>' +
        '<div class="anime-genres">' +
          genres.map(function(g) { return '<a class="genre-badge" href="search.html?genre=' + encodeURIComponent(g) + '">' + g + '</a>'; }).join('') +
        '</div>' +
        '<p class="anime-desc' + (desc.length > 400 ? ' collapsed' : '') + '" id="animeDesc">' + escH(desc) + '</p>' +
        (desc.length > 400 ? '<button class="btn btn-ghost btn-sm" id="descToggle" style="margin-bottom:14px">Show More ↓</button>' : '') +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' +
          '<a class="btn btn-primary" href="watch.html?id=' + media.id + '&ep=1&lang=sub">▶ Watch Now</a>' +
          '<a class="btn btn-secondary" href="search.html">← Browse</a>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<section class="episodes-section">' +
      '<div class="section-header" style="margin-bottom:12px">' +
        '<h2 class="section-title" style="font-size:1rem">📺 Episodes</h2>' +
        '<div class="ep-controls">' +
          '<div class="lang-toggle">' +
            '<button class="lang-btn active" id="subBtn" data-lang="sub">SUB</button>' +
            '<button class="lang-btn" id="dubBtn" data-lang="dub">DUB</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div id="episodeGrid">' + buildEpisodeGrid(totalEp, media.id, animeLang) + '</div>' +
    '</section>' +
    '<div class="divider"></div>' +
    renderRecs(media.recommendations);

  var toggle = document.getElementById('descToggle');
  if (toggle) {
    toggle.addEventListener('click', function() {
      var descEl = document.getElementById('animeDesc');
      var collapsed = descEl.classList.toggle('collapsed');
      toggle.textContent = collapsed ? 'Show More ↓' : 'Show Less ↑';
    });
  }

  document.getElementById('subBtn') && document.getElementById('subBtn').addEventListener('click', function() {
    animeLang = 'sub';
    document.getElementById('subBtn').classList.add('active');
    document.getElementById('dubBtn').classList.remove('active');
    document.getElementById('episodeGrid').innerHTML = buildEpisodeGrid(totalEp, media.id, animeLang);
  });
  document.getElementById('dubBtn') && document.getElementById('dubBtn').addEventListener('click', function() {
    animeLang = 'dub';
    document.getElementById('dubBtn').classList.add('active');
    document.getElementById('subBtn').classList.remove('active');
    document.getElementById('episodeGrid').innerHTML = buildEpisodeGrid(totalEp, media.id, animeLang);
  });
}

if (animeId) {
  getAnimeById(animeId).then(function(media) {
    renderPage(media);
  }).catch(function(err) {
    main.innerHTML = '<div class="error-wrap" style="padding-top:120px"><h3>Failed to load</h3><p>' + err.message + '</p><a class="btn btn-primary" href="index.html" style="margin-top:14px">Go Home</a></div>';
  });
}
