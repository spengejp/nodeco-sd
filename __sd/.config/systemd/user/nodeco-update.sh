#!/bin/bash
set -e

function clean() {
	rm -rf ${HOME}/nodeco-sd
	exit 1
}

if [ -d ${HOME}/nodeco-sd ] && [ -f ${HOME}/nodeco-sd/sd-update.yml ]; then
	ansible-playbook ${HOME}/nodeco-sd/sd-update.yml
else
	rm -rf ${HOME}/nodeco-sd
	git clone https://github.com/spengejp/nodeco-sd.git ${HOME}/nodeco-sd
	ansible-playbook ${HOME}/nodeco-sd/sd-update.yml
fi

trap clean ERR

exit 0
