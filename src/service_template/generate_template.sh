#!/usr/bin/env bash

if [ -z "$1" ]; then
	echo "can't run alone"
	exit 1
fi

TARGET_PATH="$1"

mkdir -p "${TARGET_PATH}"
node service_template/index.js "${TARGET_PATH}"
