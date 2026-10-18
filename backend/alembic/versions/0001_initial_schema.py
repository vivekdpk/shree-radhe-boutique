"""Create the initial Shree Radhe Boutique schema."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE customer_code_seq START 1")
    op.create_table(
        "customers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("customer_code", sa.String(20), nullable=False, unique=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("normalized_name", sa.String(150), nullable=False),
        sa.Column("phone", sa.String(20)),
        sa.Column("normalized_phone", sa.String(20)),
        sa.Column("alternate_phone", sa.String(20)),
        sa.Column("email", sa.String(254)),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_customers_normalized_name", "customers", ["normalized_name"])
    op.create_index("ix_customers_normalized_phone", "customers", ["normalized_phone"])

    op.create_table(
        "garment_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("template_key", sa.String(80), nullable=False, unique=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("category", sa.String(20), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("category IN ('mens','womens','unisex')", name="ck_template_category"),
    )
    op.create_table(
        "garment_template_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("garment_templates.id"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("fields", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("template_id", "version", name="uq_template_version"),
    )
    op.create_table(
        "measurement_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("garment_templates.id"), nullable=False),
        sa.Column("profile_name", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_measurement_profiles_customer_id", "measurement_profiles", ["customer_id"])
    op.create_index("ix_measurement_profiles_template_id", "measurement_profiles", ["template_id"])

    op.create_table(
        "measurement_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("profile_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("measurement_profiles.id"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("template_version_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("garment_template_versions.id"), nullable=False),
        sa.Column("measured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("unit", sa.String(10), nullable=False),
        sa.Column("measurements", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("fit_preference", sa.String(30)),
        sa.Column("notes", sa.Text()),
        sa.Column("change_reason", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("profile_id", "version", name="uq_profile_record_version"),
        sa.CheckConstraint("unit IN ('inches','cm')", name="ck_measurement_unit"),
    )
    op.create_index("ix_measurement_records_profile_id", "measurement_records", ["profile_id"])
    op.execute("CREATE INDEX ix_measurement_history ON measurement_records (profile_id, version DESC)")


def downgrade() -> None:
    op.execute("DROP SEQUENCE IF EXISTS customer_code_seq")
    op.drop_index("ix_measurement_history", table_name="measurement_records")
    op.drop_index("ix_measurement_records_profile_id", table_name="measurement_records")
    op.drop_table("measurement_records")
    op.drop_index("ix_measurement_profiles_template_id", table_name="measurement_profiles")
    op.drop_index("ix_measurement_profiles_customer_id", table_name="measurement_profiles")
    op.drop_table("measurement_profiles")
    op.drop_table("garment_template_versions")
    op.drop_table("garment_templates")
    op.drop_index("ix_customers_normalized_phone", table_name="customers")
    op.drop_index("ix_customers_normalized_name", table_name="customers")
    op.drop_table("customers")
