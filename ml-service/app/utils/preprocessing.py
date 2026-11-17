import re

# Identifiers are removed in the formats people actually write, not only as plain digits:
#   NIK   3171234567890001, 3171 2345 6789 0001, 3171-2345-6789-0001, 317123-456789-0001
#   phone 081234567890, 0812-3456-7890, +62 812 3456 7890, 6281234567890
# Grouped like an ID on purpose: "any 16 digits with any separator" would also eat lab values and dates.
_NIK = re.compile(r"(?<!\d)(?:\d{16}|\d{4}([\s.-])\d{4}\1\d{4}\1\d{4}|\d{6}([\s.-])\d{6}\2\d{4})(?!\d)")
_PHONE = re.compile(r"(?<!\d)(?:\+?62|0)[\s.-]?8\d{1,3}(?:[\s.-]?\d{3,4}){2,3}(?!\d)")
_PLAIN = (re.compile(r"\b\d{16}\b"), re.compile(r"(?:\+62|08)\d{8,12}"))  # the original patterns, kept so nothing it removed before is lost


def normalize_text(value: str) -> str:
    """Lowercase and strip identifiers (NIK, phone) before embedding or logging."""
    for pattern in (_NIK, _PHONE, *_PLAIN):
        value = pattern.sub(" ", value)
    return " ".join(value.lower().split())
