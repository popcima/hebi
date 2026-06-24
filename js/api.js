/* =====================================================
   AniStream — AniList GraphQL API + MegaPlay streaming
   ALL queries enforce type:ANIME, isAdult:false
   Streaming always uses /stream/ani/{anilist-id}/{ep}/{lang}
   ===================================================== */

const ANILIST_URL = 'https://graphql.anilist.co';
const MEGAPLAY_URL = 'https://megaplay.buzz/stream/ani';

/* ---------- core fetch ---------- */
async function anilistFetch(query, variables) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query: query, variables: variables || {} }),
  });
  if (!res.ok) throw new Error('AniList HTTP ' + res.status);
  const json = await res.json();
  if (json.errors && json.errors.length) throw new Error(json.errors[0].message);
  return json.data;
}

/* ---------- shared fields ---------- */
const MEDIA_FRAGMENT = `
  id
  type
  format
  status
  isAdult
  title { romaji english native }
  coverImage { extraLarge large medium color }
  bannerImage
  description(asHtml: false)
  genres
  episodes
  duration
  averageScore
  popularity
  season
  seasonYear
  startDate { year month day }
  endDate { year month day }
  studios(isMain: true) { nodes { name } }
  nextAiringEpisode { episode timeUntilAiring airingAt }
`;

/* ---------- shared page wrapper ---------- */
function buildMediaQuery(filters, page, perPage) {
  return `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        media(
          type: ANIME
          isAdult: false
          ${filters}
        ) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `;
}

/* =====================================================
   PUBLIC FUNCTIONS
   ===================================================== */

async function getTrending(page, perPage) {
  const q = buildMediaQuery('sort: TRENDING_DESC', page, perPage);
  const data = await anilistFetch(q, { page: page || 1, perPage: perPage || 20 });
  return data.Page.media;
}

async function getNewest(page, perPage) {
  const q = buildMediaQuery('sort: START_DATE_DESC', page, perPage);
  const data = await anilistFetch(q, { page: page || 1, perPage: perPage || 20 });
  return data.Page.media;
}

async function getPopular(page, perPage) {
  const q = buildMediaQuery('sort: POPULARITY_DESC', page, perPage);
  const data = await anilistFetch(q, { page: page || 1, perPage: perPage || 20 });
  return data.Page.media;
}

async function getTopRated(page, perPage) {
  const q = buildMediaQuery('sort: SCORE_DESC averageScore_greater: 70', page, perPage);
  const data = await anilistFetch(q, { page: page || 1, perPage: perPage || 20 });
  return data.Page.media;
}

async function getAiring(page, perPage) {
  const q = buildMediaQuery('status: RELEASING sort: POPULARITY_DESC', page, perPage);
  const data = await anilistFetch(q, { page: page || 1, perPage: perPage || 20 });
  return data.Page.media;
}

async function getFinished(page, perPage) {
  const q = buildMediaQuery('status: FINISHED sort: END_DATE_DESC', page, perPage);
  const data = await anilistFetch(q, { page: page || 1, perPage: perPage || 10 });
  return data.Page.media;
}

async function getMovies(page, perPage) {
  const q = buildMediaQuery('format: MOVIE sort: POPULARITY_DESC', page, perPage);
  const data = await anilistFetch(q, { page: page || 1, perPage: perPage || 10 });
  return data.Page.media;
}

async function getUpcoming(page, perPage) {
  const q = buildMediaQuery('status: NOT_YET_RELEASED sort: POPULARITY_DESC', page, perPage);
  const data = await anilistFetch(q, { page: page || 1, perPage: perPage || 8 });
  return data.Page.media;
}

