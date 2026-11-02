#!/bin/sh
. /mnt/us/dashboard/bin/common.sh

pid_alive "$DASH_PID" && exit 0
kill_pid "$WATCH_PID"
# detach from the launcher, dash.sh stops the framework that started us
if command -v setsid >/dev/null 2>&1; then
  setsid nohup /bin/sh "$EXT_DIR/bin/dash.sh" >/dev/null 2>&1 &
else
  nohup /bin/sh "$EXT_DIR/bin/dash.sh" >/dev/null 2>&1 &
fi
