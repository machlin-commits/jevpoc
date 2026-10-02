#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null 2>&1; then
    if [ -x /tmp/node-v22.16.0-darwin-arm64/bin/node ]; then
        PATH="/tmp/node-v22.16.0-darwin-arm64/bin:$PATH"
        export PATH
    else
        echo 'Install Node.js 20.19+ or 22.12+ before starting.' >&2
        exit 1
    fi
fi
if [ -x .venv311/bin/python ]; then
    jev_python=.venv311/bin/python
elif [ -x .venv/bin/python ]; then
    jev_python=.venv/bin/python
else
    echo 'Create the Python virtual environment described in README.md first.' >&2
    exit 1
fi
"$jev_python" -m backend.main &
jev_backend_pid=$!
trap 'kill "$jev_backend_pid" 2>/dev/null || true' EXIT INT TERM
npm --prefix frontend run dev
