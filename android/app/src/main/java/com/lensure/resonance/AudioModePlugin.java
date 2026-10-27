package com.lensure.resonance;

import android.content.Context;
import android.media.AudioManager;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * v0.8b micfix: after an ohm listens to the mic, put the phone's audio back to normal media playback.
 * The WebView can leave AudioManager in MODE_IN_COMMUNICATION (voice-call routing / volume) after getUserMedia,
 * which kept the game's sound from coming back. Called from listen.js (RS.Listen.restore) on every end of listening.
 * Only undoes communication mode (never touches a real phone call, MODE_IN_CALL).
 */
@CapacitorPlugin(name = "AudioMode")
public class AudioModePlugin extends Plugin {
    @PluginMethod
    public void restore(PluginCall call) {
        JSObject r = new JSObject();
        try {
            AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            int was = am.getMode();
            r.put("was", was);
            boolean restored = false;
            if (was == AudioManager.MODE_IN_COMMUNICATION) {
                if (Build.VERSION.SDK_INT >= 31) {
                    try { am.clearCommunicationDevice(); } catch (Exception e) { }
                }
                am.setMode(AudioManager.MODE_NORMAL);
                restored = true;
            }
            r.put("restored", restored);
            r.put("mode", am.getMode());
        } catch (Exception e) {
            r.put("error", String.valueOf(e));
        }
        call.resolve(r);
    }
}
