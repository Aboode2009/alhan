package com.alhaan.music;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

/** Resolves a YouTube video to an audio stream without opening a browser. */
public final class PipedStreamResolver {
    private static final List<String> INSTANCES = Arrays.asList(
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.tokhmi.xyz",
        "https://pipedapi.moomoo.me",
        "https://pipedapi.syncpundit.io"
    );

    private PipedStreamResolver() {}

    public static String resolveAudio(String videoId) throws Exception {
        Exception last = null;
        for (String base : INSTANCES) {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(base + "/streams/" + videoId);
                connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(12000);
                connection.setRequestProperty("User-Agent", "Alhan/1.0 Android");
                connection.setRequestProperty("Accept", "application/json");
                int code = connection.getResponseCode();
                if (code < 200 || code >= 300) throw new IllegalStateException("Piped HTTP " + code);
                String json = read(connection.getInputStream());
                JSONObject root = new JSONObject(json);
                JSONArray streams = root.optJSONArray("audioStreams");
                if (streams == null || streams.length() == 0) throw new IllegalStateException("No audio streams");
                JSONObject best = null;
                int bestBitrate = -1;
                for (int i = 0; i < streams.length(); i++) {
                    JSONObject stream = streams.getJSONObject(i);
                    if (stream.optBoolean("videoOnly", false)) continue;
                    String mime = stream.optString("mimeType", "");
                    String format = stream.optString("format", "");
                    String streamUrl = stream.optString("url", "");
                    if (streamUrl.isEmpty()) continue;
                    if (!mime.startsWith("audio/") && !"M4A".equalsIgnoreCase(format) && !"WEBM".equalsIgnoreCase(format)) continue;
                    int bitrate = stream.optInt("bitrate", 0);
                    if (bitrate > bestBitrate) { bestBitrate = bitrate; best = stream; }
                }
                if (best == null) throw new IllegalStateException("No compatible audio stream");
                return best.getString("url");
            } catch (Exception e) {
                last = e;
            } finally {
                if (connection != null) connection.disconnect();
            }
        }
        throw new IllegalStateException("Unable to resolve audio from available stream providers", last);
    }

    private static String read(InputStream input) throws Exception {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(input))) {
            StringBuilder out = new StringBuilder(); String line;
            while ((line = reader.readLine()) != null) out.append(line);
            return out.toString();
        }
    }
}
