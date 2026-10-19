from decimal import Decimal, ROUND_HALF_UP


def cents(value: float | Decimal) -> int:
    return int((Decimal(str(value)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def validate_payment_amount(amount: float, advance: float | Decimal, price: float | Decimal) -> tuple[int, int]:
    """Return (payment cents, new paid cents), rejecting zero or overpayment."""
    amount_cents = cents(amount)
    advance_cents = cents(advance)
    price_cents = cents(price)
    if amount_cents <= 0:
        raise ValueError("Payment must be greater than zero")
    if advance_cents + amount_cents > price_cents:
        raise ValueError("Payment cannot exceed the remaining balance")
    return amount_cents, advance_cents + amount_cents
