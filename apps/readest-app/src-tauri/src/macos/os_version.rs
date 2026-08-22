//! macOS OS-version detection for the close-to-hide workaround.
//!
//! macOS 26 (Tahoe) regressed `NSWindow` ordering so that `orderOut:` —
//! which Tauri's `WebviewWindow::hide()` maps to — can leave a focused
//! black phantom window on screen instead of hiding it. See issue #4875.
//! The same failure is reproducible on macOS 15.7, but was not reproducible
//! on macOS 15.6. The workaround is therefore intentionally scoped to macOS
//! 26 and macOS 15.7 or later within major version 15.

use objc::{class, msg_send, sel, sel_impl};

/// Returns true for macOS versions that require the defensive hide path.
pub(crate) fn requires_defensive_hide(major: i64, minor: i64, _patch: i64) -> bool {
    major == 26 || (major == 15 && minor >= 7)
}

/// Reads the running macOS version via `NSProcessInfo`.
fn macos_version() -> (i64, i64, i64) {
    #[repr(C)]
    struct NSOperatingSystemVersion {
        major: i64,
        minor: i64,
        patch: i64,
    }

    unsafe {
        let process_info: *mut objc::runtime::Object =
            msg_send![class!(NSProcessInfo), processInfo];
        let version: NSOperatingSystemVersion = msg_send![process_info, operatingSystemVersion];
        (version.major, version.minor, version.patch)
    }
}

/// True when the running macOS version requires the defensive hide path.
pub fn current_macos_requires_defensive_hide() -> bool {
    let (major, minor, patch) = macos_version();
    requires_defensive_hide(major, minor, patch)
}

#[cfg(test)]
mod tests {
    use super::requires_defensive_hide;

    #[test]
    fn uses_normal_hide_before_macos_15_7() {
        assert!(!requires_defensive_hide(15, 6, 1));
    }

    #[test]
    fn detects_affected_macos_15_7_versions() {
        assert!(requires_defensive_hide(15, 7, 0));
        assert!(requires_defensive_hide(15, 7, 7));
    }

    #[test]
    fn detects_macos_tahoe() {
        assert!(requires_defensive_hide(26, 0, 0));
        assert!(requires_defensive_hide(26, 5, 2));
    }

    #[test]
    fn rejects_other_major_versions() {
        assert!(!requires_defensive_hide(14, 7, 7));
        assert!(!requires_defensive_hide(25, 7, 0));
        assert!(!requires_defensive_hide(27, 0, 0));
    }
}
