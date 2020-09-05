#!/bin/bash
pids=()

error() {
    exit 1
}

set -e
trap "error" INT TERM ERR

sleep 1
/usr/bin/node ${HOME}/nodeco-api/rest.js &
pids+=($!)
sleep 1
/usr/bin/node ${HOME}/nodeco-client/server.js &
pids+=($!)

for pid in ${pids[@]}; do
        wait $pid
done

exit 0
