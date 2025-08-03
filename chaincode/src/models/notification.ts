import { Object as FabricObject, Property } from 'fabric-contract-api';

@FabricObject()
export class Notification {
    @Property()
    id: string;

    @Property()
    productId: string;

    @Property()
    type: string; // 'created', 'shipped', 'delivered', 'quality_check'

    @Property()
    message: string;

    @Property()
    timestamp: string;

    @Property()
    location: string;

    @Property()
    severity: string; // 'info', 'warning', 'error'

    @Property()
    acknowledged: boolean;
}