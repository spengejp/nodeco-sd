#!/bin/bash

net=$1
ss=$2

recover() {
        if [ -d ${HOME}/.tezos-node-old ]; then
                echo -n "Recovering tezos node files... "
                rm -rf ${HOME}/.tezos-node 2>/dev/null
                mv ${HOME}/.tezos-node-old ${HOME}/.tezos-node
                echo "Done."
        fi

        if [ -d ${HOME}/.tezos-node-old-del ]; then
                echo -n "Erasing no longer use tezos node files..."
                rm -rf ${HOME}/.tezos-node-old-del
                echo "Done."
        fi
}

stats() {
        echo "[$1] $2"
        echo -ne "{\"title\": \"$1\", \"msg\": \"$2\"}" > /tmp/import.stats
}

finalize() {
        stats "error" "Unknown error has occured."
        recover
        systemctl --user start tezos-node tezos-daemons
        rm -rf /tmp/import.lock
        exit 1
}

set -e
trap "finalize" INT TERM ERR

if [ $# -lt 1 ]; then
        net="mainnet"
fi

if [ $# -lt 2 ]; then
        ss="rolling"
fi

if ! ln -s $$ /tmp/import.lock; then
        stats "error" "Already running."
        exit 1
fi

recover

cur_net=""

stats "1/7" "Backup json files..."
if [ -f ${HOME}/tezos/@* ]; then
        cur_net=`\find ${HOME}/tezos/@* -type f -exec basename {} \;`
        mkdir -p ${HOME}/.conf/${cur_net#@}
        if [ -f ${HOME}/.tezos-node/identity.json ]; then
                cp ${HOME}/.tezos-node/identity.json ${HOME}/.conf/${cur_net#@}
        fi
        if [ -f ${HOME}/.tezos-node/config.json ]; then
                cp ${HOME}/.tezos-node/config.json ${HOME}/.conf/${cur_net#@}
        fi
fi

if [ ! -f ${HOME}/.nodeco-client/snapshot/${net}.${ss} ]; then
        finalize
fi

stats "2/7" "Stopping tezos daemons..."
systemctl --user stop tezos-node tezos-daemons

stats "3/7" "Backup old node data..."
if [ -d ${HOME}/.tezos-node ] && [ ! -d ${HOME}/.tezos-node-old ]; then
        mv ${HOME}/.tezos-node ${HOME}/.tezos-node-old
fi

stats "4/7" "Importing snapshot (It would take some time)..."
${HOME}/tezos/tezos-node snapshot import ${HOME}/.nodeco-client/snapshot/${net}.${ss}

stats "5/7" "Restoring json files..."
cp ${HOME}/.conf/${net}/* ${HOME}/.tezos-node | true

if [ ! -f ${HOME}/.tezos-node/identity.json ]; then
        echo "Generating identity file..."
        ${HOME}/tezos/tezos-node identity generate
fi

stats "6/7" "Starting tezos daemons..."
systemctl --user start tezos-node tezos-daemons

stats "7/7" "Elasing old node data..."
if [ -d ${HOME}/.tezos-node-old ]; then
        mv ${HOME}/.tezos-node-old ${HOME}/.tezos-node-old-del
        rm -rf ${HOME}/.tezos-node-old-del
fi

stats "complete" "Done."
rm -rf /tmp/import.lock

exit 0