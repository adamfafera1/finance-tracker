-- Update an existing transfer pair (reverse old balances, update rows, apply new balances)
CREATE OR REPLACE FUNCTION update_transfer(
  p_user_id UUID,
  p_pair_id UUID,
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_transaction_date DATE DEFAULT CURRENT_DATE
) RETURNS VOID AS $$
DECLARE
  v_from_tx_id UUID;
  v_to_tx_id UUID;
  v_old_from_id UUID;
  v_old_to_id UUID;
  v_old_amount NUMERIC;
  v_old_from_kind account_kind;
  v_old_to_kind account_kind;
  v_new_from_kind account_kind;
  v_new_to_kind account_kind;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT id, account_id, amount INTO v_from_tx_id, v_old_from_id, v_old_amount
  FROM transactions
  WHERE transfer_pair_id = p_pair_id AND user_id = p_user_id
  ORDER BY created_at ASC
  LIMIT 1;

  SELECT id, account_id INTO v_to_tx_id, v_old_to_id
  FROM transactions
  WHERE transfer_pair_id = p_pair_id AND user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_from_tx_id IS NULL OR v_to_tx_id IS NULL THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;

  SELECT kind INTO v_new_from_kind FROM accounts WHERE id = p_from_account_id AND user_id = p_user_id;
  SELECT kind INTO v_new_to_kind FROM accounts WHERE id = p_to_account_id AND user_id = p_user_id;

  IF v_new_from_kind IS NULL OR v_new_to_kind IS NULL THEN
    RAISE EXCEPTION 'Invalid accounts';
  END IF;

  SELECT kind INTO v_old_from_kind FROM accounts WHERE id = v_old_from_id;
  SELECT kind INTO v_old_to_kind FROM accounts WHERE id = v_old_to_id;

  -- Reverse old balances
  IF v_old_from_kind = 'asset' THEN
    UPDATE accounts SET balance = balance + v_old_amount, updated_at = now() WHERE id = v_old_from_id;
  ELSE
    UPDATE accounts SET balance = balance - v_old_amount, updated_at = now() WHERE id = v_old_from_id;
  END IF;

  IF v_old_to_kind = 'asset' THEN
    UPDATE accounts SET balance = balance - v_old_amount, updated_at = now() WHERE id = v_old_to_id;
  ELSE
    UPDATE accounts SET balance = balance + v_old_amount, updated_at = now() WHERE id = v_old_to_id;
  END IF;

  -- Update both legs
  UPDATE transactions SET
    account_id = p_from_account_id,
    amount = p_amount,
    description = p_description,
    transaction_date = p_transaction_date
  WHERE id = v_from_tx_id;

  UPDATE transactions SET
    account_id = p_to_account_id,
    amount = p_amount,
    description = p_description,
    transaction_date = p_transaction_date
  WHERE id = v_to_tx_id;

  -- Apply new balances
  IF v_new_from_kind = 'asset' THEN
    UPDATE accounts SET balance = balance - p_amount, updated_at = now() WHERE id = p_from_account_id;
  ELSE
    UPDATE accounts SET balance = balance + p_amount, updated_at = now() WHERE id = p_from_account_id;
  END IF;

  IF v_new_to_kind = 'asset' THEN
    UPDATE accounts SET balance = balance + p_amount, updated_at = now() WHERE id = p_to_account_id;
  ELSE
    UPDATE accounts SET balance = balance - p_amount, updated_at = now() WHERE id = p_to_account_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
