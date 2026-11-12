package com.executor.komiktools;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(FileSaverPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
