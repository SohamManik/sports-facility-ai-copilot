import re


def check_message_length(message: str, max_length: int = 500) -> dict:
    """Layer 0: Reject messages over max_length characters."""
    if len(message) > max_length:
        return {
            "blocked": True,
            "reason": "Please keep your message concise — under 500 characters."
        }
    return {"blocked": False, "reason": ""}


def check_injection(message: str) -> dict:
    """Layer 1: Block prompt injection and SQL injection attempts."""
    dangerous_patterns = [
        "ignore previous", "ignore all instructions", "jailbreak",
        "system prompt", "pretend you are", "drop table", "delete from",
        "delete ", "remove ",
        " -- ", "/*", "as an ai", "new persona", "disregard"
    ]
    message_lower = message.lower()
    for pattern in dangerous_patterns:
        if pattern in message_lower:
            return {
                "blocked": True,
                "reason": "I detected an unsafe input pattern. Please ask a normal vendor portal question."
            }
    return {"blocked": False, "reason": ""}


def check_topic_scope(message: str) -> dict:
    """Layer 2: Check if message is related to CRM operations."""
    crm_keywords = [
        "user", "vendor", "revenue", "booking", "membership", "trial",
        "plan", "extend", "update", "list", "show", "count", "cancel",
        "payment", "amount", "date", "status", "active", "expired",
        "today", "how many", "what is", "who", "which", "when", "rupee",
        "income", "earning", "member", "sport", "badminton", "yoga",
        "football", "summary", "change", "audit", "log", "history"
    ]
    # Note: user names removed per brainstorm decision D9
    message_lower = message.lower()
    for keyword in crm_keywords:
        if keyword in message_lower:
            return {"in_scope": True}
    return {"in_scope": False}


def validate_read_sql(sql: str) -> dict:
    """Layer 3: Validate SELECT queries for safety."""
    sql_upper = sql.strip().upper()
    
    if not sql_upper.startswith("SELECT"):
        return {"valid": False, "reason": "Query must be a SELECT statement."}
    
    dangerous_keywords = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE"]
    for keyword in dangerous_keywords:
        # Use word boundary check to avoid false positives
        if re.search(r'\b' + keyword + r'\b', sql_upper):
            return {"valid": False, "reason": f"Query contains forbidden keyword: {keyword}"}
    
    if "vendor_id" not in sql.lower():
        return {"valid": False, "reason": "Query must include vendor_id scope filter."}
    
    return {"valid": True, "reason": ""}


def validate_write_sql(sql: str) -> dict:
    """Layer 3: Validate UPDATE queries for safety."""
    sql_upper = sql.strip().upper()
    
    if not sql_upper.startswith("UPDATE"):
        return {"valid": False, "reason": "Write action must be an UPDATE statement."}
    
    dangerous_keywords = ["DELETE", "DROP", "INSERT", "ALTER", "CREATE", "TRUNCATE"]
    for keyword in dangerous_keywords:
        if re.search(r'\b' + keyword + r'\b', sql_upper):
            return {"valid": False, "reason": f"Write action contains forbidden keyword: {keyword}"}
    
    if "vendor_id" not in sql.lower():
        return {"valid": False, "reason": "Write action must include vendor_id scope filter."}
    
    # Check for forbidden target tables (space after to avoid column name false matches)
    forbidden_tables = ["users ", "vendors ", "revenue ", "audit_log"]
    # Check what table is being updated (first word after UPDATE)
    update_target = sql_upper.split("UPDATE")[1].strip().split()[0] if "UPDATE" in sql_upper else ""
    for table in forbidden_tables:
        if update_target == table.strip().upper():
            return {"valid": False, "reason": f"Cannot modify table: {table.strip()}"}
    
    # Must target one of the allowed tables
    allowed_tables = ["memberships", "trials", "bookings"]
    if not any(table in sql.lower() for table in allowed_tables):
        return {"valid": False, "reason": "Write action must target memberships, trials, or bookings table."}
    
    return {"valid": True, "reason": ""}


def check_bulk_operation(sql: str) -> dict:
    """Layer 4: Flag bulk operations without specific record identifiers."""
    sql_lower = sql.lower()
    # Check if WHERE clause has specific identifiers
    has_specific_id = any(pattern in sql_lower for pattern in [
        "where id", "where user_id", "where name", "like '%"
    ])
    if not has_specific_id:
        return {
            "is_bulk": True,
            "warning": "This will affect multiple records. Are you sure?"
        }
    return {"is_bulk": False, "warning": ""}


def mask_pii(text: str) -> str:
    """Layer 5: Mask emails and phone numbers in output."""
    # Mask email addresses
    text = re.sub(
        r'[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
        r'p***@\1',
        text
    )
    # Mask 10-digit Indian phone numbers (starting with 6-9)
    text = re.sub(
        r'\b[6-9]\d{9}\b',
        '+91 98***1234',
        text
    )
    return text
