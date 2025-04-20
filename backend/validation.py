# validation.py

from typing import Any, Tuple, List, Dict, Union

def validate_business_card_data(data: Dict[str, Any]) -> Tuple[bool, Union[str, None]]:
    """
    Validates the structure and basic types for business card data.
    Returns (True, None) if valid, or (False, error_message) if invalid.
    """
    expected_keys = {"name", "title", "phone", "email", "website", "address"}
    actual_keys = set(data.keys())

    if not expected_keys.issubset(actual_keys):
        missing = expected_keys - actual_keys
        extra = actual_keys - expected_keys
        error = f"Missing keys: {missing}. " if missing else ""
        error += f"Unexpected keys: {extra}." if extra else ""
        return False, f"Business card data structure mismatch. {error.strip()}"

    # Type checks (allow None)
    if data.get("name") is not None and not isinstance(data["name"], str):
        return False, "Invalid type for 'name', expected string or null."
    if data.get("title") is not None and not isinstance(data["title"], str):
        return False, "Invalid type for 'title', expected string or null."
    if data.get("address") is not None and not isinstance(data["address"], str):
        return False, "Invalid type for 'address', expected string or null."

    # List type checks (allow None or list of strings)
    for key in ["phone", "email", "website"]:
        value = data.get(key)
        if value is not None:
            if not isinstance(value, list):
                return False, f"Invalid type for '{key}', expected list or null."
            if not all(isinstance(item, str) for item in value):
                 return False, f"Invalid item type in '{key}' list, expected strings."

    return True, None # Data is valid

def validate_visitor_register_data(data: List[Dict[str, Any]]) -> Tuple[bool, Union[str, None]]:
    """
    Validates the structure and basic types for visitor register data (list of entries).
    Returns (True, None) if valid, or (False, error_message) if invalid.
    """
    if not isinstance(data, list):
        return False, "Visitor register data should be a list of entries."

    if not data: # Empty list is considered valid (empty register)
        return True, None

    expected_entry_keys = {"date", "visitor_name", "address", "time_in", "time_out"}

    for i, entry in enumerate(data):
        if not isinstance(entry, dict):
            return False, f"Entry at index {i} is not a dictionary."

        actual_keys = set(entry.keys())
        if not expected_entry_keys.issubset(actual_keys):
            missing = expected_entry_keys - actual_keys
            extra = actual_keys - expected_entry_keys
            error = f"Missing keys: {missing}. " if missing else ""
            error += f"Unexpected keys: {extra}." if extra else ""
            return False, f"Visitor entry structure mismatch at index {i}. {error.strip()}"

        # Basic type checks for entry fields (allow None, expect strings)
        for key in expected_entry_keys:
            value = entry.get(key)
            if value is not None and not isinstance(value, str):
                 return False, f"Invalid type for '{key}' in entry at index {i}, expected string or null."

    return True, None # Data is valid