// Supabase Edge Function: youtube-search
// Searches YouTube music videos using the YouTube Data API v3.
// Secret: YOUTUBE_API_KEY (set via `supabase secrets set`)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!apiKey) throw new Error('YouTube API key not configured on the server');

    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return Response.json({ error: 'Missing query' }, { status: 400, headers: corsHeaders });
    }
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('videoCategoryId', '10'); // Music
    url.searchParams.set('maxResults', '8');
    url.searchParams.set('q', query);
    url.searchParams.set('key', apiKey);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube search failed: ${res.status}`);
    const json = await res.json();
    const results = (json.items ?? [])
      .filter((item: any) => item.id?.videoId)
      .map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet?.title ?? '',
        channel: item.snippet?.channelTitle ?? '',
        thumbnailUrl: item.snippet?.thumbnails?.default?.url ?? null,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      }));
    return Response.json({ results }, { headers: corsHeaders });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500, headers: corsHeaders });
  }
});
