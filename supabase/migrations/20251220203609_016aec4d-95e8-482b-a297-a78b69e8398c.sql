-- Activate the LTD plan so admins can see it in AssignPlanDialog
UPDATE subscription_plans 
SET is_active = true 
WHERE name = 'LTD';