from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from ..core.utils import utils

# from beanie import str
from datetime import date
from ..expense_tracker.models import (
    Transaction,
    Category,
    Account,
    Contact,
    Budget,
    UpiProvider,
    TransactionCreate,
    TransactionUpdate,
    CategoryCreate,
    AccountCreate,
    ContactCreate,
    ApiResponse,
    FilterOptions,
    TransactionType,
    PaymentMethod,
)
from ..auth.dependencies import get_current_user  # Reuse your auth
from datetime import datetime

router = APIRouter()
# utils = Utils()
# ==================== TRANSACTION ENDPOINTS ====================


@router.post("/save", response_model=ApiResponse)
async def save_transaction(data: TransactionCreate):
    """Create, Update, or Duplicate transaction"""
    try:
        # Convert to dict with Python field names (not aliases)
        transaction_data = data.model_dump(by_alias=False, exclude_unset=True)

        # Get transaction details
        transaction_id = transaction_data.get("transaction_id")
        is_duplicated = transaction_data.pop(
            "is_duplicated", False
        )  # Remove this field

        # Determine operation type
        is_new = not transaction_id or transaction_id in utils.none_list
        is_duplicate = transaction_id and is_duplicated
        is_update = transaction_id and not is_duplicated

        # === CREATE NEW TRANSACTION ===
        if is_new:
            # Remove None/empty transaction_id
            transaction_data.pop("transaction_id", None)

            # Add metadata
            transaction_data["transaction_id"] = utils.get_id()
            transaction_data["created_at"] = datetime.utcnow()
            transaction_data["is_deleted"] = False

            # ✅ CORRECT WAY: Use constructor + insert
            transaction = Transaction(**transaction_data)
            await transaction.insert()

            return ApiResponse(
                success=True,
                data=transaction.model_dump(by_alias=True, mode="json"),
                message="Transaction created successfully",
            )

        # === DUPLICATE TRANSACTION ===
        elif is_duplicate:
            # Find original
            original = await Transaction.find_one(
                Transaction.transaction_id == transaction_id,
                Transaction.is_deleted == False,
            )

            if not original:
                raise HTTPException(
                    status_code=404, detail="Original transaction not found"
                )

            # Remove old transaction_id
            # transaction_data.pop("transaction_id", None)

            # Generate new ID
            transaction_data["transaction_id"] = utils.get_id()
            transaction_data["created_at"] = datetime.utcnow()
            transaction_data["updated_at"] = None
            transaction_data["is_deleted"] = False

            # Clear sensitive fields
            transaction_data["upi_transaction_id"] = None
            transaction_data["card_last_four_digits"] = None
            transaction_data["cheque_number"] = None
            transaction_data["reference_number"] = None
            transaction_data["attachments"] = []

            # Mark as copy
            if "description" in transaction_data and transaction_data["description"] == original.description:
                transaction_data["description"] = (
                    f"{transaction_data['description']} (Copy)"
                )

            # ✅ CORRECT WAY: Use constructor + insert
            transaction = Transaction(**transaction_data)
            await transaction.insert()

            return ApiResponse(
                success=True,
                data=transaction.model_dump(by_alias=True, mode="json"),
                message="Transaction duplicated successfully",
            )

        # === UPDATE EXISTING TRANSACTION ===
        elif is_update:
            # Find existing
            transaction = await Transaction.find_one(
                Transaction.transaction_id == transaction_id,
                Transaction.is_deleted == False,
            )

            if not transaction:
                raise HTTPException(status_code=404, detail="Transaction not found")

            # Remove immutable fields
            transaction_data.pop("transaction_id", None)
            transaction_data.pop("created_at", None)
            transaction_data.pop("created_by", None)

            # Update timestamp
            transaction_data["updated_at"] = datetime.utcnow()

            # Update fields
            for key, value in transaction_data.items():
                if hasattr(transaction, key):
                    setattr(transaction, key, value)

            await transaction.save()

            return ApiResponse(
                success=True,
                data=transaction.model_dump(by_alias=True, mode="json"),
                message="Transaction updated successfully",
            )

    except HTTPException:
        raise
    except Exception as e:
        import traceback

        print(f"Error in save_transaction: {str(e)}")
        print(traceback.format_exc())
        return ApiResponse(
            success=False, errors=[str(e)], message="Failed to save transaction"
        )


