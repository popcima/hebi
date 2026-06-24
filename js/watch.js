/* Watch page — Miruro-style layout */
var params   = new URLSearchParams(location.search);
var watchId  = params.get('id');
var main     = document.getElementById('mainContent');
var watchEp  = parseInt(params.get('ep'))  || 1;
var watchLang= params.get('lang') || 'sub';
var watchData= null;

function escH(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

if (!watchId) {
  main.innerHTML = '<div class="error-wrap" style="padding-top:120px"><h3>No anime selected</h3><a href="index.html" class="btn btn-primary" style="margin-top:14px">Go Home</a></div>';
}

function updateUrl() {
  history.replaceState({}, '', 'watch.html?id='+watchId+'&ep='+watchEp+'&lang='+watchLang);
}

function fmtDate(d) {
  if (!d || !d.year) return '—';
  var M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return M[(d.month||1)-1] + ' ' + (d.day ? String(d.day).padStart(2,'0')+', ' : '') + d.year;
}

/* ── Episode list helpers ── */
var epDates  = {}; // episode → date string
var epImages = {}; // episode → { thumb, title }

function tsToShort(ts) {
  if (!ts) return '';
  var d = new Date(ts * 1000);
  var M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return M[d.getMonth()] + ' ' + String(d.getDate()).padStart(2,'0') + ', ' + d.getFullYear();
}

function buildEpDatesMap(airingSchedule) {
  epDates = {};
  if (!airingSchedule || !airingSchedule.nodes) return;
  airingSchedule.nodes.forEach(function(n) { epDates[n.episode] = tsToShort(n.airingAt); });
}

/* Parse "Episode 3 - A New World" → { num:3, title:"A New World" }
   Handles: "Episode N", "Ep. N", "N - Title", "N: Title" patterns */
function parseStreamEp(str) {
  var s = (str || '').trim();
  var m = s.match(/(?:episode|ep\.?)\s*(\d+)[\s:·\-–—]+(.+)/i);
  if (m) return { num: parseInt(m[1]), title: m[2].trim() };
  var m2 = s.match(/(?:episode|ep\.?)\s*(\d+)/i);
  if (m2) return { num: parseInt(m2[1]), title: '' };
  var m3 = s.match(/^(\d+)[\s:·\-–—]+(.+)/);
  if (m3) return { num: parseInt(m3[1]), title: m3[2].trim() };
  return null;
}

function buildEpImagesMap(streamingEps) {
  epImages = {};
  if (!streamingEps || !streamingEps.length) return;
  streamingEps.forEach(function(ep) {
    if (!ep.thumbnail) return;
    var parsed = parseStreamEp(ep.title);
    if (parsed && parsed.num && !epImages[parsed.num]) {
      epImages[parsed.num] = { thumb: ep.thumbnail, title: parsed.title };
    }
  });
}

function buildEpCard(n, total, active, poster) {
  var date    = epDates[n] || '';
  var epData  = epImages[n] || {};
  var thumb   = epData.thumb || poster;
  var hasReal = !!epData.thumb;
  var epTitle = epData.title ? 'Ep '+n+': '+escH(epData.title) : 'Episode '+n;
  var fb      = escH(poster); // fallback if thumb 404s

  return (
    '<div class="wep-card'+(active?' active':'')+'" id="sep-'+n+'" data-ep="'+n+'">' +
      '<div class="wep-thumb'+(hasReal?' has-real':'')+'">' +
        '<img src="'+escH(thumb)+'" alt="Ep '+n+'" loading="lazy" onerror="if(this.src!==\''+fb+'\')this.src=\''+fb+'\'"/>' +
        '<span class="wep-badge">EP '+n+'</span>' +
      '</div>' +
      '<div class="wep-body">' +
        '<div class="wep-title">'+epTitle+'</div>' +
        '<div class="wep-meta">' +
          (date ? '<i class="fa-solid fa-calendar-days"></i> '+date : '<i class="fa-solid fa-film"></i> '+n+(total?' / '+total:'')) +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

/* ── Recommendations ── */
function buildRecs(recs) {
  if (!recs || !recs.nodes) return '';
  var items = recs.nodes.filter(function(r) {
    return r.mediaRecommendation && r.mediaRecommendation.type === 'ANIME';
  });
  if (!items.length) return '';
  var cards = items.map(function(r) {
    var m   = r.mediaRecommendation;
    var t   = (m.title && (m.title.english || m.title.romaji)) || 'Unknown';
    var img = m.coverImage && m.coverImage.large;
    var sc  = m.averageScore ? (m.averageScore/10).toFixed(1) : '';
    return '<div class="wp-rec-card" onclick="location.href=\'anime.html?id='+m.id+'\'">' +
      '<div class="wp-rec-thumb">' +
        (img ? '<img src="'+escH(img)+'" alt="'+escH(t)+'" loading="lazy"/>' : '') +
        (sc ? '<span class="wp-rec-score"><i class="fa-solid fa-star"></i> '+sc+'</span>' : '') +
      '</div>' +
      '<div class="wp-rec-title">'+escH(t)+'</div>' +
    '</div>';
  }).join('');
  return '<div class="wp-recs"><div class="wp-recs-hd"><i class="fa-solid fa-heart-pulse"></i> Recommended</div><div class="wp-recs-row">'+cards+'</div></div>';
}

/* ── External links ── */
function buildExtLinks(links) {
  if (!links || !links.length) return '';
  var streaming = links.filter(function(l) { return l.type === 'STREAMING'; }).slice(0, 3);
  if (!streaming.length) return '';
  var pills = streaming.map(function(l) {
    return '<a class="wp-extlink" href="'+escH(l.url)+'" target="_blank" rel="noopener">'+
      '<i class="fa-solid fa-play"></i> '+escH(l.site)+'</a>';
  }).join('');
  return '<div class="wp-extlinks">'+pills+'</div>';
}

function buildRangeBtns(total, chunkSize) {
  var html = '';
  chunkSize = chunkSize || 20;
  for (var s = 1; s <= total; s += chunkSize) {
    var e   = Math.min(s + chunkSize - 1, total);
    var cur = watchEp >= s && watchEp <= e;
    html += '<button class="wep-range'+(cur?' active':'')+'" data-start="'+s+'" data-end="'+e+'">'+s+'–'+e+'</button>';
  }
  return html;
}

function buildEpListHtml(total, poster, start, end) {
  var count = total || 50;
  start = start || 1;
  end   = end   || count;
  var html = '';
  for (var i = start; i <= end; i++) {
    html += buildEpCard(i, total, i === watchEp, poster);
  }
  return html;
}

/* ── Main render ── */
function renderWatch(media) {
  var title   = getTitle(media);
  document.title = 'Ep '+watchEp+' — '+title+' — AniStream';

  buildEpDatesMap(media.airingSchedule);
  buildEpImagesMap(media.streamingEpisodes);

  var poster  = media.coverImage.extraLarge || media.coverImage.large;
  var total   = media.episodes || (media.nextAiringEpisode ? media.nextAiringEpisode.episode-1 : null);
  var score   = formatScore(media.averageScore);
  var status  = formatStatus(media.status);
  var format  = (media.format||'TV').replace(/_/g,' ');
  var studio  = media.studios&&media.studios.nodes[0] ? media.studios.nodes[0].name : '—';
  var genres  = (media.genres||[]).slice(0,3);
  var desc    = (media.description||'').replace(/<[^>]*>/g,'');
  var startD  = fmtDate(media.startDate);
  var endD    = fmtDate(media.endDate);
  var season  = media.season ? media.season[0]+media.season.slice(1).toLowerCase()+(media.seasonYear?' '+media.seasonYear:'') : '—';
  var useRange= total && total > 20;
  var chunk   = 20;
  var rStart  = useRange ? Math.floor((watchEp-1)/chunk)*chunk+1 : 1;
  var rEnd    = useRange ? Math.min(rStart+chunk-1, total) : (total||50);

  main.innerHTML =
  '<div class="wp-wrap">'+

    /* ── LEFT: main column ── */
    '<div class="wp-main">'+

      /* title bar */
      '<div class="wp-bar">'+
        '<div class="wp-bar-left">'+
          '<span class="wp-ep-num">Ep '+watchEp+'</span>'+
          '<span class="wp-ep-name">'+escH(title)+'</span>'+
        '</div>'+
        '<div class="wp-bar-right">'+
          '<div class="wp-lang-seg">'+
            '<button class="wp-lbtn'+(watchLang==='sub'?' on':'')+'" id="subBtn">SUB</button>'+
            '<button class="wp-lbtn'+(watchLang==='dub'?' on':'')+'" id="dubBtn">DUB</button>'+
          '</div>'+
        '</div>'+
      '</div>'+

      /* player */
      '<div class="wp-player">'+
        '<iframe id="playerIframe" src="'+escH(getStreamUrl(watchId,watchEp,watchLang))+'" allowfullscreen scrolling="no" allow="autoplay; fullscreen"></iframe>'+
      '</div>'+

      /* info row */
      '<div class="wp-info">'+
        '<div class="wp-pills">'+
          '<span class="wp-pill"><i class="fa-solid fa-calendar-days"></i> '+startD+'</span>'+
          (total?'<span class="wp-pill"><i class="fa-solid fa-tv"></i> '+total+' eps</span>':'')+
          (score!=='N/A'?'<span class="wp-pill"><i class="fa-solid fa-star" style="color:#fbbf24"></i> '+score+'</span>':'')+
        '</div>'+
        '<div class="wp-acts">'+
          (watchEp>1?'<button class="wp-act" id="prevEpBtn"><i class="fa-solid fa-backward-step"></i> Prev</button>':'')+
          (total===null||watchEp<total?'<button class="wp-act" id="nextEpBtn">Next <i class="fa-solid fa-forward-step"></i></button>':'')+
          '<a class="wp-act" href="anime.html?id='+watchId+'"><i class="fa-solid fa-circle-info"></i> Details</a>'+
        '</div>'+
      '</div>'+

      /* description */
      (desc?'<div class="wp-desc">'+escH(desc.slice(0,320))+(desc.length>320?'…':'')+'</div>':'')+

      /* external streaming links */
      buildExtLinks(media.externalLinks)+

      /* anime info card */
      '<div class="wp-card">'+
        '<img class="wp-poster" src="'+escH(poster)+'" alt="'+escH(title)+'" onclick="location.href=\'anime.html?id='+watchId+'\'">'+
        '<div class="wp-card-info">'+
          '<div class="wp-card-title" onclick="location.href=\'anime.html?id='+watchId+'\'">'+escH(title)+'</div>'+
          (media.title&&media.title.native?'<div class="wp-card-native">'+escH(media.title.native)+'</div>':'')+
          (genres.length?'<div class="wp-card-genres">'+genres.map(function(g){return'<span class="wp-genre">'+escH(g)+'</span>';}).join('')+'</div>':'')+
          (desc?'<div class="wp-card-desc">'+escH(desc.slice(0,260))+(desc.length>260?'…':'')+'</div>':'')+
          '<div class="wp-dg">'+
            '<div class="wp-dr"><span>Format</span><strong>'+format+'</strong></div>'+
            '<div class="wp-dr"><span>Start Date</span><strong>'+startD+'</strong></div>'+
            '<div class="wp-dr"><span>Status</span><strong>'+status+'</strong></div>'+
            '<div class="wp-dr"><span>End Date</span><strong>'+endD+'</strong></div>'+
            (total?'<div class="wp-dr"><span>Episodes</span><strong>'+(media.nextAiringEpisode?(media.nextAiringEpisode.episode-1)+'/'+total:total)+'</strong></div>':'')+
            '<div class="wp-dr"><span>Adult</span><strong>'+(media.isAdult?'Yes':'No')+'</strong></div>'+
            (score!=='N/A'?'<div class="wp-dr"><span>Score</span><strong>'+score+' / 100</strong></div>':'')+
            '<div class="wp-dr"><span>Studio</span><strong>'+escH(studio)+'</strong></div>'+
            (media.duration?'<div class="wp-dr"><span>Duration</span><strong>'+media.duration+' min</strong></div>':'')+
            (media.season?'<div class="wp-dr"><span>Season</span><strong>'+escH(season)+'</strong></div>':'')+
          '</div>'+
        '</div>'+
      '</div>'+

      /* recommendations */
      buildRecs(media.recommendations)+

    '</div>'+/* /wp-main */

    /* ── RIGHT: episode sidebar ── */
    '<div class="wp-sidebar">'+
      '<div class="wp-sb-hd">'+
        '<span class="wp-sb-label"><i class="fa-solid fa-list"></i> Episodes</span>'+
        '<div style="display:flex;align-items:center;gap:8px">'+
          (total?'<span class="wp-sb-count">'+total+'</span>':'')+
          '<button class="wp-view-btn" id="viewToggle" title="Switch view">'+
            '<i class="fa-solid fa-grip" id="viewIcon"></i>'+
          '</button>'+
        '</div>'+
      '</div>'+
      (useRange?'<div class="wp-ranges" id="rangeBar">'+buildRangeBtns(total,chunk)+'</div>':'')+
      '<div class="wp-filter-wrap">'+
        '<i class="fa-solid fa-magnifying-glass wp-fi"></i>'+
        '<input class="wp-filter" id="epFilter" placeholder="Filter episodes…" autocomplete="off">'+
      '</div>'+
      '<div class="wp-eplist" id="epList">'+
        buildEpListHtml(total, poster, rStart, rEnd)+
      '</div>'+
    '</div>'+

  '</div>';/* /wp-wrap */

  attachEvents(total, poster, chunk);
  scrollToEp();
}

/* ── Event wiring ── */
function attachEvents(total, poster, chunk) {
  /* lang */
  var s = document.getElementById('subBtn');
  var d = document.getElementById('dubBtn');
  if (s) s.addEventListener('click', function(){ watchLang='sub'; reloadPlayer(total); });
  if (d) d.addEventListener('click', function(){ watchLang='dub'; reloadPlayer(total); });

  /* prev/next */
  var p = document.getElementById('prevEpBtn');
  var n = document.getElementById('nextEpBtn');
  if (p) p.addEventListener('click', function(){ if(watchEp>1){watchEp--;reloadPlayer(total);} });
  if (n) n.addEventListener('click', function(){ if(!total||watchEp<total){watchEp++;reloadPlayer(total);} });

  /* episode cards */
  var list = document.getElementById('epList');
  if (list) list.addEventListener('click', function(e) {
    var card = e.target.closest('.wep-card');
    if (card) { watchEp=parseInt(card.dataset.ep); reloadPlayer(total); }
  });

  /* range buttons */
  var rb = document.getElementById('rangeBar');
  if (rb) rb.addEventListener('click', function(e) {
    var btn = e.target.closest('.wep-range');
    if (!btn) return;
    rb.querySelectorAll('.wep-range').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    var s2 = parseInt(btn.dataset.start);
    var e2 = parseInt(btn.dataset.end);
    var epList = document.getElementById('epList');
    if (epList) {
      var wasGrid = epList.classList.contains('grid-mode');
      epList.innerHTML = buildEpListHtml(total, poster, s2, e2);
      if (wasGrid) epList.classList.add('grid-mode');
    }
    reattachEpList(total, poster);
    scrollToEp();
  });

  /* filter */
  var flt = document.getElementById('epFilter');
  if (flt) flt.addEventListener('input', function() {
    var val = flt.value.toLowerCase();
    document.querySelectorAll('.wep-card').forEach(function(card) {
      var n2 = card.dataset.ep;
      card.style.display = (val===''||('episode '+n2).includes(val)||n2.includes(val)) ? '' : 'none';
    });
  });

  /* grid / list toggle */
  var vt   = document.getElementById('viewToggle');
  var icon = document.getElementById('viewIcon');
  var epl  = document.getElementById('epList');
  if (vt && epl) {
    var isGrid = localStorage.getItem('anistream:epView') === 'grid';
    function applyView(g) {
      epl.classList.toggle('grid-mode', g);
      if (icon) { icon.className = g ? 'fa-solid fa-list' : 'fa-solid fa-grip'; }
    }
    applyView(isGrid);
    vt.addEventListener('click', function() {
      isGrid = !isGrid;
      applyView(isGrid);
      localStorage.setItem('anistream:epView', isGrid ? 'grid' : 'list');
    });
  }
}

function reattachEpList(total, poster) {
  var list = document.getElementById('epList');
  if (list) list.addEventListener('click', function(e) {
    var card = e.target.closest('.wep-card');
    if (card) { watchEp=parseInt(card.dataset.ep); reloadPlayer(total); }
  });
}

/* ── Reload after ep/lang change ── */
function reloadPlayer(total) {
  var iframe = document.getElementById('playerIframe');
  if (iframe) iframe.src = getStreamUrl(watchId, watchEp, watchLang);

  document.title = 'Ep '+watchEp+' — '+getTitle(watchData)+' — AniStream';

  var epNum = document.querySelector('.wp-ep-num');
  if (epNum) epNum.textContent = 'Ep '+watchEp;

  document.querySelectorAll('.wp-lbtn').forEach(function(b){
    b.classList.toggle('on', b.id===(watchLang+'Btn'));
  });
  document.querySelectorAll('.wep-card').forEach(function(el){
    el.classList.toggle('active', parseInt(el.dataset.ep)===watchEp);
  });

  /* rebuild prev/next */
  var acts = document.querySelector('.wp-acts');
  if (acts) {
    acts.innerHTML =
      (watchEp>1?'<button class="wp-act" id="prevEpBtn"><i class="fa-solid fa-backward-step"></i> Prev</button>':'')+
      (total===null||watchEp<total?'<button class="wp-act" id="nextEpBtn">Next <i class="fa-solid fa-forward-step"></i></button>':'')+
      '<a class="wp-act" href="anime.html?id='+watchId+'"><i class="fa-solid fa-circle-info"></i> Details</a>';
    var p = document.getElementById('prevEpBtn');
    var n = document.getElementById('nextEpBtn');
    if (p) p.addEventListener('click', function(){ if(watchEp>1){watchEp--;reloadPlayer(total);} });
    if (n) n.addEventListener('click', function(){ if(!total||watchEp<total){watchEp++;reloadPlayer(total);} });
  }

  scrollToEp();
  updateUrl();
}

function scrollToEp() {
  var el = document.getElementById('sep-'+watchEp);
  if (el) el.scrollIntoView({ block:'center', behavior:'smooth' });
}

/* ── Keyboard nav ── */
document.addEventListener('keydown', function(e) {
  if (!watchData) return;
  var total = watchData.episodes;
  if (e.key==='ArrowRight'&&(!total||watchEp<total)){ watchEp++; reloadPlayer(total); }
  if (e.key==='ArrowLeft'&&watchEp>1){ watchEp--; reloadPlayer(total); }
});

/* ── Boot ── */
if (watchId) {
  getAnimeById(watchId).then(function(media) {
    watchData = media;
    renderWatch(media);
  }).catch(function(err) {
    main.innerHTML = '<div class="error-wrap" style="padding-top:120px"><h3>Failed to load</h3><p>'+err.message+'</p><a class="btn btn-primary" href="index.html" style="margin-top:14px">Go Home</a></div>';
  });
}
