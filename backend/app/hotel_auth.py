from __future__ import annotations

import base64
import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Literal

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator


router = APIRouter(prefix="/api/auth", tags=["authentication"])
COOKIE_NAME = "hotel_session"
SESSION_LIFETIME_SECONDS = 12 * 60 * 60
PASSWORD_ITERATIONS = 600_000
PASSWORD_PATTERN = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,30}$")
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
USER_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{5,20}$")


class CustomerRegistration(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=50)
    email: str = Field(min_length=3, max_length=254)
    phone_country_code: str = Field(pattern=r"^\+\d{1,4}$")
    phone_number: str = Field(pattern=r"^\d{10}$")
    address: str = Field(min_length=1, max_length=500)
    password: str = Field(min_length=8, max_length=30)

    @field_validator("name", "email", "address")
    @classmethod
    def trim_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field cannot be blank.")
        return normalized

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not EMAIL_PATTERN.fullmatch(normalized):
            raise ValueError("Enter a valid email address.")
        return normalized


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: str = Field(min_length=5, max_length=20)
    password: str = Field(min_length=1, max_length=30)
    role: Literal["customer", "admin"]

    @field_validator("user_id")
    @classmethod
    def validate_user_id(cls, value: str) -> str:
        normalized = value.strip()
        if not USER_ID_PATTERN.fullmatch(normalized):
            raise ValueError("User ID may contain letters, numbers, underscores, and hyphens.")
        return normalized


def database_path() -> Path:
    configured_path = os.environ.get("HOTEL_DATABASE_PATH")
    if configured_path:
        return Path(configured_path).expanduser().resolve()
    return Path(__file__).resolve().parents[1] / ".data" / "hotel.db"


@contextmanager
def database() -> Iterator[sqlite3.Connection]:
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 10000")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database() -> None:
    with database() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                role TEXT NOT NULL CHECK (role IN ('customer', 'admin')),
                name TEXT NOT NULL,
                email TEXT COLLATE NOCASE,
                phone_country_code TEXT,
                phone_number TEXT,
                address TEXT,
                password_hash TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                UNIQUE (phone_country_code, phone_number)
            );
            CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
                ON users(email COLLATE NOCASE) WHERE email IS NOT NULL;
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
            """
        )


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    encoded_salt = base64.urlsafe_b64encode(salt).decode("ascii")
    encoded_digest = base64.urlsafe_b64encode(digest).decode("ascii")
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${encoded_salt}${encoded_digest}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iterations_text, salt_text, expected_text = password_hash.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iterations_text)
        if not 1 <= iterations <= PASSWORD_ITERATIONS:
            return False
        salt = base64.urlsafe_b64decode(salt_text.encode("ascii"))
        expected = base64.urlsafe_b64decode(expected_text.encode("ascii"))
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    except (ValueError, TypeError, UnicodeError):
        return False
    return hmac.compare_digest(actual, expected)


def validate_password(password: str) -> None:
    if not PASSWORD_PATTERN.fullmatch(password):
        raise HTTPException(
            status_code=422,
            detail="Password must be 8–30 characters and include an uppercase letter, a lowercase letter, and a special character.",
        )


def public_user(row: sqlite3.Row) -> dict[str, str]:
    return {
        "user_id": row["user_id"],
        "name": row["name"],
        "role": row["role"],
    }


def _new_customer_id(connection: sqlite3.Connection) -> str:
    for _ in range(10):
        candidate = f"C{secrets.randbelow(100_000_000_000):011d}"
        exists = connection.execute(
            "SELECT 1 FROM users WHERE user_id = ?",
            (candidate,),
        ).fetchone()
        if exists is None:
            return candidate
    raise HTTPException(status_code=503, detail="Could not allocate a customer ID. Please try again.")


def create_customer(payload: CustomerRegistration) -> dict[str, str]:
    validate_password(payload.password)
    password_hash = hash_password(payload.password)
    try:
        with database() as connection:
            user_id = _new_customer_id(connection)
            connection.execute(
                """
                INSERT INTO users (
                    user_id, role, name, email, phone_country_code,
                    phone_number, address, password_hash, created_at
                ) VALUES (?, 'customer', ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    payload.name,
                    payload.email,
                    payload.phone_country_code,
                    payload.phone_number,
                    payload.address,
                    password_hash,
                    int(time.time()),
                ),
            )
            row = connection.execute(
                "SELECT user_id, name, role FROM users WHERE user_id = ?",
                (user_id,),
            ).fetchone()
            if row is None:
                raise RuntimeError("The newly created customer could not be read.")
            return public_user(row)
    except sqlite3.IntegrityError as error:
        raise HTTPException(
            status_code=409,
            detail="An account already uses that email address or mobile number.",
        ) from error


