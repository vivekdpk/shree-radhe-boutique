"""Generate and remove explicitly marked local demo data."""
from __future__ import annotations

import argparse
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.models import (
    Customer, GarmentTemplate, GarmentTemplateVersion, MeasurementProfile, MeasurementRecord, Order, OrderPayment,
)
from app.seed import seed_templates

TARGET_CUSTOMERS = 500
GIVEN_NAMES = ["Aarav", "Anaya", "Ishaan", "Meera", "Rohan", "Kavya", "Arjun", "Diya", "Kabir", "Nisha"]
FAMILY_NAMES = ["Sharma", "Patel", "Verma", "Gupta", "Rao", "Mehta", "Singh", "Joshi", "Khan", "Das"]
SAMPLE_CITIES = ["Delhi", "Mumbai", "Jaipur", "Lucknow", "Agra", "Pune", "Ahmedabad", "Varanasi"]
STYLES = ["Regular fit", "Slim fit", "Festive", "Everyday", "Wedding", "Classic"]


def _measurement_values(fields: list[dict], rng: random.Random) -> dict[str, float]:
    values = {}
    for field in fields:
        low, high = float(field.get("min", 1)), float(field.get("max", 100))
        # Keep sample values varied while respecting each garment field's validation range.
        center = min(max((low + high) / 2, low + 1), high - 1)
        spread = max((high - low) * 0.18, 0.5)
        value = min(max(rng.gauss(center, spread), low), high)
        step = float(field.get("step", 0.25))
        values[field["key"]] = round(round(value / step) * step, 2)
    return values


def seed_demo_data(db: Session, target: int = TARGET_CUSTOMERS, rng: random.Random | None = None) -> dict[str, int]:
    """Fill up to target seeded customers and ensure each generated customer has sample orders."""
    if target < 1 or target > 5000:
        raise ValueError("Customer target must be between 1 and 5000")
    rng = rng or random.Random()
    seed_templates(db)
    for customer in db.scalars(select(Customer).where(Customer.seeded.is_(True), Customer.city.is_(None))):
        customer.city = rng.choice(SAMPLE_CITIES)
    existing = db.scalar(select(func.count()).select_from(Customer).where(Customer.seeded.is_(True))) or 0
    orders_before = db.scalar(select(func.count()).select_from(Order).join(Customer).where(Customer.seeded.is_(True), Order.seeded.is_(True))) or 0
    templates = db.scalars(
        select(GarmentTemplate).where(GarmentTemplate.active.is_(True)).order_by(GarmentTemplate.template_key)
    ).all()
    versions = {
        template.id: db.scalar(
            select(GarmentTemplateVersion).where(
                GarmentTemplateVersion.template_id == template.id
            ).order_by(GarmentTemplateVersion.version.desc()).limit(1)
        )
        for template in templates
    }
    now = datetime.now(timezone.utc)
    for index in range(existing + 1, target + 1):
        gender = rng.choice(["female", "male"])
        category = "womens" if gender == "female" else "mens"
        eligible = [t for t in templates if t.category == category and versions[t.id] is not None]
        if not eligible:
            raise RuntimeError(f"No active {category} templates found")
        first = rng.choice(GIVEN_NAMES)
        last = rng.choice(FAMILY_NAMES)
        customer = Customer(
            customer_code=_next_customer_code(db),
            name=f"Sample Customer {index:04d} - {first} {last}",
            normalized_name=f"sample customer {index:04d} - {first} {last}".casefold(),
            gender=gender,
            city=rng.choice(SAMPLE_CITIES),
            seeded=True,
            phone=f"9{index:09d}",
            normalized_phone=f"9{index:09d}",
            notes="Generated demo data; safe to remove with the demo cleanup command.",
        )
        db.add(customer)
        db.flush()
        customer_records = []
        for profile_index in range(rng.randint(3, 4)):
            template = rng.choice(eligible)
            version = versions[template.id]
            profile = MeasurementProfile(
                customer_id=customer.id,
                template_id=template.id,
                profile_name=f"{template.name} · {rng.choice(STYLES)} {profile_index + 1}",
            )
            db.add(profile)
            db.flush()
            record = MeasurementRecord(
                profile_id=profile.id,
                version=1,
                template_version_id=version.id,
                measured_at=datetime.now(timezone.utc),
                unit=rng.choice(["inches", "cm"]),
                measurements=_measurement_values(version.fields, rng),
                fit_preference=rng.choice(["regular", "slim", "loose"]),
                notes="Generated demo measurement.",
                change_reason="Generated demo data",
            )
            db.add(record)
            db.flush()
            customer_records.append(record)
        _add_sample_orders(db, customer, customer_records, rng, now)
    # Backfill orders for demo customers created by an older version of this script.
    if existing:
        customer_ids = list(db.scalars(select(Customer.id).where(Customer.seeded.is_(True))))
        with_seed_orders = set(db.scalars(select(Order.customer_id).where(Order.customer_id.in_(customer_ids), Order.seeded.is_(True)))) if customer_ids else set()
        customers_missing_orders = db.scalars(
            select(Customer).where(Customer.seeded.is_(True), Customer.id.not_in(list(with_seed_orders)))
        ).all() if customer_ids else []
        for customer in customers_missing_orders:
            profile_ids = select(MeasurementProfile.id).where(MeasurementProfile.customer_id == customer.id)
            records = db.scalars(select(MeasurementRecord).where(MeasurementRecord.profile_id.in_(profile_ids))).all()
            if records:
                _add_sample_orders(db, customer, records, rng, now)
    db.commit()
    total_customers = db.scalar(select(func.count()).select_from(Customer).where(Customer.seeded.is_(True))) or 0
    total_orders = db.scalar(select(func.count()).select_from(Order).join(Customer).where(Customer.seeded.is_(True), Order.seeded.is_(True))) or 0
    return {"customers_added": max(target - existing, 0), "customers_total": total_customers,
            "orders_added": total_orders - orders_before, "orders_total": total_orders}


