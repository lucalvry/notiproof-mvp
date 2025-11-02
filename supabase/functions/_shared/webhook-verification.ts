/**
 * Helper function to mark a connector as verified when it receives its first event
 */
export async function markConnectorVerified(
  supabase: any,
  connectorId: string
): Promise<void> {
  try {
    // Update connector status to 'active' and set last_sync timestamp
    const { error } = await supabase
      .from('integration_connectors')
      .update({
        status: 'active',
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', connectorId)
      .eq('status', 'pending'); // Only update if still pending

    if (error) {
      console.error('Failed to mark connector as verified:', error);
    } else {
      console.log(`Connector ${connectorId} verified and marked as active`);
    }
  } catch (error) {
    console.error('Error in markConnectorVerified:', error);
  }
}

/**
 * Update last_sync timestamp for active connectors
 */
export async function updateConnectorSync(
  supabase: any,
  connectorId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('integration_connectors')
      .update({
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', connectorId);

    if (error) {
      console.error('Failed to update connector sync:', error);
    }
  } catch (error) {
    console.error('Error in updateConnectorSync:', error);
  }
}
