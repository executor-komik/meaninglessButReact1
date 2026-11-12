from __future__ import annotations

import getpass

from fastapi import HTTPException

from app.hotel_auth import create_admin, initialize_database


def main() -> None:
    initialize_database()
    user_id = input("Admin User ID (5–20 letters, numbers, _ or -): ").strip()
    name = input("Admin display name: ").strip()
    password = getpass.getpass("Admin password (8–30 characters, uppercase, lowercase, special): ")
    confirmation = getpass.getpass("Confirm admin password: ")
    if password != confirmation:
        raise SystemExit("Passwords do not match.")

    try:
        create_admin(user_id, name, password)
    except ValueError as error:
        raise SystemExit(str(error)) from error
    except HTTPException as error:
        raise SystemExit(str(error.detail)) from error
    print(f"Admin account {user_id} was created.")


if __name__ == "__main__":
    main()
