from enum import Enum

class Category(str, Enum):
    REAL_ESTATE = "real_estate"
    VEHICLE = "vehicle"
    ELECTRONICS = "electronics"
    OTHER = "other"

class ItemCondition(str, Enum):
    NEW = "new"
    USED = "used"
