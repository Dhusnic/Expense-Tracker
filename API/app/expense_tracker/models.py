from datetime import datetime, date
from typing import Optional, List, Literal
from enum import Enum
# from beanie import str
from pydantic import Field, validator, BaseModel, EmailStr
from ..database import BaseDocument

# ==================== ENUMS ====================

class TransactionType(str, Enum):
    """Transaction types"""
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"
    TRANSFER = "TRANSFER"
    DEBT_GIVEN = "DEBT_GIVEN"
    DEBT_RECEIVED = "DEBT_RECEIVED"
    DEBT_REPAYMENT = "DEBT_REPAYMENT"
    DEBT_COLLECTION = "DEBT_COLLECTION"

class PaymentMethod(str, Enum):
    """Payment methods"""
    CASH = "CASH"
    UPI = "UPI"
    CREDIT_CARD = "CREDIT_CARD"
    DEBIT_CARD = "DEBIT_CARD"
    NET_BANKING = "NET_BANKING"
    BANK_TRANSFER = "BANK_TRANSFER"
    WALLET = "WALLET"
    CHEQUE = "CHEQUE"
    OTHER = "OTHER"

class RecurrenceFrequency(str, Enum):
    """Recurrence frequency"""
    NONE = "NONE"
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    YEARLY = "YEARLY"

class AccountType(str, Enum):
    """Account types"""
    BANK = "BANK"
    CREDIT_CARD = "CREDIT_CARD"
    CASH = "CASH"
    WALLET = "WALLET"
    INVESTMENT = "INVESTMENT"

# ==================== SUBDOCUMENTS ====================

class Location(BaseModel):
    """Location information"""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: str = Field(..., min_length=1)

class Attachment(BaseModel):
    """File attachment"""
    id: str = Field(default_factory=lambda: str(str()))
    file_name: str = Field(..., alias="fileName")
    file_type: str = Field(..., alias="fileType")
    file_size: int = Field(..., alias="fileSize")
    file_url: str = Field(..., alias="fileUrl")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow, alias="uploadedAt")
    
    class Config:
        populate_by_name = True

class SplitTransaction(BaseModel):
    """Split transaction details"""
    contact_id: str = Field(..., alias="contactId")
    amount: float = Field(..., gt=0)
    percentage: Optional[float] = Field(None, ge=0, le=100)
    settled: bool = False
    
    class Config:
        populate_by_name = True

class RecurringConfig(BaseModel):
    """Recurring configuration"""
    frequency: RecurrenceFrequency
    start_date: date = Field(..., alias="startDate")
    end_date: Optional[date] = Field(None, alias="endDate")
    occurrences: Optional[int] = Field(None, ge=1)
    next_occurrence: Optional[date] = Field(None, alias="nextOccurrence")
    
    class Config:
        populate_by_name = True

# ==================== MAIN MODELS ====================

class Category(BaseDocument):
    """Category model"""
    name: str = Field(..., min_length=1, max_length=100)
    icon: str
    color: str
    type: TransactionType
    parent_id: Optional[str] = Field(None, alias="parentId")
    is_active: bool = Field(default=True, alias="isActive")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
    
    class Settings:
        name = "categories"
        indexes = [
            "name",
            "type",
            [("parent_id", 1), ("name", 1)]
        ]
    
    class Config:
        populate_by_name = True

class Account(BaseDocument):
    """Account model"""
    name: str = Field(..., min_length=1, max_length=100)
    type: AccountType
    account_number: Optional[str] = Field(None, alias="accountNumber")
    bank_name: Optional[str] = Field(None, alias="bankName")
    balance: float = 0.0
    currency: str = "INR"
    icon: str
    is_active: bool = Field(default=True, alias="isActive")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
    
    class Settings:
        name = "accounts"
        indexes = ["name", "type", "is_active"]
    
    class Config:
        populate_by_name = True

class UpiProvider(BaseDocument):
    """UPI Provider"""
    name: str = Field(..., min_length=1, max_length=100)
    icon: str
    upi_id: Optional[str] = Field(None, alias="upiId")
    is_active: bool = Field(default=True, alias="isActive")
    
    class Settings:
        name = "upi_providers"
        indexes = ["name"]
    
    class Config:
        populate_by_name = True

class Contact(BaseDocument):
    """Contact model for debt tracking"""
    name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=15)
    email: Optional[EmailStr] = None
    upi_id: Optional[str] = Field(None, alias="upiId")
    total_debt_given: float = Field(default=0.0, alias="totalDebtGiven")
    total_debt_received: float = Field(default=0.0, alias="totalDebtReceived")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
    
    class Settings:
        name = "contacts"
        indexes = ["name", "phone", "email"]
    
    class Config:
        populate_by_name = True

