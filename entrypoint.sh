#!/bin/sh
/bin/frontend-exporter &
exec nginx -g "daemon off;"
