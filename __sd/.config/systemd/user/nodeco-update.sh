#!/bin/bash

if [ -d ${HOME}/nodeco-sd ] && [ -f ${HOME}/nodeco-sd/sd-update.yml ]; then
	ansible-playbook ${HOME}/nodeco-sd/sd-update.yml || echo "error while updating sd files."; rm -rf ${HOME}/nodeco-sd; exit 1
else
	rm -rf ${HOME}/nodeco-sd
	git clone https://github.com/spengejp/nodeco-sd.git || echo "error while cloning git repository."; rm -rf ${HOME}/nodeco-sd; exit 1
	ansible-playbook ${HOME}/nodeco-sd/sd-update.yml || echo "error while updating sd files."; rm -rf ${HOME}/nodeco-sd; exit 1
fi

exit 0
