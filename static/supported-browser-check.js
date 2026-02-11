// IMPORTANT. This file must be imported as separate entry point
// and it cannot use any modern JS syntax (ES5 only).

(function () {
	var userAgent = navigator.userAgent || navigator.vendor || window.opera;
	var isInstagram = userAgent.indexOf('Instagram') > -1;
	var isFacebook = userAgent.indexOf('FBAN') > -1 || userAgent.indexOf('FBAV') > -1;
	var isLine = userAgent.indexOf('Line') > -1;
	var isLinkedin = userAgent.indexOf('LinkedIn') > -1;
	var isWebView = isInstagram || isFacebook || isLine || isLinkedin;

	var isSupportedBrowser =
		'noModule' in HTMLScriptElement.prototype &&
		navigator.locks &&
		'timeout' in AbortSignal &&
		window.CSS &&
		window.CSS.supports &&
		window.CSS.supports('color: color-mix(in oklab, black, black)') &&
		// Container queries
		'container' in document.documentElement.style &&
		navigator.serviceWorker;

	// specific check for iOS browsers that are not Safari or Chrome (often just WebViews)
	// mostly to catch other in-app browsers
	var isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;

	if (isWebView || !isSupportedBrowser) {
		// Stop the app from initializing further if possible
		var app = document.getElementById('app');
		if (app) app.style.display = 'none';

		// Create a robust overlay with inline styles to survive without Tailwind
		var overlay = document.createElement('div');
		overlay.style.position = 'fixed';
		overlay.style.top = '0';
		overlay.style.left = '0';
		overlay.style.width = '100%';
		overlay.style.height = '100%';
		overlay.style.backgroundColor = '#1a1a1a';
		overlay.style.zIndex = '999999';
		overlay.style.display = 'flex';
		overlay.style.flexDirection = 'column';
		overlay.style.alignItems = 'center';
		overlay.style.justifyContent = 'center';
		overlay.style.padding = '20px';
		overlay.style.boxSizing = 'border-box';
		overlay.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
		overlay.style.color = '#ffffff';
		overlay.style.textAlign = 'center';

		var title = document.createElement('h2');
		title.textContent = isWebView ? 'External Browser Required' : 'Browser Not Supported';
		title.style.marginBottom = '16px';
		title.style.fontSize = '24px';
		overlay.appendChild(title);

		var message = document.createElement('p');
		message.textContent = isWebView
			? 'This app uses advanced features (Web Locks, File System) that are blocked by Instagram/Facebook/In-App browsers.'
			: 'This app requires a modern browser with Web Locks and Service Worker support.';
		message.style.marginBottom = '32px';
		message.style.lineHeight = '1.5';
		message.style.maxWidth = '400px';
		overlay.appendChild(message);

		// "Open in Chrome" Button logic
		var currentUrl = window.location.href;
		// Replace https:// with googlechrome:// for iOS/Android deep linking
		var chromeUrl = currentUrl.replace(/^https?:\/\//, 'googlechrome://');

		var chromeBtn = document.createElement('a');
		chromeBtn.href = chromeUrl;
		chromeBtn.textContent = 'Open in Chrome';
		chromeBtn.style.display = 'inline-block';
		chromeBtn.style.backgroundColor = '#2563eb';
		chromeBtn.style.color = 'white';
		chromeBtn.style.padding = '12px 24px';
		chromeBtn.style.borderRadius = '8px';
		chromeBtn.style.textDecoration = 'none';
		chromeBtn.style.fontWeight = 'bold';
		chromeBtn.style.marginBottom = '16px';
		chromeBtn.style.cursor = 'pointer';
		overlay.appendChild(chromeBtn);

		var copyBtn = document.createElement('button');
		copyBtn.textContent = 'Copy Link';
		copyBtn.style.background = 'transparent';
		copyBtn.style.border = '1px solid #555';
		copyBtn.style.color = '#ccc';
		copyBtn.style.padding = '10px 20px';
		copyBtn.style.borderRadius = '8px';
		copyBtn.style.cursor = 'pointer';
		copyBtn.style.fontSize = '14px';
		
		copyBtn.onclick = function() {
			if (navigator.clipboard) {
				navigator.clipboard.writeText(currentUrl).then(function() {
					copyBtn.textContent = 'Copied!';
					setTimeout(function() { copyBtn.textContent = 'Copy Link'; }, 2000);
				});
			} else {
				// Fallback for older browsers
				var textArea = document.createElement("textarea");
				textArea.value = currentUrl;
				document.body.appendChild(textArea);
				textArea.select();
				document.execCommand("Copy");
				textArea.remove();
				copyBtn.textContent = 'Copied!';
			}
		};
		overlay.appendChild(copyBtn);

		// Add helper text for iOS users if relevant
		if (isIOS) {
			var hint = document.createElement('p');
			hint.textContent = 'Tap the "Open in Chrome" button above, or copy the link and open Safari.';
			hint.style.marginTop = '24px';
			hint.style.fontSize = '12px';
			hint.style.color = '#888';
			overlay.appendChild(hint);
		}

		document.body.appendChild(overlay);
		
		// Hide the existing fallback div if it exists to avoid clutter
		var oldFallback = document.getElementById('unsupported-browser');
		if (oldFallback) oldFallback.style.display = 'none';
	}
})();
