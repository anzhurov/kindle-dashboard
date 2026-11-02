#!/bin/sh
. /mnt/us/dashboard/bin/common.sh

echo $$ > "$WATCH_PID"
log "watcher: waiting for sleep"

# grace period: ignore the power-button event that just closed the dashboard
sleep 90

lipc-wait-event com.lab126.powerd goingToScreenSaver >/dev/null 2>&1 || exit 1
rm -f "$WATCH_PID"
log "watcher: Kindle going to sleep -> dashboard"
lipc-set-prop com.lab126.powerd wakeUp 1 2>/dev/null
exec /bin/sh "$EXT_DIR/bin/dash.sh"
