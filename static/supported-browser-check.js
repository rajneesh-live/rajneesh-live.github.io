// IMPORTANT. This file must be imported as separate entry point
// and it cannot use any modern JS syntax (ES5 only).
// It runs synchronously before the app boots.

(function () {
	// --- Detection ---

	var userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
	var isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
	var isAndroid = userAgent.indexOf('Android') > -1;

	// --- Known in-app browsers (UA substring detection) ---
	var isInstagram = userAgent.indexOf('Instagram') > -1;
	var isFacebook = userAgent.indexOf('FBAN') > -1 || userAgent.indexOf('FBAV') > -1;
	var isLine = userAgent.indexOf('Line/') > -1;
	var isLinkedin = userAgent.indexOf('LinkedIn') > -1;
	var isTelegram = userAgent.indexOf('Telegram') > -1;

	// --- Known lightweight / WebView-based Android browsers ---
	// Via browser wraps Android WebView but mimics Chrome's UA. Its UA
	// typically does NOT contain "Chrome/" the way real Chrome does, or
	// contains the Android WebView marker "; wv)" or "Version/".
	var isAndroidWebView =
		isAndroid &&
		(userAgent.indexOf('; wv)') > -1 || userAgent.indexOf('Version/') > -1);

	// --- Generic iOS WebView heuristic ---
	// Real Safari and Chrome-on-iOS include "Safari" in their UA.
	// In-app WebViews on iOS typically omit it.
	var isLikelyIOSWebView =
		isIOS &&
		!isInstagram &&
		!isFacebook &&
		!isLine &&
		!isLinkedin &&
		!isTelegram &&
		userAgent.indexOf('Safari') === -1;

	var isWebView =
		isInstagram ||
		isFacebook ||
		isLine ||
		isLinkedin ||
		isTelegram ||
		isAndroidWebView ||
		isLikelyIOSWebView;

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
		var fb = document.getElementById('startup-fallback');
		if (fb) {
			fb.parentNode.removeChild(fb);
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

	// The single function that makes the block state real.
	// It is fully self-contained: it ensures the style exists, the fallback
	// div exists, and the fallback div has the correct content.
	// Safe to call many times — it only writes when something is missing.
	function enforce() {
		// 1. Ensure block <style> is in the document.
		var style = document.getElementById('snae-block');
		if (!style || !style.parentNode) {
			style = document.createElement('style');
			style.id = 'snae-block';
			style.textContent =
				'#app{display:none!important}' +
				'#startup-fallback{display:flex!important;position:fixed!important;' +
				'inset:0!important;z-index:2147483646!important;' +
				'background:#121212!important;color:#fff!important;' +
				'flex-direction:column!important;justify-content:center!important;' +
				'align-items:center!important;padding:24px!important;' +
				'text-align:center!important;' +
				'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif!important}';
			(document.head || document.documentElement).appendChild(style);
		}

		// 2. Ensure fallback div exists in the document.
		var el = document.getElementById('startup-fallback');
		if (!el || !el.parentNode) {
			el = document.createElement('div');
			el.id = 'startup-fallback';
			(document.body || document.documentElement).appendChild(el);
		}

		// 3. Ensure fallback div has the CTA content (check for the <a> tag).
		if (!el.querySelector('a')) {
			el.innerHTML = '';

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
	}

	// Apply immediately.
	enforce();

	// Watchdog: re-verify every 500ms for 10s.
	// Survives WebViews that strip injected nodes after initial paint.
	var runs = 0;
	var timer = setInterval(function () {
		runs += 1;
		enforce();
		if (runs >= 20) {
			clearInterval(timer);
		}
	}, 500);
})();