def _add_sample_orders(db: Session, customer: Customer, records: list[MeasurementRecord], rng: random.Random, now: datetime) -> int:
    count = rng.randint(1, 3)
    statuses = ["new", "in_progress", "ready", "delivered"]
    for index in range(count):
        days = rng.randint(-3, 28)
        price = round(rng.uniform(800, 8500), 2)
        advance = round(price * rng.uniform(0, 0.6), 2)
        sequence = db.execute(text("SELECT nextval('order_number_seq')")).scalar_one()
        record = rng.choice(records) if records else None
        order = Order(
            order_number=f"SRB-O{sequence:06d}", customer_id=customer.id,
            measurement_record_id=record.id if record else None,
            seeded=True,
            garment_name=rng.choice(["Blouse", "Kurti set", "Salwar suit", "Lehenga", "Sherwani", "Alteration"]),
            status=rng.choice(statuses), order_date=now - timedelta(days=rng.randint(0, 20)),
            due_date=now + timedelta(days=days), price=price, advance=advance,
            notes="Generated demo order; safe to remove with the demo cleanup command.",
            created_at=now, updated_at=now,
        )
        db.add(order)
        if advance > 0:
            db.add(OrderPayment(order=order, amount=advance, paid_at=order.order_date,
                method="cash", note="Generated demo payment", created_at=now))
    return count


def seeded_customer_ids_query():
    """The sole customer selector used by cleanup; app-created rows default to false."""
    return select(Customer.id).where(Customer.seeded.is_(True))


def seeded_order_ids_query(customer_ids: list | None = None):
    """Select only generated orders, optionally constrained to generated customers."""
    query = select(Order.id).join(Customer, Order.customer_id == Customer.id).where(
        Customer.seeded.is_(True), Order.seeded.is_(True)
    )
    if customer_ids is not None:
        query = query.where(Customer.id.in_(customer_ids))
    return query


def _next_customer_code(db: Session) -> str:
    number = db.execute(text("SELECT nextval('customer_code_seq')")).scalar_one()
    return f"SRB-{number:06d}"


def cleanup_demo_data(db: Session, dry_run: bool = True) -> dict[str, int]:
    """Count or delete only customers marked seeded and their dependent measurements."""
    seeded_ids = list(db.scalars(seeded_customer_ids_query()))
    if not seeded_ids:
        return {"customers": 0, "customers_skipped_with_real_orders": 0, "profiles": 0, "records": 0, "orders": 0}
    real_order_customer_ids = set(db.scalars(
        select(Order.customer_id).where(Order.customer_id.in_(seeded_ids), Order.seeded.is_(False)).distinct()
    ))
    removable_customer_ids = [customer_id for customer_id in seeded_ids if customer_id not in real_order_customer_ids]
    profile_ids = list(db.scalars(select(MeasurementProfile.id).where(MeasurementProfile.customer_id.in_(removable_customer_ids)))) if removable_customer_ids else []
    records = db.scalar(
        select(func.count()).select_from(MeasurementRecord).where(MeasurementRecord.profile_id.in_(profile_ids))
    ) or 0
    order_ids = list(db.scalars(seeded_order_ids_query(seeded_ids)))
    result = {"customers": len(removable_customer_ids), "customers_skipped_with_real_orders": len(real_order_customer_ids), "profiles": len(profile_ids), "records": records, "orders": len(order_ids)}
    if dry_run:
        return result
    if order_ids:
        db.query(Order).filter(Order.id.in_(order_ids), Order.seeded.is_(True)).delete(synchronize_session=False)
    if profile_ids:
        db.query(MeasurementRecord).filter(MeasurementRecord.profile_id.in_(profile_ids)).delete(synchronize_session=False)
        db.query(MeasurementProfile).filter(MeasurementProfile.id.in_(profile_ids)).delete(synchronize_session=False)
    if removable_customer_ids:
        db.query(Customer).filter(Customer.id.in_(removable_customer_ids), Customer.seeded.is_(True)).delete(synchronize_session=False)
    db.commit()
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Safely manage generated Shree Radhe Boutique demo data")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--seed", action="store_true", help="Add demo customers until there are 500")
    mode.add_argument("--cleanup", action="store_true", help="Preview or remove generated demo data only")
    parser.add_argument("--confirm-cleanup", action="store_true", help="Required before deleting seeded records")
    args = parser.parse_args()
    if args.confirm_cleanup and not args.cleanup:
        parser.error("--confirm-cleanup can only be used with --cleanup")
    with SessionLocal() as db:
        if args.seed:
            print(seed_demo_data(db))
        else:
            preview = cleanup_demo_data(db, dry_run=True)
            print(f"Demo data selected for cleanup: {preview}")
            if args.confirm_cleanup:
                phrase = input('Type DELETE SEEDED DATA to confirm cleanup: ').strip()
                if phrase != "DELETE SEEDED DATA":
                    raise SystemExit("Confirmation did not match; no data was deleted.")
                print(f"Deleted generated demo data: {cleanup_demo_data(db, dry_run=False)}")
            else:
                print("Preview only. To delete, rerun with --cleanup --confirm-cleanup.")


if __name__ == "__main__":
    main()
