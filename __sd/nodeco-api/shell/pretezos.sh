#!/bin/bash

if [ ! -f ${HOME}/.tezos-node/identity.json ]; then
        echo "Generating identity file..."
        ${HOME}/tezos/tezos-node identity generate
fi