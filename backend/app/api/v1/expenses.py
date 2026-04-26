from fastapi import APIRouter, Depends, Query, UploadFile, File
from supabase import Client
from typing import List
from app.core.dependencies import get_current_user_id, get_db
from app.services.expense_service import ExpenseService
from app.services.storage_service import StorageService
from app.schemas.expenses import ExpenseCreate, ExpenseUpdate, ExpenseResponse, UploadReceiptResponse

router = APIRouter(prefix="/groups/{group_id}/expenses", tags=["Expenses"])


@router.post("", response_model=ExpenseResponse, status_code=201)
async def create_expense(
    group_id: str,
    req: ExpenseCreate,
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    return await ExpenseService(db).create_expense(group_id, user_id, req)


@router.get("", response_model=List[ExpenseResponse])
async def list_expenses(
    group_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    return await ExpenseService(db).get_group_expenses(group_id, user_id, limit, offset)


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(expense_id: str, group_id: str, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    return await ExpenseService(db).get_expense(expense_id, user_id)


@router.patch("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(expense_id: str, group_id: str, req: ExpenseUpdate, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    return await ExpenseService(db).update_expense(expense_id, user_id, req)


@router.delete("/{expense_id}", status_code=204)
async def delete_expense(expense_id: str, group_id: str, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    await ExpenseService(db).delete_expense(expense_id, user_id)


@router.post("/{expense_id}/settle", status_code=204)
async def settle_my_split(expense_id: str, group_id: str, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    await ExpenseService(db).settle_split(expense_id, user_id)


@router.post("/{expense_id}/receipt", response_model=UploadReceiptResponse)
async def upload_receipt(
    expense_id: str,
    group_id: str,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    url = await StorageService(db).upload_receipt(file, user_id, group_id)
    await ExpenseService(db).update_expense(expense_id, user_id, {"receipt_url": url})
    return UploadReceiptResponse(url=url, expense_id=expense_id)
