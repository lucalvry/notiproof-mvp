import { adapterRegistry } from './AdapterRegistry';
import { ShopifyAdapter } from './adapters/ShopifyAdapter';
import { StripeAdapter } from './adapters/StripeAdapter';
import { AnnouncementsAdapter } from './adapters/AnnouncementsAdapter';
import { LiveVisitorsAdapter } from './adapters/LiveVisitorsAdapter';
import { InstantCaptureAdapter } from './adapters/InstantCaptureAdapter';

// Register all adapters
adapterRegistry.register(new ShopifyAdapter());
adapterRegistry.register(new StripeAdapter());
adapterRegistry.register(new AnnouncementsAdapter());
adapterRegistry.register(new LiveVisitorsAdapter());
adapterRegistry.register(new InstantCaptureAdapter());

export { adapterRegistry };
export * from './IntegrationAdapter';
export * from './AdapterRegistry';
export * from './BaseAdapter';
