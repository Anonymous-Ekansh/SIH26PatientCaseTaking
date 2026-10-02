-- Migration: ct_kiosk_auth
-- Description: RPC for verifying participant PIN using pgcrypto.

CREATE OR REPLACE FUNCTION ct_verify_pin(p_code TEXT, p_pin TEXT) 
RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_hash TEXT;
BEGIN
    SELECT id, pin_hash INTO v_id, v_hash FROM ct_participants WHERE subject_code = p_code;
    IF v_id IS NOT NULL AND v_hash IS NOT NULL THEN
        IF v_hash = crypt(p_pin, v_hash) THEN
            RETURN v_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
