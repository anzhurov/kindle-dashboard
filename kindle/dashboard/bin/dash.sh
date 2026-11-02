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

get() {
  url="$1?t=$(date +%s)"
  curl -fsSL --max-time 30 -o "$2" "$url" || curl -kfsSL --max-time 30 -o "$2" "$url"
}

fetch() {
  get "$DASH_URL" /tmp/dash.new.png || return 1
  mv /tmp/dash.new.png "$IMG"
}

# pulls bin/, dash.conf and battery icons published next to dash.png, restarts if anything changed
self_update() {
  base="${DASH_URL%/*}/kindle"
  get "$base/version" /tmp/dash-version || return 0
  [ "$(cat /tmp/dash-version)" = "$(cat "$EXT_DIR/version" 2>/dev/null)" ] && return 0
  get "$base/files" /tmp/dash-files || return 0
  rm -rf /tmp/dash-upd
  while read -r f; do
    [ -z "$f" ] && continue
    mkdir -p "/tmp/dash-upd/$(dirname "$f")"
    get "$base/$f" "/tmp/dash-upd/$f" || { log "update: failed to get $f"; return 0; }
    case "$f" in *.sh) sh -n "/tmp/dash-upd/$f" || { log "update: bad $f"; return 0; } ;; esac
  done < /tmp/dash-files
  cp -r /tmp/dash-upd/. "$EXT_DIR/"
  cp /tmp/dash-version "$EXT_DIR/version"
  log "update: installed $(cat "$EXT_DIR/version"), restarting"
  exec /bin/sh "$EXT_DIR/bin/dash.sh"
}

show() {
  if [ $((cycle % FULL_REFRESH_EVERY)) -eq 0 ]; then
    eips -c
    eips -f -g "$IMG"
    # let the full flash finish before drawing the battery over it
    sleep 2
  else
    eips -g "$IMG"
  fi
}

find_fbink() {
  for f in "$(command -v fbink 2>/dev/null)" /mnt/us/libkh/bin/fbink /usr/bin/fbink \
           /mnt/us/usbnet/bin/fbink /mnt/us/extensions/MRInstaller/bin/K5/fbink; do
    [ -n "$f" ] && [ -x "$f" ] && { echo "$f"; return; }
  done
  find /mnt/us/libkh -name fbink -type f 2>/dev/null | head -n 1
}

battery() {
  b=$(lipc-get-prop com.lab126.powerd battLevel 2>/dev/null | tr -dc 0-9)
  [ -z "$b" ] && b=$(gasgauge-info -c 2>/dev/null | tr -dc 0-9)
  echo "$b"
}

# battery badge (percent + icon) in the top-right corner
draw_battery() {
  bat=$(battery)
  [ -z "$bat" ] && return
  icon="$EXT_DIR/battery/$bat.png"
  [ -f "$icon" ] || return
  if [ -n "$FBINK" ]; then
    "$FBINK" -q -g "file=$icon,x=$BATTERY_X,y=$BATTERY_Y" && return
  fi
  eips -g "$icon" -x "$BATTERY_X" -y "$BATTERY_Y"
}

# bottom-right corner, next to "Оновлено" in the footer
overlay() {
  [ -z "$1" ] && return
  if [ -n "$FBINK" ]; then
    "$FBINK" -q -S "$STATUS_SCALE" -x "-$((${#1} + 2))" -y -2 "$1" && return
  fi
  eips 1 1 " $1 "
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
FBINK=$(find_fbink)
STATUS_SCALE=${STATUS_SCALE:-4}
BATTERY_X=${BATTERY_X:-816}
BATTERY_Y=${BATTERY_Y:-58}
log "dashboard start $(cat "$EXT_DIR/version" 2>/dev/null) (fbink: ${FBINK:-none}, battery: $(battery)%)"
lipc-set-prop com.lab126.powerd preventScreenSaver 1
sleep 2
framework_stop
sleep 3

while true; do
  note=""
  if wifi_up && fetch; then
    log "updated"
    self_update
  else
    note="OFFLINE"
    log "fetch failed"
  fi
  [ -f "$IMG" ] && show
  draw_battery
  overlay "$note"
  cycle=$((cycle + 1))

  # e-ink updates are asynchronous: suspending mid-update leaves a half-drawn, smeared screen
  sleep 3
  rtc_sleep "$INTERVAL" || back_to_reader
done
