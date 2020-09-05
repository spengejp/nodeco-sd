#!/bin/bash

#${HOME}/nodeco-api/shell/update.sh

for path in `\find ${HOME} -maxdepth 1 -mindepth 1 -type d -name "*-old"`; do
        rm -rf ${path}
done

exit 0
