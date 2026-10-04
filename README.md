# Header Override

A Chrome extension for overriding request headers on API calls. Add a header such as `x-token`, set its value, and switch each rule on or off whenever you need.

## Features

- Set or remove any request header on fetch / XHR requests
- An on/off switch for every rule, plus a master switch that pauses them all
- Limit a rule to specific domains (subdomains and all ports included), or leave it empty to apply everywhere
- Values are masked by default so tokens stay hidden while screen sharing
- The toolbar badge shows how many rules are active
- Changes take effect immediately, with no reload of the extension needed

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Turn on "Developer mode" in the top-right corner
3. Click "Load unpacked"
4. Select this project's folder

## Usage

1. Click the extension icon in the toolbar
2. Click "Add" and enter the header name (for example `x-token`) and its value
3. Optionally enter domains such as `api.example.com, localhost` to limit where the rule applies
4. Use the switch on each rule to turn it on or off, or the switch in the header to pause everything

A rule with a missing name, missing value, or invalid domain shows a hint and is not applied.

## How it works

Rules are stored in `chrome.storage.local` and converted into `declarativeNetRequest` dynamic rules by the background service worker. Chrome applies them natively, so the extension never reads request or response contents.

Headers changed by `declarativeNetRequest` may not appear in the DevTools Network panel. To confirm a rule works, check the request on the server side or with an endpoint that echoes headers back.

## Packaging

Run `./package.sh` to create `dist/header-override-<version>.zip` containing only the files the extension needs, ready to upload to the Chrome Web Store.

## Privacy

All rules, including header values, are stored locally on your device and are never sent anywhere.

See the full [Privacy Policy](https://chrislitw.github.io/header-override/privacy-policy-en.html) ([繁體中文](https://chrislitw.github.io/header-override/privacy-policy.html)).
