# Host Utility: Minimal Chromium Kiosk for Raspberry Pi OS Lite

This utility provides a low-overhead Chromium browser setup on Raspbian Lite using **Cage (Wayland Kiosk Compositor)** and **WayVNC**.

Moved from the Pi-hole directory into `host-tools/kiosk-chrome` as part of domain segregation.

## Features
- Minimal dependencies (no full X11 desktop environment).
- Zero memory footprint when closed (all UI memory is reclaimed).
- Runs fullscreen on attached HDMI monitor or headless via remote VNC.

## Available Launchers
- `chrome`: Launch fullscreen on attached monitor.
- `chrome-vnc`: Launch on monitor with VNC server on port `5900`.
- `chrome-remote`: Headless VNC only (no monitor required).

## Installation
```bash
sudo bash install-chrome.sh
```
