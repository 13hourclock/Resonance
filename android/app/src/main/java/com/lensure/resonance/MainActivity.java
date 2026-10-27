package com.lensure.resonance;

import android.media.AudioManager;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AudioModePlugin.class); // v0.8b micfix: sound back after listening (AudioModePlugin)
        super.onCreate(savedInstanceState);
        setVolumeControlStream(AudioManager.STREAM_MUSIC); // volume keys always set the game's (media) volume
    }
}