def create_admin(user_id: str, name: str, password: str) -> None:
    normalized_id = user_id.strip()
    normalized_name = name.strip()
    if not USER_ID_PATTERN.fullmatch(normalized_id):
        raise ValueError("Admin User ID must be 5–20 letters, numbers, underscores, or hyphens.")
    if not normalized_name or len(normalized_name) > 50:
        raise ValueError("Admin name must be between 1 and 50 characters.")
    validate_password(password)
    with database() as connection:
        try:
            connection.execute(
                """
                INSERT INTO users (user_id, role, name, password_hash, created_at)
                VALUES (?, 'admin', ?, ?, ?)
                """,
                (normalized_id, normalized_name, hash_password(password), int(time.time())),
            )
        except sqlite3.IntegrityError as error:
            raise ValueError("That User ID is already in use.") from error


def session_cookie_is_secure() -> bool:
    return os.environ.get("HOTEL_COOKIE_SECURE", "").strip().lower() in {"1", "true", "yes"}


def _token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _find_session_user(token: str | None) -> dict[str, str] | None:
    if token is None:
        return None
    with database() as connection:
        row = connection.execute(
            """
            SELECT users.user_id, users.name, users.role
            FROM sessions
            JOIN users ON users.user_id = sessions.user_id
            WHERE sessions.token_hash = ? AND sessions.expires_at > ?
            """,
            (_token_digest(token), int(time.time())),
        ).fetchone()
    if row is None:
        return None
    return public_user(row)


def get_authenticated_user(
    token: str | None = Cookie(default=None, alias=COOKIE_NAME),
) -> dict[str, str]:
    user = _find_session_user(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Your session has expired. Please sign in again.")
    return user


def _admin_is_provisioned(connection: sqlite3.Connection) -> bool:
    return connection.execute("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1").fetchone() is not None


@router.post("/register", status_code=201)
def register_customer(payload: CustomerRegistration) -> dict[str, object]:
    user = create_customer(payload)
    return {"message": "Customer registration successful.", "user": user}


@router.post("/login")
def login(payload: LoginRequest, response: Response) -> dict[str, dict[str, str]]:
    with database() as connection:
        if payload.role == "admin" and not _admin_is_provisioned(connection):
            raise HTTPException(
                status_code=503,
                detail="Admin access has not been set up yet. Ask the application operator to provision an admin account.",
            )
        row = connection.execute(
            "SELECT * FROM users WHERE user_id = ? AND role = ?",
            (payload.user_id, payload.role),
        ).fetchone()
        if row is None or not verify_password(payload.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="User ID or password is incorrect.")

        token = secrets.token_urlsafe(32)
        now = int(time.time())
        connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))
        connection.execute(
            "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (
                _token_digest(token),
                row["user_id"],
                now + SESSION_LIFETIME_SECONDS,
            ),
        )
        user = public_user(row)

    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=SESSION_LIFETIME_SECONDS,
        httponly=True,
        secure=session_cookie_is_secure(),
        samesite="lax",
        path="/",
    )
    return {"user": user}


@router.get("/me")
def current_user(user: dict[str, str] = Depends(get_authenticated_user)) -> dict[str, dict[str, str]]:
    return {"user": user}


@router.get("/session")
def current_session(
    response: Response,
    token: str | None = Cookie(default=None, alias=COOKIE_NAME),
) -> dict[str, dict[str, str] | None]:
    user = _find_session_user(token)
    if token is not None and user is None:
        response.delete_cookie(
            key=COOKIE_NAME,
            httponly=True,
            secure=session_cookie_is_secure(),
            samesite="lax",
            path="/",
        )
    return {"user": user}


@router.post("/logout", status_code=204)
def logout(
    response: Response,
    token: str | None = Cookie(default=None, alias=COOKIE_NAME),
) -> Response:
    if token is not None:
        with database() as connection:
            connection.execute("DELETE FROM sessions WHERE token_hash = ?", (_token_digest(token),))
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=True,
        secure=session_cookie_is_secure(),
        samesite="lax",
        path="/",
    )
    response.status_code = 204
    return response
