import UIKit
import WebKit

final class ZeroNativeHostViewController: UIViewController {
    private let webView = WKWebView(frame: .zero)
    private var nativeApp: UnsafeMutableRawPointer?

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .systemBackground
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])

        nativeApp = zero_native_app_create()
        if let nativeApp {
            zero_native_app_start(nativeApp)
        }

        webView.loadHTMLString(Self.html, baseURL: nil)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        guard let nativeApp else { return }
        let scale = Float(view.window?.screen.scale ?? UIScreen.main.scale)
        zero_native_app_resize(nativeApp, Float(view.bounds.width), Float(view.bounds.height), scale, nil)
        zero_native_app_frame(nativeApp)
    }

    deinit {
        guard let nativeApp else { return }
        zero_native_app_stop(nativeApp)
        zero_native_app_destroy(nativeApp)
    }

    private static let html = """
    <!doctype html>
    <html>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <body style="font-family: -apple-system, system-ui; padding: 2rem;">
        <p style="letter-spacing: .08em; text-transform: uppercase;">zero-native</p>
        <h1>iOS Example</h1>
        <p>This WKWebView is hosted by Swift and linked to the zero-native C ABI.</p>
      </body>
    </html>
    """
}
