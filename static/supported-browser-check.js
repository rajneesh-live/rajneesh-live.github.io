// IMPORTANT. This file must be imported as separate entry point
// and it cannot use any modern JS syntax (ES5 only).
// It runs synchronously before the app boots.

(function () {
	// --- Detection ---

	var userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
	var isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
	var isAndroid = userAgent.indexOf('Android') > -1;

	var isInstagram = userAgent.indexOf('Instagram') > -1;
	var isFacebook = userAgent.indexOf('FBAN') > -1 || userAgent.indexOf('FBAV') > -1;
	var isLine = userAgent.indexOf('Line') > -1;
	var isLinkedin = userAgent.indexOf('LinkedIn') > -1;
	var isTelegram = userAgent.indexOf('Telegram') > -1;

	// Generic: iOS WebViews don't include "Safari" in their UA.
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
	var hasPromiseWithResolvers =
		typeof Promise !== 'undefined' && typeof Promise.withResolvers === 'function';
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
		hasPromiseWithResolvers &&
		hasCssSupport &&
		hasContainerQueries &&
		hasServiceWorker;

	var shouldBlock = isWebView || !isSupportedBrowser;

	// --- Supported browser: clean up and let app boot ---

	if (!shouldBlock) {
		var fallback = document.getElementById('startup-fallback');
		if (fallback) {
			fallback.style.display = 'none';
		}
		return;
	}

	// --- Blocked browser path ---

	// Build Chrome deep-link URL.
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

	var titleText = isWebView ? 'Open In Chrome' : 'Browser Not Supported';
	var messageText = isWebView
		? 'This in-app browser is blocked. Open this page in Chrome to continue.'
		: 'This browser is missing required web features. Open this page in Chrome.';

	// Inject a <style> that force-hides #app and force-shows fallback.
	// Re-check on every tick that it's still in the DOM (some WebViews strip injected nodes).
	function ensureBlockStyles() {
		var existing = document.getElementById('snae-block');
		if (existing && existing.parentNode) {
			return;
		}
		var s = document.createElement('style');
		s.id = 'snae-block';
		s.textContent =
			'#app{display:none!important}' +
			'#startup-fallback{display:flex!important;position:fixed!important;inset:0!important;z-index:2147483646!important}';
		var target = document.head || document.documentElement;
		target.appendChild(s);
	}

	// Build the fallback overlay content once into #startup-fallback.
	function buildFallbackContent() {
		var el = document.getElementById('startup-fallback');
		if (!el) {
			el = document.createElement('div');
			el.id = 'startup-fallback';
			(document.body || document.documentElement).appendChild(el);
		}

		// Only populate if empty (avoid flicker from repeated innerHTML wipes).
		if (el.childNodes.length > 0) {
			return;
		}

		el.style.cssText =
			'position:fixed;inset:0;z-index:2147483646;background:#121212;color:#fff;' +
			'display:flex;flex-direction:column;justify-content:center;align-items:center;' +
			'padding:24px;text-align:center;' +
			'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif';

		var h = document.createElement('h2');
		h.textContent = titleText;
		h.style.cssText = 'margin:0 0 12px 0;font-size:24px';
		el.appendChild(h);

		var p = document.createElement('p');
		p.textContent = messageText;
		p.style.cssText = 'max-width:420px;margin:0 0 16px 0;line-height:1.5';
		el.appendChild(p);

		var a = document.createElement('a');
		a.href = chromeUrl;
		a.textContent = 'Open in Chrome';
		a.style.cssText =
			'display:inline-block;padding:12px 18px;border-radius:10px;background:#2563eb;' +
			'color:#fff;font-weight:600;text-decoration:none;margin-bottom:10px';
		el.appendChild(a);

		var hint = document.createElement('p');
		hint.textContent =
			'If this does not open Chrome automatically, use browser menu \u2192 Open in browser.';
		hint.style.cssText = 'font-size:12px;opacity:0.85;margin:6px 0 0 0';
		el.appendChild(hint);
	}

	// Apply block immediately.
	ensureBlockStyles();
	buildFallbackContent();

	// Watchdog: re-verify every 500ms for 10 seconds that block styles and
	// fallback content are still intact. This survives WebViews that mutate
	// DOM after initial paint (Telegram, Via, etc).
	var watchdogRuns = 0;
	var watchdog = setInterval(function () {
		watchdogRuns += 1;
		ensureBlockStyles();
		buildFallbackContent();
		if (watchdogRuns >= 20) {
			clearInterval(watchdog);
		}
	}, 500);
})();
