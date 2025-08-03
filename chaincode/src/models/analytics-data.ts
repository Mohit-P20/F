import { Object as FabricObject, Property } from 'fabric-contract-api';

@FabricObject()
export class AnalyticsData {
    @Property()
    totalProducts: number;

    @Property()
    activeShipments: number;

    @Property()
    completedDeliveries: number;

    @Property()
    averageDeliveryTime: number;

    @Property()
    onTimeDeliveryRate: number;

    @Property()
    qualityScore: number;

    @Property('categoryStats', 'object')
    categoryStats: { [key: string]: number };

    @Property('locationStats', 'object')
    locationStats: { [key: string]: number };

    @Property('monthlyTrends', 'Array<object>')
    monthlyTrends: Array<{ month: string; products: number; shipments: number }>;
}