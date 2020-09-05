#!/bin/bash
set -eu

export TEZOS_CLIENT_UNSAFE_DISABLE_DISCLAIMER=Y

IFS=$'\n'
suffix=()
pids=()
i=0

if [ ! -f .nodeco-client/setting/nodeco.json ]; then
        net="mainnet"
else
        net=`cat .nodeco-client/setting/nodeco.json | jq -r '.net'`
fi

bakename='null'
while true;
do
        if [ ! -f ${HOME}/tezos-${net}/tezos-client ]; then
                sleep 10
                continue
        fi

        if [ ! -f ${HOME}/.nodeco-client/setting/nodeco.json ]; then
                sleep 10
                continue
        fi

        bakename=`cat ${HOME}/.nodeco-client/setting/nodeco.json | jq -r '.bakeaddress.name'`
        if [ ${bakename} == "null" ]; then
                sleep 10
                continue
        fi
        break
done

for line in `${HOME}/tezos-${net}/tezos-client rpc get /chains/main/blocks/head/protocols`
do
        tmp=`echo ${line} | sed -e 's/^[^:]\+: \"\(.\{8\}\).\+\".*$/\1/g'`

        if [ $i -ne 0 ] && [ "${suffix[i - 1]}" == "${tmp}" ]; then
                continue
        fi

        suffix+=("${tmp}")

        for line2 in `ls ${HOME}/tezos-${net} | grep ${suffix[$i]}`
        do
                proto=`echo ${line2} | sed -e 's/.*-\([0-9]\{3\}-[a-zA-Z0-9]\{8\}\)$/\1/g'`
                bin="${HOME}/tezos-${net}/${line2}"

                echo "Launched ${bin} Daemon."

                case ${line2} in
                        "tezos-baker-${proto}" )
                                ${bin} run with local node ${HOME}/.tezos-${net}-node ${bakename} &
                                pids+=($!)
                                ;;
                        "tezos-endorser-${proto}" )
                                ${bin} run ${bakename} &
                                pids+=($!)
                                ;;
                        "tezos-accuser-${proto}" )
                                ${bin} run &
                                ;;
                esac
        done
        i=$(expr $i + 1)
done

for pid in ${pids[@]}; do
        wait $pid
done

sleep 10
exit 1
