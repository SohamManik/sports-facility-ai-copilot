import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

Base = declarative_base()


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True)
    phone = Column(String(15))
    hobby_preferences = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)


class Vendor(Base):
    __tablename__ = 'vendors'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=True)
    password = Column(String(100), nullable=True)
    sport_category = Column(String(50))
    location = Column(String(100))
    portal_since = Column(DateTime)


class Booking(Base):
    __tablename__ = 'bookings'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    vendor_id = Column(Integer, ForeignKey('vendors.id'))
    facility = Column(String(100))
    booking_date = Column(Date)
    slot_time = Column(String(20))
    amount = Column(Float)
    status = Column(String(20))  # confirmed/cancelled/completed
    created_at = Column(DateTime, default=datetime.utcnow)


class Membership(Base):
    __tablename__ = 'memberships'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    vendor_id = Column(Integer, ForeignKey('vendors.id'))
    plan_type = Column(String(20))  # monthly/quarterly/annual
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(String(20))  # active/expired/cancelled
    amount_paid = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)


class Trial(Base):
    __tablename__ = 'trials'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    vendor_id = Column(Integer, ForeignKey('vendors.id'))
    sport = Column(String(50))
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(String(20))  # active/expired/converted
    created_at = Column(DateTime, default=datetime.utcnow)


class Revenue(Base):
    __tablename__ = 'revenue'
    id = Column(Integer, primary_key=True)
    vendor_id = Column(Integer, ForeignKey('vendors.id'))
    date = Column(Date)
    bookings_revenue = Column(Float)
    membership_revenue = Column(Float)
    total_revenue = Column(Float)


class PendingAction(Base):
    __tablename__ = 'pending_actions'
    id = Column(Integer, primary_key=True)
    vendor_id = Column(Integer)
    action_type = Column(String(50))
    action_sql = Column(Text)
    human_readable = Column(Text)
    current_state = Column(Text, nullable=True)   # JSON string for diff
    proposed_state = Column(Text, nullable=True)  # JSON string for diff
    status = Column(String(20), default='pending')  # pending/approved/rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)


class AuditLog(Base):
    __tablename__ = 'audit_log'
    id = Column(Integer, primary_key=True)
    vendor_id = Column(Integer)
    action_type = Column(String(50))
    description = Column(Text)
    executed_at = Column(DateTime, default=datetime.utcnow)
    approved_by = Column(String(50), default='vendor')


engine = create_engine('sqlite:///./hobbyfi.db', connect_args={'check_same_thread': False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
