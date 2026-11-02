#!/bin/sh
. /mnt/us/extensions/dashboard/bin/common.sh

pid_alive "$DASH_PID" && exit 0
kill_pid "$WATCH_PID"
nohup /bin/sh "$EXT_DIR/bin/dash.sh" >/dev/null 2>&1 &
