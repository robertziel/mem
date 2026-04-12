### Cron Jobs

**Cron expression format:**
```
* * * * *
| | | | |
| | | | +-- Day of week (0-7, Sun=0 or 7)
| | | +---- Month (1-12)
| | +------ Day of month (1-31)
| +-------- Hour (0-23)
+---------- Minute (0-59)
```

**Common schedules:**
- `0 * * * *` - every hour
- `*/5 * * * *` - every 5 minutes
- `0 2 * * *` - daily at 2:00 AM
- `0 0 * * 0` - weekly on Sunday midnight
- `0 0 1 * *` - first of every month
- `30 9 * * 1-5` - weekdays at 9:30 AM

**Managing cron:**
- `crontab -e` - edit current user's crontab
- `crontab -l` - list current crontab
- `crontab -r` - remove all cron jobs
- System-wide: `/etc/crontab`, `/etc/cron.d/`
- Drop-in dirs: `/etc/cron.daily/`, `/etc/cron.hourly/`

**Best practices:**
```bash
# Always set PATH and redirect output
PATH=/usr/local/bin:/usr/bin:/bin
0 2 * * * /opt/scripts/backup.sh >> /var/log/backup.log 2>&1

# Use flock to prevent overlapping runs
* * * * * flock -n /tmp/job.lock /opt/scripts/job.sh

# Use MAILTO for error notifications
MAILTO=ops@example.com
```

**systemd timers (modern alternative):**
```ini
# /etc/systemd/system/backup.timer
[Timer]
OnCalendar=daily
Persistent=true   # run missed executions after downtime

[Install]
WantedBy=timers.target
```
- `systemctl enable --now backup.timer`
- `systemctl list-timers` - list all timers

**Rule of thumb:** Use `flock` to prevent overlap, always redirect output, prefer systemd timers on modern systems for better logging and dependency management.
