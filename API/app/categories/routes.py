from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from ..core.utils import utils
from datetime import datetime
from .models import (
    Category,
    CategoryCreate,
    CategoryUpdate,
    ApiResponse,
    TransactionType,
    Subcategory,
)


router = APIRouter()


# ==================== CATEGORY ENDPOINTS ====================


@router.post("/save", response_model=ApiResponse)
async def save_category(data: CategoryCreate):
    """Create, Update, or Duplicate category"""
    try:
        category_data = data.model_dump(by_alias=False, exclude_unset=True)
        
        category_id = category_data.get("category_id")
        is_duplicated = category_data.pop("is_duplicated", False)
        
        is_new = not category_id or category_id in utils.none_list
        is_duplicate = category_id and is_duplicated
        is_update = category_id and not is_duplicated
        
        # === CREATE NEW CATEGORY ===
        if is_new:
            category_data.pop("category_id", None)
            category_data.pop("id", None)  # ✅ Remove frontend id
            
            category_data["category_id"] = utils.get_id()
            category_data["created_at"] = datetime.utcnow()
            category_data["is_deleted"] = False
            
            # ✅ Generate IDs for subcategories
            if "subcategories" in category_data:
                for i, sub in enumerate(category_data["subcategories"]):
                    sub["id"] = utils.get_id()  # ✅ Use 'id' not 'subcategory_id'
                    sub["sort_order"] = i
                    sub["created_at"] = datetime.utcnow()
            
            category = Category(**category_data)
            await category.insert()
            
            return ApiResponse(
                success=True,
                message="Category created successfully",
                data=category.model_dump(by_alias=True, mode="json"),
            )
        
        # === UPDATE EXISTING CATEGORY ===
        elif is_update:
            category = await Category.find_one(
                Category.category_id == category_id,
                Category.is_deleted == False,
            )
            
            if not category:
                raise HTTPException(status_code=404, detail="Category not found")
            
            category_data.pop("category_id", None)
            category_data.pop("created_at", None)
            category_data["updated_at"] = datetime.utcnow()
            
            # ✅ Handle subcategories update
            if "subcategories" in category_data:
                for i, sub in enumerate(category_data["subcategories"]):
                    if "id" not in sub or not sub["id"]:
                        sub["id"] = utils.get_id()
                        sub["created_at"] = datetime.utcnow()
                    sub["sort_order"] = i
                    sub["updated_at"] = datetime.utcnow()
            
            for key, value in category_data.items():
                if hasattr(category, key):
                    setattr(category, key, value)
            
            await category.save()
            
            return ApiResponse(
                success=True,
                message="Category updated successfully",
                data=category.model_dump(by_alias=True, mode="json"),
            )
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error in save_category: {str(e)}")
        print(traceback.format_exc())
        return ApiResponse(
            success=False,
            message="Failed to save category",
            errors=[str(e)]
        )


@router.get("/categories/{category_id}")
async def get_category(category_id: str):
    """Get single category by custom category_id"""
    try:
        # Use find_one() for custom fields
        category = await Category.find_one(
            Category.category_id == category_id,
            Category.is_deleted == False
        )
        
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        return ApiResponse(
            success=True,
            data=category.model_dump(by_alias=True, mode='json'),
            message="Category retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error getting category: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/get_list")
async def list_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    transaction_types: Optional[List[TransactionType]] = Query(None, alias="transactionTypes"),
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
):
    """List categories with filters - supports multiple transaction types"""
    try:
        # Start with base query
        query = Category.find(Category.is_deleted == False)
        
        # ✅ Filter by multiple transaction types
        if transaction_types:
            from beanie.operators import In
            query = query.find(In(Category.transaction_types, transaction_types))
        
        if is_active is not None:
            query = query.find(Category.is_active == is_active)
        
        # Search in name/description
        if search:
            from beanie.operators import RegEx
            query = query.find(
                RegEx(Category.name, search, "i") | 
                RegEx(Category.description, search, "i")
            )
        
        # Get total count
        total = await query.count()
        
        # Apply sorting and pagination
        categories = (
            await query.sort(
                Category.sort_order,
                Category.name
            )
            .skip(skip)
            .limit(limit)
            .to_list()
        )
        
        # Serialize
        categories_data = [
            c.model_dump(by_alias=True, mode="json") for c in categories
        ]
        
        return {
            "success": True,
            "data": categories_data,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "pages": (total + limit - 1) // limit,
            },
        }
    except Exception as e:
        import traceback
        print(f"Error listing categories: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    """Soft delete category"""
    try:
        category = await Category.find_one(
            Category.category_id == category_id,
            Category.is_deleted == False
        )
        
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Prevent deletion of system categories
        if category.is_system_category:
            raise HTTPException(
                status_code=403, 
                detail="System categories cannot be deleted"
            )
        
        # Soft delete
        category.is_deleted = True
        category.updated_at = datetime.utcnow()
        await category.save()
        
        return ApiResponse(
            success=True, 
            message="Category deleted successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error deleting category: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/categories/{category_id}/reorder")
async def reorder_categories(category_id: str, new_order: int = Query(..., ge=0)):
    """Update category display order"""
    try:
        category = await Category.find_one(
            Category.category_id == category_id,
            Category.is_deleted == False
        )
        
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        category.display_order = new_order
        category.updated_at = datetime.utcnow()
        await category.save()
        
        return ApiResponse(
            success=True,
            data=category.model_dump(by_alias=True, mode="json"),
            message="Category order updated successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/stats/summary")
async def get_category_stats():
    """Get category statistics"""
    try:
        # Count categories by type
        categories = await Category.find(
            Category.is_deleted == False,
            Category.is_active == True
        ).to_list()
        
        stats = {
            "total": len(categories),
            "byType": {},
            "withSubcategories": 0,
            "totalSubcategories": 0
        }
        
        for category in categories:
            type_name = category.transaction_type.value
            stats["byType"][type_name] = stats["byType"].get(type_name, 0) + 1
            
            if category.subcategories:
                stats["withSubcategories"] += 1
                stats["totalSubcategories"] += len(category.subcategories)
        
        return {
            "success": True,
            "data": stats
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
