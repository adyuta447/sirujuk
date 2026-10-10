import re

def normalize_text(value: str) -> str:
    """Lowercase and strip identifiers (NIK, phone) before embedding or logging."""
    value = re.sub(r"\b\d{16}\b", " ", value)
    value = re.sub(r"(?:\+62|08)\d{8,12}", " ", value)
    return " ".join(value.lower().split())
