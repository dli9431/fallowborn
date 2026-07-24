<#
  itch-release.ps1 - interactive control over WHAT reaches itch.

  Why this exists: the two deploy targets differ.
    * play.fallowborn.com (Coolify) auto-deploys from PUSHED origin/main.
    * itch (deploy.cmd) ships the WORKING TREE on disk - it never looks at git.
  So to give itch a different slice than main, we arrange the working tree,
  call deploy.cmd, then restore the branch. This script does that safely.

  Two modes:
    snapshot - deploy the tree exactly as of commit N (drops everything after N).
               Always conflict-free (it is just an ancestor checkout).
    exclude  - deploy the tip with chosen commits reverted, e.g. hide features
               B and C so itch gets A+D. Only clean if those commits are
               independent; a conflicting revert aborts the run untouched.

  Safety: refuses to run on a dirty tree, and ALWAYS returns to your branch
  (even on error or a failed deploy) via the finally block.

  Keep this file ASCII-only: Windows PowerShell 5.1 reads BOM-less scripts as
  ANSI, and non-ASCII punctuation (em-dash, curly quotes) corrupts parsing.

  Private tool - lives in notes\ (git-ignored), never ships. Run it with
  notes\itch-release.cmd  (or: powershell -File notes\itch-release.ps1).
#>

param([int]$Count = 20)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot   # notes\ -> repo root
Set-Location $root

# --- guard: clean working tree (uncommitted tracked changes would ride along) ---
git diff --quiet;          $dirty = ($LASTEXITCODE -ne 0)
git diff --cached --quiet; if ($LASTEXITCODE -ne 0) { $dirty = $true }
if ($dirty) {
  Write-Host "Uncommitted changes present - commit or stash before deploying to itch." -ForegroundColor Red
  exit 1
}

# --- current branch (restored at the end) ---
$startRef = (git rev-parse --abbrev-ref HEAD).Trim()
if ($startRef -eq 'HEAD') { $startRef = 'main' }   # detached -> default to main

# --- what this tool last shipped to itch (marker from a previous run) ---
$markerPath = Join-Path $PSScriptRoot 'itch-live.txt'
$live = ''
if (Test-Path $markerPath) { $live = (Get-Content $markerPath -Raw).Trim() }

# --- unpushed reminder: play.fallowborn.com only has PUSHED commits ---
$ahead = ''
$aheadOut = git rev-list --count "origin/main..$startRef" 2>$null
if ($aheadOut) { $ahead = $aheadOut.Trim() }

Write-Host ""
Write-Host "  itch release - choose what ships to itch (play.fallowborn.com is separate)" -ForegroundColor Cyan
if ($ahead -and $ahead -ne '0') {
  Write-Host "  note: $startRef is $ahead commit(s) ahead of origin/main - NOT on play.fallowborn.com until you push." -ForegroundColor DarkYellow
}
Write-Host ""

# --- gather recent commits (with each commit's FB.VERSION) ---
$fmt = '%h' + [char]0x1f + '%s' + [char]0x1f + '%ad'
$logLines = git log -n $Count --date=short --format=$fmt $startRef
$rows = @()
$i = 1
foreach ($line in $logLines) {
  if (-not $line) { continue }
  $p = $line -split ([char]0x1f)
  $sha = $p[0]
  $ver = '?'
  $mj = (git show "$($sha):js/main.js" 2>$null) -join "`n"
  if ($mj) {
    $m = [regex]::Match($mj, "FB\.VERSION\s*=\s*'([^']+)'")
    if ($m.Success) { $ver = $m.Groups[1].Value }
  }
  $rows += [pscustomobject]@{ Idx=$i; Sha=$sha; Ver=$ver; Date=$p[2]; Subject=$p[1] }
  $i++
}

# --- display table ---
Write-Host ("  {0,3}  {1,-8} {2,-9} {3,-10} {4}" -f '#','commit','version','date','subject') -ForegroundColor DarkGray
foreach ($r in $rows) {
  $mark = ''
  if ($live -and $r.Sha -and $live.StartsWith($r.Sha)) { $mark = '   <== last shipped to itch' }
  $subj = $r.Subject
  if ($subj.Length -gt 52) { $subj = $subj.Substring(0,49) + '...' }
  $out = "  {0,3}) {1,-8} {2,-9} {3,-10} {4}{5}" -f $r.Idx, $r.Sha, $r.Ver, $r.Date, $subj, $mark
  if ($mark) { Write-Host $out -ForegroundColor Green } else { Write-Host $out }
}

