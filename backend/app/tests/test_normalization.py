import re


def normalize_phone(phone: str | None) -> str | None:
    if not phone:
        return None
    return re.sub(r"\D", "", phone)


def test_phone_normalization():
    assert normalize_phone("+91 98765-43210") == "919876543210"
    assert normalize_phone(None) is None

from app.services.measurements import measurement_validation_error


def test_measurement_validation_accepts_valid_values():
    fields = [
        {"key": "chest", "required": True, "min": 10, "max": 80},
        {"key": "sleeve", "required": False, "min": 1, "max": 50},
    ]
    assert measurement_validation_error(fields, {"chest": 38.5, "sleeve": 24}) is None


def test_measurement_validation_requires_required_fields():
    fields = [{"key": "chest", "required": True, "min": 10, "max": 80}]
    assert measurement_validation_error(fields, {}) == {
        "code": "REQUIRED_FIELD", "field": "chest"
    }


def test_measurement_validation_rejects_unknown_keys():
    fields = [{"key": "chest", "required": False, "min": 10, "max": 80}]
    assert measurement_validation_error(fields, {"mystery": 30}) == {
        "code": "UNKNOWN_FIELDS", "fields": ["mystery"]
    }


def test_measurement_validation_rejects_non_positive_and_out_of_range_values():
    fields = [{"key": "chest", "required": False, "min": 10, "max": 80}]
    for value in (0, -1, 9.9, 80.1, float("nan"), float("inf")):
        error = measurement_validation_error(fields, {"chest": value})
        assert error and error["code"] == "INVALID_MEASUREMENT"


def test_measurement_validation_accepts_missing_optional_fields():
    fields = [{"key": "chest", "required": False, "min": 10, "max": 80}]
    assert measurement_validation_error(fields, {}) is None


def test_profile_name_is_trimmed_and_blank_names_are_rejected():
    from pydantic import ValidationError
    from app.schemas.schemas import ProfileCreate
    from uuid import uuid4

    payload = ProfileCreate(template_id=uuid4(), profile_name="  Wedding shirt  ")
    assert payload.profile_name == "Wedding shirt"
    try:
        ProfileCreate(template_id=uuid4(), profile_name="   ")
    except ValidationError:
        pass
    else:
        raise AssertionError("Whitespace-only profile names must be rejected")


def test_customer_update_rejects_whitespace_only_name():
    from pydantic import ValidationError
    from app.schemas.schemas import CustomerUpdate

    assert CustomerUpdate(name="  Anil  ").name == "Anil"
    try:
        CustomerUpdate(name="   ")
    except ValidationError:
        pass
    else:
        raise AssertionError("Whitespace-only customer names must be rejected")


def test_customer_city_is_trimmed_and_can_be_cleared():
    from app.schemas.schemas import CustomerCreate, CustomerUpdate

    created = CustomerCreate(name="Riya", gender="female", city="  Jaipur  ")
    assert created.city == "Jaipur"
    assert CustomerCreate(name="Riya", gender="female", city="  ").city is None
    assert CustomerUpdate(city="  Pune ").city == "Pune"
    assert CustomerUpdate(city="  ").city is None


def test_seeded_garment_fields_are_required_and_have_sane_ranges():
    from app.template_catalog import TEMPLATES, fields

    assert len({template[0] for template in TEMPLATES}) == len(TEMPLATES)
    for _, _, _, items in TEMPLATES:
        template_fields = fields(items)
        assert template_fields
        assert len({field["key"] for field in template_fields}) == len(template_fields)
        assert all(field["required"] for field in template_fields)
        assert all(0 < field["min"] < field["max"] for field in template_fields)
