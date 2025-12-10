import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, title } = await req.json();
    
    console.log('Generating download link for:', videoId);

    // Return the download URL using a third-party service
    // Note: For production, you might want to use a more reliable service
    const downloadUrl = `https://www.y2mate.com/youtube/${videoId}`;
    
    return new Response(
      JSON.stringify({ 
        downloadUrl,
        message: 'سيتم فتح صفحة التحميل في نافذة جديدة'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in download-song function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
