from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import Field, field_validator, BaseModel
from ..database import BaseDocument


# ==================== ENUMS ====================

class IconType(str, Enum):
    """Icon types"""
    BOOTSTRAP_ICON = "BOOTSTRAP_ICON"
    EMOJI = "EMOJI"
    CUSTOM_IMAGE = "CUSTOM_IMAGE"


class TransactionType(str, Enum):
    """Transaction types for categories"""
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"
    TRANSFER = "TRANSFER"
    DEBT_GIVEN = "DEBT_GIVEN"
    DEBT_RECEIVED = "DEBT_RECEIVED"
    DEBT_REPAYMENT = "DEBT_REPAYMENT"
    DEBT_COLLECTION = "DEBT_COLLECTION"


# ==================== SUBDOCUMENTS ====================

class CategoryIcon(BaseModel):
    """Category icon configuration"""
    type: IconType
    value: str = Field(..., min_length=1)
    color: Optional[str] = None
    background_color: Optional[str] = Field(None, alias='backgroundColor')
    
    @field_validator('background_color', 'color', mode='before')
    @classmethod
    def validate_color(cls, v):
        """Allow hex, rgb, rgba, or None"""
        if not v or v == '':
            return None
        return v
    
    class Config:
        populate_by_name = True


class Subcategory(BaseModel):
    """Subcategory subdocument"""
    id: Optional[str] = None
    name: str = Field(..., min_length=2, max_length=100)
    icon: CategoryIcon
    description: Optional[str] = Field(None, max_length=500)
    sort_order: int = Field(default=0, alias="sortOrder")
    is_active: bool = Field(default=True, alias="isActive")
    budget_limit: Optional[float] = Field(None, ge=0, alias="budgetLimit")
    is_tax_deductible: bool = Field(default=False, alias="isTaxDeductible")
    tax_category: Optional[str] = Field(None, max_length=100, alias="taxCategory")
    default_account_id: Optional[str] = Field(None, alias="defaultAccountId")
    linked_account_ids: List[str] = Field(default_factory=list, alias="linkedAccountIds")
    created_at: Optional[datetime] = Field(None, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
    
    @field_validator('name', mode='after')
    @classmethod
    def clean_name(cls, v):
        return v.strip()
    
    @field_validator('tax_category', 'description', 'default_account_id', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == '' or (isinstance(v, str) and not v.strip()):
            return None
        return v
    
    @field_validator('linked_account_ids', mode='before')
    @classmethod
    def clean_linked_accounts(cls, v):
        if not v:
            return []
        return [acc for acc in v if acc and str(acc).strip()]
    
    class Config:
        populate_by_name = True


# ==================== MAIN MODELS ====================

class Category(BaseDocument):
    """Main Category model - Matches Angular Category interface"""
    categoryId: str = Field(..., alias="categoryId")
    name: str = Field(..., min_length=2, max_length=100)
    icon: CategoryIcon
    description: Optional[str] = Field(None, max_length=500)
    transaction_types: List[TransactionType] = Field(..., alias="transactionTypes")
    subcategories: List[Subcategory] = Field(default_factory=list)
    sort_order: int = Field(default=0, alias="sortOrder")
    is_active: bool = Field(default=True, alias="isActive")
    budget_limit: Optional[float] = Field(None, ge=0, alias="budgetLimit")
    is_tax_deductible: bool = Field(default=False, alias="isTaxDeductible")
    tax_category: Optional[str] = Field(None, max_length=100, alias="taxCategory")
    is_default: bool = Field(default=False, alias="isDefault")
    default_account_id: Optional[str] = Field(None, alias="defaultAccountId")
    linked_account_ids: List[str] = Field(default_factory=list, alias="linkedAccountIds")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
    created_by: Optional[str] = Field(None, alias="createdBy")
    is_deleted: bool = Field(default=False, alias="isDeleted")
    is_system_category: bool = Field(default=False, alias="isSystemCategory")
    isDuplicated: bool = Field(default=False, alias="isDuplicated")

    @field_validator('name', mode='after')
    @classmethod
    def clean_name(cls, v):
        return v.strip()
    
    @field_validator('transaction_types', mode='after')
    @classmethod
    def validate_transaction_types(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one transaction type is required')
        return v
    
    @field_validator('subcategories', mode='after')
    @classmethod
    def validate_subcategories_unique(cls, v):
        names = [sub.name.lower() for sub in v]
        if len(names) != len(set(names)):
            raise ValueError('Subcategory names must be unique')
        return v
    
    @field_validator('tax_category', 'description', 'default_account_id', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == '' or (isinstance(v, str) and not v.strip()):
            return None
        return v
    
    @field_validator('linked_account_ids', mode='before')
    @classmethod
    def clean_linked_accounts(cls, v):
        if not v:
            return []
        return [acc for acc in v if acc and str(acc).strip()]
    
    class Settings:
        name = "categories"
        indexes = [
            "categoryId",
            "name",
            "transaction_types",
            "is_active",
            "is_deleted",
            "sort_order"
        ]
    
    class Config:
        populate_by_name = True


# ==================== PYDANTIC SCHEMAS ====================

class ApiResponse(BaseModel):
    """Standard API response"""
    success: bool
    message: str
    data: Optional[dict | List[dict]] = None
    errors: Optional[List[str]] = None


class SubcategoryCreate(BaseModel):
    """Schema for creating subcategories"""
    id: Optional[str] = None
    name: str = Field(..., min_length=2, max_length=100)
    icon: CategoryIcon
    description: Optional[str] = Field(None, max_length=500)
    sort_order: int = Field(default=0, alias="sortOrder")
    is_active: bool = Field(default=True, alias="isActive")
    budget_limit: Optional[float] = Field(None, ge=0, alias="budgetLimit")
    is_tax_deductible: bool = Field(default=False, alias="isTaxDeductible")
    tax_category: Optional[str] = Field(None, max_length=100, alias="taxCategory")
    default_account_id: Optional[str] = Field(None, alias="defaultAccountId")
    linked_account_ids: List[str] = Field(default_factory=list, alias="linkedAccountIds")
    
    @field_validator('tax_category', 'description', 'default_account_id', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == '' or (isinstance(v, str) and not v.strip()):
            return None
        return v
    
    @field_validator('linked_account_ids', mode='before')
    @classmethod
    def clean_linked_accounts(cls, v):
        if not v:
            return []
        return [acc for acc in v if acc and str(acc).strip()]
    
    class Config:
        populate_by_name = True


class CategoryCreate(BaseModel):
    """Schema for creating categories - Matches Angular CategoryFormData"""
    categoryId: Optional[str] = Field(None, alias="categoryId")
    id: Optional[str] = None
    name: str = Field(..., min_length=2, max_length=100)
    icon: CategoryIcon
    # ✅ REMOVED: color field
    description: Optional[str] = Field(None, max_length=500)
    transaction_types: List[TransactionType] = Field(..., alias="transactionTypes", min_length=1)
    subcategories: List[SubcategoryCreate] = Field(default_factory=list)
    sort_order: int = Field(default=0, alias="sortOrder")
    is_active: bool = Field(default=True, alias="isActive")
    budget_limit: Optional[float] = Field(None, ge=0, alias="budgetLimit")
    is_tax_deductible: bool = Field(default=False, alias="isTaxDeductible")
    tax_category: Optional[str] = Field(None, max_length=100, alias="taxCategory")
    is_default: bool = Field(default=False, alias="isDefault")
    default_account_id: Optional[str] = Field(None, alias="defaultAccountId")
    linked_account_ids: List[str] = Field(default_factory=list, alias="linkedAccountIds")
    isDuplicated: bool = Field(default=False, alias="isDuplicated")
    
    @field_validator('tax_category', 'description', 'default_account_id', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == '' or (isinstance(v, str) and not v.strip()):
            return None
        return v
    
    @field_validator('linked_account_ids', mode='before')
    @classmethod
    def clean_linked_accounts(cls, v):
        if not v:
            return []
        return [acc for acc in v if acc and str(acc).strip()]
    
    class Config:
        populate_by_name = True


class CategoryUpdate(BaseModel):
    """Schema for updating categories"""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    icon: Optional[CategoryIcon] = None
    description: Optional[str] = Field(None, max_length=500)
    transaction_types: Optional[List[TransactionType]] = Field(None, alias="transactionTypes")
    subcategories: Optional[List[SubcategoryCreate]] = None
    sort_order: Optional[int] = Field(None, alias="sortOrder")
    is_active: Optional[bool] = Field(None, alias="isActive")
    budget_limit: Optional[float] = Field(None, ge=0, alias="budgetLimit")
    is_tax_deductible: Optional[bool] = Field(None, alias="isTaxDeductible")
    tax_category: Optional[str] = Field(None, alias="taxCategory")
    is_default: Optional[bool] = Field(None, alias="isDefault")
    default_account_id: Optional[str] = Field(None, alias="defaultAccountId")
    linked_account_ids: Optional[List[str]] = Field(None, alias="linkedAccountIds")
    
    @field_validator('tax_category', 'description', 'default_account_id', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if v == '' or (isinstance(v, str) and not v.strip()):
            return None
        return v
    
    class Config:
        populate_by_name = True
