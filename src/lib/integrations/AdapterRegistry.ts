import { IntegrationAdapter } from './IntegrationAdapter';

class IntegrationAdapterRegistry {
  private adapters = new Map<string, IntegrationAdapter>();
  
  register(adapter: IntegrationAdapter) {
    this.adapters.set(adapter.id, adapter);
    console.log(`✅ Registered adapter: ${adapter.displayName}`);
  }
  
  get(integrationId: string): IntegrationAdapter | undefined {
    return this.adapters.get(integrationId);
  }
  
  getAll(): IntegrationAdapter[] {
    return Array.from(this.adapters.values());
  }
  
  getByType(type: 'native' | 'external' | 'manual'): IntegrationAdapter[] {
    return this.getAll().filter(a => a.type === type);
  }
}

export const adapterRegistry = new IntegrationAdapterRegistry();
