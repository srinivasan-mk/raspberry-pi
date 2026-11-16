import json
import sys
import uuid
from typing import Dict, Any, Optional

def request_user_challenge(
    prompt_type: str,
    message: str,
    session_id: Optional[str] = None,
    timeout_seconds: int = 120
) -> Dict[str, Any]:
    """
    Halts execution, emits an INTERACTIVE_PROMPT to stdout for the Go daemon to publish,
    and blocks on stdin until the user submits their response via HiveMQ Cloud.
    """
    if not session_id:
        session_id = f"sess_otp_{uuid.uuid4().hex[:12]}"

    challenge_payload = {
        "type": "INTERACTIVE_PROMPT",
        "sessionId": session_id,
        "promptType": prompt_type,
        "message": message,
        "timeoutSeconds": timeout_seconds
    }

    # Print the prompt line to stdout and flush immediately so Go daemon detects it
    sys.stdout.write(json.dumps(challenge_payload) + "\n")
    sys.stdout.flush()

    sys.stderr.write(f"[Interactive] Awaiting user response for challenge '{session_id}' on stdin...\n")
    sys.stderr.flush()

    # Block and wait for response on stdin
    response_line = sys.stdin.readline()
    if not response_line:
        raise TimeoutError("Interactive challenge timed out: EOF received without response")

    try:
        response_data = json.loads(response_line.strip())
        return response_data
    except json.JSONDecodeError as e:
        # Fallback if raw string was passed
        return {"code": response_line.strip()}

def request_user_otp(message: str, session_id: Optional[str] = None, timeout_seconds: int = 120) -> str:
    """Convenience helper to prompt for a 6-digit OTP and return the string code."""
    res = request_user_challenge("OTP", message, session_id, timeout_seconds)
    code = res.get("code") or res.get("response", {}).get("code") or ""
    if not code:
        raise ValueError("Invalid OTP response received: 'code' field missing")
    return str(code).strip()
