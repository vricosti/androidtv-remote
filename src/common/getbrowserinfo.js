function getBrowserInfo() {
    if (typeof window !== 'undefined' && window.navigator) {
        const ua = navigator.userAgent;
        let browser = 'Unknown Browser';
        let os = 'Unknown OS';

        if (ua.includes("Chrome")) {
            browser = 'chrome';
        } else if (ua.includes("Firefox")) {
            browser = 'firefox';
        } else if (ua.includes("Safari")) {
            browser = 'safari';
        }

        if (ua.includes("Win")) {
            os = 'windows';
        } else if (ua.includes("Mac")) {
            os = 'macos';
        } else if (ua.includes("Linux")) {
            os = 'linux';
        } else if (ua.includes("Android")) {
            os = 'android';
        } else if (ua.includes("iOS")) {
            os = 'ios';
        }

        return { browser, os };
    } else {
        return {
            browser: 'node.js',
            os: process.platform  // Returns the operating system Node.js is running on
        };
    }
}

export default getBrowserInfo;