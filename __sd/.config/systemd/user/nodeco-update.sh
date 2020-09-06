#!/bin/bash
set -e

function clean() {
	rm -rf ${HOME}/nodeco-sd
	exit 1
}

if [ ! -d ${HOME}/nodeco-sd ] || [ ! -f ${HOME}/nodeco-sd/sd-update.yml ]; then
	rm -rf ${HOME}/nodeco-sd
	git clone https://github.com/spengejp/nodeco-sd.git ${HOME}/nodeco-sd
fi

if [ -d ${HOME}/.nodeco-client ] && [ -f ${HOME}/.nodeco-client/.update ]; then
	ansible-playbook ${HOME}/nodeco-sd/sd-update.yml
fi

trap clean ERR

exit 0
