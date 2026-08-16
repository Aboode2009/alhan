package com.alhaan.music;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Environment;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.util.ArrayList;

@CapacitorPlugin(name = "YoutubeDownloader")
public class YoutubeDownloaderPlugin extends Plugin {
    private BroadcastReceiver receiver;
    private boolean receiverRegistered = false;

    private synchronized void ensureReceiverRegistered() {
        if (receiverRegistered || getContext() == null) return;
        receiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                String action = intent.getAction(); if (action == null) return;
                JSObject event = new JSObject(); event.put("taskId", intent.getStringExtra("taskId")); event.put("videoId", intent.getStringExtra("videoId"));
                if (AlhanDownloadService.ACTION_PROGRESS.equals(action)) { event.put("progress", intent.getIntExtra("progress", 0)); notifyListeners("downloadProgress", event); }
                else if (AlhanDownloadService.ACTION_COMPLETE.equals(action)) { event.put("localPath", intent.getStringExtra("localPath")); event.put("size", intent.getLongExtra("size", 0)); notifyListeners("downloadComplete", event); }
                else if (AlhanDownloadService.ACTION_ERROR.equals(action)) { event.put("message", intent.getStringExtra("message")); notifyListeners("downloadError", event); }
            }
        };
        IntentFilter filter = new IntentFilter(); filter.addAction(AlhanDownloadService.ACTION_PROGRESS); filter.addAction(AlhanDownloadService.ACTION_COMPLETE); filter.addAction(AlhanDownloadService.ACTION_ERROR);
        if (Build.VERSION.SDK_INT >= 33) getContext().registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED); else getContext().registerReceiver(receiver, filter);
        receiverRegistered = true;
    }

    private File getDownloadDirectory() { File base = getContext().getExternalFilesDir(Environment.DIRECTORY_MUSIC); File directory = new File(base, "Alhan"); if (!directory.exists()) directory.mkdirs(); return directory; }

    @PluginMethod public void download(PluginCall call) {
        ensureReceiverRegistered();
        String videoId = call.getString("videoId"); String title = call.getString("title", "Alhan");
        if (videoId == null || videoId.trim().isEmpty()) { call.reject("videoId is required"); return; }
        String taskId = java.util.UUID.randomUUID().toString();
        Intent intent = new Intent(getContext(), AlhanDownloadService.class); intent.putExtra("taskId", taskId); intent.putExtra("videoId", videoId); intent.putExtra("title", title);
        try { if (Build.VERSION.SDK_INT >= 26) getContext().startForegroundService(intent); else getContext().startService(intent); call.resolve(new JSObject().put("taskId", taskId)); }
        catch (Exception e) { call.reject(e.getMessage() == null ? "Could not start downloader" : e.getMessage()); }
    }

    @PluginMethod public void cancel(PluginCall call) { getContext().stopService(new Intent(getContext(), AlhanDownloadService.class)); call.resolve(); }

    @PluginMethod public void getDownloaded(PluginCall call) {
        File[] files = getDownloadDirectory().listFiles(); ArrayList<JSObject> songs = new ArrayList<>();
        if (files != null) for (File file : files) if (file.isFile()) { String name=file.getName(); int dot=name.lastIndexOf('.'); String id=dot>0?name.substring(0,dot):name; JSObject song=new JSObject(); song.put("id",id); song.put("localPath",file.getAbsolutePath()); song.put("downloadedAt",file.lastModified()); song.put("size",file.length()); songs.add(song); }
        call.resolve(new JSObject().put("songs", songs));
    }
    @PluginMethod public void getLocalPath(PluginCall call) { String videoId=call.getString("videoId"); if(videoId==null){call.reject("videoId is required");return;} File[] files=getDownloadDirectory().listFiles(); String path=null; if(files!=null) for(File f:files) if(f.isFile()&&f.getName().startsWith(videoId+".")){path=f.getAbsolutePath();break;} call.resolve(new JSObject().put("localPath",path)); }
    @PluginMethod public void delete(PluginCall call) { String videoId=call.getString("videoId"); if(videoId==null){call.reject("videoId is required");return;} File[] files=getDownloadDirectory().listFiles(); if(files!=null) for(File f:files) if(f.isFile()&&f.getName().startsWith(videoId+".")) f.delete(); call.resolve(); }
    @PluginMethod public void getStorageUsage(PluginCall call) { long total=0; File[] files=getDownloadDirectory().listFiles(); if(files!=null) for(File f:files) if(f.isFile()) total+=f.length(); call.resolve(new JSObject().put("bytes",total)); }

    @Override protected void handleOnDestroy() { try { if(receiverRegistered && receiver!=null) getContext().unregisterReceiver(receiver); } catch(Exception ignored) {} receiverRegistered=false; receiver=null; super.handleOnDestroy(); }
}
