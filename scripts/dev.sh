#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

node_is_supported() {
    "$1" -e '
        const [major, minor] = process.versions.node.split(".").map(Number);
        process.exit(
            (major === 20 && minor >= 19) || (major >= 22 && (major > 22 || minor >= 12))
                ? 0
                : 1
        );
    ' >/dev/null 2>&1
}

install_node() {
    node_version=22.16.0
    case "$(uname -s)-$(uname -m)" in
        Darwin-arm64) node_platform=darwin-arm64 ;;
        Darwin-x86_64) node_platform=darwin-x64 ;;
        Linux-aarch64|Linux-arm64) node_platform=linux-arm64 ;;
        Linux-x86_64) node_platform=linux-x64 ;;
        *)
            echo "Cannot install Node.js automatically on $(uname -s)-$(uname -m)." >&2
            echo 'Install Node.js 20.19+ or 22.12+ and run this script again.' >&2
            exit 1
            ;;
    esac

    legacy_node="/tmp/node-v22.16.0-$node_platform/bin"
    if [ -x "$legacy_node/node" ] && node_is_supported "$legacy_node/node"; then
        PATH="$legacy_node:$PATH"
        export PATH
        return
    fi

    node_install="$jev_cache_home/jev/node-v$node_version-$node_platform"
    if [ -x "$node_install/bin/node" ] && node_is_supported "$node_install/bin/node"; then
        PATH="$node_install/bin:$PATH"
        export PATH
        return
    fi

    if ! command -v curl >/dev/null 2>&1 || ! command -v tar >/dev/null 2>&1; then
        echo 'curl and tar are required to install Node.js automatically.' >&2
        exit 1
    fi
    if command -v shasum >/dev/null 2>&1; then
        node_checksum_tool=shasum
    elif command -v sha256sum >/dev/null 2>&1; then
        node_checksum_tool=sha256sum
    else
        echo 'shasum or sha256sum is required to verify the Node.js download.' >&2
        exit 1
    fi

    node_archive="node-v$node_version-$node_platform.tar.xz"
    jev_node_tmp=$(mktemp -d "${TMPDIR:-/tmp}/jev-node.XXXXXX")
    echo "Downloading Node.js v$node_version..."
    curl --fail --silent --show-error --location \
        "https://nodejs.org/dist/v$node_version/$node_archive" \
        --output "$jev_node_tmp/$node_archive"
    curl --fail --silent --show-error --location \
        "https://nodejs.org/dist/v$node_version/SHASUMS256.txt" \
        --output "$jev_node_tmp/SHASUMS256.txt"
    if ! awk -v archive="$node_archive" '$2 == archive { print; count++ } END { if (count != 1) exit 1 }' \
        "$jev_node_tmp/SHASUMS256.txt" >"$jev_node_tmp/checksum"; then
        echo 'Could not find a unique checksum for the Node.js download.' >&2
        exit 1
    fi
    if [ "$node_checksum_tool" = shasum ]; then
        (cd "$jev_node_tmp" && shasum -a 256 -c checksum)
    else
        (cd "$jev_node_tmp" && sha256sum -c checksum)
    fi
    tar -xJf "$jev_node_tmp/$node_archive" -C "$jev_node_tmp"

    mkdir -p "$(dirname "$node_install")"
    if [ -e "$node_install" ]; then
        if [ ! -x "$node_install/bin/node" ] || ! node_is_supported "$node_install/bin/node"; then
            echo "The cached Node.js install is incomplete: $node_install" >&2
            exit 1
        fi
    else
        mv "$jev_node_tmp/node-v$node_version-$node_platform" "$node_install"
    fi
    rm -r "$jev_node_tmp"
    jev_node_tmp=
    PATH="$node_install/bin:$PATH"
    export PATH
}

jev_cache_home=${XDG_CACHE_HOME:-"$HOME/.cache"}
jev_node_tmp=
jev_backend_pid=
cleanup() {
    if [ -n "$jev_node_tmp" ] && [ -d "$jev_node_tmp" ]; then
        rm -r "$jev_node_tmp"
    fi
    if [ -n "$jev_backend_pid" ]; then
        kill "$jev_backend_pid" 2>/dev/null || true
        wait "$jev_backend_pid" 2>/dev/null || true
    fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if ! command -v node >/dev/null 2>&1 || ! node_is_supported node; then
    install_node
fi
if ! command -v npm >/dev/null 2>&1; then
    echo 'npm was not found with Node.js. Reinstall Node.js and try again.' >&2
    exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
    echo 'curl is required to check that the backend is ready.' >&2
    exit 1
fi
echo "Using Node.js $(node --version)."

if [ -x .venv311/bin/python ] && .venv311/bin/python -c 'import sys; sys.exit(sys.version_info < (3, 11))' >/dev/null 2>&1; then
    jev_python=.venv311/bin/python
elif [ -x .venv/bin/python ] && .venv/bin/python -c 'import sys; sys.exit(sys.version_info < (3, 11))' >/dev/null 2>&1; then
    jev_python=.venv/bin/python
else
    jev_python_command=
    for candidate in python3.11 python3; do
        if command -v "$candidate" >/dev/null 2>&1 &&
            "$candidate" -c 'import sys; sys.exit(sys.version_info < (3, 11))' >/dev/null 2>&1; then
            jev_python_command=$(command -v "$candidate")
            break
        fi
    done
    if [ -z "$jev_python_command" ]; then
        echo 'Python 3.11+ is required. Install it, then run this script again.' >&2
        exit 1
    fi
    echo 'Creating the Python virtual environment...'
    "$jev_python_command" -m venv .venv311
    jev_python=.venv311/bin/python
fi

if ! "$jev_python" -c 'import fastapi, httpx, pydantic, uvicorn, dotenv' >/dev/null 2>&1; then
    echo 'Installing backend Python dependencies...'
    if ! "$jev_python" -m pip --version >/dev/null 2>&1; then
        "$jev_python" -m ensurepip --upgrade
    fi
    "$jev_python" -m pip install -r backend/requirements.txt
fi

if ! npm --prefix frontend ls --depth=0 >/dev/null 2>&1; then
    echo 'Installing frontend dependencies...'
    npm --prefix frontend ci
fi

echo 'Starting the backend...'
"$jev_python" -m backend.main &
jev_backend_pid=$!

attempt=0
until
    kill -0 "$jev_backend_pid" 2>/dev/null &&
        curl --fail --silent http://127.0.0.1:8000/api/health >/dev/null
do
    if ! kill -0 "$jev_backend_pid" 2>/dev/null; then
        wait "$jev_backend_pid" || true
        echo 'The backend stopped before becoming healthy.' >&2
        exit 1
    fi
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 30 ]; then
        echo 'The backend did not become healthy on port 8000.' >&2
        exit 1
    fi
    sleep 1
done

echo 'Backend ready at http://localhost:8000.'
echo 'Starting the frontend at http://localhost:5173 (Ctrl+C to stop both servers).'
npm --prefix frontend run dev
