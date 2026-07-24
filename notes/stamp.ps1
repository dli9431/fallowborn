# ============================================================================
# stamp.ps1 - cache-bust the STAGED index.html for a Fallowborn release.
#
# Appends ?v=<FB.VERSION> to every css/js/data/mods asset URL in the staged
# index.html so browsers and the Cloudflare cache in front of play.fallowborn.com
# fetch fresh files on each release. The version becomes the cache key, so the
# FB.VERSION bump in js\main.js is what actually busts the cache.
#
# Operates ONLY on the temp staging copy passed in $Stage - never the repo copy.
# The committed index.html must stay query-string free so it still runs from
# file:// (a hard project rule). Called by deploy.cmd; not meant to be run alone.
# ============================================================================
param([Parameter(Mandatory = $true)][string]$Stage)

try {
    $ErrorActionPreference = 'Stop'

    # read the version out of the copy we are about to ship, so the stamp always
    # matches the shipped code exactly
    $mainJs = Join-Path $Stage 'js\main.js'
    $main = Get-Content -Raw -LiteralPath $mainJs
    if ($main -notmatch "FB\.VERSION\s*=\s*'([^']+)'") {
        throw "Could not find FB.VERSION in $mainJs"
    }
    $ver = $Matches[1]

    $idx = Join-Path $Stage 'index.html'
    $html = Get-Content -Raw -LiteralPath $idx

    # match src="js/..." / href="css/..." / src="data/..." / src="mods/...",
    # skipping any URL that already carries a ?query or #fragment
    $rx = [regex]'(?<attr>src|href)="(?<path>(?:css|js|data|mods)/[^"?#]+)"'
    $count = $rx.Matches($html).Count
    if ($count -eq 0) {
        throw "No stampable asset URLs found in $idx - aborting."
    }

    $html = $rx.Replace($html, {
            param($m)
            '{0}="{1}?v={2}"' -f $m.Groups['attr'].Value, $m.Groups['path'].Value, $ver
        })

    # UTF-8 without BOM, preserving exact content (no trailing newline added)
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($idx, $html, $utf8NoBom)

    Write-Host "  stamped $count asset URLs with ?v=$ver"
    exit 0
}
catch {
    Write-Error $_
    exit 1
}
