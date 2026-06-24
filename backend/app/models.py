import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Enum, Index, Time, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db


def utcnow():
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    PLATFORM_ADMIN = "platform_admin"
    ORG_ADMIN = "org_admin"
    SUPERVISOR = "supervisor"
    THERAPIST = "therapist"
    TRAINEE = "trainee"
    CLIENT = "client"


class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class Organization(db.Model):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(db.String(255), nullable=False)
    slug: Mapped[str] = mapped_column(db.String(255), unique=True, nullable=False, index=True)
    timezone: Mapped[str] = mapped_column(db.String(64), default="UTC", nullable=False)
    is_active: Mapped[bool] = mapped_column(db.Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    members = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")


class User(db.Model):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(db.String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(db.String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(db.String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(db.String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(db.String(32))
    is_email_verified: Mapped[bool] = mapped_column(db.Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(db.Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    memberships = relationship("OrganizationMember", back_populates="user", cascade="all, delete-orphan")
    therapist_profile = relationship("TherapistProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    trainee_profile = relationship(
        "TraineeProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        foreign_keys="TraineeProfile.user_id",
    )
    client_profile = relationship("ClientProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    telegram_link = relationship("TelegramLink", back_populates="user", uselist=False, cascade="all, delete-orphan")

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class OrganizationMember(db.Model):
    __tablename__ = "organization_members"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_org_member"),
        Index("ix_org_members_role", "organization_id", "role"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), nullable=False)
    is_active: Mapped[bool] = mapped_column(db.Boolean, default=True, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    organization = relationship("Organization", back_populates="members")
    user = relationship("User", back_populates="memberships")


class TherapistProfile(db.Model):
    __tablename__ = "therapist_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    bio: Mapped[str | None] = mapped_column(db.Text)
    specializations: Mapped[str | None] = mapped_column(db.Text)
    languages: Mapped[str | None] = mapped_column(db.String(255))
    license_number: Mapped[str | None] = mapped_column(db.String(100))
    license_authority: Mapped[str | None] = mapped_column(db.String(255))
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus, name="approval_status"), default=ApprovalStatus.PENDING, nullable=False
    )
    rejection_reason: Mapped[str | None] = mapped_column(db.Text)
    approved_at: Mapped[datetime | None] = mapped_column(db.DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    user = relationship("User", back_populates="therapist_profile")
    credentials = relationship("CredentialDocument", back_populates="therapist", cascade="all, delete-orphan")


class TraineeProfile(db.Model):
    __tablename__ = "trainee_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    program_name: Mapped[str | None] = mapped_column(db.String(255))
    languages: Mapped[str | None] = mapped_column(db.String(255))
    expected_graduation: Mapped[datetime | None] = mapped_column(db.DateTime(timezone=True))
    supervisor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="SET NULL")
    )
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus, name="trainee_approval_status"), default=ApprovalStatus.PENDING, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    user = relationship("User", back_populates="trainee_profile", foreign_keys=[user_id])
    supervisor = relationship("User", foreign_keys=[supervisor_id])


class ClientProfile(db.Model):
    __tablename__ = "client_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    country: Mapped[str | None] = mapped_column(db.String(100))
    timezone: Mapped[str | None] = mapped_column(db.String(64))
    emergency_contact_name: Mapped[str | None] = mapped_column(db.String(255))
    emergency_contact_phone: Mapped[str | None] = mapped_column(db.String(32))
    preferred_language: Mapped[str] = mapped_column(db.String(32), default="en", nullable=False)
    created_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    user = relationship("User", back_populates="client_profile")


class CredentialDocument(db.Model):
    __tablename__ = "credential_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    therapist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("therapist_profiles.id", ondelete="CASCADE"), nullable=False
    )
    file_name: Mapped[str] = mapped_column(db.String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(db.String(512), nullable=False)
    document_type: Mapped[str] = mapped_column(db.String(100), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    therapist = relationship("TherapistProfile", back_populates="credentials")


class ConsentType(str, enum.Enum):
    TELEHEALTH = "telehealth"
    DATA_PROCESSING = "data_processing"
    RECORDING = "recording"
    CRISIS_DISCLAIMER = "crisis_disclaimer"
    TELEGRAM_NOTIFICATIONS = "telegram_notifications"


class ConsentRecord(db.Model):
    __tablename__ = "consent_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    consent_type: Mapped[ConsentType] = mapped_column(Enum(ConsentType, name="consent_type"), nullable=False)
    version: Mapped[str] = mapped_column(db.String(32), nullable=False)
    accepted: Mapped[bool] = mapped_column(db.Boolean, default=True, nullable=False)
    accepted_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    ip_address: Mapped[str | None] = mapped_column(db.String(45))


class TelegramLink(db.Model):
    __tablename__ = "telegram_links"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    telegram_chat_id: Mapped[str] = mapped_column(db.String(64), unique=True, nullable=False)
    telegram_username: Mapped[str | None] = mapped_column(db.String(64))
    linked_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="telegram_link")


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(db.String(100), nullable=False)
    resource_type: Mapped[str] = mapped_column(db.String(100), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(db.String(64))
    details: Mapped[str | None] = mapped_column(db.Text)
    ip_address: Mapped[str | None] = mapped_column(db.String(45))
    created_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), default=utcnow, nullable=False, index=True)


class AppointmentType(str, enum.Enum):
    CLIENT_SESSION = "client_session"
    SUPERVISION = "supervision"
    INTAKE = "intake"


class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class PricingType(str, enum.Enum):
    STANDARD = "standard"
    SLIDING_SCALE = "sliding_scale"
    PRO_BONO = "pro_bono"
    TRAINEE_RATE = "trainee_rate"


class SessionMode(str, enum.Enum):
    VIDEO = "video"
    AUDIO_ONLY = "audio_only"


class AvailabilityRule(db.Model):
    __tablename__ = "availability_rules"
    __table_args__ = (Index("ix_availability_provider_dow", "provider_id", "day_of_week"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    day_of_week: Mapped[int] = mapped_column(db.Integer, nullable=False)  # 0=Monday … 6=Sunday
    start_time: Mapped[Time] = mapped_column(Time, nullable=False)
    end_time: Mapped[Time] = mapped_column(Time, nullable=False)
    timezone: Mapped[str] = mapped_column(db.String(64), default="UTC", nullable=False)
    is_active: Mapped[bool] = mapped_column(db.Boolean, default=True, nullable=False)


class AvailabilityBlock(db.Model):
    __tablename__ = "availability_blocks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    starts_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), nullable=False)
    reason: Mapped[str | None] = mapped_column(db.String(255))


class SessionPricing(db.Model):
    __tablename__ = "session_pricing"
    __table_args__ = (UniqueConstraint("provider_id", "duration_minutes", name="uq_provider_duration"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    duration_minutes: Mapped[int] = mapped_column(db.Integer, nullable=False)
    pricing_type: Mapped[PricingType] = mapped_column(
        Enum(PricingType, name="pricing_type"), default=PricingType.STANDARD, nullable=False
    )
    amount_cents: Mapped[int] = mapped_column(db.Integer, default=0, nullable=False)
    currency: Mapped[str] = mapped_column(db.String(8), default="USD", nullable=False)
    is_active: Mapped[bool] = mapped_column(db.Boolean, default=True, nullable=False)


class Appointment(db.Model):
    __tablename__ = "appointments"
    __table_args__ = (Index("ix_appointments_provider_starts", "provider_id", "starts_at"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    supervisor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="SET NULL")
    )
    appointment_type: Mapped[AppointmentType] = mapped_column(
        Enum(AppointmentType, name="appointment_type"), default=AppointmentType.CLIENT_SESSION, nullable=False
    )
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, name="appointment_status"), default=AppointmentStatus.CONFIRMED, nullable=False
    )
    starts_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(db.Integer, nullable=False)
    client_timezone: Mapped[str] = mapped_column(db.String(64), default="UTC", nullable=False)
    provider_timezone: Mapped[str] = mapped_column(db.String(64), default="UTC", nullable=False)
    pricing_type: Mapped[PricingType] = mapped_column(
        Enum(PricingType, name="appointment_pricing_type"), default=PricingType.STANDARD, nullable=False
    )
    amount_cents: Mapped[int] = mapped_column(db.Integer, default=0, nullable=False)
    currency: Mapped[str] = mapped_column(db.String(8), default="USD", nullable=False)
    cancellation_reason: Mapped[str | None] = mapped_column(db.Text)
    cancelled_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="SET NULL")
    )
    reminder_24h_sent: Mapped[bool] = mapped_column(db.Boolean, default=False, nullable=False)
    reminder_1h_sent: Mapped[bool] = mapped_column(db.Boolean, default=False, nullable=False)
    video_room_name: Mapped[str | None] = mapped_column(db.String(255))
    video_room_url: Mapped[str | None] = mapped_column(db.String(512))
    session_mode: Mapped[SessionMode] = mapped_column(
        Enum(SessionMode, values_callable=lambda x: [e.value for e in x], name="session_mode"),
        default=SessionMode.VIDEO,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    client = relationship("User", foreign_keys=[client_id])
    provider = relationship("User", foreign_keys=[provider_id])
    supervisor = relationship("User", foreign_keys=[supervisor_id])
    clinical_note = relationship("ClinicalNote", back_populates="appointment", uselist=False)


class ClinicalNoteStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    COSIGNED = "cosigned"


class ClinicalNote(db.Model):
    __tablename__ = "clinical_notes"
    __table_args__ = (UniqueConstraint("appointment_id", name="uq_clinical_note_appointment"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appointment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    subjective: Mapped[str | None] = mapped_column(db.Text)
    objective: Mapped[str | None] = mapped_column(db.Text)
    assessment: Mapped[str | None] = mapped_column(db.Text)
    plan: Mapped[str | None] = mapped_column(db.Text)
    status: Mapped[ClinicalNoteStatus] = mapped_column(
        Enum(ClinicalNoteStatus, values_callable=lambda x: [e.value for e in x], name="clinical_note_status"),
        default=ClinicalNoteStatus.DRAFT,
        nullable=False,
    )
    submitted_at: Mapped[datetime | None] = mapped_column(db.DateTime(timezone=True))
    cosigned_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="SET NULL")
    )
    cosigned_at: Mapped[datetime | None] = mapped_column(db.DateTime(timezone=True))
    supervisor_comment: Mapped[str | None] = mapped_column(db.Text)
    created_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    appointment = relationship("Appointment", back_populates="clinical_note")
    author = relationship("User", foreign_keys=[author_id])
    client = relationship("User", foreign_keys=[client_id])
    cosigned_by = relationship("User", foreign_keys=[cosigned_by_id])


class TraineeIntake(db.Model):
    """Required intake before a client books with a supervised trainee."""

    __tablename__ = "trainee_intakes"
    __table_args__ = (UniqueConstraint("client_id", "trainee_provider_id", name="uq_trainee_intake_client"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    trainee_provider_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), db.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    presenting_concerns: Mapped[str] = mapped_column(db.Text, nullable=False)
    primary_goals: Mapped[str] = mapped_column(db.Text, nullable=False)
    prior_therapy: Mapped[str | None] = mapped_column(db.Text)
    current_medications: Mapped[str | None] = mapped_column(db.Text)
    emergency_contact_name: Mapped[str] = mapped_column(db.String(255), nullable=False)
    emergency_contact_phone: Mapped[str] = mapped_column(db.String(32), nullable=False)
    country: Mapped[str | None] = mapped_column(db.String(100))
    preferred_session_mode: Mapped[SessionMode] = mapped_column(
        Enum(SessionMode, values_callable=lambda x: [e.value for e in x], name="trainee_intake_session_mode"),
        default=SessionMode.VIDEO,
        nullable=False,
    )
    supervised_care_consent: Mapped[bool] = mapped_column(db.Boolean, default=False, nullable=False)
    telehealth_consent: Mapped[bool] = mapped_column(db.Boolean, default=False, nullable=False)
    crisis_acknowledgment: Mapped[bool] = mapped_column(db.Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(db.DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    client = relationship("User", foreign_keys=[client_id])
    trainee = relationship("User", foreign_keys=[trainee_provider_id])

