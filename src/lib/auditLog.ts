import { supabase } from "@/integrations/supabase/client";

interface AuditLogParams {
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Logs an admin action to the audit_logs table
 * @param params - The audit log parameters
 * @returns The ID of the created log entry
 */
export async function logAdminAction(params: AuditLogParams): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("No authenticated user found for audit logging");
      return null;
    }

    const { data, error } = await supabase
      .from("audit_logs")
      .insert({
        admin_id: user.id,
        action: params.action,
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        details: params.details || {},
        ip_address: params.ipAddress,
        user_agent: params.userAgent || navigator.userAgent,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error logging admin action:", error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error("Failed to log admin action:", error);
    return null;
  }
}

/**
 * Logs a user management action
 */
export async function logUserAction(
  action: "user_created" | "user_suspended" | "user_reactivated" | "user_deleted" | "role_changed",
  userId: string,
  details?: Record<string, any>
) {
  return logAdminAction({
    action,
    resourceType: "user",
    resourceId: userId,
    details,
  });
}

/**
 * Logs a website management action
 */
export async function logWebsiteAction(
  action: "website_created" | "website_verified" | "website_deleted" | "website_updated",
  websiteId: string,
  details?: Record<string, any>
) {
  return logAdminAction({
    action,
    resourceType: "website",
    resourceId: websiteId,
    details,
  });
}

/**
 * Logs an integration management action
 */
export async function logIntegrationAction(
  action: "integration_configured" | "integration_tested" | "integration_disabled" | "integration_enabled",
  integrationId: string,
  details?: Record<string, any>
) {
  return logAdminAction({
    action,
    resourceType: "integration",
    resourceId: integrationId,
    details,
  });
}

/**
 * Logs a system settings change
 */
export async function logSettingsChange(
  action: "settings_updated" | "feature_flag_toggled" | "banner_updated",
  settingKey: string,
  details?: Record<string, any>
) {
  return logAdminAction({
    action,
    resourceType: "system_setting",
    resourceId: settingKey,
    details,
  });
}

/**
 * Logs a campaign management action
 */
export async function logCampaignAction(
  action: "campaign_created" | "campaign_updated" | "campaign_activated" | "campaign_deactivated" | "campaign_deleted",
  campaignId: string,
  details?: Record<string, any>
) {
  return logAdminAction({
    action,
    resourceType: "campaign",
    resourceId: campaignId,
    details,
  });
}