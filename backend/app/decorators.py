from functools import wraps
import uuid

from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.extensions import db
from app.models import User, UserRole
from app.utils import user_has_role


def require_roles(*roles: UserRole):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = db.session.get(User, uuid.UUID(get_jwt_identity()))
            if not user or not user.is_active:
                return jsonify({"error": "Unauthorized", "message": "Invalid or inactive user"}), 401

            if not any(user_has_role(user, role) for role in roles):
                return jsonify({"error": "Forbidden", "message": "Insufficient permissions"}), 403

            return fn(*args, **kwargs, current_user=user)

        return wrapper

    return decorator
