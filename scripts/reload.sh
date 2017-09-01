#!/usr/bin/env bash

if [ -z "${RUN_IN_DOCKER}" ]; then
	echo "failed: not running in docker." >&2
	exit 1
fi

kill -SIGUSR2 1
