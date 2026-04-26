from supabase import Client
from fastapi import HTTPException
from app.schemas.settlements import (
    SettlementCreate, SettlementUpdate, SettlementResponse,
    GroupBalanceResponse, SimplifiedDebtsResponse, DebtSummary
)
from typing import List
from datetime import datetime, timezone


class SettlementService:
    def __init__(self, db: Client):
        self.db = db

    async def create_settlement(self, user_id: str, req: SettlementCreate) -> SettlementResponse:
        self._assert_member(req.group_id, user_id)
        data = {
            "group_id": req.group_id,
            "payer_id": user_id,
            "payee_id": req.payee_id,
            "amount": req.amount,
            "currency": req.currency,
            "notes": req.notes,
        }
        res = self.db.table("settlements").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create settlement")
        return await self._enrich_settlement(res.data[0])

    async def get_group_settlements(self, group_id: str, user_id: str) -> List[SettlementResponse]:
        self._assert_member(group_id, user_id)
        res = self.db.table("settlements").select("*").eq("group_id", group_id).order("created_at", desc=True).execute()
        return [await self._enrich_settlement(s) for s in res.data]

    async def get_settlement(self, settlement_id: str, user_id: str) -> SettlementResponse:
        res = self.db.table("settlements").select("*").eq("id", settlement_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Settlement not found")
        s = res.data
        if s["payer_id"] != user_id and s["payee_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        return await self._enrich_settlement(s)

    async def update_settlement(self, settlement_id: str, user_id: str, req: SettlementUpdate) -> SettlementResponse:
        settlement = self.db.table("settlements").select("payer_id, payee_id, status").eq("id", settlement_id).single().execute()
        if not settlement.data:
            raise HTTPException(status_code=404, detail="Settlement not found")
        s = settlement.data
        if s["payer_id"] != user_id and s["payee_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        if s["status"] == "completed":
            raise HTTPException(status_code=400, detail="Cannot modify a completed settlement")

        update_data = req.model_dump(exclude_none=True)
        if req.status == "completed":
            update_data["settled_at"] = datetime.now(timezone.utc).isoformat()

        self.db.table("settlements").update(update_data).eq("id", settlement_id).execute()
        return await self.get_settlement(settlement_id, user_id)

    async def get_group_balances(self, group_id: str, user_id: str) -> List[GroupBalanceResponse]:
        self._assert_member(group_id, user_id)
        res = self.db.table("group_balances").select("*").eq("group_id", group_id).execute()

        balances = []
        for row in res.data:
            balances.append(GroupBalanceResponse(
                user_id=row["user_id"],
                full_name=row.get("full_name"),
                email=row["email"],
                avatar_url=row.get("avatar_url"),
                net_balance=float(row.get("net_balance", 0)),
            ))
        return balances

    async def get_simplified_debts(self, group_id: str, user_id: str) -> SimplifiedDebtsResponse:
        self._assert_member(group_id, user_id)
        balances_res = await self.get_group_balances(group_id, user_id)
        balance_map = {b.user_id: b.net_balance for b in balances_res}
        profile_map = {b.user_id: b for b in balances_res}

        # Greedy debt simplification
        creditors = sorted([(uid, amt) for uid, amt in balance_map.items() if amt > 0.01], key=lambda x: -x[1])
        debtors = sorted([(uid, -amt) for uid, amt in balance_map.items() if amt < -0.01], key=lambda x: -x[1])

        transactions: List[DebtSummary] = []
        ci, di = 0, 0
        creditors = list(creditors)
        debtors = list(debtors)

        while ci < len(creditors) and di < len(debtors):
            cid, credit = creditors[ci]
            did, debt = debtors[di]
            amount = round(min(credit, debt), 2)

            cp = profile_map.get(cid)
            dp = profile_map.get(did)
            transactions.append(DebtSummary(
                from_user_id=did,
                from_user_name=dp.full_name if dp else None,
                from_user_avatar=dp.avatar_url if dp else None,
                to_user_id=cid,
                to_user_name=cp.full_name if cp else None,
                to_user_avatar=cp.avatar_url if cp else None,
                amount=amount,
                currency="USD",
            ))

            creditors[ci] = (cid, round(credit - amount, 2))
            debtors[di] = (did, round(debt - amount, 2))

            if creditors[ci][1] < 0.01:
                ci += 1
            if debtors[di][1] < 0.01:
                di += 1

        total_outstanding = sum(t.amount for t in transactions)
        return SimplifiedDebtsResponse(
            group_id=group_id,
            currency="USD",
            transactions=transactions,
            total_outstanding=round(total_outstanding, 2),
        )

    async def _enrich_settlement(self, s: dict) -> SettlementResponse:
        payer = self._get_profile(s["payer_id"])
        payee = self._get_profile(s["payee_id"])
        return SettlementResponse(
            **s,
            payer_name=payer.get("full_name"),
            payer_avatar=payer.get("avatar_url"),
            payee_name=payee.get("full_name"),
            payee_avatar=payee.get("avatar_url"),
        )

    def _get_profile(self, user_id: str) -> dict:
        res = self.db.table("profiles").select("full_name, avatar_url").eq("id", user_id).single().execute()
        return res.data or {}

    def _assert_member(self, group_id: str, user_id: str) -> None:
        res = self.db.table("group_members").select("id").eq("group_id", group_id).eq("user_id", user_id).execute()
        if not res.data:
            raise HTTPException(status_code=403, detail="Not a group member")