Write-Host ""
Write-Host "  <number>   deploy the snapshot AT that commit (drops everything after it)"
Write-Host "  x 2,4      deploy the tip with commits #2 and #4 reverted (hide those features)"
Write-Host "  q          quit"
$choice = (Read-Host "  choice").Trim()
if (-not $choice -or $choice -eq 'q') { Write-Host "  cancelled."; exit 0 }

# --- resolve the choice into a mode ---
$mode = ''; $snapSha = ''; $snapVer = ''; $exclude = @()
if ($choice -match '^\s*x\s+(.+)$') {
  $mode = 'exclude'
  foreach ($tok in ($matches[1] -split '[,\s]+')) {
    if (-not $tok) { continue }
    $n = 0
    if (-not [int]::TryParse($tok, [ref]$n) -or $n -lt 1 -or $n -gt $rows.Count) {
      Write-Host "  bad commit number: $tok" -ForegroundColor Red; exit 1
    }
    $exclude += $rows[$n-1]
  }
  if (-not $exclude.Count) { Write-Host "  nothing to exclude." -ForegroundColor Red; exit 1 }
}
elseif ($choice -match '^\d+$') {
  $n = [int]$choice
  if ($n -lt 1 -or $n -gt $rows.Count) { Write-Host "  out of range." -ForegroundColor Red; exit 1 }
  $mode = 'snapshot'; $snapSha = $rows[$n-1].Sha; $snapVer = $rows[$n-1].Ver
}
else { Write-Host "  unrecognised input." -ForegroundColor Red; exit 1 }

# --- critical section: move the tree, deploy, ALWAYS restore ---
$tmpBranch = ''; $deployed = $false; $deployDesc = ''
try {
  if ($mode -eq 'snapshot') {
    Write-Host ""
    Write-Host ("  snapshot {0} (v{1}) -> itch; everything after it is dropped." -f $snapSha, $snapVer) -ForegroundColor Cyan
    git checkout -q $snapSha
    if ($LASTEXITCODE -ne 0) { throw "checkout $snapSha failed" }
    $deployDesc = $snapSha
  }
  else {
    $tmpBranch = '__itch_build'
    git branch -D $tmpBranch 2>$null | Out-Null    # clear any stale temp from a crashed run
    git checkout -q -b $tmpBranch $startRef
    if ($LASTEXITCODE -ne 0) { throw "could not create temp branch" }
    foreach ($r in ($exclude | Sort-Object Idx)) {  # Idx ascending = newest first = fewer conflicts
      Write-Host ("  reverting #{0} {1}  {2}" -f $r.Idx, $r.Sha, $r.Subject)
      git revert --no-edit $r.Sha
      if ($LASTEXITCODE -ne 0) {
        git revert --abort 2>$null | Out-Null
        throw ("revert of {0} conflicts - it is not independent of the other commits. Nothing deployed." -f $r.Sha)
      }
    }
    $deployDesc = "$startRef minus " + (($exclude | Sort-Object Idx | ForEach-Object { $_.Sha }) -join ',')
  }

  # confirm the resulting cache-bust version before pushing
  $mjNow = Get-Content (Join-Path $root 'js/main.js') -Raw
  $vmNow = [regex]::Match($mjNow, "FB\.VERSION\s*=\s*'([^']+)'")
  $curVer = if ($vmNow.Success) { $vmNow.Groups[1].Value } else { '?' }
  Write-Host ""
  Write-Host ("  itch will receive FB.VERSION {0}." -f $curVer) -ForegroundColor Yellow
  Write-Host "  (If itch already had a DIFFERENT build under this version, its cache goes stale - bump if unsure.)" -ForegroundColor DarkYellow
  $go = (Read-Host "  push to itch now? [y/N]").Trim().ToLower()
  if ($go -eq 'y') {
    & (Join-Path $PSScriptRoot 'deploy.cmd')
    if ($LASTEXITCODE -ne 0) { throw "deploy.cmd failed (exit $LASTEXITCODE)" }
    $deployed = $true
  } else {
    Write-Host "  push skipped."
  }
}
finally {
  git checkout -q $startRef 2>$null
  if ($tmpBranch) { git branch -D $tmpBranch 2>$null | Out-Null }
}

if ($deployed) {
  Set-Content -Path $markerPath -Value $deployDesc -Encoding UTF8
  Write-Host ""
  Write-Host ("  done - itch now has: {0}" -f $deployDesc) -ForegroundColor Green
}
Write-Host ("  back on {0}." -f $startRef)