class Transaction(BaseDocument):
    """
    Main Transaction model - Creates 'transactions' collection
    Matches your Angular form structure exactly
    """
    transaction_id: str = Field(default_factory=lambda: str(str()), alias="transactionId")
    # Step 1: Transaction Type
    transaction_type: TransactionType = Field(..., alias="transactionType")
    
    # Step 2: Basic Info
    amount: float = Field(..., gt=0)
    currency: str = "INR"
    transaction_date: date = Field(default_factory=date.today, alias="transactionDate")
    categoryId: str = Field(..., alias="categoryId")
    subcategory_id: Optional[str] = Field(None, alias="subcategoryId")
    description: str = Field(..., min_length=3, max_length=200)
    notes: Optional[str] = Field(None, max_length=500)
    tags: List[str] = Field(default_factory=list)
    
    # Step 3: Payment Details
    payment_method: PaymentMethod = Field(..., alias="paymentMethod")
    from_account_id: Optional[str] = Field(None, alias="fromAccountId")
    to_account_id: Optional[str] = Field(None, alias="toAccountId")
    upi_provider_id: Optional[str] = Field(None, alias="upiProviderId")
    upi_transaction_id: Optional[str] = Field(None, max_length=100, alias="upiTransactionId")
    card_last_four_digits: Optional[str] = Field(None, pattern=r"^\d{4}$", alias="cardLastFourDigits")
    cheque_number: Optional[str] = Field(None, max_length=50, alias="chequeNumber")
    reference_number: Optional[str] = Field(None, max_length=100, alias="referenceNumber")
    
    # Debt specific
    contact_id: Optional[str] = Field(None, alias="contactId")
    due_date: Optional[date] = Field(None, alias="dueDate")
    is_paid: bool = Field(default=False, alias="isPaid")
    
    # Advanced Features
    is_recurring: bool = Field(default=False, alias="isRecurring")
    recurring_config: Optional[RecurringConfig] = Field(None, alias="recurringConfig")
    is_tax_deductible: bool = Field(default=False, alias="isTaxDeductible")
    tax_category: Optional[str] = Field(None, max_length=100, alias="taxCategory")
    location: Optional[Location] = None
    attachments: List[Attachment] = Field(default_factory=list)
    split_transactions: List[SplitTransaction] = Field(default_factory=list, alias="splitTransactions")
    
    # Transfer specific
    transfer_fee: float = Field(default=0.0, ge=0, alias="transferFee")
    create_linked_transactions: bool = Field(default=True, alias="createLinkedTransactions")
    linked_transaction_id: Optional[str] = Field(None, alias="linkedTransactionId")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
    created_by: Optional[str] = Field(None, alias="createdBy")
    is_deleted: bool = Field(default=False, alias="isDeleted")
    is_duplicated: bool = Field(default=False, alias="isDuplicate")
    @validator('amount', 'transfer_fee')
    def validate_positive_amount(cls, v):
        """Ensure amounts are positive"""
        if v < 0:
            raise ValueError('Amount must be positive')
        return round(v, 2)
    
    @validator(
        'card_last_four_digits', 
        'cheque_number', 
        'reference_number', 
        'upi_transaction_id',
        'tax_category',
        'notes',
        pre=True
    )
    def empty_str_to_none(cls, v):
        """Convert empty strings to None"""
        if v == '' or (isinstance(v, str) and not v.strip()):
            return None
        return v
    @validator('split_transactions')
    def validate_split_total(cls, v, values):
        """Ensure split transactions sum equals total amount"""
        if v and 'amount' in values:
            total_split = sum(split.amount for split in v)
            if abs(total_split - values['amount']) > 0.01:
                raise ValueError('Split transactions must sum to total amount')
        return v
    
    @validator('tags')
    def validate_tags(cls, v):
        """Clean and lowercase tags"""
        return [tag.lower().strip() for tag in v if tag.strip()]
    
    class Settings:
        name = "transactions"  # MongoDB collection name
        indexes = [
            "transaction_id",
            "transaction_date",
            "transaction_type",
            "categoryId",
            "from_account_id",
            "to_account_id",
            "contact_id",
            "payment_method",
            [("transaction_date", -1), ("created_at", -1)],
            [("created_by", 1), ("transaction_date", -1)],
            "is_recurring",
            "tags",
            "is_deleted"
        ]
    
    class Config:
        populate_by_name = True

class Budget(BaseDocument):
    """Budget tracking"""
    name: str = Field(..., min_length=1, max_length=100)
    categoryId: str = Field(..., alias="categoryId")
    amount: float = Field(..., gt=0)
    period: Literal['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']
    start_date: date = Field(..., alias="startDate")
    end_date: date = Field(..., alias="endDate")
    spent: float = 0.0
    currency: str = "INR"
    is_active: bool = Field(default=True, alias="isActive")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
    
    class Settings:
        name = "budgets"
        indexes = [
            "categoryId",
            [("start_date", 1), ("end_date", 1)],
            "is_active"
        ]
    
    class Config:
        populate_by_name = True

# ==================== PYDANTIC SCHEMAS (API Request/Response) ====================

class ApiResponse(BaseModel):
    """Standard API response"""
    success: bool
    data: Optional[dict] = None
    message: Optional[str] = None
    errors: Optional[List[str]] = None

