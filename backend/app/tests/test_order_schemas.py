import pytest
from pydantic import ValidationError
from app.schemas.schemas import CustomerListOut, InquiryCreate, InquiryStatusUpdate, OrderCreate, OrderPaymentCreate, OrderUpdate, SiteThemeUpdate
from app.services.payments import validate_payment_amount


def test_order_create_trims_garment_name_and_defaults_advance():
    payload = OrderCreate(garment_name="  Saree blouse  ", due_date="2026-11-01T18:00:00Z", price=1200)
    assert payload.garment_name == "Saree blouse"
    assert payload.advance == 0
    assert payload.status == "new"


def test_order_rejects_advance_greater_than_price():
    with pytest.raises(ValidationError):
        OrderCreate(garment_name="Blouse", due_date="2026-11-01T18:00:00Z", price=1000, advance=1001)


def test_order_rejects_unknown_status():
    with pytest.raises(ValidationError):
        OrderCreate(garment_name="Blouse", due_date="2026-11-01T18:00:00Z", price=1000, status="unknown")


def test_order_update_accepts_status_but_payment_is_not_editable():
    payload = OrderUpdate(status="ready")
    assert payload.model_dump(exclude_unset=True) == {"status": "ready"}
    with pytest.raises(ValidationError):
        OrderUpdate(advance=250)


def test_payment_requires_positive_amount_and_supported_method():
    assert OrderPaymentCreate(amount=250, method="upi").method == "upi"
    with pytest.raises(ValidationError):
        OrderPaymentCreate(amount=0)
    with pytest.raises(ValidationError):
        OrderPaymentCreate(amount=250, method="cheque")


def test_payment_note_is_trimmed_and_blank_note_becomes_empty():
    assert OrderPaymentCreate(amount=250, note="  UPI ref 123  ").note == "UPI ref 123"
    assert OrderPaymentCreate(amount=250, note="  ").note is None


def test_payment_balance_uses_cents_and_rejects_overpayment():
    assert validate_payment_amount(0.10, 99.90, 100) == (10, 10000)
    with pytest.raises(ValueError, match="remaining balance"):
        validate_payment_amount(0.01, 99.99, 100 - 0.01)


def test_customer_list_items_include_order_totals():
    from datetime import datetime, timezone
    from uuid import uuid4

    customer = CustomerListOut(
        id=uuid4(), customer_code="SRB-000001", name="Riya Shah", gender="female",
        city="Jaipur", phone=None, alternate_phone=None, email=None, notes=None,
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),
        order_count=3, order_value=6500, amount_paid=3000, balance_due=3500,
    )
    assert customer.order_count == 3
    assert customer.order_value == 6500
    assert customer.amount_paid + customer.balance_due == customer.order_value


def test_public_inquiry_requires_and_trims_contact_fields():
    payload = InquiryCreate(
        name="  Asha Rao ", phone=" +91 98765 43210 ", email=" asha@example.com ",
        message="  I would like to ask about a fitting.  ",
    )
    assert payload.name == "Asha Rao"
    assert payload.phone == "+91 98765 43210"
    assert payload.email == "asha@example.com"
    assert payload.message == "I would like to ask about a fitting."


@pytest.mark.parametrize("contact", [
    {"name": "Asha", "phone": "123", "email": "asha@example.com", "message": "Hello"},
    {"name": "Asha", "phone": "9876543210", "email": "not-an-email", "message": "Hello"},
    {"name": "Asha", "phone": "9876543210", "email": "asha@example.com", "message": "  "},
])
def test_public_inquiry_rejects_invalid_contact_details(contact):
    with pytest.raises(ValidationError):
        InquiryCreate(**contact)


def test_inquiry_status_is_restricted_to_supported_values():
    assert InquiryStatusUpdate(status="archived").status == "archived"
    with pytest.raises(ValidationError):
        InquiryStatusUpdate(status="deleted")


@pytest.mark.parametrize("theme", ["forest", "rose", "plum", "terracotta", "indigo", "black-blush"])
def test_site_theme_accepts_all_six_palettes(theme):
    assert SiteThemeUpdate(theme=theme).theme == theme


def test_site_theme_rejects_unknown_palette():
    with pytest.raises(ValidationError):
        SiteThemeUpdate(theme="neon")
