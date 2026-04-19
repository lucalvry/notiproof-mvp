UPDATE campaigns
SET integration_settings = jsonb_set(integration_settings, '{verification_text}', '"NotiProof Verified"'::jsonb)
WHERE integration_settings->>'verification_text' = 'Verified by ActiveProof';

UPDATE campaigns
SET native_config = jsonb_set(native_config, '{verification_text}', '"NotiProof Verified"'::jsonb)
WHERE native_config->>'verification_text' = 'Verified by ActiveProof';