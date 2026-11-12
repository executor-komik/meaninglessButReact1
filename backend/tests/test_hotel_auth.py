from __future__ import annotations

import os
import tempfile
import unittest
from unittest.mock import patch

from fastapi import HTTPException

from app.hotel_auth import (
    CustomerRegistration,
    create_admin,
    create_customer,
    database,
    hash_password,
    initialize_database,
    verify_password,
)


class HotelAuthTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.environment = patch.dict(
            os.environ,
            {"HOTEL_DATABASE_PATH": os.path.join(self.temporary_directory.name, "hotel.db")},
        )
        self.environment.start()
        initialize_database()

    def tearDown(self) -> None:
        self.environment.stop()
        self.temporary_directory.cleanup()

    def test_password_hash_is_salted_and_verified(self) -> None:
        first_hash = hash_password("ValidPass!1")
        second_hash = hash_password("ValidPass!1")

        self.assertNotEqual(first_hash, second_hash)
        self.assertTrue(verify_password("ValidPass!1", first_hash))
        self.assertFalse(verify_password("WrongPass!1", first_hash))

    def test_customer_id_is_generated_and_customer_is_persisted(self) -> None:
        user = create_customer(
            CustomerRegistration(
                name="Taylor Customer",
                email="Taylor@example.com",
                phone_country_code="+1",
                phone_number="4155550134",
                address="1 Market Street",
                password="ValidPass!1",
            )
        )

        self.assertRegex(user["user_id"], r"^C\d{11}$")
        self.assertEqual(user["role"], "customer")
        with database() as connection:
            stored = connection.execute(
                "SELECT email, password_hash FROM users WHERE user_id = ?",
                (user["user_id"],),
            ).fetchone()
        self.assertEqual(stored["email"], "taylor@example.com")
        self.assertNotEqual(stored["password_hash"], "ValidPass!1")

    def test_duplicate_email_is_rejected(self) -> None:
        registration = CustomerRegistration(
            name="Taylor Customer",
            email="taylor@example.com",
            phone_country_code="+1",
            phone_number="4155550134",
            address="1 Market Street",
            password="ValidPass!1",
        )
        create_customer(registration)
        duplicate = registration.model_copy(
            update={"phone_number": "4155550199", "email": "TAYLOR@example.com"}
        )

        with self.assertRaises(HTTPException) as raised:
            create_customer(duplicate)

        self.assertEqual(raised.exception.status_code, 409)

    def test_admin_can_only_be_provisioned_server_side(self) -> None:
        create_admin("hotel-admin", "Hotel Admin", "ValidPass!1")

        with database() as connection:
            admin_count = connection.execute(
                "SELECT COUNT(*) FROM users WHERE role = 'admin'"
            ).fetchone()[0]

        self.assertEqual(admin_count, 1)

    def test_admin_user_id_must_be_unique(self) -> None:
        create_admin("hotel-admin", "Hotel Admin", "ValidPass!1")

        with self.assertRaisesRegex(ValueError, "already in use"):
            create_admin("hotel-admin", "Another Admin", "ValidPass!2")


if __name__ == "__main__":
    unittest.main()
