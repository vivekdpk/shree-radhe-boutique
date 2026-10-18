import pytest
from pydantic import ValidationError
from app.schemas.schemas import OrderCreate, OrderUpdate


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


def test_order_update_accepts_status_and_payment_edit():
    payload = OrderUpdate(status="ready", advance=250)
    assert payload.model_dump(exclude_unset=True) == {"status": "ready", "advance": 250.0}
