@echo off
rem ============================================================================
rem itch-release.cmd - launcher for the interactive itch release tool.
rem
rem Controls WHAT reaches itch: deploy a snapshot at a chosen commit, or deploy
rem the tip with specific commits reverted (e.g. hide features B,C so itch gets
rem A+D). It shows recent commits + their FB.VERSION, prompts for a choice, runs
rem deploy.cmd on the arranged tree, then returns you to your branch.
rem
rem play.fallowborn.com is NOT affected - it deploys from pushed origin/main.
rem Private tool; lives in notes\ (git-ignored), never ships.
rem
rem Usage:  notes\itch-release.cmd          (shows the last 20 commits)
rem         notes\itch-release.cmd -Count 40
rem ============================================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0itch-release.ps1" %*
