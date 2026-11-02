EXT_DIR=/mnt/us/dashboard
. "$EXT_DIR/dash.conf"

LOG="$EXT_DIR/dash.log"
IMG="$EXT_DIR/dash.png"
DASH_PID=/tmp/kindle-dash.pid
WATCH_PID=/tmp/kindle-dash-watch.pid

log() {
  [ -f "$LOG" ] && [ "$(wc -c < "$LOG")" -gt 200000 ] && mv "$LOG" "$LOG.old"
  echo "$(date '+%F %T') $*" >> "$LOG"
}

pid_alive() {
  [ -f "$1" ] && kill -0 "$(cat "$1")" 2>/dev/null
}

kill_pid() {
  pid_alive "$1" && kill "$(cat "$1")" 2>/dev/null
  rm -f "$1"
}

framework_stop() {
  stop lab126_gui 2>/dev/null || stop framework 2>/dev/null || /etc/init.d/framework stop
}

framework_start() {
  start lab126_gui 2>/dev/null || start framework 2>/dev/null || /etc/init.d/framework start
}
