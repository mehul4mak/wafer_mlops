from fastapi import APIRouter, Depends, UploadFile, File
from supabase import Client
from typing import List
from app.core.dependencies import get_current_user_id, get_db
from app.services.settlement_service import SettlementService
from app.services.storage_service import StorageService
from app.schemas.settlements import (
    SettlementCreate, SettlementUpdate, SettlementResponse,
    GroupBalanceResponse, SimplifiedDebtsResponse
)

router = APIRouter(tags=["Settlements"])


@router.post("/settlements", response_model=SettlementResponse, status_code=201)
async def create_settlement(req: SettlementCreate, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    return await SettlementService(db).create_settlement(user_id, req)


@router.get("/groups/{group_id}/settlements", response_model=List[SettlementResponse])
async def list_settlements(group_id: str, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    return await SettlementService(db).get_group_settlements(group_id, user_id)


@router.get("/settlements/{settlement_id}", response_model=SettlementResponse)
async def get_settlement(settlement_id: str, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    return await SettlementService(db).get_settlement(settlement_id, user_id)


@router.patch("/settlements/{settlement_id}", response_model=SettlementResponse)
async def update_settlement(settlement_id: str, req: SettlementUpdate, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    return await SettlementService(db).update_settlement(settlement_id, user_id, req)


@router.post("/settlements/{settlement_id}/proof", response_model=dict)
async def upload_proof(
    settlement_id: str,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: Client = Depends(get_db),
):
    url = await StorageService(db).upload_proof(file, user_id, settlement_id)
    await SettlementService(db).update_settlement(settlement_id, user_id, SettlementUpdate(proof_url=url))
    return {"proof_url": url}


@router.get("/groups/{group_id}/balances", response_model=List[GroupBalanceResponse])
async def get_balances(group_id: str, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    return await SettlementService(db).get_group_balances(group_id, user_id)


@router.get("/groups/{group_id}/debts", response_model=SimplifiedDebtsResponse)
async def get_simplified_debts(group_id: str, user_id: str = Depends(get_current_user_id), db: Client = Depends(get_db)):
    return await SettlementService(db).get_simplified_debts(group_id, user_id)
