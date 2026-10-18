import random

import pytest
from sqlalchemy.dialects import postgresql

from app.demo_data import _measurement_values, seed_demo_data, seeded_customer_ids_query, seeded_order_ids_query


def test_measurement_samples_respect_field_ranges_and_steps():
    fields = [
        {"key": "chest", "min": 20, "max": 60, "step": 0.5},
        {"key": "length", "min": 1, "max": 100, "step": 0.25},
    ]

    values = _measurement_values(fields, random.Random(7))

    assert values.keys() == {"chest", "length"}
    assert 20 <= values["chest"] <= 60
    assert 1 <= values["length"] <= 100
    assert values["chest"] * 2 == round(values["chest"] * 2)
    assert values["length"] * 4 == round(values["length"] * 4)


def test_demo_cleanup_selector_only_matches_seeded_customers():
    sql = str(seeded_customer_ids_query().compile(dialect=postgresql.dialect()))

    assert 'customers.seeded IS true' in sql


def test_demo_cleanup_order_selector_requires_seeded_customer_and_seeded_order():
    sql = str(seeded_order_ids_query().compile(dialect=postgresql.dialect()))

    assert 'customers.seeded IS true' in sql
    assert 'orders.seeded IS true' in sql


@pytest.mark.parametrize("target", [0, -1, 5001])
def test_seed_rejects_unsafe_or_unreasonable_targets_before_database_access(target):
    with pytest.raises(ValueError, match="between 1 and 5000"):
        seed_demo_data(None, target=target)
