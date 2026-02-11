// IMPORTANT. This file must be imported as separate entry point
// and it cannot use any modern JS syntax (ES5 only).

(function () {
	function getFallbackElement() {
		return document.getElementById('startup-fallback');
	}

	function hideFallback() {
		var fallback = getFallbackElement();
		if (fallback) {
			fallback.style.display = 'none';
		}
	}

	function showFallback(titleText, messageText, chromeUrl) {
		var fallback = getFallbackElement();
		if (!fallback) {
			return;
		}

		fallback.style.display = 'flex';
		fallback.innerHTML = '';

		var title = document.createElement('h2');
		title.textContent = titleText;
		title.style.margin = '0 0 12px 0';
		title.style.fontSize = '24px';
		fallback.appendChild(title);

		var message = document.createElement('p');
		message.textContent = messageText;
		message.style.maxWidth = '420px';
		message.style.margin = '0 0 16px 0';
		message.style.lineHeight = '1.5';
		fallback.appendChild(message);

		var button = document.createElement('a');
		button.href = chromeUrl;
		button.textContent = 'Open in Chrome';
		button.style.display = 'inline-block';
		button.style.padding = '12px 18px';
		button.style.borderRadius = '10px';
		button.style.background = '#2563eb';
		button.style.color = '#fff';
		button.style.fontWeight = '600';
		button.style.textDecoration = 'none';
		button.style.marginBottom = '10px';
		fallback.appendChild(button);

		var helper = document.createElement('p');
		helper.textContent = 'If this does not open Chrome automatically, use browser menu -> Open in browser.';
		helper.style.fontSize = '12px';
		helper.style.opacity = '0.85';
		helper.style.margin = '6px 0 0 0';
		fallback.appendChild(helper);
	}

	var userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
	var isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
	var isAndroid = userAgent.indexOf('Android') > -1;

	var isInstagram = userAgent.indexOf('Instagram') > -1;
	var isFacebook = userAgent.indexOf('FBAN') > -1 || userAgent.indexOf('FBAV') > -1;
	var isLine = userAgent.indexOf('Line') > -1;
	var isLinkedin = userAgent.indexOf('LinkedIn') > -1;
	var isTelegram = userAgent.indexOf('Telegram') > -1;

	// Generic heuristic catches many in-app browsers on iOS.
	var isLikelyIOSWebView =
		isIOS &&
		!isInstagram &&
		!isFacebook &&
		!isLine &&
		!isLinkedin &&
		!isTelegram &&
		userAgent.indexOf('Safari') === -1;

	var isWebView =
		isInstagram || isFacebook || isLine || isLinkedin || isTelegram || isLikelyIOSWebView;

	var hasNoModule =
		typeof HTMLScriptElement !== 'undefined' &&
		HTMLScriptElement.prototype &&
		'noModule' in HTMLScriptElement.prototype;
	var hasLocks = typeof navigator !== 'undefined' && !!navigator.locks;
	var hasAbortTimeout = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal;
	var hasCssSupport =
		typeof CSS !== 'undefined' &&
		!!CSS.supports &&
		CSS.supports('color: color-mix(in oklab, black, black)');
	var hasContainerQueries =
		!!document &&
		!!document.documentElement &&
		!!document.documentElement.style &&
		'container' in document.documentElement.style;
	var hasServiceWorker = typeof navigator !== 'undefined' && !!navigator.serviceWorker;

	var isSupportedBrowser =
		hasNoModule &&
		hasLocks &&
		hasAbortTimeout &&
		hasCssSupport &&
		hasContainerQueries &&
		hasServiceWorker;

	var shouldBlock = isWebView || !isSupportedBrowser;

	var currentUrl = window.location.href;
	var chromeUrl = currentUrl;

	if (isIOS) {
		if (currentUrl.indexOf('https://') === 0) {
			chromeUrl = currentUrl.replace('https://', 'googlechromes://');
		} else if (currentUrl.indexOf('http://') === 0) {
			chromeUrl = currentUrl.replace('http://', 'googlechrome://');
		}
	} else if (isAndroid) {
		if (currentUrl.indexOf('https://') === 0) {
			chromeUrl =
				currentUrl.replace('https://', 'intent://') +
				'#Intent;scheme=https;package=com.android.chrome;end';
		} else if (currentUrl.indexOf('http://') === 0) {
			chromeUrl =
				currentUrl.replace('http://', 'intent://') +
				'#Intent;scheme=http;package=com.android.chrome;end';
		}
	}

	function showUnsupportedOverlay() {
		if (window.__snaeBrowserGateRendered) {
			return;
		}
		window.__snaeBrowserGateRendered = true;
		var app = document.getElementById('app');
		if (app) {
			app.style.display = 'none';
		}

		showFallback(
			isWebView ? 'Open In Chrome' : 'Browser Not Supported',
			isWebView
				? 'This in-app browser is blocked. Open this page in Chrome to continue.'
				: 'This browser is missing required web features. Open this page in Chrome.',
			chromeUrl
		);
	}

	// If startup crashes after fallback is hidden, show the fallback again.
	if (!window.__snaeStartupErrorHandlerInstalled) {
		window.__snaeStartupErrorHandlerInstalled = true;
		window.addEventListener(
			'error',
			function () {
				var app = document.getElementById('app');
				if (app) {
					app.style.display = 'none';
				}
				showFallback(
					'Failed to start app',
					'This browser environment crashed during startup. Open this page in Chrome.',
					chromeUrl
				);
			},
			true
		);
		window.addEventListener(
			'unhandledrejection',
			function () {
				var app = document.getElementById('app');
				if (app) {
					app.style.display = 'none';
				}
				showFallback(
					'Failed to start app',
					'This browser environment crashed during startup. Open this page in Chrome.',
					chromeUrl
				);
			},
			true
		);
	}

	if (shouldBlock) {
		showUnsupportedOverlay();
	} else {
		// Supported browser path: allow app UI and remove fallback.
		var app = document.getElementById('app');
		if (app) {
			app.style.display = '';
		}
		hideFallback();
	}
})();
