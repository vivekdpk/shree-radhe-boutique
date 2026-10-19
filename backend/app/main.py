import re
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from fastapi import FastAPI, Depends, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func, or_, text
from sqlalchemy.orm import Session, joinedload
from app.core.config import settings
from app.db import get_db
from app.models.models import Customer, GarmentTemplate, GarmentTemplateVersion, MeasurementProfile, MeasurementRecord, Order, OrderPayment, Inquiry, SiteSetting
from app.schemas.schemas import (
    LoginRequest, CustomerCreate, CustomerUpdate, CustomerOut, CustomerPage, CustomerListOut, TemplateOut,
    ProfileCreate, ProfileOut, ProfileIndexOut, MeasurementCreate, MeasurementOut, OrderCreate, OrderUpdate, OrderOut,
    OrderPaymentCreate, OrderPaymentOut, InquiryCreate, InquiryOut, InquiryPage, InquiryStatusUpdate, InquirySubmitOut, SiteThemeUpdate, SiteThemeOut, SiteLanguageUpdate, SiteLanguageOut,
)
from app.security import issue_session, clear_session, verify_password, require_owner
from app.seed import seed_templates
from app.services.measurements import measurement_validation_error
from app.services.payments import validate_payment_amount

app = FastAPI(title="Shree Radhe Boutique API", version="0.1.0", docs_url="/docs" if settings.app_env != "production" else None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.frontend_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-CSRF-Token", "Idempotency-Key"],
)


@app.on_event("startup")
def startup():
    if len(settings.session_secret) < 32:
        raise RuntimeError("SESSION_SECRET must be at least 32 characters")
    # Fail early on an unsafe production configuration instead of accepting traffic.
    if settings.app_env == "production":
        if not settings.cookie_secure:
            raise RuntimeError("COOKIE_SECURE must be true in production")
        if len(settings.session_secret) < 32:
            raise RuntimeError("SESSION_SECRET must be at least 32 characters in production")
        if not settings.owner_password_hash:
            raise RuntimeError("OWNER_PASSWORD_HASH must be configured in production")
    # Schema migrations are applied by the container entrypoint before serving traffic.
    # Keep startup focused on idempotent reference-data seeding.
    with next(get_db()) as db:
        seed_templates(db)


@app.get("/api/v1/health/live")
def live():
    return {"status": "ok"}


@app.get("/api/v1/health/ready")
def ready(db: Session = Depends(get_db)):
    db.execute(select(1))
    return {"status": "ready"}


@app.post("/api/v1/public/inquiries", response_model=InquirySubmitOut, status_code=201)
def submit_public_inquiry(payload: InquiryCreate, db: Session = Depends(get_db)):
    # Quietly discard basic bot submissions while preserving the same response as a real send.
    if payload.website.strip():
        return InquirySubmitOut(submitted=True)
    db.add(Inquiry(name=payload.name, phone=payload.phone, email=payload.email, message=payload.message))
    db.commit()
    return InquirySubmitOut(submitted=True)


@app.get("/api/v1/public/theme", response_model=SiteThemeOut)
def get_public_theme(db: Session = Depends(get_db)):
    setting = db.get(SiteSetting, "theme")
    return SiteThemeOut(theme=setting.value if setting else "forest")


