/* Watch page — Miruro exact layout */
var params    = new URLSearchParams(location.search);
var watchId   = params.get('id');
var main      = document.getElementById('mainContent');
var watchEp   = parseInt(params.get('ep')) || 1;
var watchLang = params.get('lang') || 'sub';
var watchData = null;

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

/* ── Episode helpers ── */
var epDates  = {};
var epImages = {};

function tsToShort(ts) {
  if (!ts) return '';
  var d = new Date(ts * 1000);
  var M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return M[d.getMonth()] + ' ' + String(d.getDate()).padStart(2,'0') + ', ' + d.getFullYear();
}

function buildEpDatesMap(sch) {
  epDates = {};
  if (!sch || !sch.nodes) return;
  sch.nodes.forEach(function(n) { epDates[n.episode] = tsToShort(n.airingAt); });
}

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

function buildEpImagesMap(eps) {
  epImages = {};
  if (!eps || !eps.length) return;
  eps.forEach(function(ep) {
    if (!ep.thumbnail) return;
    var p = parseStreamEp(ep.title);
    if (p && p.num && !epImages[p.num]) epImages[p.num] = { thumb: ep.thumbnail, title: p.title };
  });
}

function buildEpCard(n, total, active, poster) {
  var date    = epDates[n] || '';
  var epData  = epImages[n] || {};
  var thumb   = epData.thumb || poster;
  var hasReal = !!epData.thumb;
  var epTitle = epData.title ? 'Episode '+n+': '+escH(epData.title) : 'Episode '+n;
  var fb      = escH(poster);

  return (
    '<div class="wep-card'+(active?' active':'')+'" id="sep-'+n+'" data-ep="'+n+'">' +
      '<div class="wep-thumb'+(hasReal?' has-real':'')+'">' +
        '<img src="'+escH(thumb)+'" alt="Ep '+n+'" loading="lazy" onerror="if(this.src!==\''+fb+'\')this.src=\''+fb+'\'">'+
        '<span class="wep-badge">EP '+n+'</span>' +
      '</div>' +
      '<div class="wep-body">' +
        '<div class="wep-title">'+epTitle+'</div>' +
        '<div class="wep-foot">' +
          (date ? '<span class="wep-date">'+date+'</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

function buildRangeBtns(total, chunk) {
  var html = '';
  for (var s = 1; s <= total; s += chunk) {
    var e   = Math.min(s + chunk - 1, total);
    var cur = watchEp >= s && watchEp <= e;
    html += '<button class="wep-range'+(cur?' active':'')+'" data-start="'+s+'" data-end="'+e+'">'+s+' - '+e+'</button>';
  }
  return html;
}

function buildEpListHtml(total, poster, start, end) {
  var count = total || 50;
  start = start || 1; end = end || count;
  var html = '';
  for (var i = start; i <= end; i++) html += buildEpCard(i, total, i === watchEp, poster);
  return html;
}

/* ── Sidebar recommendations ── */
function buildSidebarRecs(recs) {
  if (!recs || !recs.nodes) return '';
  var items = recs.nodes.filter(function(r) {
    return r.mediaRecommendation && r.mediaRecommendation.type === 'ANIME';
  });
  if (!items.length) return '';
  var cards = items.map(function(r) {
    var m   = r.mediaRecommendation;
    var t   = (m.title && (m.title.english || m.title.romaji)) || 'Unknown';
    var img = m.bannerImage || (m.coverImage && m.coverImage.large);
    var sc  = m.averageScore || 0;
    var fmt = (m.format || 'TV').replace(/_/g,' ');
    var eps = m.episodes || '';
    return '<div class="wp-srec" onclick="location.href=\'anime.html?id='+m.id+'\'">' +
      '<div class="wp-srec-img-wrap">' +
        (img ? '<img src="'+escH(img)+'" alt="'+escH(t)+'" loading="lazy">' : '') +
      '</div>' +
      '<div class="wp-srec-body">' +
        '<span class="wp-srec-dot"></span>' +
        '<div class="wp-srec-info">' +
          '<div class="wp-srec-title">'+escH(t)+'</div>' +
          '<div class="wp-srec-meta">'+
            '<span>'+escH(fmt)+'</span>'+
            (eps?'<span><i class="fa-solid fa-tv"></i> '+eps+'</span>':'')+
            (sc?'<span><i class="fa-solid fa-star"></i> '+Math.round(sc/10)+'</span>':'')+
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
  return '<div class="wp-sidebar-recs">'+
    '<div class="wp-srec-hd"><i class="fa-solid fa-chevron-right"></i> RECOMMENDATIONS</div>'+
    cards+
  '</div>';
}

/* ── Next episode countdown ── */
function buildNextAiring(nae) {
  if (!nae || nae.timeUntilAiring <= 0) return '';
  var secs = nae.timeUntilAiring;
  var d = Math.floor(secs / 86400);
  var h = Math.floor((secs % 86400) / 3600);
  var m = Math.floor((secs % 3600) / 60);
  var timeStr = (d ? d+'d ' : '') + (h ? h+'h ' : '') + ((!d && h < 2) ? m+'m' : '');
  var dateStr = tsToShort(nae.airingAt);
  return '<div class="wp-next-air">'+
    '<i class="fa-solid fa-clock"></i> '+
    'Episode '+nae.episode+' in <strong>'+timeStr.trim()+'</strong>'+
    (dateStr ? ' · '+dateStr : '')+
  '</div>';
}

/* ── Main render ── */
function renderWatch(media) {
  var title = getTitle(media);
  document.title = 'Ep '+watchEp+' — '+title+' — AniStream';

  buildEpDatesMap(media.airingSchedule);
  buildEpImagesMap(media.streamingEpisodes);

  var poster   = media.coverImage.extraLarge || media.coverImage.large;
  var total    = media.episodes || (media.nextAiringEpisode ? media.nextAiringEpisode.episode-1 : null);
  var status   = formatStatus(media.status);
  var format   = (media.format||'TV').replace(/_/g,' ');
  var studios  = media.studios&&media.studios.nodes ? media.studios.nodes.map(function(s){return s.name;}).join(', ') : '—';
  var genres   = (media.genres||[]).slice(0,2);
  var desc     = (media.description||'').replace(/<[^>]*>/g,'');
  var startD   = fmtDate(media.startDate);
  var endD     = fmtDate(media.endDate);
  var season   = media.season ? media.season[0]+media.season.slice(1).toLowerCase() : '—';
  var country  = media.countryOfOrigin || '';
  var rawScore = media.averageScore || 0;
  var useRange = total && total > 20;
  var chunk    = 20;
  var rStart   = useRange ? Math.floor((watchEp-1)/chunk)*chunk+1 : 1;
  var rEnd     = useRange ? Math.min(rStart+chunk-1, total) : (total||50);

  var curEpData  = epImages[watchEp] || {};
  var curEpTitle = curEpData.title || '';

  /* official site */
  var officialSite = '';
  if (media.externalLinks) {
    var sl = media.externalLinks.filter(function(l){ return l.site==='Official Site'; })[0];
    if (sl) officialSite = sl.url;
  }

  /* streaming ext links */
  var streamLinks = '';
  if (media.externalLinks) {
    var sl2 = media.externalLinks.filter(function(l){ return l.type==='STREAMING'; }).slice(0,3);
    if (sl2.length) streamLinks = '<div class="wp-extlinks">'+
      sl2.map(function(l){ return '<a class="wp-extlink" href="'+escH(l.url)+'" target="_blank" rel="noopener"><i class="fa-solid fa-play"></i> '+escH(l.site)+'</a>'; }).join('')+
    '</div>';
  }

  main.innerHTML =
  '<div class="wp-wrap">'+

  /* ══ LEFT MAIN ══ */
  '<div class="wp-main">'+

    /* title bar */
    '<div class="wp-bar">'+
      '<div class="wp-bar-left">'+
        '<span class="wp-ep-num" id="epNumEl">'+watchEp+'.</span>'+
        '<span class="wp-ep-name" id="epNameEl">'+escH(curEpTitle || title)+'</span>'+
      '</div>'+
      '<div class="wp-bar-right">'+
        '<div class="wp-lang-seg">'+
          '<button class="wp-lbtn'+(watchLang==='sub'?' on':'')+'" id="subBtn"><i class="fa-solid fa-closed-captioning"></i> Sub <i class="fa-solid fa-sort"></i></button>'+
          '<button class="wp-lbtn'+(watchLang==='dub'?' on':'')+'" id="dubBtn">Dub <i class="fa-solid fa-sort"></i></button>'+
        '</div>'+
      '</div>'+
    '</div>'+

    /* player */
    '<div class="wp-player"><iframe id="playerIframe" src="'+escH(getStreamUrl(watchId,watchEp,watchLang))+'" allowfullscreen scrolling="no" allow="autoplay; fullscreen"></iframe></div>'+

    /* info bar */
    '<div class="wp-info">'+
      '<div class="wp-pills">'+
        (startD!=='—'?'<span class="wp-pill"><i class="fa-solid fa-calendar-days"></i> '+startD+'</span>':'')+
        (total?'<span class="wp-pill"><i class="fa-solid fa-film"></i> '+total+'</span>':'')+
        '<span class="wp-pill"><i class="fa-solid fa-microphone-lines"></i> 0</span>'+
      '</div>'+
      '<div class="wp-acts" id="wpActs">'+
        (watchEp>1?'<button class="wp-act-nav" id="prevEpBtn"><i class="fa-solid fa-backward-step"></i></button>':'')+
        (total===null||watchEp<total?'<button class="wp-act-nav" id="nextEpBtn"><i class="fa-solid fa-forward-step"></i></button>':'')+
        '<button class="wp-act"><i class="fa-solid fa-flag"></i> Report</button>'+
        '<button class="wp-act"><i class="fa-solid fa-download"></i> Download</button>'+
        '<button class="wp-act"><i class="fa-solid fa-share-nodes"></i> Share</button>'+
      '</div>'+
    '</div>'+

    /* next airing countdown */
    buildNextAiring(media.nextAiringEpisode)+

    /* streaming links */
    streamLinks+

    /* anime info card */
    '<div class="wp-card">'+
      /* left: poster + buttons */
      '<div class="wp-card-left">'+
        '<img class="wp-poster" src="'+escH(poster)+'" alt="'+escH(title)+'" onclick="location.href=\'anime.html?id='+watchId+'\'">'+
        '<div class="wp-poster-btns">'+
          (media.trailer&&media.trailer.id ?
            '<a class="wp-trailer-btn" href="https://www.youtube.com/watch?v='+escH(media.trailer.id)+'" target="_blank" rel="noopener">TRAILER</a>' :
            '<span class="wp-trailer-btn wp-trailer-no">NO TRAILER</span>')+
          '<a class="wp-add-btn" href="anime.html?id='+watchId+'" title="Details"><i class="fa-solid fa-plus"></i></a>'+
        '</div>'+
        '<div class="wp-src-links">'+
          '<a class="wp-src-link wp-al" href="https://anilist.co/anime/'+watchId+'" target="_blank">AL.</a>'+
          (media.idMal?'<a class="wp-src-link wp-mal" href="https://myanimelist.net/anime/'+media.idMal+'" target="_blank">MAL</a>':'')+
        '</div>'+
      '</div>'+
      /* right: info */
      '<div class="wp-card-right">'+
        '<div class="wp-ctitle" onclick="location.href=\'anime.html?id='+watchId+'\'">'+escH(title)+'</div>'+
        (media.title&&media.title.native?'<div class="wp-cnative">'+escH(media.title.native)+'</div>':'')+
        (genres.length?'<div class="wp-cgenres">'+genres.map(function(g){return'<span class="wp-ctag">'+escH(g)+'</span>';}).join('')+'</div>':'')+
        (desc?'<div class="wp-cdesc">'+escH(desc.slice(0,300))+(desc.length>300?'…':'')+'</div>':'')+
        '<div class="wp-dg">'+
          '<div class="wp-dr"><span>Format</span><strong>'+escH(format)+'</strong></div>'+
          '<div class="wp-dr"><span>Start Date</span><strong>'+startD+'</strong></div>'+
          '<div class="wp-dr"><span>Status</span><strong>'+status+'</strong></div>'+
          '<div class="wp-dr"><span>End Date</span><strong>'+endD+'</strong></div>'+
          (total?'<div class="wp-dr"><span>Episodes</span><strong>'+(media.nextAiringEpisode?(media.nextAiringEpisode.episode-1)+' / '+total:total)+'</strong></div>':'')+
          (country?'<div class="wp-dr"><span>Country</span><strong>'+escH(country)+'</strong></div>':'')+
          (rawScore?'<div class="wp-dr"><span>Rating</span><strong>'+rawScore+' /100</strong></div>':'')+
          '<div class="wp-dr"><span>Adult</span><strong>'+(media.isAdult?'Yes':'No')+'</strong></div>'+
          (media.duration?'<div class="wp-dr"><span>Duration</span><strong>'+media.duration+' min</strong></div>':'')+
          '<div class="wp-dr"><span>Studios</span><strong>'+escH(studios)+'</strong></div>'+
          (season!=='—'?'<div class="wp-dr"><span>Season</span><strong>'+escH(season)+'</strong></div>':'')+
          (officialSite?'<div class="wp-dr"><span>Official Site</span><strong><a class="wp-detail-link" href="'+escH(officialSite)+'" target="_blank">'+escH(officialSite.replace(/^https?:\/\/(www\.)?/,'').replace(/\/.*$/,''))+'</a></strong></div>':'')+
        '</div>'+
      '</div>'+
    '</div>'+

  '</div>'+/* /wp-main */

  /* ══ RIGHT SIDEBAR ══ */
  '<div class="wp-sidebar">'+

    /* sticky episode section */
    '<div class="wp-ep-section">'+
      '<div class="wp-ep-controls">'+
        (useRange?'<div class="wp-ranges" id="rangeBar">'+buildRangeBtns(total,chunk)+'</div>':'')+
        '<div class="wp-ep-ctrl-row">'+
          '<div class="wp-filter-wrap">'+
            '<i class="fa-solid fa-magnifying-glass wp-fi"></i>'+
            '<input class="wp-filter" id="epFilter" placeholder="Filter episodes…" autocomplete="off">'+
          '</div>'+
          '<button class="wp-view-btn" id="viewToggle" title="Grid/List view"><i class="fa-solid fa-grip" id="viewIcon"></i></button>'+
        '</div>'+
      '</div>'+
      '<div class="wp-eplist" id="epList">'+
        buildEpListHtml(total, poster, rStart, rEnd)+
      '</div>'+
    '</div>'+

    /* recommendations below sticky section */
    buildSidebarRecs(media.recommendations)+

  '</div>'+/* /wp-sidebar */

  '</div>';/* /wp-wrap */

  attachEvents(total, poster, chunk);
  scrollToEp();
}

/* ── Events ── */
function attachEvents(total, poster, chunk) {
  /* lang */
  var sb = document.getElementById('subBtn');
  var db = document.getElementById('dubBtn');
  if (sb) sb.addEventListener('click', function(){ watchLang='sub'; reloadPlayer(total); });
  if (db) db.addEventListener('click', function(){ watchLang='dub'; reloadPlayer(total); });

  /* prev/next in info bar */
  var pb = document.getElementById('prevEpBtn');
  var nb = document.getElementById('nextEpBtn');
  if (pb) pb.addEventListener('click', function(){ if(watchEp>1){watchEp--;reloadPlayer(total);} });
  if (nb) nb.addEventListener('click', function(){ if(!total||watchEp<total){watchEp++;reloadPlayer(total);} });

  /* episode cards */
  var epList = document.getElementById('epList');
  if (epList) epList.addEventListener('click', function(e) {
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
    var epl = document.getElementById('epList');
    if (epl) {
      var wasGrid = epl.classList.contains('grid-mode');
      epl.innerHTML = buildEpListHtml(total, poster, parseInt(btn.dataset.start), parseInt(btn.dataset.end));
      if (wasGrid) epl.classList.add('grid-mode');
      epl.addEventListener('click', epListClickHandler(total));
    }
    scrollToEp();
  });

  /* filter */
  var flt = document.getElementById('epFilter');
  if (flt) flt.addEventListener('input', function() {
    var val = flt.value.toLowerCase();
    document.querySelectorAll('.wep-card').forEach(function(c) {
      var n = c.dataset.ep;
      c.style.display = (!val||('episode '+n).includes(val)||n.includes(val)) ? '' : 'none';
    });
  });

  /* grid/list toggle */
  var vt   = document.getElementById('viewToggle');
  var icon = document.getElementById('viewIcon');
  var epl2 = document.getElementById('epList');
  if (vt && epl2) {
    var isGrid = localStorage.getItem('anistream:epView') === 'grid';
    applyView(epl2, icon, isGrid);
    vt.addEventListener('click', function() {
      isGrid = !isGrid;
      applyView(epl2, icon, isGrid);
      localStorage.setItem('anistream:epView', isGrid ? 'grid' : 'list');
    });
  }
}

function applyView(epl, icon, isGrid) {
  epl.classList.toggle('grid-mode', isGrid);
  if (icon) icon.className = isGrid ? 'fa-solid fa-list' : 'fa-solid fa-grip';
}

function epListClickHandler(total) {
  return function(e) {
    var card = e.target.closest('.wep-card');
    if (card) { watchEp=parseInt(card.dataset.ep); reloadPlayer(total); }
  };
}

/* ── Player reload ── */
function reloadPlayer(total) {
  var iframe = document.getElementById('playerIframe');
  if (iframe) iframe.src = getStreamUrl(watchId, watchEp, watchLang);

  document.title = 'Ep '+watchEp+' — '+getTitle(watchData)+' — AniStream';

  var numEl  = document.getElementById('epNumEl');
  var nameEl = document.getElementById('epNameEl');
  if (numEl) numEl.textContent = watchEp+'.';
  if (nameEl) {
    var cur = epImages[watchEp] || {};
    nameEl.textContent = cur.title || getTitle(watchData);
  }

  document.querySelectorAll('.wp-lbtn').forEach(function(b){
    b.classList.toggle('on', b.id===(watchLang+'Btn'));
  });
  document.querySelectorAll('.wep-card').forEach(function(el){
    el.classList.toggle('active', parseInt(el.dataset.ep)===watchEp);
  });

  /* rebuild prev/next */
  var acts = document.getElementById('wpActs');
  if (acts) {
    var nb = acts.querySelector('#nextEpBtn');
    var pb = acts.querySelector('#prevEpBtn');
    if (pb) pb.remove();
    if (nb) nb.remove();
    if (watchEp > 1) {
      var prevBtn = document.createElement('button');
      prevBtn.className='wp-act-nav'; prevBtn.id='prevEpBtn';
      prevBtn.innerHTML='<i class="fa-solid fa-backward-step"></i>';
      prevBtn.addEventListener('click', function(){ if(watchEp>1){watchEp--;reloadPlayer(total);} });
      acts.prepend(prevBtn);
    }
    if (!total || watchEp < total) {
      var nextBtn = document.createElement('button');
      nextBtn.className='wp-act-nav'; nextBtn.id='nextEpBtn';
      nextBtn.innerHTML='<i class="fa-solid fa-forward-step"></i>';
      nextBtn.addEventListener('click', function(){ if(!total||watchEp<total){watchEp++;reloadPlayer(total);} });
      if (acts.firstChild) acts.insertBefore(nextBtn, acts.firstChild.nextSibling);
      else acts.prepend(nextBtn);
    }
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
  if (!watchData || e.target.tagName==='INPUT') return;
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
