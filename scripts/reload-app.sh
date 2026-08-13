#!/bin/bash
# Reload (or open) the project's Chrome tab.
#
# Behavior:
#   1. Look through every Chrome window for a tab whose URL starts with the
#      dev-server origin (http://localhost:5174 by default).
#   2. If found  → bring that tab to the front and reload it. If a different
#      URL is passed, navigate the existing tab to that URL instead.
#   3. If not found → open a NEW tab with the target URL.
#
# This prevents the "every push opens a new tab" annoyance and keeps the user's
# existing tab as the single source of truth for what's on screen.
#
# Usage:
#   scripts/reload-app.sh                                  # reload existing tab
#   scripts/reload-app.sh http://localhost:5174/v/foo/    # navigate to URL
set -euo pipefail

DEV_ORIGIN="http://localhost:5174"
TARGET="${1:-$DEV_ORIGIN}"

osascript <<EOF
tell application "Google Chrome"
    set foundTab to false
    if (count of windows) is 0 then
        make new window
    end if
    set winCount to count of windows
    repeat with wi from 1 to winCount
        try
            set w to window wi
            set tabCount to count of tabs of w
            repeat with ti from 1 to tabCount
                try
                    set t to tab ti of w
                    set theURL to URL of t as string
                    if theURL starts with "$DEV_ORIGIN" then
                        set active tab index of w to ti
                        set index of w to 1
                        if theURL is "$TARGET" then
                            tell t to reload
                        else
                            set URL of t to "$TARGET"
                        end if
                        activate
                        set foundTab to true
                        exit repeat
                    end if
                end try
            end repeat
            if foundTab then exit repeat
        end try
    end repeat
    if not foundTab then
        activate
        tell window 1 to make new tab with properties {URL:"$TARGET"}
    end if
end tell
EOF
