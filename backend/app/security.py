import secrets
import bcrypt
from fastapi import HTTPException, Request, Response, status
from itsdangerous import BadSignature, URLSafeTimedSerializer
from app.core.config import settings

SESSION_COOKIE = "srb_session"
CSRF_COOKIE = "srb_csrf"
SESSION_MAX_AGE = 60 * 60 * 12


def serializer() -> URLSafeTimedSerializer:
    if len(settings.session_secret) < 32:
        raise RuntimeError("SESSION_SECRET must be at least 32 characters")
    return URLSafeTimedSerializer(settings.session_secret, salt="shree-radhe-boutique-session")


def verify_password(password: str) -> bool:
    if not settings.owner_password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), settings.owner_password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def issue_session(response: Response) -> None:
    token = serializer().dumps({"owner": True})
    csrf = secrets.token_urlsafe(32)
    response.set_cookie(
        SESSION_COOKIE, token, httponly=True, secure=settings.cookie_secure,
        samesite="strict", max_age=SESSION_MAX_AGE, path="/"
    )
    response.set_cookie(
        CSRF_COOKIE, csrf, httponly=False, secure=settings.cookie_secure,
        samesite="strict", max_age=SESSION_MAX_AGE, path="/"
    )


def clear_session(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/", samesite="strict")
    response.delete_cookie(CSRF_COOKIE, path="/", samesite="strict")


def require_owner(request: Request) -> dict:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        data = serializer().loads(token, max_age=SESSION_MAX_AGE)
    except BadSignature:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    if data.get("owner") is not True:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        csrf_cookie = request.cookies.get(CSRF_COOKIE)
        csrf_header = request.headers.get("X-CSRF-Token")
        if not csrf_cookie or not csrf_header or not secrets.compare_digest(csrf_cookie, csrf_header):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed")
        origin = request.headers.get("origin")
        allowed_origins = {
            value.strip().rstrip("/")
            for value in settings.frontend_origins.split(",")
            if value.strip()
        }
        if origin and origin.rstrip("/") not in allowed_origins:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Origin not allowed")
    return data
