# Turn Expiry Bug - Fix Documentation

## Problem Summary

When a turn expires (30 minutes pass), the first person to open the app automatically gets assigned the turn, even if they don't submit anything. This prevents others from claiming the expired turn.

## Root Cause

**Two issues:**

1. **`api/game-state.js`** (✅ FIXED): Auto-assigned `next_editor_fid` to whoever opened the app when it was NULL
2. **`api/_lib/db.js`** (⚠️ NEEDS MANUAL FIX): `assertTurnPermission` only allows NULL on turn 1, throws error on other turns

## Fixes Applied

### ✅ Fixed: `api/game-state.js`

Removed the auto-claiming logic (lines 37-47). Now when a turn expires, `next_editor_fid` remains NULL until someone actually submits.

### ⚠️ Needs Manual Fix: `api/_lib/db.js`

**File:** `api/_lib/db.js`  
**Function:** `assertTurnPermission` (lines 98-109)

**Current code (WRONG):**
```javascript
export async function assertTurnPermission(gameId, fid) {
  const rows = await query`
    SELECT next_editor_fid, status, current_turn FROM games WHERE id = ${gameId}::uuid LIMIT 1
  `;
  if (!rows.length) throw new Error('Game not found');
  const { next_editor_fid, status, current_turn } = rows[0];
  if (status !== 'active') throw new Error('Game not active');
  // Allow initial editor if next_editor_fid still null and on first turn
  if (next_editor_fid == null && current_turn === 1) return;  // ❌ Only allows NULL on turn 1
  if (next_editor_fid == null) throw new Error('No editor assigned');  // ❌ Throws error on expired turns
  if (String(next_editor_fid) !== String(fid)) throw new Error(`Not your turn (expected ${next_editor_fid}, got ${fid})`);
}
```

**Fixed code (CORRECT):**
```javascript
export async function assertTurnPermission(gameId, fid) {
  const rows = await query`
    SELECT next_editor_fid, status, current_turn FROM games WHERE id = ${gameId}::uuid LIMIT 1
  `;
  if (!rows.length) throw new Error('Game not found');
  const { next_editor_fid, status, current_turn } = rows[0];
  if (status !== 'active') throw new Error('Game not active');
  // Allow anyone to submit if next_editor_fid is NULL (initial turn or expired turn)
  if (next_editor_fid == null) return;  // ✅ Allows NULL on ANY turn
  if (String(next_editor_fid) !== String(fid)) throw new Error(`Not your turn (expected ${next_editor_fid}, got ${fid})`);
}
```

**Changes:**
- **Remove line 106:** `if (next_editor_fid == null && current_turn === 1) return;`
- **Replace line 107:** Change `if (next_editor_fid == null) throw new Error('No editor assigned');` to `if (next_editor_fid == null) return;`
- **Update comment:** Change to "Allow anyone to submit if next_editor_fid is NULL (initial turn or expired turn)"

## How It Works After Fix

1. User A gets the turn, has 30 minutes
2. User A doesn't use their turn, 30 minutes pass
3. User B opens the app → sees "It's your turn!" (because `next_editor_fid` is NULL)
4. User C opens the app → also sees "It's your turn!" (because `next_editor_fid` is NULL)
5. Whoever submits first gets the turn
6. The other person now sees "Waiting for @winner"

## Testing

After applying the fix:
1. Start a new game
2. Pass to someone
3. Wait 30+ minutes (or manually set `expiry_timestamp` in DB to past time)
4. Have multiple people open the app
5. Verify they ALL see "It's your turn!"
6. First person to submit should get the turn
7. Others should then see "Waiting for @username"
