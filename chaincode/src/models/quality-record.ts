import { Object as FabricObject, Property } from 'fabric-contract-api';

@FabricObject()
export class QualityRecord {
    @Property()
    productId: string;

    @Property()
    inspector: string;

    @Property()
    score: number;

    @Property()
    notes: string;

    @Property()
    timestamp: string;

    @Property()
    location: string;

    @Property()
    testResults: string;

    @Property()
    certificationType: string;

    @Property()
    inspectionStandard: string;

    @Property()
    batchId: string;
}