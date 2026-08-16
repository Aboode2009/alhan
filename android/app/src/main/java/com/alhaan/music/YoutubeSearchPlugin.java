package com.alhaan.music;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "YoutubeSearch")
public class YoutubeSearchPlugin extends Plugin {
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private static final List<String> INSTANCES = Arrays.asList(
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.tokhmi.xyz",
        "https://pipedapi.moomoo.me",
        "https://pipedapi.syncpundit.io"
    );

    @PluginMethod
    public void search(PluginCall call) {
        String query = call.getString("query", "").trim();
        if (query.isEmpty()) { call.resolve(new JSObject().put("songs", new JSArray())); return; }
        executor.execute(() -> {
            Exception last = null;
            for (String base : INSTANCES) {
                HttpURLConnection connection = null;
                try {
                    String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8.name());
                    URL url = new URL(base + "/search?q=" + encoded + "&filter=music");
                    connection = (HttpURLConnection) url.openConnection();
                    connection.setConnectTimeout(7000); connection.setReadTimeout(10000);
                    connection.setRequestProperty("User-Agent", "Alhan/1.0 Android");
                    connection.setRequestProperty("Accept", "application/json");
                    int code = connection.getResponseCode();
                    if (code < 200 || code >= 300) throw new IllegalStateException("Search HTTP " + code);
                    String json = read(connection);
                    JSONObject root = new JSONObject(json);
                    JSONArray items = root.optJSONArray("items");
                    JSArray songs = new JSArray();
                    if (items != null) for (int i = 0; i < items.length() && songs.length() < 25; i++) {
                        JSONObject item = items.optJSONObject(i); if (item == null || !"stream".equals(item.optString("type"))) continue;
                        String path = item.optString("url", ""); String id = extractId(path); if (id.isEmpty()) continue;
                        JSObject song = new JSObject(); song.put("id", id); song.put("title", decode(item.optString("title", ""))); song.put("artist", decode(item.optString("uploaderName", ""))); song.put("thumbnail", item.optString("thumbnail", "")); song.put("duration", formatSeconds(item.optLong("duration", 0))); songs.put(song);
                    }
                    if (songs.length() > 0) { resolveOnUi(call, new JSObject().put("songs", songs)); return; }
                    throw new IllegalStateException("No music results");
                } catch (Exception e) { last = e; } finally { if (connection != null) connection.disconnect(); }
            }
            final String message = last == null ? "Search unavailable" : last.getMessage();
            rejectOnUi(call, message == null ? "Search unavailable" : message);
        });
    }

    private void resolveOnUi(PluginCall call, JSObject result) { getActivity().runOnUiThread(() -> call.resolve(result)); }
    private void rejectOnUi(PluginCall call, String message) { getActivity().runOnUiThread(() -> call.reject(message)); }
    private static String read(HttpURLConnection c) throws Exception { try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream()))) { StringBuilder s = new StringBuilder(); String line; while ((line=r.readLine())!=null) s.append(line); return s.toString(); } }
    private static String extractId(String url) { java.util.regex.Matcher m = java.util.regex.Pattern.compile("[?&]v=([^&]+)").matcher(url); return m.find() ? m.group(1) : ""; }
    private static String formatSeconds(long total) { if (total < 0) total=0; long sec=total%60, min=(total/60)%60, hr=total/3600; return hr>0 ? hr+":"+String.format("%02d:%02d",min,sec) : min+":"+String.format("%02d",sec); }
    private static String decode(String value) { return value.replace("&amp;", "&").replace("&quot;", "\"").replace("&#39;", "'").replace("&lt;", "<").replace("&gt;", ">"); }
    @Override protected void handleOnDestroy() { executor.shutdownNow(); super.handleOnDestroy(); }
}
