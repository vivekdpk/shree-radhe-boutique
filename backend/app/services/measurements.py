"""Pure validation helpers for measurement payloads.

Keeping these checks independent of FastAPI makes the measurement rules easy to test.
"""
from __future__ import annotations

import math
from typing import Any


def measurement_validation_error(
    fields: list[dict[str, Any]], values: dict[str, float]
) -> dict[str, Any] | None:
    """Return a structured validation error, or None when values are valid."""
    field_map = {field["key"]: field for field in fields}
    unknown = set(values) - set(field_map)
    if unknown:
        return {"code": "UNKNOWN_FIELDS", "fields": sorted(unknown)}

    for field in fields:
        key = field["key"]
        if field.get("required") and key not in values:
            return {"code": "REQUIRED_FIELD", "field": key}
        if key not in values:
            continue

        value = values[key]
        minimum = field.get("min", 0)
        maximum = field.get("max", 1000)
        if not math.isfinite(value) or value <= 0 or value < minimum or value > maximum:
            return {"code": "INVALID_MEASUREMENT", "field": key, "min": minimum, "max": maximum}

    return None
