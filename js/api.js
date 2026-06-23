/* AniList + MegaPlay API — plain global script (works on file:// and http://) */
const ANILIST_API = 'https://graphql.anilist.co';
const MEGAPLAY_BASE = 'https://megaplay.buzz/stream/ani';

async function queryAniList(query, variables) {
  const res = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables: variables || {} }),
  });
  if (!res.ok) throw new Error('AniList error: ' + res.status);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

const MEDIA_FIELDS = `
  id title { romaji english native }
  coverImage { extraLarge large medium color }
  bannerImage
  description(asHtml: false)
  genres status episodes duration
  averageScore popularity
  season seasonYear format
  studios(isMain: true) { nodes { name } }
  nextAiringEpisode { episode timeUntilAiring }
`;

async function getTrending(page, perPage) {
  const data = await queryAniList(
    'query($p:Int,$pp:Int){Page(page:$p,perPage:$pp){media(sort:TRENDING_DESC,type:ANIME,isAdult:false){' + MEDIA_FIELDS + '}}}',
    { p: page || 1, pp: perPage || 20 }
  );
  return data.Page.media;
}

async function getNewest(page, perPage) {
  const data = await queryAniList(
    'query($p:Int,$pp:Int){Page(page:$p,perPage:$pp){media(sort:START_DATE_DESC,type:ANIME,isAdult:false){' + MEDIA_FIELDS + '}}}',
    { p: page || 1, pp: perPage || 20 }
  );
  return data.Page.media;
}

async function getPopular(page, perPage) {
  const data = await queryAniList(
    'query($p:Int,$pp:Int){Page(page:$p,perPage:$pp){media(sort:POPULARITY_DESC,type:ANIME,isAdult:false){' + MEDIA_FIELDS + '}}}',
    { p: page || 1, pp: perPage || 20 }
  );
  return data.Page.media;
}

async function getTopRated(page, perPage) {
  const data = await queryAniList(
    'query($p:Int,$pp:Int){Page(page:$p,perPage:$pp){media(sort:SCORE_DESC,type:ANIME,isAdult:false,averageScore_greater:70){' + MEDIA_FIELDS + '}}}',
    { p: page || 1, pp: perPage || 20 }
  );
  return data.Page.media;
}

async function getAiring(page, perPage) {
  const data = await queryAniList(
    'query($p:Int,$pp:Int){Page(page:$p,perPage:$pp){media(status:RELEASING,sort:POPULARITY_DESC,type:ANIME,isAdult:false){' + MEDIA_FIELDS + '}}}',
    { p: page || 1, pp: perPage || 20 }
  );
  return data.Page.media;
}

async function getFinished(page, perPage) {
  const data = await queryAniList(
    'query($p:Int,$pp:Int){Page(page:$p,perPage:$pp){media(status:FINISHED,sort:END_DATE_DESC,type:ANIME,isAdult:false){' + MEDIA_FIELDS + '}}}',
    { p: page || 1, pp: perPage || 10 }
  );
  return data.Page.media;
}

async function getMovies(page, perPage) {
  const data = await queryAniList(
    'query($p:Int,$pp:Int){Page(page:$p,perPage:$pp){media(format:MOVIE,sort:POPULARITY_DESC,type:ANIME,isAdult:false){' + MEDIA_FIELDS + '}}}',
    { p: page || 1, pp: perPage || 10 }
  );
  return data.Page.media;
}

async function getUpcoming(page, perPage) {
  const data = await queryAniList(
    'query($p:Int,$pp:Int){Page(page:$p,perPage:$pp){media(status:NOT_YET_RELEASED,sort:POPULARITY_DESC,type:ANIME,isAdult:false){' + MEDIA_FIELDS + '}}}',
    { p: page || 1, pp: perPage || 8 }
  );
  return data.Page.media;
}

async function searchAnime(search, genres, page, perPage) {
  const query = `
    query($search:String,$genres:[String],$p:Int,$pp:Int){
      Page(page:$p,perPage:$pp){
        pageInfo{total currentPage lastPage hasNextPage}
        media(search:$search,genre_in:$genres,type:ANIME,isAdult:false,sort:SEARCH_MATCH){${MEDIA_FIELDS}}
      }
    }`;
  const variables = { p: page || 1, pp: perPage || 24 };
  if (search) variables.search = search;
  if (genres && genres.length) variables.genres = genres;
  const data = await queryAniList(query, variables);
  return data.Page;
}

async function getByGenre(genre, page, perPage) {
  const data = await queryAniList(
    'query($genre:String,$p:Int,$pp:Int){Page(page:$p,perPage:$pp){pageInfo{total currentPage lastPage hasNextPage}media(genre:$genre,sort:POPULARITY_DESC,type:ANIME,isAdult:false){' + MEDIA_FIELDS + '}}}',
    { genre: genre, p: page || 1, pp: perPage || 24 }
  );
  return data.Page;
}

async function getAnimeById(id) {
  const data = await queryAniList(`
    query($id:Int){Media(id:$id,type:ANIME){
      ${MEDIA_FIELDS}
      tags{name rank isMediaSpoiler}
      characters(sort:ROLE,perPage:8){nodes{name{full}image{medium}}}
      relations{edges{relationType(version:2)node{id title{romaji}coverImage{medium}type format}}}
      recommendations(perPage:6){nodes{mediaRecommendation{id title{romaji}coverImage{large}averageScore}}}
    }}
  `, { id: Number(id) });
  return data.Media;
}

async function getDaySchedule(dayOffset) {
  const now = new Date();
  const day = new Date(now);
  day.setDate(day.getDate() + (dayOffset || 0));
  day.setHours(0, 0, 0, 0);
  const start = Math.floor(day.getTime() / 1000);
  const end = start + 86399;

  const data = await queryAniList(
    'query($gt:Int,$lt:Int){Page(perPage:50){airingSchedules(airingAt_greater:$gt,airingAt_lesser:$lt,sort:TIME){id airingAt episode media{id title{romaji english}coverImage{medium}averageScore isAdult}}}}',
    { gt: start, lt: end }
  );
  return (data.Page.airingSchedules || []).filter(function(s) { return !s.media || !s.media.isAdult; });
}

function getStreamUrl(anilistId, episode, lang) {
  return MEGAPLAY_BASE + '/' + anilistId + '/' + episode + '/' + (lang || 'sub');
}

function getTitle(media) {
  return media.title.english || media.title.romaji || media.title.native || 'Unknown';
}

function formatScore(score) {
  if (!score) return 'N/A';
  return (score / 10).toFixed(1);
}

function formatStatus(status) {
  var map = {
    RELEASING: 'Airing', FINISHED: 'Finished',
    NOT_YET_RELEASED: 'Upcoming', CANCELLED: 'Cancelled', HIATUS: 'On Hiatus',
  };
  return map[status] || status;
}

var GENRES = [
  'Action','Adventure','Comedy','Drama','Fantasy',
  'Horror','Mecha','Music','Mystery','Psychological',
  'Romance','Sci-Fi','Slice of Life','Sports','Supernatural','Thriller',
];
