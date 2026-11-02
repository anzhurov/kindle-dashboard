#!/bin/sh
. /mnt/us/dashboard/bin/common.sh

INTERVAL=$((INTERVAL_MIN * 60))
cycle=0

wifi_up() {
  lipc-set-prop com.lab126.cmd wirelessEnable 1
  i=0
  while [ "$(lipc-get-prop com.lab126.wifid cmState 2>/dev/null)" != "CONNECTED" ]; do
    i=$((i + 1))
    [ "$i" -ge "$WIFI_TIMEOUT" ] && return 1
    sleep 1
  done
}

fetch() {
  url="$DASH_URL?t=$(date +%s)"
  tmp=/tmp/dash.new.png
  curl -fsSL --max-time 30 -o "$tmp" "$url" \
    || curl -kfsSL --max-time 30 -o "$tmp" "$url" \
    || return 1
  mv "$tmp" "$IMG"
}

show() {
  if [ $((cycle % FULL_REFRESH_EVERY)) -eq 0 ]; then
    eips -c
    eips -f -g "$IMG"
  else
    eips -g "$IMG"
  fi
}

overlay() {
  bat=$(gasgauge-info -c 2>/dev/null | tr -dc 0-9)
  msg=""
  [ -n "$bat" ] && [ "$bat" -le "$LOW_BATTERY" ] && msg="LOW BATTERY $bat%"
  [ -n "$1" ] && msg="$msg $1"
  [ -n "$msg" ] && eips 1 1 " $msg "
}

# returns 0 if the device woke up by RTC alarm, 1 if woken early (power button)
rtc_sleep() {
  t0=$(date +%s)
  if [ -e /sys/devices/platform/mxc_rtc.0/wakeup_enable ]; then
    echo -n "$1" > /sys/devices/platform/mxc_rtc.0/wakeup_enable
    echo mem > /sys/power/state
  elif [ -e /sys/class/rtc/rtc0/wakealarm ]; then
    echo 0 > /sys/class/rtc/rtc0/wakealarm
    echo "+$1" > /sys/class/rtc/rtc0/wakealarm
    echo mem > /sys/power/state
  else
    sleep "$1"
    return 0
  fi
  slept=$(($(date +%s) - t0))
  [ "$slept" -lt 5 ] && { log "suspend failed, falling back to sleep"; sleep "$1"; return 0; }
  [ "$slept" -ge $(($1 - 30)) ]
}

back_to_reader() {
  log "exit -> reader"
  rm -f "$DASH_PID"
  lipc-set-prop com.lab126.powerd preventScreenSaver 0
  framework_start
  if [ "$AUTO_RETURN" = 1 ]; then
    nohup /bin/sh "$EXT_DIR/bin/watch.sh" >/dev/null 2>&1 &
  fi
  exit 0
}

trap back_to_reader TERM INT

echo $$ > "$DASH_PID"
log "dashboard start"
lipc-set-prop com.lab126.powerd preventScreenSaver 1
sleep 2
framework_stop
sleep 3

while true; do
  note=""
  if wifi_up && fetch; then
    log "updated"
  else
    note="OFFLINE"
    log "fetch failed"
  fi
  [ -f "$IMG" ] && show
  overlay "$note"
  cycle=$((cycle + 1))

  rtc_sleep "$INTERVAL" || back_to_reader
done
