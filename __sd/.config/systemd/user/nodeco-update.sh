#!/bin/bash
set -e

function clean() {
	rm -rf ${HOME}/nodeco-sd
	exit 1
}

if [ ! -d ${HOME}/nodeco-sd ] || [ ! -f ${HOME}/nodeco-sd/sd-update.yml ]; then
	rm -rf ${HOME}/nodeco-sd
	git clone https://github.com/spengejp/nodeco-sd.git ${HOME}/nodeco-sd
else
	cd ${HOME}/nodeco-sd
	git clean -dxf
	git reset --hard
	git pull
fi

ansible-playbook ${HOME}/nodeco-sd/sd-update.yml

trap clean ERR

exit 0