# @router.get("/transactions/{transaction_id}")
@router.get("/transactions/{transaction_id}")
async def get_transaction(transaction_id: str):
    """Get single transaction by custom transaction_id"""
    try:
        # Use find_one() for custom fields
        transaction = await Transaction.find_one(
            Transaction.transaction_id == transaction_id,
            Transaction.is_deleted == False
        )
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")

        # Check ownership (uncomment when auth is ready)
        # if transaction.created_by != str(current_user.id):
        #     raise HTTPException(status_code=403, detail="Not authorized")

        return ApiResponse(
            success=True,
            data=transaction.model_dump(by_alias=True, mode='json'),
            message="Transaction retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error getting transaction: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=str(e))



# @router.get("/get_list")
@router.get("/get_list")
async def list_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    transaction_type: Optional[TransactionType] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category_id: Optional[str] = None,
    payment_method: Optional[PaymentMethod] = None,
    search: Optional[str] = None,
):
    """List transactions with filters - Beanie query builder"""
    try:
        # Start with base query
        query = Transaction.find(Transaction.is_deleted == False)

        # Apply filters conditionally
        if transaction_type:
            query = query.find(Transaction.transaction_type == transaction_type)

        if category_id:
            query = query.find(Transaction.category_id == category_id)

        if payment_method:
            query = query.find(Transaction.payment_method == payment_method)

        # Date range filters
        if start_date:
            query = query.find(Transaction.transaction_date >= start_date)

        if end_date:
            query = query.find(Transaction.transaction_date <= end_date)

        # Search in description (MongoDB regex)
        if search:
            from beanie.operators import RegEx

            query = query.find(RegEx(Transaction.description, search, "i"))

        # Get total count before pagination
        total = await query.count()

        # Apply sorting and pagination
        transactions = (
            await query.sort(-Transaction.transaction_date, -Transaction.created_at)
            .skip(skip)
            .limit(limit)
            .to_list()
        )

        # Serialize transactions
        transactions_data = [
            t.model_dump(by_alias=True, mode="json") for t in transactions
        ]

        return {
            "success": True,
            "data": transactions_data,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "pages": (total + limit - 1) // limit,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/transactions/{transaction_id}")
async def update_transaction(
    transaction_id: str, data: TransactionUpdate, current_user=Depends(get_current_user)
):
    """Update transaction - Django style"""
    try:
        transaction = await Transaction.get(str(transaction_id))
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")

        # Check ownership
        if transaction.created_by != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized")

        # Update only provided fields
        update_data = data.dict(exclude_unset=True, by_alias=False)

        # Handle ObjectId conversions
        if "category_id" in update_data and update_data["category_id"]:
            update_data["category_id"] = str(update_data["category_id"])

        # Django-style update
        await transaction.update(**update_data)

        return ApiResponse(
            success=True,
            data=transaction.dict(by_alias=True),
            message="Transaction updated successfully",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/transactions/{transaction_id}")
# @router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    # current_user = Depends(get_current_user)
):
    """Soft delete transaction"""
    try:
        transaction = await Transaction.get(transaction_id)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")

        # Check ownership
        # if transaction.created_by != str(current_user.id):
        #     raise HTTPException(status_code=403, detail="Not authorized")

        # Soft delete - Modify and save
        transaction.is_deleted = True
        await transaction.save()  # or await transaction.replace()

        return ApiResponse(success=True, message="Transaction deleted successfully")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== CATEGORY ENDPOINTS ====================


@router.post("/categories")
async def create_category(data: CategoryCreate, current_user=Depends(get_current_user)):
    """Create category"""
    try:
        category_data = data.dict(by_alias=False)
        if data.parent_id:
            category_data["parent_id"] = str(data.parent_id)

        category = await Category.objects.create(**category_data)

        return ApiResponse(
            success=True,
            data=category.dict(by_alias=True),
            message="Category created successfully",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/categories")
async def list_categories(
    type: Optional[TransactionType] = None, current_user=Depends(get_current_user)
):
    """List all active categories"""
    try:
        query = Category.objects.filter(is_active=True)

        if type:
            query = query.filter(type=type)

        categories = await query.order_by("name").to_list()

        return {"success": True, "data": categories}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/categories/{category_id}")
async def get_category(category_id: str, current_user=Depends(get_current_user)):
    """Get single category with subcategories"""
    try:
        category = await Category.get(str(category_id))
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

        # Get subcategories
        subcategories = await Category.objects.filter(
            parent_id=category.id, is_active=True
        ).to_list()

        category_dict = category.dict(by_alias=True)
        category_dict["subcategories"] = subcategories

        return category_dict
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== ACCOUNT ENDPOINTS ====================


@router.post("/accounts")
async def create_account(data: AccountCreate, current_user=Depends(get_current_user)):
    """Create account"""
    try:
        account = await Account.objects.create(**data.dict(by_alias=False))

        return ApiResponse(
            success=True,
            data=account.dict(by_alias=True),
            message="Account created successfully",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/accounts")
async def list_accounts(current_user=Depends(get_current_user)):
    """List all active accounts"""
    try:
        accounts = (
            await Account.objects.filter(is_active=True).order_by("name").to_list()
        )

        return {"success": True, "data": accounts}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/accounts/{account_id}")
async def get_account(account_id: str, current_user=Depends(get_current_user)):
    """Get single account"""
    try:
        account = await Account.get(str(account_id))
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        return account
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/accounts/{account_id}/balance")
async def update_account_balance(
    account_id: str, balance: float, current_user=Depends(get_current_user)
):
    """Update account balance"""
    try:
        account = await Account.get(str(account_id))
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        await account.update(balance=balance)

        return ApiResponse(
            success=True,
            data=account.dict(by_alias=True),
            message="Balance updated successfully",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== CONTACT ENDPOINTS ====================


@router.post("/contacts")
async def create_contact(data: ContactCreate, current_user=Depends(get_current_user)):
    """Create contact for debt tracking"""
    try:
        contact = await Contact.objects.create(**data.dict(by_alias=False))

        return ApiResponse(
            success=True,
            data=contact.dict(by_alias=True),
            message="Contact created successfully",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/contacts")
async def list_contacts(current_user=Depends(get_current_user)):
    """List all contacts"""
    try:
        contacts = await Contact.objects.all().order_by("name").to_list()

        return {"success": True, "data": contacts}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== UPI PROVIDER ENDPOINTS ====================


@router.get("/upi-providers")
async def list_upi_providers(current_user=Depends(get_current_user)):
    """List all UPI providers"""
    try:
        providers = (
            await UpiProvider.objects.filter(is_active=True).order_by("name").to_list()
        )

        return {"success": True, "data": providers}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== STATISTICS ENDPOINTS ====================


@router.get("/stats/summary")
async def get_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user=Depends(get_current_user),
):
    """Get transaction summary statistics"""
    try:
        query = Transaction.objects.filter(
            created_by=str(current_user.id), is_deleted=False
        )

        if start_date:
            query = query.filter(transaction_date__gte=start_date)
        if end_date:
            query = query.filter(transaction_date__lte=end_date)

        transactions = await query.to_list()

        # Calculate statistics
        total_income = sum(
            t.amount
            for t in transactions
            if t.transaction_type == TransactionType.INCOME
        )
        total_expense = sum(
            t.amount
            for t in transactions
            if t.transaction_type == TransactionType.EXPENSE
        )
        total_transactions = len(transactions)

        return {
            "success": True,
            "data": {
                "totalIncome": total_income,
                "totalExpense": total_expense,
                "netSavings": total_income - total_expense,
                "totalTransactions": total_transactions,
                "averageExpense": (
                    total_expense / total_transactions if total_transactions > 0 else 0
                ),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/stats/by-category")
async def get_category_stats(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user=Depends(get_current_user),
):
    """Get spending by category"""
    try:
        query = Transaction.objects.filter(
            created_by=str(current_user.id),
            is_deleted=False,
            transaction_type=TransactionType.EXPENSE,
        )

        if start_date:
            query = query.filter(transaction_date__gte=start_date)
        if end_date:
            query = query.filter(transaction_date__lte=end_date)

        transactions = await query.to_list()

        # Group by category
        category_totals = {}
        for t in transactions:
            cat_id = str(t.category_id)
            category_totals[cat_id] = category_totals.get(cat_id, 0) + t.amount

        # Get category names
        categories = await Category.objects.all().to_list()
        category_map = {str(c.id): c.name for c in categories}

        result = [
            {
                "categoryId": cat_id,
                "categoryName": category_map.get(cat_id, "Unknown"),
                "amount": amount,
            }
            for cat_id, amount in category_totals.items()
        ]

        return {
            "success": True,
            "data": sorted(result, key=lambda x: x["amount"], reverse=True),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
