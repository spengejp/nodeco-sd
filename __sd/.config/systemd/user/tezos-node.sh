#!/bin/bash

cd ${HOME}

# detect current network
if [ ! -f .nodeco-client/setting/nodeco.json ]; then
	net="mainnet"
else
	net=`cat .nodeco-client/setting/nodeco.json | jq -r '.net'`
fi

opts="--config-file=.tezos-${net}-node/config.json --data-dir=.tezos-${net}-node"

# download snapshot
if [ ! -d .tezos-${net}-node/context ] || [ ! -d .tezos-${net}-node/store ]; then
	if [ ! -f tezos/${net}.snapshot ]; then
		echo "downloading snapshot file..."
		wget --quiet -O "tezos/${net}.snapshot" http://10.9.0.1:3000/snapshot?net=${net} || exit 1
		if [ `wc -c tezos/${net}.snapshot | awk '{print $1}'` -le 5 ]; then
			rm -f tezos/${net}.snapshot
			exit 1
		fi

		rm -rf .tezos-${net}-node/context .tezos-${net}-node/store .tezos-${net}-node/peers.json .tezos-${net}-node/version.json
	fi
fi

# create identity file
if [ ! -f .tezos-${net}-node/identity.json ]; then
	echo "creating identity file..."
	./tezos/tezos-node identity generate ${opts} || exit 1
fi

# import exist snapshot
if [ -f tezos/${net}.snapshot ]; then
	echo "importing snapshot file..."
	./tezos/tezos-node snapshot import tezos/${net}.snapshot ${opts}
	if [ $? -ne 0 ]; then
		rm -f tezos/${net}.snapshot
		exit 1
	fi
	rm -f tezos/${net}.snapshot
fi

# launch tezos-node
./tezos/tezos-node run ${opts} &
pid=($!)

wait $pid

exit 1
