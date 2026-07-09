#!/usr/bin/env python3
"""Kironomics session reporter — reads Kiro's state.vscdb and sends to the backend."""
import os, sys, ssl, json, sqlite3, urllib.request, urllib.error, time
from pathlib import Path

API_KEY  = "d8fa830fad8a924069f96b9897f8449a9bda7bc39ca5cd34bd39efec67525fbf"
API_BASE = "https://2q4zt5zl9e.execute-api.us-east-1.amazonaws.com/dev"

# ── Resolve counter directory — C:\tmp on Windows, /tmp elsewhere ─────────────
if sys.platform.startswith("win"):
    TMP = Path("C:/tmp")
else:
    TMP = Path("/tmp")

TMP.mkdir(parents=True, exist_ok=True)


def read_int(path: Path, default: int = 0) -> int:
    try:
        return int(path.read_text().strip())
    except Exception:
        return default


tools   = read_int(TMP / "kironomics_tools")
prompts = read_int(TMP / "kironomics_prompts")
start   = read_int(TMP / "kironomics_start", int(time.time()))
elapsed = max(0, int(time.time()) - start)

print(f"[kironomics] tools={tools}  prompts={prompts}  elapsed={elapsed}s")

# ── Read Kiro's state.vscdb for credit/plan data ──────────────────────────────
plan_data: dict = {}
try:
    home = Path.home()
    if sys.platform == "darwin":
        db_path = home / "Library/Application Support/Kiro/User/globalStorage/state.vscdb"
    elif sys.platform.startswith("win"):
        db_path = Path(os.environ.get("APPDATA", str(home / "AppData/Roaming"))) / "Kiro/User/globalStorage/state.vscdb"
    else:
        db_path = home / ".config/Kiro/User/globalStorage/state.vscdb"

    if db_path.exists():
        conn = sqlite3.connect(f"file:{db_path}?mode=ro&immutable=1", uri=True)
        row  = conn.execute(
            "SELECT value FROM ItemTable WHERE key=?", ("kiro.kiroAgent",)
        ).fetchone()
        conn.close()
        if row:
            state  = json.loads(row[0])
            usage  = state.get("kiro.resourceNotifications.usageState", {})
            bdowns = usage.get("usageBreakdowns", [])
            if bdowns:
                bd = bdowns[0]
                plan_data = {
                    "currentUsage":    bd.get("currentUsage"),
                    "usageLimit":      bd.get("usageLimit"),
                    "percentageUsed":  bd.get("percentageUsed"),
                    "resetDate":       bd.get("resetDate"),
                }
        print(f"[kironomics] plan_data={plan_data}")
except Exception as exc:
    print(f"[kironomics] state.vscdb read failed (ok): {exc}")

# ── Build payload ─────────────────────────────────────────────────────────────
payload = {
    "token":            API_KEY,
    "tool_calls":       tools,
    "prompts":          prompts,
    "elapsed_seconds":  elapsed,
    **plan_data,
}

# ── TLS context — try certifi first, fall back to default, then unverified ────
def _ssl_ctx():
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        try:
            return ssl.create_default_context()
        except Exception:
            return None


# ── POST to Kironomics backend ────────────────────────────────────────────────
try:
    req = urllib.request.Request(
        f"{API_BASE}/kironomics/session",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=5, context=_ssl_ctx()).read()
        print("[kironomics] ✓ session reported")
    except (ssl.SSLError, urllib.error.URLError) as exc:
        if "certificate verify failed" in str(exc).lower():
            # Retry without cert verification (payload is only counters, over HTTPS)
            urllib.request.urlopen(
                req, timeout=5,
                context=ssl._create_unverified_context()  # noqa: SLF001
            ).read()
            print("[kironomics] ✓ session reported (unverified TLS)")
        else:
            raise
except Exception as exc:
    print(f"[kironomics] report failed (non-fatal): {exc}")

# ── Clean up counter files ────────────────────────────────────────────────────
for name in ("kironomics_tools", "kironomics_prompts", "kironomics_start"):
    try:
        (TMP / name).unlink()
    except Exception:
        pass

print("[kironomics] counters cleared")