/* search — type:ANIME always enforced; sort falls back to POPULARITY_DESC when no search term */
async function searchAnime(search, genres, page, perPage) {
  const hasSearch = search && search.trim();
  const query = `
    query ($search: String, $genres: [String], $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        media(
          type: ANIME
          isAdult: false
          search: $search
          genre_in: $genres
          sort: ${hasSearch ? 'SEARCH_MATCH' : 'POPULARITY_DESC'}
        ) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `;
  const variables = { page: page || 1, perPage: perPage || 24 };
  if (hasSearch) variables.search = search.trim();
  if (genres && genres.length > 0) variables.genres = genres;
  const data = await anilistFetch(query, variables);
  return data.Page;
}

/* browse by genre — type:ANIME always enforced */
async function getByGenre(genre, page, perPage) {
  const query = `
    query ($genre: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        media(
          type: ANIME
          isAdult: false
          genre: $genre
          sort: POPULARITY_DESC
        ) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `;
  const data = await anilistFetch(query, { genre: genre, page: page || 1, perPage: perPage || 24 });
  return data.Page;
}

/* single anime — type:ANIME enforced, never returns manga */
async function getAnimeById(id) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_FRAGMENT}
        tags { name rank isMediaSpoiler }
        airingSchedule(notYetAired: false) {
          nodes { episode airingAt }
        }
        streamingEpisodes { title thumbnail site url }
        externalLinks { site url type }
        characters(sort: ROLE, perPage: 8) {
          nodes { name { full } image { medium } }
        }
        relations {
          edges {
            relationType(version: 2)
            node { id title { romaji } coverImage { medium } type format }
          }
        }
        recommendations(perPage: 8) {
          nodes {
            mediaRecommendation { id title { romaji english } coverImage { large } averageScore type }
          }
        }
      }
    }
  `;
  const data = await anilistFetch(query, { id: Number(id) });
  if (!data.Media) throw new Error('Anime not found (ID: ' + id + ')');
  return data.Media;
}

/* airing schedule — filtered to anime only via airingSchedules endpoint
   (only anime air on TV so this is inherently anime-only,
    but we still double-check type === ANIME in the result) */
async function getDaySchedule(dayOffset) {
  const now = new Date();
  const day = new Date(now);
  day.setDate(day.getDate() + (dayOffset || 0));
  day.setHours(0, 0, 0, 0);
  const startUnix = Math.floor(day.getTime() / 1000);
  const endUnix = startUnix + 86399;

  const query = `
    query ($gt: Int, $lt: Int) {
      Page(perPage: 50) {
        airingSchedules(
          airingAt_greater: $gt
          airingAt_lesser: $lt
          sort: TIME
        ) {
          id
          airingAt
          episode
          media {
            id
            type
            title { romaji english }
            coverImage { medium }
            averageScore
            isAdult
          }
        }
      }
    }
  `;
  const data = await anilistFetch(query, { gt: startUnix, lt: endUnix });
  return (data.Page.airingSchedules || []).filter(function (s) {
    return s.media && s.media.type === 'ANIME' && !s.media.isAdult;
  });
}

/* =====================================================
   STREAMING — always AniList ID + episode number
   URL format: megaplay.buzz/stream/ani/{anilist-id}/{ep}/{sub|dub}
   ===================================================== */
function getStreamUrl(anilistId, episode, lang) {
  return MEGAPLAY_URL + '/' + anilistId + '/' + episode + '/' + (lang || 'sub');
}

/* =====================================================
   HELPERS
   ===================================================== */
function getTitle(media) {
  return (media.title && (media.title.english || media.title.romaji || media.title.native)) || 'Unknown';
}

function formatScore(score) {
  if (!score) return 'N/A';
  return (score / 10).toFixed(1);
}

function formatStatus(status) {
  const map = {
    RELEASING: 'Airing',
    FINISHED: 'Finished',
    NOT_YET_RELEASED: 'Upcoming',
    CANCELLED: 'Cancelled',
    HIATUS: 'On Hiatus',
  };
  return map[status] || (status || 'Unknown');
}

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
  'Horror', 'Mecha', 'Music', 'Mystery', 'Psychological',
  'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
];
