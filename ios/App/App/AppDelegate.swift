import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // Notifications push : transmet le jeton APNs (ou l'erreur) au plugin Capacitor PushNotifications.
    // Sans ces deux méthodes, l'iPhone ne s'enregistre jamais et ne reçoit aucune notification.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

}

// MARK: - Scène (obligatoire depuis iOS 27)
// Sans cycle de vie par scènes, iOS 27 ferme l'app dès le lancement
// (_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption). La fenêtre et Main.storyboard
// sont chargés par la scène (UIApplicationSceneManifest dans Info.plist) ; les liens ouverts
// (schéma io.findmycoach.app, liens universels) sont transmis au plugin Capacitor App comme avant.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        // App lancée par un lien : le transmettre au plugin (App.getLaunchUrl)
        if let url = connectionOptions.urlContexts.first?.url {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
        }
        if let activity = connectionOptions.userActivities.first {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url, options: [:])
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
}

// MARK: - Icône de l'app (campagnes Octobre Rose, Noël…)
// Icônes livrées dans Assets.xcassets (AppIcon-Rose, AppIcon-Noel) et déclarées par le réglage
// ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES. Choix piloté depuis l'admin (src/lib/campaign.ts).
@objc(AppIconPlugin)
public class AppIconPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppIconPlugin"
    public let jsName = "AppIcon"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getName", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "change", returnType: CAPPluginReturnPromise)
    ]
    private let iconNames: [String: String?] = ["default": nil, "rose": "AppIcon-Rose", "noel": "AppIcon-Noel"]

    @objc func getName(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let current = UIApplication.shared.alternateIconName
            let name = self.iconNames.first(where: { $0.value == current })?.key ?? "default"
            call.resolve(["value": name])
        }
    }

    @objc func change(_ call: CAPPluginCall) {
        let name = call.getString("name") ?? "default"
        guard let target = iconNames[name] else {
            call.reject("Icône inconnue : \(name)")
            return
        }
        DispatchQueue.main.async {
            guard UIApplication.shared.supportsAlternateIcons else {
                call.reject("Icônes alternatives non disponibles")
                return
            }
            if UIApplication.shared.alternateIconName == target {
                call.resolve()
                return
            }
            UIApplication.shared.setAlternateIconName(target) { error in
                if let error = error { call.reject(error.localizedDescription) } else { call.resolve() }
            }
        }
    }
}

/// Contrôleur principal : enregistre les plugins propres à l'app.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppIconPlugin())
    }
}
