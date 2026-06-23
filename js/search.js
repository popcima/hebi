/* Search page — no ES modules */
var params = new URLSearchParams(location.search);
var currentQuery = params.get('q') || '';
var currentGenre = params.get('genre') || '';
var currentPage = 1;
var searchLoading = false;

var searchInput = document.getElementById('searchInput');
var resultsGrid = document.getElementById('resultsGrid');
var resultsHeader = document.getElementById('resultsHeader');
var loadMoreWrap = document.getElementById('loadMoreWrap');
var loadMoreBtn = document.getElementById('loadMoreBtn');

searchInput.value = currentQuery;
document.title = currentQuery ? '"' + currentQuery + '" — AniStream' : 'Browse Anime — AniStream';

function escH(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function searchAnimeCard(media) {
  var title = getTitle(media);
  var score = formatScore(media.averageScore);
  var img = media.coverImage.large || media.coverImage.medium;
  var ep = media.episodes ? media.episodes + ' eps' : '';
  return '<div class="anime-card fade-in" onclick="location.href=\'anime.html?id=' + media.id + '\'">' +
    '<div class="card-img-wrap">' +
      '<img src="' + escH(img) + '" alt="' + escH(title) + '" loading="lazy" />' +
      '<div class="card-score">★ ' + score + '</div>' +
      (ep ? '<div class="card-ep-badge">' + ep + '</div>' : '') +
    '</div>' +
    '<div class="card-info">' +
      '<div class="card-title">' + escH(title) + '</div>' +
      '<div class="card-tags">' +
        (media.genres || []).slice(0, 2).map(function(g) { return '<span class="card-tag">' + g + '</span>'; }).join('') +
      '</div>' +
    '</div>' +
  '</div>';
}

function buildGenreChips() {
  var el = document.getElementById('genreChips');
  el.innerHTML = GENRES.map(function(g) {
    return '<div class="genre-chip' + (g === currentGenre ? ' active' : '') + '" data-genre="' + escH(g) + '">' + g + '</div>';
  }).join('');
  el.querySelectorAll('.genre-chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      currentGenre = chip.dataset.genre === currentGenre ? '' : chip.dataset.genre;
      currentPage = 1;
      resultsGrid.innerHTML = '';
      buildGenreChips();
      doSearch(true);
    });
  });
}

function setHeader(total, query, genre) {
  var text = '';
  if (total !== null && total !== undefined) {
    text = 'Found <span>' + (total || 0).toLocaleString() + '</span> results';
    if (query) text += ' for "<span>' + escH(query) + '</span>"';
    if (genre) text += ' in <span>' + escH(genre) + '</span>';
  }
  resultsHeader.innerHTML = text;
}

async function doSearch(reset) {
  if (searchLoading) return;
  searchLoading = true;
  if (reset) {
    currentPage = 1;
    resultsGrid.innerHTML = '<div class="loading-wrap" style="grid-column:1/-1"><div class="spinner"></div></div>';
    loadMoreWrap.hidden = true;
  } else {
    loadMoreBtn.textContent = 'Loading...';
    loadMoreBtn.disabled = true;
  }

  try {
    var page;
    if (!currentQuery && currentGenre) {
      page = await getByGenre(currentGenre, currentPage, 24);
    } else {
      page = await searchAnime(currentQuery || null, currentGenre ? [currentGenre] : [], currentPage, 24);
    }

    var items = page.media || [];
    var hasNext = page.pageInfo && page.pageInfo.hasNextPage;

    if (reset) {
      setHeader(page.pageInfo && page.pageInfo.total, currentQuery, currentGenre);
      resultsGrid.innerHTML = items.length
        ? items.map(searchAnimeCard).join('')
        : '<div class="error-wrap" style="grid-column:1/-1"><h3>No results found</h3><p>Try a different title or genre.</p></div>';
    } else {
      resultsGrid.insertAdjacentHTML('beforeend', items.map(searchAnimeCard).join(''));
    }

    loadMoreWrap.hidden = !hasNext;
    loadMoreBtn.textContent = 'Load More';
    loadMoreBtn.disabled = false;
    currentPage++;
  } catch(err) {
    console.error(err);
    if (reset) resultsGrid.innerHTML = '<div class="error-wrap" style="grid-column:1/-1"><h3>Error</h3><p>' + err.message + '</p></div>';
  } finally {
    searchLoading = false;
  }
}

var debounceTimer;
searchInput.addEventListener('input', function() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(function() {
    currentQuery = searchInput.value.trim();
    history.replaceState({}, '', currentQuery ? '?q=' + encodeURIComponent(currentQuery) : '?');
    doSearch(true);
  }, 400);
});

loadMoreBtn && loadMoreBtn.addEventListener('click', function() { doSearch(false); });

buildGenreChips();
doSearch(true);
