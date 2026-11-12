package com.executor.komiktools;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.OutputStream;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(name = "FileSaver")
public class FileSaverPlugin extends Plugin {

    private final ConcurrentHashMap<String, OutputStream> openFiles = new ConcurrentHashMap<>();

    @PluginMethod
    public void createFile(PluginCall call) {
        String fileName = call.getString("fileName");
        String mimeType = call.getString("mimeType");
        if (fileName == null || fileName.trim().isEmpty() || mimeType == null || mimeType.trim().isEmpty()) {
            call.reject("A file name and MIME type are required.");
            return;
        }

        String safeFileName = fileName.replace('\\', '/');
        safeFileName = safeFileName.substring(safeFileName.lastIndexOf('/') + 1);
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, safeFileName);
        intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        startActivityForResult(call, intent, "saveFileResult");
    }

    @ActivityCallback
    private void saveFileResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            JSObject response = new JSObject();
            response.put("saved", false);
            call.resolve(response);
            return;
        }

        Uri uri = result.getData().getData();
        if (uri == null) {
            call.reject("No save location was selected.");
            return;
        }

        try {
            OutputStream output = getContext().getContentResolver().openOutputStream(uri, "w");
            if (output == null) {
                call.reject("The selected save location could not be opened.");
                return;
            }
            String sessionId = UUID.randomUUID().toString();
            openFiles.put(sessionId, output);
            JSObject response = new JSObject();
            response.put("sessionId", sessionId);
            call.resolve(response);
        } catch (IOException error) {
            call.reject("The selected save location could not be opened.", error);
        }
    }

    @PluginMethod
    public void writeChunk(PluginCall call) {
        String sessionId = call.getString("sessionId");
        String data = call.getString("data");
        OutputStream output = sessionId == null ? null : openFiles.get(sessionId);
        if (output == null || data == null) {
            call.reject("The save operation is no longer available.");
            return;
        }

        try {
            output.write(Base64.decode(data, Base64.DEFAULT));
            call.resolve();
        } catch (IllegalArgumentException | IOException error) {
            call.reject("The file data could not be written.", error);
        }
    }

    @PluginMethod
    public void finishFile(PluginCall call) {
        closeFile(call, true);
    }

    @PluginMethod
    public void cancelFile(PluginCall call) {
        closeFile(call, false);
    }

    private void closeFile(PluginCall call, boolean resolveOnSuccess) {
        String sessionId = call.getString("sessionId");
        OutputStream output = sessionId == null ? null : openFiles.remove(sessionId);
        if (output == null) {
            if (resolveOnSuccess) call.reject("The save operation is no longer available.");
            else call.resolve();
            return;
        }

        try {
            output.close();
            call.resolve();
        } catch (IOException error) {
            call.reject("The file could not be closed.", error);
        }
    }
}
