#!/bin/bash

net=$1
dev=$2

if [ $# -lt 1 ]; then
        net="mainnet"
fi

if [ $# -lt 2 ]; then
        dev="release"
fi

recover() {
        if [ ! -f "${HOME}/.bin/@package" ] && [ -d "${HOME}/.bin/${dev}_${net}" ]; then
                echo "Cleaning ${dev}_${net} dir..."
                rm -rf "${HOME}/.bin/${dev}_${net}"
        fi

        if [ -f "${HOME}/.bin/@package" ] && [ "$(ls ${HOME}/*-old 2>/dev/null)" != '' ]; then
                olds=`\find ${HOME}/*-old 2>/dev/null -mindepth 0 -maxdepth 0 -type d`
                if [ ! "${olds}" = "" ]; then
                        echo "Recovering old files..."
                        for old in ${olds}; do
                        rm -rf "${old%-old}"
                                mv "${old}" "${old%-old}"
                        done
                fi
        fi
}

stats() {
        echo "[$1] $2"
        echo -ne "{\"title\": \"$1\", \"msg\": \"$2\"}" > /tmp/update.stats
}

finalize() {
        stats "error" "Unknown error has occured."
        recover
        rm -rf /tmp/update.lock
        exit 0
}

set -e
trap "finalize" INT TERM ERR

if ! ln -s $$ /tmp/update.lock; then
    stats "error" "Already running."
    exit 1
fi

recover

# @packageの有無で分岐
if [ ! -f "${HOME}/.bin/@package" ]; then
        # 圧縮リリースファイルを検索
        target=`\find ${HOME}/.nodeco-client/release/${dev}_${net}* 2>/dev/null -type f | sort -r | head -1`

        # リリースファイルが見つからない
        if [ "${target}" = "" ]; then
                rm -rf /tmp/update.lock
                exit 1
        fi

        stats "1/1" "Decompressing files..."
        tar --recursive-unlink -zxf ${target} -C ${HOME}/.bin/
        echo "${dev}_${net}" > ${HOME}/.bin/@package

        stats "restart" "Restarting system..."
        rm -rf /tmp/update.lock
        exit 0
fi

# 以下は、再起動直後に実行する
target=`cat ${HOME}/.bin/@package`
srcdirs=`\find ${HOME}/.bin/${target} 2>/dev/null -mindepth 1 -maxdepth 1 -type d`

arr=(${target//_/ })
net=${arr[0]}
dev=${arr[1]}

echo "System update started."

stats "1/3" "Stopping Daemons..."
systemctl --user stop tezos-node tezos-daemons

stats "2/3" "Copying new SD files..."
for srcdir in ${srcdirs}; do
        dirname=`basename ${srcdir}`
        dstdir="${HOME}/${dirname}"
        
        mv "${dstdir}" "${dstdir}-old"
        cp -r "${srcdir}" "${dstdir}"

        # .nの拡張子ファイルは、上書きしないで戻す
        npaths=`\find ${dstdir} -type f -name '*.n'`
        for npath in ${npaths}; do
                oldpath=`echo "${npath}" | sed -e "s:^\(${HOME}/[^/]\+\)\(/.*\)$:\1-old\2:"`                
                if [ -f "${oldpath%.n}" ]; then
                        echo "mv ${oldpath%.n} -> ${npath%.n}"
                        mv "${oldpath%.n}" "${npath%.n}"
                        rm -rf "${npath}"
                fi
        done

        # .nの拡張子ディレクトリは、上書きしないで戻す
        npaths=`\find ${dstdir} -type d -name '*.n'`
        for npath in ${npaths}; do
                oldpath=`echo "${npath}" | sed -e "s:^\(${HOME}/[^/]\+\)\(/.*\)$:\1-old\2:"`                
                if [ -d "${oldpath%.n}" ]; then
                        echo "mv ${oldpath%.n} -> ${npath%.n}"
                        mv "${oldpath%.n}" "${npath%.n}"
                        rm -rf "${npath}"
                fi
        done
done

stats "3/3" "Restarting Daemons..."
systemctl --user start tezos-node tezos-daemons

stats "complete" "Done."
rm -rf ${HOME}/.bin/@package
rm -rf /tmp/update.lock

exit 0