class DateRange(BaseModel):
    """Date range filter"""
    start_date: Optional[date] = Field(None, alias="startDate")
    end_date: Optional[date] = Field(None, alias="endDate")
    preset: Optional[Literal['today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'thisYear', 'all', 'custom']] = None
    
    class Config:
        populate_by_name = True

class AmountRange(BaseModel):
    """Amount range filter"""
    min: Optional[float] = None
    max: Optional[float] = None

class FilterOptions(BaseModel):
    """Filter options for transactions"""
    date_range: DateRange = Field(..., alias="dateRange")
    transaction_types: List[TransactionType] = Field(default_factory=list, alias="transactionTypes")
    category_ids: List[str] = Field(default_factory=list, alias="categoryIds")
    account_ids: List[str] = Field(default_factory=list, alias="accountIds")
    payment_methods: List[str] = Field(default_factory=list, alias="paymentMethods")
    amount_range: AmountRange = Field(default_factory=AmountRange, alias="amountRange")
    tags: List[str] = Field(default_factory=list)
    status: List[str] = Field(default_factory=list)
    search_query: str = Field("", alias="searchQuery")
    
    class Config:
        populate_by_name = True

class TransactionCreate(BaseModel):
    """Schema for creating transactions"""
    transaction_id : Optional[str] = Field(None, alias="transactionId")
    transaction_type: TransactionType = Field(..., alias="transactionType")
    amount: float = Field(..., gt=0)
    currency: str = "INR"
    transaction_date: date = Field(..., alias="transactionDate")
    categoryId: str = Field(..., alias="categoryId")
    subcategory_id: Optional[str] = Field(None, alias="subcategoryId")
    description: str = Field(..., min_length=3, max_length=200)
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    payment_method: PaymentMethod = Field(..., alias="paymentMethod")
    from_account_id: Optional[str] = Field(None, alias="fromAccountId")
    to_account_id: Optional[str] = Field(None, alias="toAccountId")
    upi_provider_id: Optional[str] = Field(None, alias="upiProviderId")
    upi_transaction_id: Optional[str] = Field(None, alias="upiTransactionId")
    card_last_four_digits: Optional[str] = Field(None, alias="cardLastFourDigits")
    cheque_number: Optional[str] = Field(None, alias="chequeNumber")
    reference_number: Optional[str] = Field(None, alias="referenceNumber")
    contact_id: Optional[str] = Field(None, alias="contactId")
    due_date: Optional[date] = Field(None, alias="dueDate")
    is_paid: bool = Field(default=False, alias="isPaid")
    is_recurring: bool = Field(default=False, alias="isRecurring")
    recurring_config: Optional[RecurringConfig] = Field(None, alias="recurringConfig")
    is_tax_deductible: bool = Field(default=False, alias="isTaxDeductible")
    tax_category: Optional[str] = Field(None, alias="taxCategory")
    location: Optional[Location] = None
    attachments: List[Attachment] = Field(default_factory=list)
    split_transactions: List[SplitTransaction] = Field(default_factory=list, alias="splitTransactions")
    transfer_fee: float = Field(default=0.0, alias="transferFee")
    create_linked_transactions: bool = Field(default=True, alias="createLinkedTransactions")
    is_duplicated : bool = Field(default=False, alias="isDuplicate")
    # Add validator to convert empty strings to None
    @validator(
        'card_last_four_digits', 
        'cheque_number', 
        'reference_number', 
        'upi_transaction_id',
        'tax_category',
        'notes',
        'subcategory_id',
        'from_account_id',
        'to_account_id',
        'upi_provider_id',
        'contact_id',
        pre=True
    )
    def empty_str_to_none(cls, v):
        """Convert empty strings to None for optional fields"""
        if v == '' or (isinstance(v, str) and not v.strip()):
            return None
        return v
    class Config:
        populate_by_name = True

class TransactionUpdate(BaseModel):
    """Schema for updating transactions"""
    transaction_type: Optional[TransactionType] = Field(None, alias="transactionType")
    amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = None
    transaction_date: Optional[date] = Field(None, alias="transactionDate")
    categoryId: Optional[str] = Field(None, alias="categoryId")
    subcategory_id: Optional[str] = Field(None, alias="subcategoryId")
    description: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    payment_method: Optional[PaymentMethod] = Field(None, alias="paymentMethod")
    is_paid: Optional[bool] = Field(None, alias="isPaid")
    
    class Config:
        populate_by_name = True

class CategoryCreate(BaseModel):
    """Schema for creating categories"""
    name: str = Field(..., min_length=1, max_length=100)
    icon: str
    color: str
    type: TransactionType
    parent_id: Optional[str] = Field(None, alias="parentId")
    
    class Config:
        populate_by_name = True

class AccountCreate(BaseModel):
    """Schema for creating accounts"""
    name: str = Field(..., min_length=1, max_length=100)
    type: AccountType
    account_number: Optional[str] = Field(None, alias="accountNumber")
    bank_name: Optional[str] = Field(None, alias="bankName")
    balance: float = 0.0
    currency: str = "INR"
    icon: str
    
    class Config:
        populate_by_name = True

class ContactCreate(BaseModel):
    """Schema for creating contacts"""
    name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=15)
    email: Optional[EmailStr] = None
    upi_id: Optional[str] = Field(None, alias="upiId")
    
    class Config:
        populate_by_name = True
