package io.findmycoach.app;

import android.content.ComponentName;
import android.content.pm.PackageManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Icône de l'app (campagnes Octobre Rose, Noël…) : active l'alias de lancement correspondant
 * (voir les <activity-alias> du manifeste). Les icônes sont livrées dans l'app.
 */
@CapacitorPlugin(name = "AppIcon")
public class AppIconPlugin extends Plugin {
    private static final String[] NAMES = { "default", "rose", "noel" };

    private ComponentName alias(String name) {
        String cls;
        switch (name) {
            case "rose": cls = "IconRose"; break;
            case "noel": cls = "IconNoel"; break;
            default: cls = "IconDefault"; break;
        }
        return new ComponentName(getContext().getPackageName(), "io.findmycoach.app." + cls);
    }

    private boolean isEnabled(PackageManager pm, String name) {
        int state = pm.getComponentEnabledSetting(alias(name));
        if (state == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT) return "default".equals(name);
        return state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED;
    }

    @PluginMethod
    public void getName(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        String current = "default";
        for (String n : NAMES) {
            if (isEnabled(pm, n)) { current = n; break; }
        }
        JSObject ret = new JSObject();
        ret.put("value", current);
        call.resolve(ret);
    }

    @PluginMethod
    public void change(PluginCall call) {
        String name = call.getString("name", "default");
        boolean known = false;
        for (String n : NAMES) if (n.equals(name)) known = true;
        if (!known) { call.reject("Icône inconnue : " + name); return; }
        try {
            PackageManager pm = getContext().getPackageManager();
            // Activer la nouvelle icône avant de désactiver les autres (il reste toujours une icône de lancement)
            pm.setComponentEnabledSetting(alias(name), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
            for (String n : NAMES) {
                if (!n.equals(name)) {
                    pm.setComponentEnabledSetting(alias(n), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
                }
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Changement d'icône impossible", e);
        }
    }
}