@app.patch("/api/v1/settings/theme", response_model=SiteThemeOut)
def update_site_theme(payload: SiteThemeUpdate, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    setting = db.get(SiteSetting, "theme")
    if setting is None:
        setting = SiteSetting(key="theme", value=payload.theme)
        db.add(setting)
    else:
        setting.value = payload.theme
        setting.updated_at = datetime.now(timezone.utc)
    db.commit()
    return SiteThemeOut(theme=setting.value)


@app.get("/api/v1/public/language", response_model=SiteLanguageOut)
def get_public_language(db: Session = Depends(get_db)):
    setting = db.get(SiteSetting, "language")
    return SiteLanguageOut(language=setting.value if setting else "hinglish")


@app.patch("/api/v1/settings/language", response_model=SiteLanguageOut)
def update_site_language(payload: SiteLanguageUpdate, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    setting = db.get(SiteSetting, "language")
    if setting is None:
        setting = SiteSetting(key="language", value=payload.language)
        db.add(setting)
    else:
        setting.value = payload.language
        setting.updated_at = datetime.now(timezone.utc)
    db.commit()
    return SiteLanguageOut(language=setting.value)


@app.get("/api/v1/inquiries", response_model=InquiryPage)
def list_inquiries(
    status_filter: str | None = Query(None, alias="status", pattern="^(new|read|archived)$"),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _owner=Depends(require_owner),
):
    query = select(Inquiry)
    if status_filter:
        query = query.where(Inquiry.status == status_filter)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(query.order_by(Inquiry.status != "new", Inquiry.created_at.desc()).limit(limit).offset(offset)).all()
    return InquiryPage(items=items, total_count=total, limit=limit, offset=offset)


@app.patch("/api/v1/inquiries/{inquiry_id}", response_model=InquiryOut)
def update_inquiry(inquiry_id: uuid.UUID, payload: InquiryStatusUpdate,
                   db: Session = Depends(get_db), _owner=Depends(require_owner)):
    inquiry = db.get(Inquiry, inquiry_id)
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    inquiry.status = payload.status
    inquiry.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(inquiry)
    return inquiry


@app.post("/api/v1/auth/login")
def login(payload: LoginRequest, response: Response):
    if not verify_password(payload.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    issue_session(response)
    return {"authenticated": True}


@app.post("/api/v1/auth/logout")
def logout(response: Response, _owner=Depends(require_owner)):
    clear_session(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@app.get("/api/v1/auth/me")
def me(_owner=Depends(require_owner)):
    return {"authenticated": True, "user": "owner"}


def normalize_phone(phone: str | None) -> str | None:
    if not phone:
        return None
    return re.sub(r"\D", "", phone)


def next_customer_code(db: Session) -> str:
    # Uses a PostgreSQL sequence to avoid count-based collisions.
    number = db.execute(text("SELECT nextval('customer_code_seq')")).scalar_one()
    return f"SRB-{number:06d}"


@app.post("/api/v1/customers", response_model=CustomerOut, status_code=201)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    phone_norm = normalize_phone(payload.phone)
    customer = Customer(
        customer_code=next_customer_code(db),
        name=payload.name.strip(),
        normalized_name=payload.name.strip().casefold(),
        gender=payload.gender,
        city=payload.city,
        phone=payload.phone,
        normalized_phone=phone_norm,
        alternate_phone=payload.alternate_phone,
        email=payload.email,
        notes=payload.notes,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@app.get("/api/v1/customers", response_model=CustomerPage)
def list_customers(
    search: str = "",
    gender: str | None = Query(None, pattern="^(female|male)$"),
    limit: int = Query(20, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _owner=Depends(require_owner),
):
    query = select(Customer).where(Customer.archived_at.is_(None))
    if gender in {"female", "male"}:
        query = query.where(Customer.gender == gender)
    term = search.strip()
    if term:
        like = f"%{term.casefold()}%"
        digits = normalize_phone(term)
        criteria = [Customer.normalized_name.ilike(like), Customer.customer_code.ilike(f"%{term}%")]
        criteria.append(Customer.city.ilike(like))
        if digits:
            criteria.append(Customer.normalized_phone.ilike(f"%{digits}%"))
        query = query.where(or_(*criteria))
    matching_customers = query.with_only_columns(Customer.id).order_by(None).subquery()
    order_stats = (
        select(
            Order.customer_id.label("customer_id"),
            func.count(Order.id).label("order_count"),
            func.coalesce(func.sum(Order.price), 0).label("order_value"),
            func.coalesce(func.sum(Order.advance), 0).label("amount_paid"),
            func.coalesce(func.sum(Order.price - Order.advance), 0).label("balance_due"),
        )
        .where(Order.status != "cancelled")
        .group_by(Order.customer_id)
        .subquery()
    )
    total = db.scalar(select(func.count()).select_from(matching_customers)) or 0
    summary_row = db.execute(
        select(
            func.count(matching_customers.c.id),
            func.coalesce(func.sum(order_stats.c.order_count), 0),
            func.coalesce(func.sum(order_stats.c.order_value), 0),
            func.coalesce(func.sum(order_stats.c.amount_paid), 0),
            func.coalesce(func.sum(order_stats.c.balance_due), 0),
        ).select_from(matching_customers.outerjoin(
            order_stats, matching_customers.c.id == order_stats.c.customer_id))
    ).one()
    item_rows = db.execute(
        select(Customer, order_stats.c.order_count, order_stats.c.order_value,
            order_stats.c.amount_paid, order_stats.c.balance_due)
        .outerjoin(order_stats, Customer.id == order_stats.c.customer_id)
        .where(Customer.id.in_(select(matching_customers.c.id)))
        .order_by(Customer.updated_at.desc()).limit(limit).offset(offset)
    ).all()
    items = []
    for customer, order_count, order_value, amount_paid, balance_due in item_rows:
        item = CustomerOut.model_validate(customer).model_dump(mode="python")
        item.update({
            "order_count": int(order_count or 0),
            "order_value": round(float(order_value or 0), 2),
            "amount_paid": round(float(amount_paid or 0), 2),
            "balance_due": round(float(balance_due or 0), 2),
        })
        items.append(CustomerListOut.model_validate(item))
    summary = {
        "order_count": int(summary_row[1] or 0),
        "order_value": round(float(summary_row[2] or 0), 2),
        "amount_paid": round(float(summary_row[3] or 0), 2),
        "balance_due": round(float(summary_row[4] or 0), 2),
    }
    return CustomerPage(items=items, total_count=total, limit=limit, offset=offset, summary=summary)


@app.get("/api/v1/customer-insights")
def customer_insights(db: Session = Depends(get_db), _owner=Depends(require_owner)):
    """Customer segments calculated from saved customers and non-cancelled orders."""
    now = datetime.now(timezone.utc)
    rollup = (
        select(
            Order.customer_id.label("customer_id"),
            func.count(Order.id).label("order_count"),
            func.coalesce(func.sum(Order.price), 0).label("lifetime_value"),
            func.max(Order.order_date).label("last_order_at"),
            func.coalesce(func.sum(Order.price - Order.advance), 0).label("outstanding"),
        )
        .where(Order.status != "cancelled")
        .group_by(Order.customer_id)
        .subquery()
    )
    rows = db.execute(
        select(Customer, rollup.c.order_count, rollup.c.lifetime_value,
            rollup.c.last_order_at, rollup.c.outstanding)
        .outerjoin(rollup, Customer.id == rollup.c.customer_id)
        .where(Customer.archived_at.is_(None))
        .order_by(Customer.name)
    ).all()
    customers = []
    for customer, order_count, lifetime_value, last_order_at, outstanding in rows:
        payload = CustomerOut.model_validate(customer).model_dump(mode="python")
        payload.update({
            "order_count": int(order_count or 0),
            "lifetime_value": round(float(lifetime_value or 0), 2),
            "last_order_at": last_order_at,
            "days_since_order": max(0, (now.date() - last_order_at.date()).days) if last_order_at else None,
            "outstanding": round(float(outstanding or 0), 2),
        })
        customers.append(payload)

    new_cutoff = now - timedelta(days=30)
    active_cutoff = now - timedelta(days=30)
    risk_cutoff = now - timedelta(days=90)
    vip_ranked = sorted((c for c in customers if c["lifetime_value"] > 0),
        key=lambda c: (-c["lifetime_value"], -c["order_count"], c["name"].casefold()))
    vip = vip_ranked[:max(1, (len(vip_ranked) + 9) // 10)] if vip_ranked else []
    repeaters = sorted((c for c in customers if c["order_count"] >= 2),
        key=lambda c: (-c["order_count"], -c["lifetime_value"], c["name"].casefold()))
    new_customers = sorted((c for c in customers if c["created_at"] and c["created_at"] >= new_cutoff),
        key=lambda c: c["created_at"], reverse=True)
    active = sorted((c for c in customers if c["last_order_at"] and c["last_order_at"] >= active_cutoff),
        key=lambda c: c["last_order_at"], reverse=True)
    at_risk = sorted((c for c in customers if c["last_order_at"] and c["last_order_at"] < risk_cutoff),
        key=lambda c: c["last_order_at"])
    never_ordered = [c for c in customers if c["order_count"] == 0]
    city_totals: dict[str, dict] = {}
    for customer in customers:
        city = (customer["city"] or "").strip()
        if not city:
            continue
        entry = city_totals.setdefault(city.casefold(), {"city": city, "customers": 0, "orders": 0, "lifetime_value": 0.0})
        entry["customers"] += 1
        entry["orders"] += customer["order_count"]
        entry["lifetime_value"] += customer["lifetime_value"]
    top_cities = sorted(city_totals.values(), key=lambda c: (-c["lifetime_value"], -c["customers"], c["city"].casefold()))
    return {
        "generated_at": now,
        "summary": {
            "customers": len(customers),
            "customers_with_orders": sum(c["order_count"] > 0 for c in customers),
            "repeat_customers": len(repeaters),
            "new_last_30_days": len(new_customers),
            "active_last_30_days": len(active),
            "at_risk_90_days": len(at_risk),
            "never_ordered": len(never_ordered),
            "lifetime_order_value": round(sum(c["lifetime_value"] for c in customers), 2),
            "outstanding_balance": round(sum(c["outstanding"] for c in customers), 2),
        },
        "vip_customers": vip,
        "repeat_customers": repeaters,
        "new_customers": new_customers,
        "recently_active": active,
        "at_risk": at_risk,
        "never_ordered": never_ordered,
        "top_cities": top_cities,
        "definitions": {
            "vip": "Top 10% by lifetime value of non-cancelled orders; at least one when any customer has ordered.",
            "repeat": "At least two non-cancelled orders.",
            "new": "Customer record created in the last 30 days.",
            "active": "Most recent non-cancelled order is within 30 days.",
            "at_risk": "Has orders, but none in the last 90 days.",
        },
    }


@app.get("/api/v1/customers/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: uuid.UUID, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    customer = db.get(Customer, customer_id)
    if not customer or customer.archived_at:
        raise HTTPException(404, "Customer not found")
    return customer


@app.patch("/api/v1/customers/{customer_id}", response_model=CustomerOut)
def update_customer(customer_id: uuid.UUID, payload: CustomerUpdate, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    customer = db.get(Customer, customer_id)
    if not customer or customer.archived_at:
        raise HTTPException(404, "Customer not found")
    changes = payload.model_dump(exclude_unset=True)
    if "name" in changes and changes["name"] is not None:
        changes["name"] = changes["name"].strip()
        changes["normalized_name"] = changes["name"].casefold()
    if "phone" in changes:
        changes["normalized_phone"] = normalize_phone(changes["phone"])
    for key, value in changes.items():
        setattr(customer, key, value)
    customer.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(customer)
    return customer


@app.post("/api/v1/customers/{customer_id}/archive", status_code=204)
def archive_customer(customer_id: uuid.UUID, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    customer = db.get(Customer, customer_id)
    if not customer or customer.archived_at:
        raise HTTPException(404, "Customer not found")
    customer.archived_at = datetime.now(timezone.utc)
    db.commit()
    return Response(status_code=204)


@app.get("/api/v1/customers/{customer_id}/export")
def export_customer(customer_id: uuid.UUID, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    customer = db.get(Customer, customer_id)
    if not customer or customer.archived_at:
        raise HTTPException(404, "Customer not found")
    profiles = db.scalars(select(MeasurementProfile).where(MeasurementProfile.customer_id == customer_id)).all()
    profile_data = []
    for profile in profiles:
        records = db.scalars(select(MeasurementRecord).where(MeasurementRecord.profile_id == profile.id).order_by(MeasurementRecord.version)).all()
        profile_data.append({
            "profile_name": profile.profile_name,
            "garment": profile.template.name,
            "measurements": [MeasurementOut.model_validate(record).model_dump(mode="json") for record in records],
        })
    orders = db.scalars(select(Order).where(Order.customer_id == customer_id).order_by(Order.order_date)).all()
    payment_rows = db.scalars(select(OrderPayment).where(OrderPayment.order_id.in_([o.id for o in orders]))
        .order_by(OrderPayment.paid_at, OrderPayment.created_at)).all() if orders else []
    payments_by_order: dict[uuid.UUID, list[dict]] = {}
    for payment in payment_rows:
        payments_by_order.setdefault(payment.order_id, []).append(
            OrderPaymentOut.model_validate(payment).model_dump(mode="json"))
    order_data = [{**order_payload(order, customer), "payments": payments_by_order.get(order.id, [])} for order in orders]
    return {
        "customer": CustomerOut.model_validate(customer).model_dump(mode="json"),
        "measurement_profiles": profile_data,
        "orders": order_data,
    }


@app.delete("/api/v1/customers/{customer_id}", status_code=204)
def delete_customer(customer_id: uuid.UUID, confirm_name: str = Query(..., min_length=1), db: Session = Depends(get_db), _owner=Depends(require_owner)):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")
    if confirm_name.strip().casefold() != customer.name.casefold():
        raise HTTPException(422, "Confirmation name does not match")
    profiles = db.scalars(select(MeasurementProfile).where(MeasurementProfile.customer_id == customer_id)).all()
    profile_ids = [p.id for p in profiles]
    record_ids = []
    if profile_ids:
        record_ids = list(db.scalars(select(MeasurementRecord.id).where(MeasurementRecord.profile_id.in_(profile_ids))).all())
    if record_ids:
        db.query(Order).filter(Order.measurement_record_id.in_(record_ids)).update({Order.measurement_record_id: None}, synchronize_session=False)
    db.query(Order).filter(Order.customer_id == customer_id).delete(synchronize_session=False)
    if profile_ids:
        db.query(MeasurementRecord).filter(MeasurementRecord.profile_id.in_(profile_ids)).delete(synchronize_session=False)
        db.query(MeasurementProfile).filter(MeasurementProfile.id.in_(profile_ids)).delete(synchronize_session=False)
    db.delete(customer)
    db.commit()
    return Response(status_code=204)


def order_payload(order: Order, customer: Customer | None = None):
    customer = customer or order.customer
    price, advance = float(order.price), float(order.advance)
    return {
        "id": order.id, "order_number": order.order_number, "customer_id": order.customer_id,
        "customer_name": customer.name, "customer_phone": customer.phone,
        "measurement_record_id": order.measurement_record_id, "garment_name": order.garment_name,
        "status": order.status, "order_date": order.order_date, "due_date": order.due_date,
        "price": price, "advance": advance, "balance": round(price - advance, 2),
        "notes": order.notes, "created_at": order.created_at, "updated_at": order.updated_at,
    }


@app.get("/api/v1/orders", response_model=list[OrderOut])
def list_orders(status_filter: str | None = Query(None, alias="status"), due_before: datetime | None = None, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    query = select(Order).join(Customer).where(Customer.archived_at.is_(None))
    if status_filter in {"new", "in_progress", "ready", "delivered", "cancelled"}:
        query = query.where(Order.status == status_filter)
    if due_before:
        query = query.where(Order.due_date <= due_before)
    orders = db.scalars(query.order_by(Order.due_date, Order.created_at.desc())).all()
    return [order_payload(order) for order in orders]


@app.get("/api/v1/customers/{customer_id}/orders", response_model=list[OrderOut])
def customer_orders(customer_id: uuid.UUID, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    customer = db.get(Customer, customer_id)
    if not customer or customer.archived_at:
        raise HTTPException(404, "Customer not found")
    orders = db.scalars(select(Order).where(Order.customer_id == customer_id).order_by(Order.due_date.desc())).all()
    return [order_payload(order, customer) for order in orders]


@app.post("/api/v1/customers/{customer_id}/orders", response_model=OrderOut, status_code=201)
def create_order(customer_id: uuid.UUID, payload: OrderCreate, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    customer = db.get(Customer, customer_id)
    if not customer or customer.archived_at:
        raise HTTPException(404, "Customer not found")
    if payload.advance > payload.price:
        raise HTTPException(422, "Advance cannot be greater than the total price")
    if payload.measurement_record_id:
        record = db.get(MeasurementRecord, payload.measurement_record_id)
        if not record or db.get(MeasurementProfile, record.profile_id).customer_id != customer_id:
            raise HTTPException(422, "Selected measurement record does not belong to this customer")
    number = db.execute(text("SELECT nextval('order_number_seq')")).scalar_one()
    now = datetime.now(timezone.utc)
    order = Order(order_number=f"SRB-O{number:06d}", customer_id=customer_id,
        order_date=now, updated_at=now, **payload.model_dump())
    db.add(order); db.flush()
    if payload.advance > 0:
        db.add(OrderPayment(order_id=order.id, amount=payload.advance, paid_at=now,
            method="other", note="Initial advance; payment method not specified", created_at=now))
    db.commit(); db.refresh(order)
    return order_payload(order, customer)


@app.patch("/api/v1/orders/{order_id}", response_model=OrderOut)
def update_order(order_id: uuid.UUID, payload: OrderUpdate, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    changes = payload.model_dump(exclude_unset=True)
    price = changes.get("price", float(order.price))
    advance = float(order.advance)
    if advance > price:
        raise HTTPException(422, "Advance cannot be greater than the total price")
    if "measurement_record_id" in changes and changes["measurement_record_id"]:
        record = db.get(MeasurementRecord, changes["measurement_record_id"])
        profile = db.get(MeasurementProfile, record.profile_id) if record else None
        if not profile or profile.customer_id != order.customer_id:
            raise HTTPException(422, "Selected measurement record does not belong to this customer")
    for key, value in changes.items():
        setattr(order, key, value)
    order.updated_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(order)
    return order_payload(order)


@app.get("/api/v1/orders/{order_id}/payments", response_model=list[OrderPaymentOut])
def list_order_payments(order_id: uuid.UUID, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    if not db.get(Order, order_id):
        raise HTTPException(404, "Order not found")
    return db.scalars(select(OrderPayment).where(OrderPayment.order_id == order_id)
        .order_by(OrderPayment.paid_at.desc(), OrderPayment.created_at.desc())).all()


@app.post("/api/v1/orders/{order_id}/payments", response_model=OrderPaymentOut, status_code=201)
def create_order_payment(order_id: uuid.UUID, payload: OrderPaymentCreate,
    db: Session = Depends(get_db), _owner=Depends(require_owner)):
    order = db.scalar(select(Order).where(Order.id == order_id).with_for_update())
    if not order:
        raise HTTPException(404, "Order not found")
    try:
        amount_cents, new_advance_cents = validate_payment_amount(payload.amount, order.advance, order.price)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    now = datetime.now(timezone.utc)
    payment = OrderPayment(order_id=order.id, amount=Decimal(amount_cents) / 100,
        paid_at=payload.paid_at or now, method=payload.method, note=payload.note, created_at=now)
    order.advance = Decimal(new_advance_cents) / 100
    order.updated_at = now
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@app.get("/api/v1/garment-templates", response_model=list[TemplateOut])
def list_templates(category: str | None = None, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    query = select(GarmentTemplate).where(GarmentTemplate.active.is_(True))
    if category in {"mens", "womens", "unisex"}:
        query = query.where(GarmentTemplate.category == category)
    templates = db.scalars(query.order_by(GarmentTemplate.category, GarmentTemplate.name)).all()
    result = []
    for template in templates:
        current = db.scalar(select(GarmentTemplateVersion).where(
            GarmentTemplateVersion.template_id == template.id
        ).order_by(GarmentTemplateVersion.version.desc()).limit(1))
        if current:
            result.append(TemplateOut(
                id=template.id, template_key=template.template_key, name=template.name,
                category=template.category, current_version=current.version, current_version_id=current.id, fields=current.fields
            ))
    return result


@app.post("/api/v1/customers/{customer_id}/measurement-profiles", response_model=ProfileOut, status_code=201)
def create_profile(customer_id: uuid.UUID, payload: ProfileCreate, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    customer = db.get(Customer, customer_id)
    template = db.get(GarmentTemplate, payload.template_id)
    if not customer or customer.archived_at:
        raise HTTPException(404, "Customer not found")
    if not template or not template.active:
        raise HTTPException(404, "Garment template not found")
    profile = MeasurementProfile(
        customer_id=customer_id, template_id=template.id, profile_name=payload.profile_name.strip()
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return ProfileOut(
        id=profile.id, customer_id=customer_id, template_id=template.id,
        template_name=template.name, category=template.category,
        profile_name=profile.profile_name, created_at=profile.created_at
    )


@app.get("/api/v1/customers/{customer_id}/measurement-profiles", response_model=list[ProfileOut])
def list_profiles(customer_id: uuid.UUID, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    customer = db.get(Customer, customer_id)
    if not customer or customer.archived_at:
        raise HTTPException(404, "Customer not found")
    rows = db.execute(
        select(MeasurementProfile, GarmentTemplate)
        .join(GarmentTemplate, MeasurementProfile.template_id == GarmentTemplate.id)
        .where(MeasurementProfile.customer_id == customer_id, MeasurementProfile.archived_at.is_(None))
        .order_by(MeasurementProfile.created_at.desc())
    ).all()
    return [
        ProfileOut(
            id=p.id, customer_id=p.customer_id, template_id=p.template_id,
            template_name=t.name, category=t.category, profile_name=p.profile_name,
            created_at=p.created_at
        )
        for p, t in rows
    ]


@app.get("/api/v1/measurement-profiles", response_model=list[ProfileIndexOut])
def list_all_profiles(db: Session = Depends(get_db), _owner=Depends(require_owner)):
    rows = db.execute(
        select(MeasurementProfile, Customer, GarmentTemplate)
        .join(Customer, MeasurementProfile.customer_id == Customer.id)
        .join(GarmentTemplate, MeasurementProfile.template_id == GarmentTemplate.id)
        .where(MeasurementProfile.archived_at.is_(None), Customer.archived_at.is_(None))
        .order_by(Customer.name, MeasurementProfile.profile_name)
    ).all()
    profile_ids = [profile.id for profile, _, _ in rows]
    latest = dict(db.execute(
        select(MeasurementRecord.profile_id, func.max(MeasurementRecord.version))
        .where(MeasurementRecord.profile_id.in_(profile_ids))
        .group_by(MeasurementRecord.profile_id)
    ).all()) if profile_ids else {}
    return [ProfileIndexOut(
        id=profile.id, customer_id=customer.id, customer_name=customer.name,
        customer_code=customer.customer_code, phone=customer.phone,
        template_name=template.name, category=template.category,
        profile_name=profile.profile_name, latest_version=latest.get(profile.id),
    ) for profile, customer, template in rows]


def validate_measurements(fields: list[dict], values: dict[str, float]):
    error = measurement_validation_error(fields, values)
    if error:
        raise HTTPException(422, detail=error)


@app.post("/api/v1/measurement-profiles/{profile_id}/records", response_model=MeasurementOut, status_code=201)
def create_measurement(profile_id: uuid.UUID, payload: MeasurementCreate, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    profile = db.scalar(
        select(MeasurementProfile).options(joinedload(MeasurementProfile.template))
        .where(MeasurementProfile.id == profile_id, MeasurementProfile.archived_at.is_(None))
    )
    if not profile:
        raise HTTPException(404, "Measurement profile not found")
    template_version = db.get(GarmentTemplateVersion, payload.template_version_id)
    if not template_version or template_version.template_id != profile.template_id:
        raise HTTPException(422, "Template version does not match profile garment")
    validate_measurements(template_version.fields, payload.measurements)
    # Lock the profile row to serialize version allocation for this profile.
    db.execute(select(MeasurementProfile).where(MeasurementProfile.id == profile_id).with_for_update())
    latest = db.scalar(
        select(func.max(MeasurementRecord.version)).where(MeasurementRecord.profile_id == profile_id)
    ) or 0
    record = MeasurementRecord(
        profile_id=profile_id, version=latest + 1,
        template_version_id=template_version.id,
        measured_at=payload.measured_at or datetime.now(timezone.utc),
        unit=payload.unit, measurements=payload.measurements,
        fit_preference=payload.fit_preference, notes=payload.notes,
        change_reason=payload.change_reason,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/api/v1/measurement-profiles/{profile_id}/records", response_model=list[MeasurementOut])
def list_measurements(profile_id: uuid.UUID, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    profile = db.get(MeasurementProfile, profile_id)
    if not profile:
        raise HTTPException(404, "Measurement profile not found")
    return db.scalars(
        select(MeasurementRecord).where(MeasurementRecord.profile_id == profile_id)
        .order_by(MeasurementRecord.version.desc())
    ).all()


@app.get("/api/v1/measurement-records/{record_id}", response_model=MeasurementOut)
def get_measurement(record_id: uuid.UUID, db: Session = Depends(get_db), _owner=Depends(require_owner)):
    record = db.get(MeasurementRecord, record_id)
    if not record:
        raise HTTPException(404, "Measurement record not found")
    return record
